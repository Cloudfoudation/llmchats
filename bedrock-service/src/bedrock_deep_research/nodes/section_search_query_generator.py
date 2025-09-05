import logging

from langchain_aws import ChatBedrock
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from ..config import Configuration
from ..model import Queries, Section, SectionState
from ..utils import exponential_backoff_retry
from ..prompts import DEFAULT_QUERY_WRITER_INSTRUCTIONS

logger = logging.getLogger(__name__)

class SectionSearchQueryGenerator:
    N = "generate_section_search_queries"

    def __call__(self, state: SectionState, config: RunnableConfig):
        """Generate search queries for a article section"""

        # Get state
        section = state["section"]

        # Get configuration
        configurable = Configuration.from_runnable_config(config)

        try:
            queries = generate_section_queries(configurable, section)
        except Exception as e:
            logger.error(f"Error generating search queries: {e}")
            raise e
        return {"search_queries": queries.queries}


@exponential_backoff_retry(Exception, max_retries=10)
def generate_section_queries(configurable: Configuration, section: Section) -> Queries:
    planner_model = ChatBedrock(
        model_id=configurable.planner_model, max_tokens=configurable.max_tokens, region_name='us-east-1'
    ).with_structured_output(Queries)

    # Get custom prompt if available
    query_instructions = configurable.get_prompt("query_writer_instructions")

    # Format system instructions
    system_instructions = query_instructions.format(
        section_topic=section.description, number_of_queries=configurable.number_of_queries
    )

    # Generate queries
    return planner_model.invoke(
        [SystemMessage(content=system_instructions)]
        + [HumanMessage(content="Generate search queries on the provided topic.")]
    )
