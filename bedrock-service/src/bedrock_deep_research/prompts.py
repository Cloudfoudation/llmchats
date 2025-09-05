# bedrock-service/src/bedrock_deep_research/prompts.py
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

# Default prompt templates
DEFAULT_OUTLINE_GENERATOR_SYSTEM_PROMPT = """You are an expert technical writer tasked to plan an article outline for a topic.

<instructions>
1. Create a clear, engaging title for the article
2. Generate a list of sections for the article.
3. Design a logical progression of sections with descriptive headings
4. Each section should have the fields:
    - name: Concise, descriptive section heading
    - description: Brief summary of section content (2-3 sentences)
5. Introduction and conclusion will not require research because they can distill information from other parts of the article.
6. If a feedback is provided, use it to improve the outline or the title.
7. Return the title and sections as a valid JSON object without any additional text.
</instructions>
"""

DEFAULT_SECTION_WRITER_INSTRUCTIONS = """You are an expert technical writer crafting one section of a technical article.

<Section topic>
{section_topic}
</Section topic>

<Existing section content (if populated)>
{section_content}
</Existing section content>

<Source material>
{context}
</Source material>

<Guidelines for writing>
1. If the existing section content is not populated, write a new section from scratch.
2. If the existing section content is populated, write a new section that synthesizes the existing section content with the new information.
</Guidelines for writing>

<Length and style>
- Do not include a section title
- No marketing language
- Technical focus
- Write in simple, clear language
- Use short paragraphs (2-3 sentences max)
- Only use ONE structural element IF it helps clarify your point:
  * Either a focused table comparing 2-3 key items (using Markdown table syntax)
  * Or a short list (3-5 items) using proper Markdown list syntax:
    - Use `*` or `-` for unordered lists
    - Use `1.` for ordered lists
    - Ensure proper indentation and spacing
- End with ### Sources that references the below source material formatted as:
  * List each source with title, date, and URL
  * Format: `- Title : URL`
{writing_guidelines}
</Length and style>

<Quality checks>
- Careful use of only ONE structural element (table or list) and only if it helps clarify your point
- One specific example / case study
- No preamble prior to creating the section content
- Sources cited at end
</Quality checks>
"""

DEFAULT_SECTION_GRADER_INSTRUCTIONS = """Review a section of an article relative to the specified topic:

<section topic>
{section_topic}
</section topic>

<section content>
{section}
</section content>

<task>
Evaluate whether the section adequately covers the topic by checking technical accuracy and depth.

If the section fails any criteria, generate specific follow-up search queries to gather missing information.
</task>

<format>
    grade: Literal["pass","fail"] = Field(
        description="Evaluation result indicating whether the response meets requirements ('pass') or needs revision ('fail')."
    )
    follow_up_queries: List[SearchQuery] = Field(
        description="List of follow-up search queries.",
    )
</format>
"""

DEFAULT_QUERY_WRITER_INSTRUCTIONS = """You are an expert technical writer crafting targeted web search queries that will gather comprehensive information for writing a technical article section.

<Section topic>
{section_topic}
</Section topic>


<Task>
When generating {number_of_queries} search queries, ensure they:
1. Cover different aspects of the topic (e.g., core features, real-world applications, technical architecture)
2. Include specific technical terms related to the topic
3. Target recent information by including year markers where relevant (e.g., "2024")
4. Look for comparisons or differentiators from similar technologies/approaches
5. Search for both official documentation and practical implementation examples

Your queries should be:
- Specific enough to avoid generic results
- Technical enough to capture detailed implementation information
- Diverse enough to cover all aspects of the section plan
- Focused on authoritative sources (documentation, technical blogs, academic papers)
</Task>"""

DEFAULT_INITIAL_RESEARCH_SYSTEM_PROMPT = """You are an expert technical writer, helping to structure an article content on the topic: "{topic}"

<instructions>
{article_organization}
</instructions>

Your task is to generate {number_of_queries} search queries that will help gather comprehensive information for planning the article sections.

The queries should:
1. Be relevant to the topic
2. Help satisfy the requirements specified in instructions.

Make the queries detailed but specific enough to find high-quality, relevant sources while covering the breadth needed for the article structure."""

