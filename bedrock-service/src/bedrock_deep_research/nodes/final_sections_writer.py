from langchain_aws import ChatBedrock
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from ..config import Configuration
from ..model import Section, SectionState
from ..utils import exponential_backoff_retry
from ..prompts import DEFAULT_FINAL_SECTION_WRITER_INSTRUCTIONS

class FinalSectionsWriter:
    N = "write_final_sections"

    def __call__(self, state: SectionState, config: RunnableConfig):
        """Write final sections of the article, which do not require web search and use the completed sections as context"""

        section = state["section"]
        completed_report_sections = state["report_sections_from_research"]

        configurable = Configuration.from_runnable_config(config)

        writer_model = ChatBedrock(
            model_id=configurable.writer_model, streaming=True, region_name='us-east-1')

        # Get custom prompt if available
        final_section_instructions = configurable.get_prompt("final_section_writer_instructions")

        section.content = self._generate_final_sections(
            writer_model,
            final_section_instructions,
            section,
            completed_report_sections,
        )

        return {"completed_sections": [section]}

    @exponential_backoff_retry(Exception, max_retries=10)
    def _generate_final_sections(
        self,
        model: ChatBedrock,
        system_prompt: str,
        section: Section,
        completed_report_sections: str,
    ) -> str:
        # Format system instructions
        system_instructions = system_prompt.format(
            section_title=section.name,
            section_description=section.description,
            context=completed_report_sections,
        )

        # Generate section
        section_content = model.invoke(
            [SystemMessage(content=system_instructions)]
            + [
                HumanMessage(
                    content="Generate a section of an article based on the provided sources."
                )
            ]
        )

        return section_content.content
