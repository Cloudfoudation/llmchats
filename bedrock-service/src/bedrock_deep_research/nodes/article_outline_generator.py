import logging

from langchain_aws import ChatBedrock
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from ..config import Configuration
from ..model import ArticleState, Outline, Section
from ..prompts import DEFAULT_OUTLINE_GENERATOR_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

user_prompt_template = """
The topic of the article is:
<topic>
{topic}
</topic>

<article organization>
{article_organization}
</article organization>

Use this context to plan the sections of the article:
<Context>
{context}
</Context>

<feedback>
{feedback}
</feedback>
"""


class ArticleOutlineGenerator:
    N = "generate_article_outline"

    def __call__(self, state: ArticleState, config: RunnableConfig):
        logging.info("Generating report plan")

        topic = state.get("topic", "")
        source_str = state.get("source_str", "")
        feedback = state.get("feedback_on_report_plan", "")
        if feedback:
            feedback = f"<Feedback>\nHere is some feedback on article structure from user review:{feedback}\n</Feedback>"

        configurable = Configuration.from_runnable_config(config)

        # Use custom prompt if available
        system_prompt = configurable.get_prompt("outline_generator_system_prompt")

        user_prompt = user_prompt_template.format(
            topic=topic,
            article_organization=configurable.report_structure,
            context=source_str,
            feedback=feedback,
        )
        outline = self.generate_outline(
            configurable.planner_model, configurable.max_tokens, system_prompt, user_prompt)

        logger.info(f"Generated sections: {outline.sections}")
        sections = [
            Section(section_number=i, name=section.name,
                    description=section.description)
            for i, section in enumerate(outline.sections)
        ]
        # Set the first and the last section research as false.
        sections[-1].research, sections[0].research = False, False
        logger.info(f"Sections -> {sections}")
        return {"title": outline.title, "sections": sections}

    def generate_outline(self, model_id: str, max_tokens: int, system_prompt: str, user_prompt: str):

        planner_model = ChatBedrock(
            model_id=model_id, max_tokens=max_tokens, region_name='us-east-1'
        ).with_structured_output(Outline)

        return planner_model.invoke(
            [SystemMessage(content=system_prompt)]
            + [
                HumanMessage(
                    content=user_prompt
                )
            ]
        )
