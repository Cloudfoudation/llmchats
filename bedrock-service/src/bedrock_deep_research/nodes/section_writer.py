import logging
from typing import List, Literal

from langchain_aws import ChatBedrock
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END
from langgraph.types import Command
from pydantic import BaseModel, Field

from ..config import Configuration
from ..model import Section, SectionState
from ..utils import exponential_backoff_retry
from .section_web_researcher import SectionWebResearcher

logger = logging.getLogger(__name__)


class Feedback(BaseModel):
    """A feedback for a section with potential followup queries."""

    grade: Literal["pass", "fail"] = Field(
        description="Evaluation result indicating whether the response meets requirements ('pass') or needs revision ('fail')."
    )
    follow_up_queries: List[str] = Field(
        description="List of follow-up search queries.",
    )


class SectionWriter:
    """Write a section of the article"""

    N = "section_write"

    def __call__(self, state: SectionState, config: RunnableConfig) -> Command[Literal[END, SectionWebResearcher.N]]:
        """Write a section of the article"""

        # Get state
        section = state["section"]
        source_str = state["source_str"]
        sources = state["sources"]

        # Get configuration
        configurable = Configuration.from_runnable_config(config)
        writing_guidelines = configurable.writing_guidelines

        try:
            writer_model = ChatBedrock(
                model_id=configurable.writer_model, max_tokens=configurable.max_tokens, region_name='us-east-1')

            # Get custom prompts if available
            section_writer_instr = configurable.get_prompt("section_writer_instructions")
            section_grader_instr = configurable.get_prompt("section_grader_instructions")

            section.content = self._generate_section_content(
                writer_model,
                section_writer_instr,
                section,
                source_str,
                writing_guidelines,
            )
            section.sources = sources

            feedback = self._grade_section_content(
                writer_model, section_grader_instr, section
            )

        except Exception as e:
            logger.error(f"Error writing section: {e}")
            raise e

        if (
            feedback.grade == "pass"
            or state["search_iterations"] >= configurable.max_search_depth
        ):
            # Publish the section to completed sections
            return Command(update={"completed_sections": [section]}, goto=END)
        else:
            # Update the existing section with new content and update search queries
            return Command(
                update={
                    "search_queries": feedback.follow_up_queries,
                    "section": section,
                },
                goto=SectionWebResearcher.N,
            )

    @exponential_backoff_retry(Exception, max_retries=10)
    def _generate_section_content(
        self,
        model: ChatBedrock,
        system_prompt: str,
        section: Section,
        search_content: str,
        writing_guidelines: str,
    ) -> str:
        system_prompt = system_prompt.format(
            section_title=section.name,
            section_topic=section.description,
            context=search_content,
            section_content=section.content,
            writing_guidelines=writing_guidelines,
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content="Generate a section of the article based on the provided sources."
            ),
        ]

        section_content = model.invoke(messages)

        return section_content.content

    @exponential_backoff_retry(Exception, max_retries=10)
    def _grade_section_content(
        self, model: ChatBedrock, system_prompt: str, section: Section
    ) -> Feedback:

        section_grader_instructions_formatted = system_prompt.format(
            section_topic=section.description, section=section.content
        )

        structured_llm = model.with_structured_output(Feedback)
        feedback = structured_llm.invoke(
            [SystemMessage(content=section_grader_instructions_formatted)]
            + [
                HumanMessage(
                    content="Grade the article and consider follow-up questions for missing information:"
                )
            ]
        )

        return feedback