DEFAULT_FINAL_SECTION_WRITER_INSTRUCTIONS = """You are an expert technical writer crafting a section that synthesizes information from the rest of the article.

<Section title>
{section_title}
</Section title>

<Section description>
{section_description}
</Section description>

<Available article content>
{context}
</Available article content>

<Task>
1. Section-Specific Approach:

For Introduction:
- Do not include a section title
- 50-100 word limit
- Write in simple and clear language
- Focus on the core motivation for the article in 1-2 paragraphs
- Use a clear narrative arc to introduce the article
- Include NO structural elements (no lists or tables)
- No sources section needed

For Conclusion/Summary:
- Do not include a section title
- 100-150 word limit
- For comparative articles:
    * Must include a focused comparison table using Markdown table syntax
    * Table should distill insights from the article
    * Keep table entries clear and concise
- For non-comparative articles:
    * Only use ONE structural element IF it helps distill the points made in the article:
    * Either a focused table comparing items present in the article (using Markdown table syntax)
    * Or a short list using proper Markdown list syntax:
      - Use `*` or `-` for unordered lists
      - Use `1.` for ordered lists
      - Ensure proper indentation and spacing
- End with specific next steps or implications
- No sources section needed

3. Writing Approach:
- Use concrete details over general statements
- Make every word count
- Focus on your single most important point
</Task>

<Quality Checks>
- Do not include any title or Markdown element starting with # or ##
- For introduction: 50-100 word limit, no structural elements, no sources section
- For conclusion: 100-150 word limit, only ONE structural element at most, no sources section
- Markdown format
- Do not include word count or any preamble in your response
</Quality Checks>"""


DEFAULT_REPORT_STRUCTURE = """
The article should follow this structure:
1. Introduction
   - Provide an overview of the topic
   - Explain why this topic is important or relevant
   - Preview the main points that will be covered

2. Main Content Sections
   - Organize information into logical sections
   - Each section should focus on a specific aspect of the topic
   - Include relevant examples, data, or case studies
   - Provide analysis and insights

3. Conclusion
   - Summarize the key points
   - Discuss implications or future developments
   - End with a meaningful takeaway for readers
"""

class PromptConfig(BaseModel):
    """Configuration schema for customizable prompts in the research process"""
    
    outline_generator_system_prompt: Optional[str] = Field(
        default=DEFAULT_OUTLINE_GENERATOR_SYSTEM_PROMPT,
        description="System prompt for generating article outline"
    )    
    
    section_writer_instructions: Optional[str] = Field(
        default=DEFAULT_SECTION_WRITER_INSTRUCTIONS,
        description="Instructions for writing article sections"
    )
    
    section_grader_instructions: Optional[str] = Field(
        default=DEFAULT_SECTION_GRADER_INSTRUCTIONS,
        description="Instructions for grading section quality and suggesting improvements"
    )
    
    query_writer_instructions: Optional[str] = Field(
        default=DEFAULT_QUERY_WRITER_INSTRUCTIONS,
        description="Instructions for generating search queries for section research"
    )
    
    initial_research_system_prompt: Optional[str] = Field(
        default=DEFAULT_INITIAL_RESEARCH_SYSTEM_PROMPT,
        description="System prompt for initial topic research"
    )
    
    final_section_writer_instructions: Optional[str] = Field(
        default=DEFAULT_FINAL_SECTION_WRITER_INSTRUCTIONS,
        description="Instructions for writing concluding sections of the article"
    )
    
    report_structure: Optional[str] = Field(
        default=DEFAULT_REPORT_STRUCTURE,
        description="Template for article organization and structure"
    )

    def get_prompt(self, prompt_name: str) -> str:
        """Get a prompt by name, returning the default if not customized"""
        prompts = {
            "report_structure": self.report_structure or DEFAULT_REPORT_STRUCTURE,
            "outline_generator_system_prompt": self.outline_generator_system_prompt or DEFAULT_OUTLINE_GENERATOR_SYSTEM_PROMPT,
            "section_writer_instructions": self.section_writer_instructions or DEFAULT_SECTION_WRITER_INSTRUCTIONS,
            "section_grader_instructions": self.section_grader_instructions or DEFAULT_SECTION_GRADER_INSTRUCTIONS,
            "query_writer_instructions": self.query_writer_instructions or DEFAULT_QUERY_WRITER_INSTRUCTIONS,
            "initial_research_system_prompt": self.initial_research_system_prompt or DEFAULT_INITIAL_RESEARCH_SYSTEM_PROMPT,
            "final_section_writer_instructions": self.final_section_writer_instructions or DEFAULT_FINAL_SECTION_WRITER_INSTRUCTIONS,
        }
        return prompts.get(prompt_name, "") 