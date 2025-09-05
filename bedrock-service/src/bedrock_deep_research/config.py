import os
from dataclasses import dataclass, fields
from typing import Any, Optional

from langchain_core.runnables import RunnableConfig
from .prompts import PromptConfig, DEFAULT_REPORT_STRUCTURE

SUPPORTED_MODELS = {
    "Anthropic Claude 3.5 Haiku": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    "Anthropic Claude 3.5 Sonnet v2": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "Anthropic Claude 3.7 Sonnet": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    #     "Amazon Nova Lite": "amazon.nova-lite-v1:0",
    #     "Amazon Nova Pro": "amazon.nova-pro-v1:0",
}

@dataclass(kw_only=True)
class Configuration:
    # Existing attributes
    thread_id: str
    report_structure: str
    writing_guidelines: str
    number_of_queries: int
    max_search_depth: int
    max_tokens: int
    planner_model: str
    writer_model: str
    output_dir: str
    image_model: Optional[str]
    generate_images: bool
    aws_region: str
    
    # New attribute for custom prompts
    prompt_config: Optional[PromptConfig] = None
    
    def __init__(self, **kwargs):
        # Initialize existing attributes
        for key, value in kwargs.items():
            if key != 'prompt_config':
                setattr(self, key, value)
            
        # Initialize prompt_config - ensure it's a PromptConfig object
        if 'prompt_config' in kwargs:
            if isinstance(kwargs['prompt_config'], dict):
                self.prompt_config = PromptConfig(**kwargs['prompt_config'])
            elif isinstance(kwargs['prompt_config'], PromptConfig):
                self.prompt_config = kwargs['prompt_config']
            else:
                self.prompt_config = PromptConfig()
        else:
            self.prompt_config = PromptConfig()
        
        # Use report_structure from prompt_config if available
        if not hasattr(self, 'report_structure'):
            self.report_structure = (self.prompt_config.report_structure 
                                   or DEFAULT_REPORT_STRUCTURE)
    
    @classmethod
    def from_runnable_config(cls, config: dict):
        """Create Configuration from runnable config"""
        configurable = config.get("configurable", {})
        return cls(**configurable)
    
    def get_prompt(self, prompt_name: str) -> str:
        """Get custom prompt if exists, otherwise return default"""
        if not self.prompt_config:
            from .prompts import PromptConfig
            self.prompt_config = PromptConfig()
        
        return self.prompt_config.get_prompt(prompt_name)
