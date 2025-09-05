import os
import time
import random
import threading
import asyncio
import functools
import json
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import logging
import warnings
import urllib3
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from handlers.auth import verify_token

import tempfile
import subprocess
from pathlib import Path
from fastapi.responses import StreamingResponse, RedirectResponse
import io
from bedrock_deep_research.prompts import (
    PromptConfig,
    DEFAULT_REPORT_STRUCTURE,
    DEFAULT_OUTLINE_GENERATOR_SYSTEM_PROMPT,
    DEFAULT_SECTION_WRITER_INSTRUCTIONS,
    DEFAULT_SECTION_GRADER_INSTRUCTIONS,
    DEFAULT_QUERY_WRITER_INSTRUCTIONS,
    DEFAULT_INITIAL_RESEARCH_SYSTEM_PROMPT,
    DEFAULT_FINAL_SECTION_WRITER_INSTRUCTIONS
)
# Create a thread pool executor for running syncronous code that might use asyncio.run()
executor = ThreadPoolExecutor()

def get_dynamodb_table():
    """Get or create the DynamoDB table, ensuring it exists in each worker"""
    table_name = os.environ.get('RESEARCH_TASKS_TABLE', 'bedrock-research-tasks')
    dynamodb_resource = boto3.resource('dynamodb')
    
    try:
        # Try to access the table
        table = dynamodb_resource.Table(table_name)
        # Test if the table exists with a simple operation
        table.table_status
        return table
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.info(f"Table {table_name} does not exist, creating it...")
            
            # Create the table
            table = dynamodb_resource.create_table(
                TableName=table_name,
                KeySchema=[
                    {'AttributeName': 'userId', 'KeyType': 'HASH'},
                    {'AttributeName': 'task_id', 'KeyType': 'RANGE'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'userId', 'AttributeType': 'S'},
                    {'AttributeName': 'task_id', 'AttributeType': 'S'}
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            
            # Wait until table is created
            table.meta.client.get_waiter('table_exists').wait(TableName=table_name)
            return dynamodb_resource.Table(table_name)
        else:
            logger.error(f"Error accessing DynamoDB table: {e}")
            raise

async def run_in_threadpool(func, *args, **kwargs):
    """Run a synchronous function in a thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        executor, functools.partial(func, *args, **kwargs)
    )

# Patch urllib3's response closing to avoid the warnings
def patch_urllib3():
    original_close = urllib3.response.HTTPResponse.close
    
    def patched_close(self):
        try:
            if self._fp:
                try:
                    original_close(self)
                except (ValueError, IOError):
                    pass
            else:
                original_close(self)
        except Exception:
            pass  # Suppress all exceptions during close
    
    urllib3.response.HTTPResponse.close = patched_close

# Apply the patch
patch_urllib3()

# Suppress warnings
warnings.filterwarnings("ignore", category=ResourceWarning)
warnings.filterwarnings("ignore", message="unclosed file")
warnings.filterwarnings("ignore", message="I/O operation on closed file")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:%(filename)s:L%(lineno)d - %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress unnecessary boto3 and urllib3 logging
logging.getLogger("boto3").setLevel(logging.WARNING)
logging.getLogger("botocore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
tasks_table = None  # Will be initialized at startup

# Initialize S3 client
s3_client = boto3.client('s3')

# Define the table name and S3 bucket based on environment variables or default values
TASKS_TABLE_NAME = os.environ.get('RESEARCH_TASKS_TABLE', 'bedrock-research-tasks')
STORAGE_BUCKET_NAME = os.environ.get('RESEARCH_STORAGE_BUCKET', 'bedrock-research-storage')
TMP_DIR = os.environ.get('TMP_DIR', '/tmp')

# Create FastAPI app
app = FastAPI(
    title="Bedrock Deep Research API",
    description="API for generating in-depth research articles using AWS Bedrock and Claude AI",
    version="1.0.0",
)

# Pydantic models for API
class ResearchRequest(BaseModel):
    topic: str
    writing_guidelines: str = """- Strict 200 word limit
- Start with your most important insight in **bold**
"""
    generate_images: bool = True
    prompt_config: Optional[PromptConfig] = None
    
    # Research configuration
    number_of_queries: int = 2  # Number of search queries to generate per iteration
    max_search_depth: int = 2   # Maximum number of reflection + search iterations
    max_tokens: int = 2048
    
    # Model configuration
    planner_model: str = "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
    writer_model: str = "us.anthropic.claude-3-5-haiku-20241022-v1:0"
    image_model: str = "amazon.nova-canvas-v1:0"
    
    # Output configuration
    output_dir: str = "output"
    
    class Config:
        # Allow extra fields
        extra = "allow"
        
        # Provide descriptions for fields
        schema_extra = {
            "example": {
                "topic": "The impact of artificial intelligence on healthcare",
                "writing_guidelines": "- Strict 200 word limit\n- Start with your most important insight in **bold**",
                "generate_images": True,
                "number_of_queries": 2,
                "max_search_depth": 2
            }
        }

class ResearchResponse(BaseModel):
    task_id: str
    status: str
    message: str

class ResearchOutlineResponse(BaseModel):
    task_id: str
    title: Optional[str] = None
    sections: Optional[List[Dict[str, Any]]] = None

class FeedbackRequest(BaseModel):
    task_id: str
    accept_outline: bool = True

class ResearchStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: float = 0.0
    current_step: Optional[str] = None
    outline: Optional[Any] = None
    article: Optional[str] = None
    article_url: Optional[str] = None
    image_url: Optional[str] = None
    pdf_url: Optional[str] = None
    error: Optional[str] = None
    created_at: float

# Local cache of tasks for better performance
task_cache = {}

# Image generation monitor class
class ImageGenerationMonitor:
    def __init__(self, max_wait=300):
        self.started = False
        self.completed = False
        self.stop_thread = False
        self.max_wait = max_wait
        self.start_time = None
        self.monitor_thread = None
        
    def start_monitoring(self):
        self.started = True
        self.start_time = time.time()
        self.monitor_thread = threading.Thread(target=self._monitor_progress)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
    def _monitor_progress(self):
        chars = "|/-\\"
        i = 0
        elapsed_seconds = 0
        
        while not self.completed and not self.stop_thread:
            elapsed_seconds = int(time.time() - self.start_time)
            minutes = elapsed_seconds // 60
            seconds = elapsed_seconds % 60
            
            # Instead of printing to stdout, we'll just log the progress
            logger.info(f"Image generation in progress: {minutes:02d}:{seconds:02d}")
            i = (i + 1) % len(chars)
            
            # Use controlled delay with early exit check
            for _ in range(50):  # 5 seconds total, checking every 0.1 seconds
                if self.completed or self.stop_thread:
                    break
                # Legitimate polling delay for image generation status
                time.sleep(0.1)  # nosemgrep: arbitrary-sleep
            
            if elapsed_seconds > self.max_wait:
                logger.warning("Image generation timed out after 5 minutes.")
                self.stop_thread = True
        
        if self.completed:
            logger.info("Image generation completed")
            
    def complete(self):
        self.completed = True
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1.0)
            
    def __del__(self):
        self.stop_thread = True
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=0.5)

def exponential_backoff(attempts, max_attempts=5, base_delay=1, max_delay=60):
    if attempts >= max_attempts:
        return None
    
    delay = min(max_delay, (2 ** attempts) * base_delay)
    jitter = random.uniform(0, 0.1 * delay)
    return delay + jitter

def with_retry(func, *args, max_attempts=5, **kwargs):
    attempts = 0
    last_exception = None
    
    while attempts < max_attempts:
        try:
            return func(*args, **kwargs)
        except (ClientError, boto3.exceptions.Boto3Error) as e:
            # Check for specific errors
            error_code = getattr(e, 'response', {}).get('Error', {}).get('Code')
            error_message = getattr(e, 'response', {}).get('Error', {}).get('Message', '')
            
            # Handle image generation validation error specifically
            if error_code == 'ValidationException' and 'model identifier is invalid' in error_message.lower():
                logger.warning("The image model is not available or not enabled for your account.")
                # Allow continuing without image generation
                if 'image' in func.__name__.lower():
                    logger.info("Continuing without generating an image.")
                    return None
            
            # Handle throttling exceptions
            if error_code in ['ThrottlingException', 'TooManyRequestsException', 'ServiceUnavailable']:
                attempts += 1
                delay = exponential_backoff(attempts, max_attempts)
                
                if delay is None:
                    last_exception = e
                    break
                    
                logger.info(f"Rate limit reached. Retrying in {delay:.2f} seconds... (Attempt {attempts}/{max_attempts})")
                # Use asyncio.sleep for async compatibility instead of time.sleep
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # We're in an async context, but this is a sync function
                        # Use a minimal delay to avoid blocking
                        time.sleep(min(delay, 1.0))  # nosemgrep: arbitrary-sleep
                    else:
                        # Legitimate retry delay for AWS service calls
                        time.sleep(delay)  # nosemgrep: arbitrary-sleep
                except RuntimeError:
                    # No event loop, safe to use time.sleep
                    time.sleep(delay)  # nosemgrep: arbitrary-sleep
            else:
                # Log the error but don't retry for other AWS errors
                logger.warning(f"AWS Error: {error_code} - {error_message}")
                if 'image' in func.__name__.lower():
                    logger.info("Continuing without generating an image.")
                    return None
                raise
        except Exception as e:
            # For non-AWS exceptions, don't retry
            raise
    
    # If we've exhausted retries
    if last_exception:
        logger.error(f"Maximum retry attempts reached. Last error: {last_exception}")
        raise last_exception
    
    return None

def format_outline(state_values):
    if 'title' not in state_values or 'sections' not in state_values:
        return "Unable to construct outline - missing title or sections"
    
    title = state_values['title']
    sections = state_values['sections']
    
    outline = f"\nTitle: **{title}**\n\n"
    
    if not sections:
        return outline + "No sections defined."
    
    for i, section in enumerate(sections):
        if isinstance(section, dict):
            section_name = section.get('name', f"Section {i+1}")
            outline += f"{i + 1}. {section_name}\n"
        else:
            outline += f"{i + 1}. {str(section)}\n"
            
    return outline

async def upload_file_to_s3(file_path, user_id, task_id, file_type):
    """Upload a file to S3 and return the S3 URL"""
    try:
        if not os.path.exists(file_path):
            logger.warning(f"File {file_path} does not exist")
            return None
            
        # Determine file extension
        _, file_ext = os.path.splitext(file_path)
        if not file_ext:
            # Default extensions if none found
            if file_type == 'article':
                file_ext = '.md'
            elif file_type == 'pdf':
                file_ext = '.pdf'
            else:
                file_ext = '.png'  # Default for images
            
        # Define S3 key (path) - include user_id in the path
        s3_key = f"{user_id}/{task_id}/{file_type}{file_ext}"
        
        # Set appropriate content type
        content_type = 'text/markdown'
        if file_type == 'pdf':
            content_type = 'application/pdf'
        elif file_type == 'image':
            content_type = 'image/png'
        
        # Upload file to S3
        with open(file_path, 'rb') as file_data:
            await run_in_threadpool(
                lambda: s3_client.upload_fileobj(
                    file_data, 
                    STORAGE_BUCKET_NAME, 
                    s3_key,
                    ExtraArgs={'ContentType': content_type}
                )
            )
        
        # Generate presigned URL (valid for 6 days)
        url = await run_in_threadpool(
            lambda: s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': STORAGE_BUCKET_NAME, 'Key': s3_key},
                ExpiresIn=518400  # 6 days in seconds (6 * 24 * 60 * 60)
            )
        )
        
        logger.info(f"Uploaded {file_type} to S3: {s3_key}")
        
        # Delete the local file after successful upload
        try:
            os.remove(file_path)
            logger.info(f"Deleted local file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete local file {file_path}: {e}")
            
        return url
    except Exception as e:
        logger.error(f"Error uploading {file_type} to S3: {e}")
        return None

from decimal import Decimal

def convert_floats_to_decimals(obj):
    """Recursively convert float values to Decimal for DynamoDB compatibility"""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_floats_to_decimals(i) for i in obj)
    else:
        return obj
    
async def save_task_to_db(user_id, task_id, data):
    """Save task data to DynamoDB"""
    try:
        # Get the table for this worker process
        table = get_dynamodb_table()
        
        # Create a copy of the data to avoid modifying the original
        data_copy = data.copy()
        
        # Remove objects that shouldn't be stored in DynamoDB
        for key in ['bedrock_research', 'bedrock_config', 'image_monitor']:
            if key in data_copy:
                del data_copy[key]
        
        # Special handling for outline data - ensure it's properly serialized
        if 'outline' in data_copy and isinstance(data_copy['outline'], dict):
            # Store a properly serialized version for better retrieval
            try:
                data_copy['outline_json'] = json.dumps(data_copy['outline'])
            except Exception as e:
                logger.warning(f"Failed to JSON serialize outline: {e}")
                
        # Convert all float values to Decimal for DynamoDB compatibility
        cleaned_data = convert_floats_to_decimals(data_copy)
        
        # Handle non-serializable objects
        for key, value in list(cleaned_data.items()):
            try:
                # Test if it's JSON serializable
                json.dumps(value)
            except (TypeError, OverflowError):
                # Convert to string if not serializable
                cleaned_data[key] = str(value)
        
        # Add last updated timestamp
        cleaned_data['last_updated'] = int(time.time())
        
        # Add primary key fields
        cleaned_data['userId'] = user_id
        cleaned_data['task_id'] = task_id
        
        # Add TTL for automatic deletion (7 days from now)
        cleaned_data['ttl'] = int(time.time()) + 604800
        
        # Put the item in DynamoDB
        await run_in_threadpool(
            lambda: table.put_item(Item=cleaned_data)
        )
        
        # Update cache 
        cache_key = f"{user_id}:{task_id}"
        task_cache[cache_key] = cleaned_data
        
        return True
    except Exception as e:
        logger.error(f"Error saving task to DynamoDB: {e}")
        return False
async def get_task_from_db(user_id, task_id, bypass_cache=False):
    """Get task data from DynamoDB"""
    try:
        # Check cache first unless bypass_cache is True
        cache_key = f"{user_id}:{task_id}"
        if not bypass_cache and cache_key in task_cache:
            logger.debug(f"Task {task_id} found in cache")
            return task_cache[cache_key]
            
        # If not in cache or bypass_cache is True, query DynamoDB
        table = get_dynamodb_table()
        response = await run_in_threadpool(
            lambda: table.get_item(Key={'userId': user_id, 'task_id': task_id})
        )
        
        if 'Item' in response:
            # Update cache
            task_cache[cache_key] = response['Item']
            return response['Item']
        else:
            return None
    except Exception as e:
        logger.error(f"Error getting task from DynamoDB: {e}")
        return None

async def process_step(user_id, task_id, step):
    """Process a step from the research stream and update task status"""
    
    # Get the current task data - always fresh from DynamoDB
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    
    if not task_data:
        logger.warning(f"Task {task_id} not found for user {user_id}")
        return
    
    # Ensure progress is a numeric value
    current_progress = task_data.get('progress', 0)
    if isinstance(current_progress, str):
        try:
            current_progress = float(current_progress)
        except ValueError:
            current_progress = 0
    
    if 'steps' not in step:
        task_data['progress'] = min(current_progress + 0.05, 0.95)
        task_data['current_step'] = "Processing..."
        await save_task_to_db(user_id, task_id, task_data)
        return
    
    step_info = step['steps'][0] if step['steps'] else {}
    step_name = step_info.get('name', 'unknown')
    
    # Check for errors in the step
    if 'error' in step_info:
        error_msg = f"ERROR IN STEP {step_name}: {step_info['error']}"
        logger.error(error_msg)
        task_data['error'] = error_msg
        
        await save_task_to_db(user_id, task_id, task_data)
        return
    
    # Update the task progress
    task_data['current_step'] = step_name
    
    # Special handling for image generation
    if step_name == "generate_head_image":
        logger.info("Starting image generation")
        task_data['image_generation_started'] = True
        await save_task_to_db(user_id, task_id, task_data)
        return
    
    # If we were monitoring image generation and got to a new step, mark it as complete
    if task_data.get('image_generation_started') and not task_data.get('image_generation_completed'):
        task_data['image_generation_completed'] = True
        logger.info("Image generation completed")
    
    # If there's output, update the task with relevant information
    if 'output' in step_info:
        output = step_info['output']
        if isinstance(output, dict):
            # Extract and update various outputs
            if 'outline' in output:
                task_data['outline_text'] = output['outline']
                # Set status to outline_ready when outline is generated
                if task_data.get('status') not in ['generating', 'completed']:
                    task_data['status'] = 'outline_ready'
            
            if 'section' in output and isinstance(output['section'], dict) and 'content' in output['section']:
                task_data['progress'] = min(current_progress + 0.05, 0.95)
            
            if 'completed_sections' in output:
                count = len(output['completed_sections'])
                task_data['progress'] = min(0.7 + (count * 0.05), 0.95)
            
            if 'final_report' in output:
                task_data['article'] = output['final_report']
                task_data['progress'] = 1.0
                task_data['status'] = "completed"
                
            if 'head_image_path' in output:
                task_data['image_path'] = output['head_image_path']
                task_data['image_generation_completed'] = True
    
    # Save the updated task data
    await save_task_to_db(user_id, task_id, task_data)

async def run_research(user_id: str, task_id: str, topic: str, **config):
    """Run the research process in the background"""
    try:
        # Import dependencies
        from bedrock_deep_research import BedrockDeepResearch
        
        # Load environment variables if not already loaded
        load_dotenv()
        
        # Check AWS region - Nova Canvas is only available in certain regions
        aws_region = os.getenv("AWS_BEDROCK_REGION", "us-east-1")
        logger.info(f"Using AWS Region: {aws_region}")
        
        # Check for Tavily API key
        tavily_api_key = os.getenv("TAVILY_API_KEY")
        if not tavily_api_key:
            raise ValueError("TAVILY_API_KEY environment variable not set")        
        
        # Create output directory using TMP_DIR
        output_dir = os.path.join(TMP_DIR, "output", task_id)
        os.makedirs(output_dir, exist_ok=True)
        
        # Create configuration with image generation enabled only if available
        bedrock_config = {
            "configurable": {
                "thread_id": task_id,
                # Store all prompts from prompt_config if provided, otherwise use defaults
                "report_structure": (
                    config.get('prompt_config', {}).get('report_structure', DEFAULT_REPORT_STRUCTURE) 
                    if config.get('prompt_config') 
                    else DEFAULT_REPORT_STRUCTURE
                ),
                "outline_generator_system_prompt": (
                    config.get('prompt_config', {}).get('outline_generator_system_prompt', DEFAULT_OUTLINE_GENERATOR_SYSTEM_PROMPT)
                    if config.get('prompt_config')
                    else DEFAULT_OUTLINE_GENERATOR_SYSTEM_PROMPT
                ),
                "section_writer_instructions": (
                    config.get('prompt_config', {}).get('section_writer_instructions', DEFAULT_SECTION_WRITER_INSTRUCTIONS)
                    if config.get('prompt_config')
                    else DEFAULT_SECTION_WRITER_INSTRUCTIONS
                ),
                "section_grader_instructions": (
                    config.get('prompt_config', {}).get('section_grader_instructions', DEFAULT_SECTION_GRADER_INSTRUCTIONS)
                    if config.get('prompt_config')
                    else DEFAULT_SECTION_GRADER_INSTRUCTIONS
                ),
                "query_writer_instructions": (
                    config.get('prompt_config', {}).get('query_writer_instructions', DEFAULT_QUERY_WRITER_INSTRUCTIONS)
                    if config.get('prompt_config')
                    else DEFAULT_QUERY_WRITER_INSTRUCTIONS
                ),
                "initial_research_system_prompt": (
                    config.get('prompt_config', {}).get('initial_research_system_prompt', DEFAULT_INITIAL_RESEARCH_SYSTEM_PROMPT)
                    if config.get('prompt_config')
                    else DEFAULT_INITIAL_RESEARCH_SYSTEM_PROMPT
                ),
                "final_section_writer_instructions": (
                    config.get('prompt_config', {}).get('final_section_writer_instructions', DEFAULT_FINAL_SECTION_WRITER_INSTRUCTIONS)
                    if config.get('prompt_config')
                    else DEFAULT_FINAL_SECTION_WRITER_INSTRUCTIONS
                ),
                "writing_guidelines": config.get('writing_guidelines'),
                "number_of_queries": config.get('number_of_queries', 2),
                "max_search_depth": config.get('max_search_depth', 2),
                "max_tokens": config.get('max_tokens', 2048),
                "planner_model": config.get('planner_model'),
                "writer_model": config.get('writer_model'),
                "output_dir": config.get('output_dir', os.path.join(TMP_DIR, "output", task_id)),
                "image_model": config.get('image_model') if config.get('generate_images', True) else None,
                "generate_images": config.get('generate_images', True),
                "aws_region": aws_region
            }
        }
        
        # Initialize BedrockDeepResearch
        logger.info(f"Initializing BedrockDeepResearch for task {task_id}")
        bedrock_research = BedrockDeepResearch(config=bedrock_config["configurable"], tavily_api_key=tavily_api_key)
        
        # Get task data and update it
        task_data = await get_task_from_db(user_id, task_id)
        task_data['bedrock_config_serialized'] = json.dumps(bedrock_config)
        task_data['output_dir'] = output_dir
        await save_task_to_db(user_id, task_id, task_data)
        
        # Start the research with retry logic in a thread pool
        logger.info(f"Starting research on topic: \"{topic}\" for task {task_id}")
        
        # Process the research stream
        try:
            # Use a thread pool to execute the synchronous method that might call asyncio.run()
            response = await run_in_threadpool(
                lambda: with_retry(lambda: bedrock_research.start(topic), max_attempts=5)
            )
            
            # Process the response
            for step in response:
                await process_step(user_id, task_id, step)
                # Use minimal async delay instead of blocking sleep
                await asyncio.sleep(0.1)
                
        except Exception as e:
            logger.warning(f"Warning in response stream processing: {e}")
            task_data = await get_task_from_db(user_id, task_id)
            task_data['error'] = str(e)
            await save_task_to_db(user_id, task_id, task_data)
        
        # Get the outline state using thread pool
        logger.info(f"Retrieving article outline for task {task_id}")
        try:
            # Use a thread pool for getting the state
            state = await run_in_threadpool(
                lambda: with_retry(lambda: bedrock_research.graph.get_state(bedrock_config), max_attempts=5)
            )
            
            task_data = await get_task_from_db(user_id, task_id)
            
            if hasattr(state, 'values'):
                # Save outline information to task
                if 'title' in state.values and 'sections' in state.values:
                    try:
                        # Try to safely serialize the outline data
                        outline = {
                            'title': state.values['title'],
                            'sections': state.values['sections']
                        }
                        
                        # Convert sections to a serializable format if needed
                        if isinstance(outline['sections'], list):
                            serializable_sections = []
                            for section in outline['sections']:
                                if hasattr(section, '__dict__'):
                                    # Convert objects to dictionaries
                                    section_dict = section.__dict__.copy()
                                    # Remove any private attributes (starting with _)
                                    section_dict = {k: v for k, v in section_dict.items() if not k.startswith('_')}
                                    serializable_sections.append(section_dict)
                                elif isinstance(section, dict):
                                    # It's already a dict
                                    serializable_sections.append(section)
                                else:
                                    # Convert to string if needed
                                    serializable_sections.append({"name": str(section)})
                            outline['sections'] = serializable_sections
                        
                        task_data['outline'] = outline
                        task_data['status'] = 'outline_ready'
                        await save_task_to_db(user_id, task_id, task_data)
                    except Exception as e:
                        logger.error(f"Error serializing outline: {e}")
                        task_data['error'] = f"Error serializing outline: {str(e)}"
                        await save_task_to_db(user_id, task_id, task_data)
                
        except Exception as e:
            logger.error(f"Error getting outline: {e}", exc_info=True)
            task_data = await get_task_from_db(user_id, task_id)
            task_data['error'] = f"Error getting outline: {str(e)}"
            task_data['status'] = 'error'
            await save_task_to_db(user_id, task_id, task_data)
            
    except Exception as e:
        logger.error(f"An error occurred in task {task_id} for user {user_id}: {e}", exc_info=True)
        task_data = await get_task_from_db(user_id, task_id)
        task_data['error'] = str(e)
        task_data['status'] = 'error'
        await save_task_to_db(user_id, task_id, task_data)

async def generate_article(user_id, task_id):
    """Generate the article after outline has been accepted"""
    try:
        # Always get fresh data from DynamoDB
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        if not task_data:
            logger.warning(f"Task {task_id} not found for user {user_id}")
            return
        
        # Import dependencies
        from bedrock_deep_research import BedrockDeepResearch
        
        # Load environment variables if not already loaded
        load_dotenv()
        
        # Check for Tavily API key
        tavily_api_key = os.getenv("TAVILY_API_KEY")
        if not tavily_api_key:
            raise ValueError("TAVILY_API_KEY environment variable not set")
        
        # Get the bedrock config from serialized data
        bedrock_config = json.loads(task_data.get('bedrock_config_serialized', '{}'))
        if not bedrock_config or 'configurable' not in bedrock_config:
            task_data['error'] = "No bedrock configuration found"
            task_data['status'] = 'error'
            await save_task_to_db(user_id, task_id, task_data)
            return
        
        bedrock_config["configurable"]["aws_region"] = os.getenv("AWS_BEDROCK_REGION", "us-east-1")        
        # Make sure output_dir exists
        output_dir = task_data.get('output_dir')
        if not output_dir or not os.path.exists(output_dir):
            output_dir = os.path.join(TMP_DIR, "output", task_id)
            os.makedirs(output_dir, exist_ok=True)
            bedrock_config["configurable"]["output_dir"] = output_dir
            task_data['output_dir'] = output_dir
            await save_task_to_db(user_id, task_id, task_data)
        
        # Get the topic from task data
        topic = task_data.get('topic')
        if not topic:
            raise ValueError("Topic not found in task data. Cannot continue article generation.")
        
        # Initialize BedrockDeepResearch
        logger.info(f"Initializing BedrockDeepResearch for continuing task {task_id}")
        bedrock_research = BedrockDeepResearch(
            config=bedrock_config["configurable"], 
            tavily_api_key=tavily_api_key
        )
        
        # Update task status
        task_data['status'] = 'generating'
        task_data['current_step'] = 'Starting article generation'
        await save_task_to_db(user_id, task_id, task_data)
        
        logger.info(f"Generating full article for task {task_id}")
        
        # First, re-initialize the state with the topic
        # This ensures the graph has the topic in its state
        await run_in_threadpool(
            lambda: with_retry(
                lambda: bedrock_research.start(topic),
                max_attempts=5
            )
        )
        
        # Now we can call feedback without needing to pass the topic
        feedback_response = await run_in_threadpool(
            lambda: with_retry(
                lambda: bedrock_research.feedback(True),
                max_attempts=5
            )
        )
        
        for step in feedback_response:
            await process_step(user_id, task_id, step)
            # Use minimal async delay instead of blocking sleep
            await asyncio.sleep(0.1)
        
        # Get the final article with thread pool
        final_state = await run_in_threadpool(
            lambda: with_retry(lambda: bedrock_research.graph.get_state(bedrock_config), max_attempts=5)
        )
        
        # Always get fresh task data
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        
        if hasattr(final_state, 'values') and 'final_report' in final_state.values:
            article = final_state.values["final_report"]
            head_image_path = final_state.values.get("head_image_path")
            
            task_data['article'] = article
            
            # Get the title for file naming - HANDLE DIFFERENT OUTLINE TYPES
            title = 'generated_article'
            outline = task_data.get('outline')
            
            # Check outline type and extract title safely
            if isinstance(outline, dict) and 'title' in outline:
                title = outline.get('title')
            elif isinstance(outline, str):
                # Try to parse JSON string
                try:
                    outline_dict = json.loads(outline)
                    if isinstance(outline_dict, dict) and 'title' in outline_dict:
                        title = outline_dict.get('title')
                except (json.JSONDecodeError, TypeError):
                    # If outline is just a string but not JSON, use topic as title
                    title = task_data.get('topic', 'generated_article')
            else:
                # Fall back to topic if available
                title = task_data.get('topic', 'generated_article')
                
            # Make sure title is a string
            if not isinstance(title, str):
                title = str(title)
                
            clean_title = ''.join(c if c.isalnum() else '_' for c in title)
            
            # Handle image if available
            if head_image_path:
                task_data['image_path'] = head_image_path
                
                # Verify image exists
                if os.path.exists(head_image_path):
                    # Upload image to S3
                    image_url = await upload_file_to_s3(head_image_path, user_id, task_id, 'image')
                    if image_url:
                        task_data['image_url'] = image_url
                        # We don't modify the article content, just store the image URL separately
                else:
                    logger.warning(f"Image file doesn't exist at {head_image_path}")
            
            # Save the article to a temporary file - use original article content
            article_filename = f"{task_id}_{clean_title}.md"
            article_filepath = os.path.join(output_dir, article_filename)
            
            with open(article_filepath, "w") as f:
                f.write(article)
            logger.info(f"Article saved to temporary file: {article_filepath}")

            if article:
                # Also generate a PDF version
                pdf_filename = f"{task_id}_{clean_title}.pdf"
                pdf_filepath = os.path.join(output_dir, pdf_filename)
                
                # Get image URL if available
                image_url = task_data.get('image_url')
                
                pdf_success = await markdown_to_pdf(article, pdf_filepath, title, image_url)
                
                if pdf_success:
                    logger.info(f"PDF generated successfully: {pdf_filepath}")
                    
                    # Upload PDF to S3
                    pdf_url = await upload_file_to_s3(pdf_filepath, user_id, task_id, 'pdf')
                    if pdf_url:
                        task_data['pdf_url'] = pdf_url
                        logger.info(f"PDF uploaded to S3: {pdf_url}")
                else:
                    logger.warning("Failed to generate PDF")
            
            # Upload article to S3
            article_url = await upload_file_to_s3(article_filepath, user_id, task_id, 'article')
            if article_url:
                task_data['article_url'] = article_url
            
            # Handle image if available
            if head_image_path:
                task_data['image_path'] = head_image_path
                
                # Verify image exists
                if os.path.exists(head_image_path):
                    # Upload image to S3
                    image_url = await upload_file_to_s3(head_image_path, user_id, task_id, 'image')
                    if image_url:
                        task_data['image_url'] = image_url
                else:
                    logger.warning(f"Image file doesn't exist at {head_image_path}")
            
            task_data['status'] = 'completed'
            task_data['progress'] = 1.0
            task_data['current_step'] = 'Article completed'
            await save_task_to_db(user_id, task_id, task_data)
            
            # Clean up the output directory after successful upload
            try:
                import shutil
                if os.path.exists(output_dir):
                    shutil.rmtree(output_dir)
                    logger.info(f"Cleaned up temporary directory: {output_dir}")
            except Exception as e:
                logger.warning(f"Failed to clean up output directory: {e}")
        else:
            task_data['error'] = "Final article not found in state."
            task_data['status'] = 'error'
            await save_task_to_db(user_id, task_id, task_data)
            
    except Exception as e:
        logger.error(f"Error generating article for user {user_id}, task {task_id}: {e}", exc_info=True)
        # Always get fresh task data
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        if task_data:
            task_data['error'] = f"Error generating article: {str(e)}"
            task_data['status'] = 'error'
            await save_task_to_db(user_id, task_id, task_data)

@app.on_event("startup")
async def startup_event():
    global tasks_table
    
    # Initialize DynamoDB table using the function
    try:
        # This initializes the table in this worker process
        _ = get_dynamodb_table()
        logger.info("DynamoDB table initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing DynamoDB table: {e}")
        raise
        
    # Initialize DynamoDB table
    try:
        tasks_table = dynamodb.Table(TASKS_TABLE_NAME)
        
        # Check if table exists, if not create it
        try:
            tasks_table.table_status
            logger.info(f"Connected to DynamoDB table: {TASKS_TABLE_NAME}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                logger.info(f"Table {TASKS_TABLE_NAME} does not exist, creating it...")
                
                # Create the table
                table = dynamodb.create_table(
                    TableName=TASKS_TABLE_NAME,
                    KeySchema=[
                        {'AttributeName': 'userId', 'KeyType': 'HASH'},
                        {'AttributeName': 'task_id', 'KeyType': 'RANGE'}
                    ],
                    AttributeDefinitions=[
                        {'AttributeName': 'userId', 'AttributeType': 'S'},
                        {'AttributeName': 'task_id', 'AttributeType': 'S'}
                    ],
                    BillingMode='PAY_PER_REQUEST'
                )
                
                # Wait until table is created
                table.meta.client.get_waiter('table_exists').wait(TableName=TASKS_TABLE_NAME)
                tasks_table = dynamodb.Table(TASKS_TABLE_NAME)
                logger.info(f"Created DynamoDB table: {TASKS_TABLE_NAME}")
            else:
                raise
    except Exception as e:
        logger.error(f"Error connecting to DynamoDB: {e}")
        raise
    
    # Check if S3 bucket exists, if not create it
    try:
        s3_client.head_bucket(Bucket=STORAGE_BUCKET_NAME)
        logger.info(f"Connected to S3 bucket: {STORAGE_BUCKET_NAME}")
    except ClientError as e:
        error_code = int(e.response['Error']['Code'])
        if error_code == 404:  # Bucket not found
            logger.info(f"Bucket {STORAGE_BUCKET_NAME} does not exist, creating it...")
            try:
                # Create the bucket in the current region
                region = os.environ.get('AWS_BEDROCK_REGION', 'us-east-1')
                
                if region == 'us-east-1':
                    s3_client.create_bucket(Bucket=STORAGE_BUCKET_NAME)
                else:
                    location = {'LocationConstraint': region}
                    s3_client.create_bucket(
                        Bucket=STORAGE_BUCKET_NAME,
                        CreateBucketConfiguration=location
                    )
                
                # Configure the bucket to block public access
                s3_client.put_public_access_block(
                    Bucket=STORAGE_BUCKET_NAME,
                    PublicAccessBlockConfiguration={
                        'BlockPublicAcls': True,
                        'IgnorePublicAcls': True,
                        'BlockPublicPolicy': True,
                        'RestrictPublicBuckets': True
                    }
                )
                
                # Add lifecycle policy to delete old objects (30 days)
                lifecycle_config = {
                    'Rules': [
                        {
                            'ID': 'Delete old objects',
                            'Status': 'Enabled',
                            'Expiration': {'Days': 30},
                            'Prefix': ''
                        }
                    ]
                }
                s3_client.put_bucket_lifecycle_configuration(
                    Bucket=STORAGE_BUCKET_NAME,
                    LifecycleConfiguration=lifecycle_config
                )
                
                logger.info(f"Created S3 bucket: {STORAGE_BUCKET_NAME}")
            except Exception as bucket_error:
                logger.error(f"Failed to create bucket: {bucket_error}")
                raise
        else:
            logger.error(f"Error checking S3 bucket: {e}")
            raise

    # Make sure the local temporary directory exists
    os.makedirs(TMP_DIR, exist_ok=True)

    # Set up a background task to clean old entries from cache
    async def cleanup_task_cache():
        while True:
            try:
                now = time.time()
                to_remove = []
                
                for cache_key, task_data in task_cache.items():
                    # Keep items in cache for 30 minutes
                    if now - task_data.get('last_updated', now) > 1800:  # 30 minutes
                        to_remove.append(cache_key)
                
                for cache_key in to_remove:
                    if cache_key in task_cache:
                        del task_cache[cache_key]
                        logger.debug(f"Removed task {cache_key} from cache")
                        
                # Also clean up any leftover temporary directories
                temp_output_dir = os.path.join(TMP_DIR, "output")
                if os.path.exists(temp_output_dir):
                    import shutil
                    for dirname in os.listdir(temp_output_dir):
                        dir_path = os.path.join(temp_output_dir, dirname)
                        if os.path.isdir(dir_path):
                            # Check if directory is older than 24 hours
                            dir_time = os.path.getmtime(dir_path)
                            if now - dir_time > 86400:  # 24 hours in seconds
                                try:
                                    shutil.rmtree(dir_path)
                                    logger.info(f"Cleaned up old temp dir: {dir_path}")
                                except Exception as e:
                                    logger.warning(f"Failed to clean up old temp dir {dir_path}: {e}")
                        
            except Exception as e:
                logger.error(f"Error in cache cleanup task: {e}")
                
            # Run cleanup every 15 minutes
            await asyncio.sleep(900)
    
    # Start the cache cleanup task
    asyncio.create_task(cleanup_task_cache())

@app.get("/", response_class=JSONResponse)
async def root():
    return {"message": "Welcome to the Bedrock Deep Research API", "version": "1.0.0"}

@app.get("/health", response_class=JSONResponse)
async def health_check():
    """Health check endpoint for load balancer"""
    try:
        # Verify DynamoDB connection by testing a simple operation
        await run_in_threadpool(lambda: tasks_table.scan(Limit=1))
        
        # Verify S3 connection
        await run_in_threadpool(lambda: s3_client.list_objects_v2(Bucket=STORAGE_BUCKET_NAME, MaxKeys=1))
        
        return {"status": "healthy", "timestamp": time.time()}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e), "timestamp": time.time()}
        )

@app.post("/start", response_model=ResearchResponse)
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks, 
                        token_data: dict = Depends(verify_token)):
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    task_id = str(uuid4())
    
    # Create task data using model defaults if values not provided
    task_data = {
        'status': 'started',
        'progress': 0.0,
        'current_step': 'Initializing',
        'topic': request.topic,
        'writing_guidelines': request.writing_guidelines,
        'generate_images': request.generate_images,
        'number_of_queries': request.number_of_queries,
        'max_search_depth': request.max_search_depth,
        'max_tokens': request.max_tokens,
        'planner_model': request.planner_model,
        'writer_model': request.writer_model,
        'image_model': request.image_model if request.generate_images else None,
        'output_dir': request.output_dir,
        'created_at': int(time.time())
    }
    
    # Store prompt config if provided
    if request.prompt_config:
        task_data['prompt_config'] = {
            k: v for k, v in request.prompt_config.dict().items() if v is not None
        }
    
    # Save task data to DynamoDB
    await save_task_to_db(user_id, task_id, task_data)
    
    # Prepare configuration for research process
    research_config = {
        'writing_guidelines': task_data['writing_guidelines'],
        'number_of_queries': task_data['number_of_queries'],
        'max_search_depth': task_data['max_search_depth'],
        'max_tokens': task_data['max_tokens'],
        'planner_model': task_data['planner_model'],
        'writer_model': task_data['writer_model'],
        'image_model': task_data['image_model'],
        'generate_images': task_data['generate_images'],
        'output_dir': task_data['output_dir'],
        'prompt_config': request.prompt_config
    }
    
    # Start the research process with configuration
    background_tasks.add_task(
        run_research, 
        user_id,
        task_id, 
        request.topic, 
        **research_config
    )
    
    return ResearchResponse(
        task_id=task_id,
        status='started',
        message=f"Research started for topic: {request.topic}"
    )

@app.get("/{task_id}/outline", response_model=ResearchOutlineResponse)
async def get_research_outline(task_id: str, token_data: dict = Depends(verify_token)):
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
        
    # Always get fresh data from DynamoDB
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task_data.get('status') not in ['outline_ready', 'feedback_needed', 'generating', 'completed']:
        raise HTTPException(status_code=400, detail="Outline not yet available")
    
    # Get the outline data - first try outline_json if it exists
    outline = None
    outline_json = task_data.get('outline_json')
    
    if outline_json:
        try:
            outline = json.loads(outline_json)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse outline_json: {outline_json[:100]}...")
    
    # If outline_json doesn't exist or couldn't be parsed, try the regular outline field
    if not outline:
        outline = task_data.get('outline')
        
    # If outline is a string that looks like a Python dict representation, try to parse it
    if isinstance(outline, str) and outline.startswith("{'") and outline.endswith("'}"):
        logger.info(f"Outline appears to be a string representation of a dict: {outline[:50]}...")
        try:
            # Use ast.literal_eval which can safely parse Python literal structures
            import ast
            outline = ast.literal_eval(outline)
        except (SyntaxError, ValueError) as e:
            logger.warning(f"Failed to parse outline string with ast.literal_eval: {e}")
            
            # As a fallback, try some manual string manipulation
            try:
                # Replace single quotes with double quotes for JSON compatibility
                json_compatible = outline.replace("'", "\"")
                # Fix inconsistencies in the string format
                json_compatible = json_compatible.replace("\"[", "[").replace("]\"", "]")
                json_compatible = json_compatible.replace("\"(", "(").replace(")\"", ")")
                json_compatible = json_compatible.replace("\"\\\"", "\"").replace("\\\"\"", "\"")
                
                outline = json.loads(json_compatible)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed manual JSON parsing: {e}")
    
    # If outline is None or not a dict, create a default
    if not outline or not isinstance(outline, dict):
        logger.warning(f"Outline is not a dictionary, creating default structure. Type: {type(outline)}")
        outline = {
            "title": task_data.get('topic', 'Unknown Topic'),
            "sections": []
        }
    
    # Now get sections safely
    sections = outline.get('sections', [])
    
    # Convert Section objects to dictionaries if necessary
    converted_sections = []
    
    # Handle different types of sections
    if isinstance(sections, list):
        for section in sections:
            if hasattr(section, '__dict__'):
                # It's a custom object, convert it to a dict
                section_dict = section.__dict__.copy()
                # Remove any private attributes (starting with _)
                section_dict = {k: v for k, v in section_dict.items() if not k.startswith('_')}
                converted_sections.append(section_dict)
            elif isinstance(section, dict):
                # It's already a dict
                converted_sections.append(section)
            else:
                # Fall back to string representation
                converted_sections.append({"name": str(section)})
    elif isinstance(sections, str):
        # If sections is a string, try to parse it
        try:
            parsed_sections = json.loads(sections)
            if isinstance(parsed_sections, list):
                for section in parsed_sections:
                    if isinstance(section, dict):
                        converted_sections.append(section)
                    else:
                        converted_sections.append({"name": str(section)})
        except json.JSONDecodeError:
            try:
                # Try parsing as Python literal
                import ast
                parsed_sections = ast.literal_eval(sections)
                if isinstance(parsed_sections, list):
                    for section in parsed_sections:
                        if isinstance(section, dict):
                            converted_sections.append(section)
                        else:
                            converted_sections.append({"name": str(section)})
            except (SyntaxError, ValueError):
                # If not valid, create a single section
                converted_sections.append({"name": sections})
    else:
        # For any other type, create a generic section
        converted_sections.append({"name": "Main Section"})
    
    # Get title safely
    title = outline.get('title')
    if not title:
        title = task_data.get('topic', 'Unknown Topic')
    
    return ResearchOutlineResponse(
        task_id=task_id,
        title=title,
        sections=converted_sections
    )

async def regenerate_outline(user_id, task_id):
    """Regenerate the research outline after rejection"""
    try:
        # Import dependencies
        from bedrock_deep_research import BedrockDeepResearch
        from bedrock_deep_research.config import SUPPORTED_MODELS, DEFAULT_REPORT_STRUCTURE
        
        # Load environment variables if not already loaded
        load_dotenv()
        
        # Always get fresh data from DynamoDB
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        
        if not task_data:
            logger.error(f"Task {task_id} not found for user {user_id}")
            return
        
        # Get the original topic and guidelines
        topic = task_data.get('topic')
        writing_guidelines = task_data.get('writing_guidelines', "Focus on practical applications and recent advancements.")
        
        # Add special instructions for regenerating the outline
        revised_guidelines = writing_guidelines + " IMPORTANT: Please generate a different outline than before with alternative sections and approach."
        
        # Get configuration from serialized data or create new one
        bedrock_config = None
        if task_data.get('bedrock_config_serialized'):
            try:
                bedrock_config = json.loads(task_data.get('bedrock_config_serialized'))
            except json.JSONDecodeError:
                logger.warning(f"Could not parse bedrock_config_serialized for task {task_id}")
        
        # Check AWS region - Nova Canvas is only available in certain regions
        aws_region = os.getenv("AWS_BEDROCK_REGION", "us-east-1")
        logger.info(f"Using AWS Region: {aws_region}")
        
        # Check for Tavily API key
        tavily_api_key = os.getenv("TAVILY_API_KEY")
        if not tavily_api_key:
            raise ValueError("TAVILY_API_KEY environment variable not set")
        
        # Determine image generation preference from original task
        use_image_generation = task_data.get('generate_images', True)
        
        # Create output directory using TMP_DIR
        output_dir = task_data.get('output_dir')
        if not output_dir or not os.path.exists(output_dir):
            output_dir = os.path.join(TMP_DIR, "output", task_id)
            os.makedirs(output_dir, exist_ok=True)
        
        # Create configuration if needed
        if not bedrock_config or 'configurable' not in bedrock_config:
            bedrock_config = {
                "configurable": {
                    "thread_id": task_id,
                    "report_structure": DEFAULT_REPORT_STRUCTURE,
                    "writing_guidelines": revised_guidelines,
                    "number_of_queries": 1,
                    "max_search_depth": 1,
                    "max_tokens": 2048,
                    "planner_model": SUPPORTED_MODELS["Anthropic Claude 3.5 Haiku"],
                    "writer_model": SUPPORTED_MODELS["Anthropic Claude 3.5 Haiku"],
                    "output_dir": output_dir,
                    "image_model": "amazon.nova-canvas-v1:0" if use_image_generation else None,
                    "generate_images": use_image_generation,
                    "aws_region": aws_region
                }
            }
        else:
            # Update guidelines to request a different outline
            bedrock_config["configurable"]["writing_guidelines"] = revised_guidelines
            bedrock_config["configurable"]["output_dir"] = output_dir
        
        # Initialize BedrockDeepResearch
        logger.info(f"Initializing BedrockDeepResearch for regenerating outline for task {task_id}")
        bedrock_research = BedrockDeepResearch(config=bedrock_config["configurable"], tavily_api_key=tavily_api_key)
        
        # Update task status
        task_data['status'] = 'regenerating_outline'
        task_data['current_step'] = 'Regenerating outline'
        task_data['progress'] = 0.1  # Reset progress
        task_data['bedrock_config_serialized'] = json.dumps(bedrock_config)
        task_data['output_dir'] = output_dir
        await save_task_to_db(user_id, task_id, task_data)
        
        # Call the reset method to clear existing outline
        try:
            await run_in_threadpool(lambda: bedrock_research.reset())
            logger.info(f"Reset existing research state for task {task_id}")
        except Exception as e:
            logger.warning(f"Error resetting research state: {e}")
            
        # Start the research with retry logic in a thread pool to generate a new outline
        logger.info(f"Regenerating outline for topic: \"{topic}\" for task {task_id}")
        
        try:
            # Use a thread pool to execute the synchronous method
            response = await run_in_threadpool(
                lambda: with_retry(lambda: bedrock_research.start(topic), max_attempts=5)
            )
            
            # Process the response
            for step in response:
                await process_step(user_id, task_id, step)
                await asyncio.sleep(0.5)
                
            # Get the new outline state
            logger.info(f"Retrieving regenerated outline for task {task_id}")
            state = await run_in_threadpool(
                lambda: with_retry(lambda: bedrock_research.graph.get_state(bedrock_config), max_attempts=5)
            )
            
            task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
            
            if hasattr(state, 'values'):
                # Save outline information to task
                if 'title' in state.values and 'sections' in state.values:
                    try:
                        # Try to safely serialize the outline data
                        outline = {
                            'title': state.values['title'],
                            'sections': state.values['sections']
                        }
                        
                        # Convert sections to a serializable format if needed
                        if isinstance(outline['sections'], list):
                            serializable_sections = []
                            for section in outline['sections']:
                                if hasattr(section, '__dict__'):
                                    section_dict = section.__dict__.copy()
                                    section_dict = {k: v for k, v in section_dict.items() if not k.startswith('_')}
                                    serializable_sections.append(section_dict)
                                elif isinstance(section, dict):
                                    serializable_sections.append(section)
                                else:
                                    serializable_sections.append({"name": str(section)})
                            outline['sections'] = serializable_sections
                        
                        task_data['outline'] = outline
                        task_data['status'] = 'outline_ready'
                        task_data['current_step'] = 'New outline ready for review'
                        await save_task_to_db(user_id, task_id, task_data)
                    except Exception as e:
                        logger.error(f"Error serializing regenerated outline: {e}")
                        task_data['error'] = f"Error serializing regenerated outline: {str(e)}"
                        await save_task_to_db(user_id, task_id, task_data)
                
        except Exception as e:
            logger.error(f"Error regenerating outline: {e}", exc_info=True)
            task_data = await get_task_from_db(user_id, task_id)
            task_data['error'] = f"Error regenerating outline: {str(e)}"
            task_data['status'] = 'error'
            await save_task_to_db(user_id, task_id, task_data)
            
    except Exception as e:
        logger.error(f"An error occurred while regenerating outline for task {task_id}: {e}", exc_info=True)
        task_data = await get_task_from_db(user_id, task_id)
        task_data['error'] = str(e)
        task_data['status'] = 'error'
        await save_task_to_db(user_id, task_id, task_data)

@app.post("/{task_id}/feedback", response_model=ResearchResponse)
async def provide_feedback(task_id: str, request: FeedbackRequest, background_tasks: BackgroundTasks, 
                         token_data: dict = Depends(verify_token)):
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Log the incoming request for debugging
    logger.info(f"Received feedback request for user {user_id}, task {task_id}: {request}")
    
    # Always get fresh data from DynamoDB
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Make sure to handle both status values
    valid_statuses = ['outline_ready', 'feedback_needed', 'prompts_updated']
    current_status = task_data.get('status')
    
    logger.info(f"Current task status: {current_status}, Valid statuses: {valid_statuses}")
    
    if current_status not in valid_statuses:
        # Check if outline exists even if status doesn't match
        if task_data.get('outline') and isinstance(task_data.get('outline'), dict):
            # If we have an outline structure, we can consider it ready even if status doesn't match
            logger.info(f"Task has outline but status is {current_status}. Allowing feedback anyway.")
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Task is not ready for feedback. Current status: {current_status}"
            )
    
    if not request.accept_outline:
        # Instead of stopping the process, update status to regenerating
        task_data['status'] = 'regenerating'
        task_data['current_step'] = 'Generating alternative outline'
        task_data['progress'] = 0.05  # Reset progress
        await save_task_to_db(user_id, task_id, task_data)
        
        # Trigger background task to regenerate outline
        background_tasks.add_task(regenerate_outline, user_id, task_id)
        
        return ResearchResponse(
            task_id=task_id,
            status='regenerating',
            message="Outline rejected. Generating an alternative outline..."
        )
    
    # Start article generation
    background_tasks.add_task(generate_article, user_id, task_id)
    
    # Update task status immediately
    task_data['status'] = 'generating'
    await save_task_to_db(user_id, task_id, task_data)
    
    return ResearchResponse(
        task_id=task_id,
        status='generating',
        message="Outline accepted. Article generation started."
    )

@app.get("/tasks", response_class=JSONResponse)
async def list_research_tasks(
    limit: int = Query(10, description="Maximum number of tasks to return"),
    offset: int = Query(0, description="Number of tasks to skip"),
    status: Optional[str] = Query(None, description="Filter tasks by status"),
    sort_by: str = Query("created_at", description="Field to sort by (created_at, topic, status)"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    token_data: dict = Depends(verify_token)
):
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    try:
        # Get the table for this worker process
        tasks_table = get_dynamodb_table()
        
        # Query tasks for this specific user - always fresh from DB, no caching
        response = await run_in_threadpool(
            lambda: tasks_table.query(
                KeyConditionExpression=Key('userId').eq(user_id)
            )
        )
        
        tasks = response.get('Items', [])
        
        # Get more items if there are any (pagination)
        while 'LastEvaluatedKey' in response:
            response = await run_in_threadpool(
                lambda: tasks_table.query(
                    KeyConditionExpression=Key('userId').eq(user_id),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
            )
            tasks.extend(response.get('Items', []))
        
        # Apply status filter if provided
        if status:
            tasks = [task for task in tasks if task.get('status') == status]
        
        # Apply sorting
        valid_sort_fields = {"created_at", "topic", "status", "progress"}
        sort_field = sort_by if sort_by in valid_sort_fields else "created_at"
        
        # Handle cases where the field might be missing in some records
        def get_sort_key(task):
            value = task.get(sort_field)
            
            # Handle missing values
            if value is None:
                if sort_field == "created_at":
                    return 0
                elif sort_field == "progress":
                    return 0.0
                else:
                    return ""
                    
            # Convert Decimal to float for proper comparison
            if isinstance(value, Decimal):
                return float(value)
                
            # If we're sorting a numeric field, convert strings to numbers if possible
            if sort_field in ["created_at", "progress"]:
                if isinstance(value, str):
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        return 0.0
                return float(value) if isinstance(value, (int, float, Decimal)) else 0.0
            
            # For string fields, ensure we have a string
            if sort_field in ["topic", "status"]:
                return str(value)
                
            # Default behavior
            return value
        
        # Sort with error handling
        try:
            tasks = sorted(
                tasks,
                key=get_sort_key,
                reverse=(sort_order.lower() == "desc")
            )
        except TypeError as e:
            logger.error(f"Sorting error: {e} - Falling back to unsorted results")
            # If sorting fails, return unsorted results
        
        # Count total before pagination
        total_count = len(tasks)
        
        # Apply pagination
        paginated_tasks = tasks[offset:offset + limit]
        
        # Format the response
        result = []
        for task in paginated_tasks:
            # Convert Decimal to float for JSON serialization
            progress = task.get('progress')
            if isinstance(progress, Decimal):
                progress = float(progress)
            elif isinstance(progress, str):
                try:
                    progress = float(progress)
                except (ValueError, TypeError):
                    progress = 0.0
            
            task_info = {
                'task_id': task.get('task_id', 'Unknown'),
                'topic': task.get('topic', 'Unknown'),
                'status': task.get('status', 'unknown'),
                'progress': progress if progress is not None else 0,
                'created_at': task.get('created_at'),
                'current_step': task.get('current_step'),
                'error': task.get('error'),
                'last_updated': task.get('last_updated')
            }
            
            # Include URLs if available
            if task.get('article_url'):
                task_info['article_url'] = task.get('article_url')
            if task.get('image_url'):
                task_info['image_url'] = task.get('image_url')
            if task.get('pdf_url'):
                task_info['pdf_url'] = task.get('pdf_url')
                
            # Include outline title if available
            if task.get('outline'):
                outline = task.get('outline')
                if isinstance(outline, dict) and 'title' in outline:
                    task_info['title'] = outline.get('title')
                elif isinstance(outline, str):
                    try:
                        outline_dict = json.loads(outline)
                        if isinstance(outline_dict, dict) and 'title' in outline_dict:
                            task_info['title'] = outline_dict.get('title')
                    except (json.JSONDecodeError, TypeError):
                        pass
                
            result.append(task_info)
        
        return {
            'tasks': result,
            'total': total_count,
            'limit': limit,
            'offset': offset,
            'filtered': status is not None
        }
    except Exception as e:
        logger.error(f"Error listing tasks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing tasks: {str(e)}")

@app.get("/{task_id}/status", response_model=ResearchStatusResponse)
@app.get("/{task_id}/status", response_model=ResearchStatusResponse)
async def get_research_status(task_id: str, token_data: dict = Depends(verify_token)):
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Always get fresh data from DynamoDB
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if URLs need refreshing (if last refresh was > 5 hours ago or if never refreshed)
    current_time = int(time.time())
    last_refresh_time = task_data.get('last_url_refresh', 0)
    
    # Convert last_refresh_time to int if it's stored as a string in DynamoDB
    if isinstance(last_refresh_time, str):
        try:
            last_refresh_time = int(last_refresh_time)
        except ValueError:
            last_refresh_time = 0
    
    # If it's been more than 5 hours since last refresh (18000 seconds)
    if current_time - last_refresh_time > 18000:
        # Only attempt refresh if we have URLs that might need refreshing
        has_urls_to_refresh = (
            task_data.get('article_url') or 
            task_data.get('image_url') or 
            task_data.get('pdf_url')
        )
        
        if has_urls_to_refresh:
            logger.info(f"URLs for task {task_id} are stale (last refresh: {last_refresh_time}). Refreshing...")
            
            try:
                # Refresh URLs
                updated_urls = {}
                url_types = ['article_url', 'image_url', 'pdf_url']
                
                for url_type in url_types:
                    # Skip if this URL type doesn't exist in the task data
                    if url_type not in task_data or not task_data[url_type]:
                        continue
                    
                    try:
                        # Parse the S3 key from the URL
                        old_url = task_data[url_type]
                        from urllib.parse import urlparse
                        parsed_url = urlparse(old_url)
                        path = parsed_url.path.lstrip('/')
                        
                        # Extract bucket and key
                        parts = path.split('/', 1)
                        if len(parts) < 2:
                            logger.warning(f"Invalid S3 URL format for {url_type}: {old_url}")
                            continue
                        
                        bucket = parts[0]
                        key = parts[1]
                        
                        # Ensure we have the right bucket
                        if bucket != STORAGE_BUCKET_NAME:
                            # If URL format is different, try to reconstruct the key
                            file_type = url_type.split('_')[0]  # article, image, or pdf
                            key = f"{user_id}/{task_id}/{file_type}"
                            
                            # Add appropriate extension based on file type
                            if file_type == "article":
                                key += ".md"
                            elif file_type == "pdf":
                                key += ".pdf"
                            elif file_type == "image":
                                key += ".png"
                        
                        # Generate new presigned URL (valid for 6 days)
                        new_url = await run_in_threadpool(
                            lambda: s3_client.generate_presigned_url(
                                'get_object',
                                Params={'Bucket': STORAGE_BUCKET_NAME, 'Key': key},
                                ExpiresIn=518400  # 6 days in seconds (6 * 24 * 60 * 60)
                            )
                        )
                        
                        # Update task data
                        task_data[url_type] = new_url
                        updated_urls[url_type] = new_url
                        
                    except Exception as e:
                        logger.error(f"Error refreshing {url_type}: {e}")
                
                # Save updated task data if we refreshed any URLs
                if updated_urls:
                    task_data['last_url_refresh'] = current_time
                    await save_task_to_db(user_id, task_id, task_data)
                    logger.info(f"Successfully refreshed URLs for task {task_id}")
                
            except Exception as e:
                logger.error(f"Error refreshing URLs during status check: {e}")
                # Continue with the original task data if refresh fails
    
    # Construct the response with available task data
    response = {
        "task_id": task_id,
        "status": task_data.get("status", "unknown"),
        "progress": task_data.get("progress", 0.0),
        "current_step": task_data.get("current_step"),
        "outline": task_data.get("outline"),
        "article": task_data.get("article"),
        "article_url": task_data.get("article_url"),
        "pdf_url": task_data.get("pdf_url"),
        "image_url": task_data.get("image_url"),
        "error": task_data.get("error"),
        "created_at": task_data.get("created_at")
    }
    
    return response
async def markdown_to_pdf(markdown_content, output_path, title=None, image_url=None):
    """Convert markdown content to a PDF file with an optional header image"""
    try:
        # Create a temporary markdown file
        with tempfile.NamedTemporaryFile(suffix='.md', delete=False) as temp_md:
            # Add title as header if provided
            md_content = ""
            
            # Add image at the top if provided
            if image_url:
                # For wkhtmltopdf compatibility - encode with proper HTML for better compatibility
                md_content += f'<div style="text-align: center; margin: 20px 0;"><img src="{image_url}" alt="Header Image" style="max-width: 100%;"/></div>\n\n'
            
            # Add the main content
            md_content += markdown_content
            
            temp_md.write(md_content.encode('utf-8'))
            temp_md.flush()  # Ensure content is written to disk
            temp_md_path = temp_md.name
        
        # First try using pandoc with wkhtmltopdf with improved options
        try:
            logger.info("Attempting PDF conversion with pandoc + wkhtmltopdf")
            result = subprocess.run(
                ['pandoc', temp_md_path, '-o', output_path, '--pdf-engine=wkhtmltopdf', 
                 '-V', 'geometry:margin=1in', '-V', f'title:{title or "Research Article"}'],
                capture_output=True,
                text=True,
                check=True,
                timeout=60  # 1 minute timeout
            )
            success = os.path.exists(output_path) and os.path.getsize(output_path) > 0
            if success:
                logger.info("PDF generated successfully with pandoc + wkhtmltopdf")
                return True
        except (subprocess.SubprocessError, subprocess.TimeoutExpired) as e:
            logger.warning(f"First PDF conversion method failed: {e}")
        
        # If that fails, try pandoc with weasyprint
        try:
            logger.info("Attempting PDF conversion with pandoc + weasyprint")
            result = subprocess.run(
                ['pandoc', temp_md_path, '-o', output_path, '--pdf-engine=weasyprint',
                 '-V', 'geometry:margin=1in', '-V', f'title:{title or "Research Article"}'],
                capture_output=True,
                text=True,
                check=True,
                timeout=60
            )
            success = os.path.exists(output_path) and os.path.getsize(output_path) > 0
            if success:
                logger.info("PDF generated successfully with pandoc + weasyprint")
                return True
        except (subprocess.SubprocessError, subprocess.TimeoutExpired) as e:
            logger.warning(f"Second PDF conversion method failed: {e}")
            
        # Last resort: Try with any available PDF engine
        try:
            logger.info("Attempting PDF conversion with pandoc + default PDF engine")
            result = subprocess.run(
                ['pandoc', temp_md_path, '-o', output_path,
                 '-V', 'geometry:margin=1in', '-V', f'title:{title or "Research Article"}'],
                capture_output=True,
                text=True,
                check=True,
                timeout=60
            )
            success = os.path.exists(output_path) and os.path.getsize(output_path) > 0
            if success:
                logger.info("PDF generated successfully with pandoc + default PDF engine")
                return True
        except (subprocess.SubprocessError, subprocess.TimeoutExpired) as e:
            logger.warning(f"Third PDF conversion method failed: {e}")
        
        # If none of the pandoc methods work, try markdown2pdf if available
        try:
            logger.info("Attempting PDF conversion with markdown2pdf")
            result = subprocess.run(
                ['markdown2pdf', temp_md_path, '-o', output_path],
                capture_output=True,
                text=True,
                check=True,
                timeout=60
            )
            success = os.path.exists(output_path) and os.path.getsize(output_path) > 0
            if success:
                logger.info("PDF generated successfully with markdown2pdf")
                return True
        except (subprocess.SubprocessError, subprocess.TimeoutExpired, FileNotFoundError) as e:
            logger.warning(f"Fourth PDF conversion method failed: {e}")
            
        # Clean up temp file
        os.remove(temp_md_path)
        
        # If we got here, all attempts failed
        logger.error("All PDF conversion methods failed")
        return False
        
    except Exception as e:
        logger.error(f"Error in markdown_to_pdf: {e}", exc_info=True)
        return False

@app.get("/{task_id}/pdf", response_class=JSONResponse)
async def get_research_pdf(task_id: str, token_data: dict = Depends(verify_token)):
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Always get fresh data from DynamoDB
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task_data.get('status') != 'completed':
        raise HTTPException(status_code=400, detail="Article not yet completed")
    
    # Check if PDF URL is already available
    pdf_url = task_data.get('pdf_url')
    if pdf_url:
        return {"pdf_url": pdf_url}
    
    # If PDF URL is not available but article is, generate PDF on demand
    article = task_data.get('article')
    if not article:
        raise HTTPException(status_code=404, detail="Article content not found")
    
    # Get title from outline or topic
    title = task_data.get('topic', 'Research Article')
    outline = task_data.get('outline')
    if isinstance(outline, dict) and 'title' in outline:
        title = outline['title']
    
    # Get image URL if available
    image_url = task_data.get('image_url')
    
    # Create temporary directory
    output_dir = os.path.join(TMP_DIR, "output", task_id)
    os.makedirs(output_dir, exist_ok=True)
    
    # Sanitize title for filename
    clean_title = ''.join(c if c.isalnum() else '_' for c in title)
    pdf_filename = f"{task_id}_{clean_title}.pdf"
    pdf_filepath = os.path.join(output_dir, pdf_filename)
    
    # Generate PDF
    pdf_success = await markdown_to_pdf(article, pdf_filepath, title, image_url)
    
    if not pdf_success:
        raise HTTPException(status_code=500, detail="Failed to generate PDF")
    
    # Upload PDF to S3
    pdf_url = await upload_file_to_s3(pdf_filepath, user_id, task_id, 'pdf')
    if not pdf_url:
        raise HTTPException(status_code=500, detail="Failed to upload PDF")
    
    # Update task data with PDF URL
    task_data['pdf_url'] = pdf_url
    await save_task_to_db(user_id, task_id, task_data)
    
    return {"pdf_url": pdf_url}

@app.get("/{task_id}/download/{file_type}", response_class=StreamingResponse)
async def download_file(task_id: str, file_type: str, token_data: dict = Depends(verify_token)):
    """
    Download a file directly from S3 based on the file type.
    file_type can be one of: 'article', 'pdf', or 'image'
    """
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Always get fresh data from DynamoDB
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Validate file_type
    valid_file_types = ['article', 'pdf', 'image']
    if file_type not in valid_file_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Must be one of: {', '.join(valid_file_types)}")
    
    # Get the corresponding URL from task data
    url_key = f"{file_type}_url"
    file_url = task_data.get(url_key)
    
    if not file_url:
        raise HTTPException(status_code=404, detail=f"{file_type.capitalize()} not found for this task")
    
    try:
        # Parse the S3 key from the URL
        from urllib.parse import urlparse
        parsed_url = urlparse(file_url)
        path = parsed_url.path.lstrip('/')
        
        # Extract bucket and key
        parts = path.split('/', 1)
        if len(parts) < 2:
            raise HTTPException(status_code=500, detail="Invalid S3 URL format")
        
        bucket = parts[0]
        key = parts[1]
        
        # Ensure we have the right bucket
        if bucket != STORAGE_BUCKET_NAME:
            # If URL format is different, try to reconstruct the key
            key = f"{user_id}/{task_id}/{file_type}"
            # Add appropriate extension based on file type
            if file_type == "article":
                key += ".md"
            elif file_type == "pdf":
                key += ".pdf"
            elif file_type == "image":
                key += ".png"
        
        # Get the object from S3
        response = await run_in_threadpool(
            lambda: s3_client.get_object(Bucket=STORAGE_BUCKET_NAME, Key=key)
        )
        
        # Set up file content
        file_content = await run_in_threadpool(lambda: response['Body'].read())
        
        # Determine content type
        content_type = response.get('ContentType', 'application/octet-stream')
        
        # Determine filename
        filename = task_data.get('topic', 'download')
        if isinstance(filename, str):
            # Sanitize filename
            filename = ''.join(c if c.isalnum() or c in ['-', '_', ' '] else '_' for c in filename)
            # Truncate if too long
            if len(filename) > 50:
                filename = filename[:50]
        else:
            filename = 'download'
            
        # Add appropriate extension
        if file_type == 'article':
            filename += '.md'
        elif file_type == 'pdf':
            filename += '.pdf'
        elif file_type == 'image':
            filename += '.png'
        
        # Return streaming response
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except ClientError as e:
        logger.error(f"Error accessing S3 object: {e}")
        
        # Attempt to redirect to the presigned URL as fallback
        if e.response['Error']['Code'] == 'NoSuchKey':
            logger.info(f"Object not found with constructed key, redirecting to presigned URL")
            return RedirectResponse(url=file_url)
        
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")
    except Exception as e:
        logger.error(f"Error in download_file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

@app.get("/{task_id}/refresh-urls", response_class=JSONResponse)
async def refresh_urls(task_id: str, token_data: dict = Depends(verify_token)):
    """
    Refresh all presigned URLs for a task (article, image, and PDF)
    """
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Always get fresh data from DynamoDB
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_urls = {}
    url_types = ['article_url', 'image_url', 'pdf_url']
    
    for url_type in url_types:
        # Skip if this URL type doesn't exist in the task data
        if url_type not in task_data or not task_data[url_type]:
            continue
        
        try:
            # Parse the S3 key from the URL
            old_url = task_data[url_type]
            from urllib.parse import urlparse
            parsed_url = urlparse(old_url)
            path = parsed_url.path.lstrip('/')
            
            # Extract bucket and key
            parts = path.split('/', 1)
            if len(parts) < 2:
                logger.warning(f"Invalid S3 URL format for {url_type}: {old_url}")
                continue
            
            bucket = parts[0]
            key = parts[1]
            
            # Ensure we have the right bucket
            if bucket != STORAGE_BUCKET_NAME:
                # If URL format is different, try to reconstruct the key
                file_type = url_type.split('_')[0]  # article, image, or pdf
                key = f"{user_id}/{task_id}/{file_type}"
                
                # Add appropriate extension based on file type
                if file_type == "article":
                    key += ".md"
                elif file_type == "pdf":
                    key += ".pdf"
                elif file_type == "image":
                    key += ".png"
            
            # Generate new presigned URL (valid for 6 days)
            new_url = await run_in_threadpool(
                lambda: s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': STORAGE_BUCKET_NAME, 'Key': key},
                    ExpiresIn=518400  # 6 days in seconds (6 * 24 * 60 * 60)
                )
            )
            
            # Update task data
            task_data[url_type] = new_url
            updated_urls[url_type] = new_url
            
        except Exception as e:
            logger.error(f"Error refreshing {url_type}: {e}")
            # Continue with other URLs even if this one fails
    
    # Save updated task data if we refreshed any URLs
    if updated_urls:
        await save_task_to_db(user_id, task_id, task_data)
    
    return {
        "task_id": task_id,
        "refreshed_urls": updated_urls
    }

class UpdatePromptsRequest(BaseModel):
    prompt_config: PromptConfig

@app.post("/{task_id}/update-prompts", response_model=ResearchResponse)
async def update_prompts(
    task_id: str, 
    request: UpdatePromptsRequest,
    token_data: dict = Depends(verify_token)
):
    """Update prompt configuration for an existing research task"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Get the current task data
    task_data = await get_task_from_db(user_id, task_id)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task_data.get('status') == 'completed':
        raise HTTPException(status_code=400, detail="Cannot update prompts for completed tasks")

    try:
        # Load existing bedrock configuration
        bedrock_config = json.loads(task_data.get('bedrock_config_serialized', '{}'))
        if 'configurable' not in bedrock_config:
            bedrock_config['configurable'] = {}

        # Get the prompt configuration from the nested structure
        prompt_dict = request.prompt_config.dict(exclude_unset=True)
        
        # Handle report_structure separately if it exists
        if 'report_structure' in prompt_dict and prompt_dict['report_structure']:
            bedrock_config['configurable']['report_structure'] = prompt_dict['report_structure']
            del prompt_dict['report_structure']  # Remove so it's not added twice

        # Update other prompt configurations
        for key, value in prompt_dict.items():
            if value is not None:  # Only update non-None values
                bedrock_config['configurable'][key] = value

        # Store the updated config
        task_data['bedrock_config_serialized'] = json.dumps(bedrock_config)
        
        # Update task status
        current_status = task_data.get('status', '')
        if current_status == 'outline_ready':
            task_data['status'] = 'prompts_updated'
            task_data['current_step'] = 'Prompts updated, outline needs regeneration'
        else:
            task_data['current_step'] = 'Prompt configuration updated'
            
        task_data['prompts_updated_at'] = int(time.time())
        
        # Save the updated task data
        await save_task_to_db(user_id, task_id, task_data)

        return ResearchResponse(
            task_id=task_id,
            status=task_data['status'],
            message="Prompt configuration updated successfully"
        )

    except Exception as e:
        logger.error(f"Error updating prompts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating prompts: {str(e)}"
        )

class UserPromptsResponse(BaseModel):
    prompts: Dict[str, Any]
    message: str

@app.get("/{task_id}/prompts", response_model=UserPromptsResponse)
async def get_user_prompts(
    task_id: str, 
    token_data: dict = Depends(verify_token)
):
    """Get the current prompt configuration for a research task"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Get the task data
    task_data = await get_task_from_db(user_id, task_id)
    
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Initialize prompts dictionary with defaults
    prompts = {
        'outline_generator_system_prompt': DEFAULT_OUTLINE_GENERATOR_SYSTEM_PROMPT,
        'report_structure': DEFAULT_REPORT_STRUCTURE
    }
    
    try:
        # Get prompts from bedrock config
        bedrock_config = json.loads(task_data.get('bedrock_config_serialized', '{}'))
        if 'configurable' in bedrock_config:
            config = bedrock_config['configurable']
            
            # Extract prompt-related fields
            prompt_fields = [
                'outline_generator_system_prompt',
                'section_writer_instructions',
                'section_grader_instructions',
                'query_writer_instructions',
                'initial_research_system_prompt',
                'final_section_writer_instructions',
                'report_structure'
            ]
            
            for field in prompt_fields:
                if field in config and config[field] is not None:
                    prompts[field] = config[field]
                    
    except json.JSONDecodeError as e:
        logger.warning(f"Error parsing bedrock configuration for task {task_id}: {e}")
    
    # Add metadata
    if 'prompts_updated_at' in task_data:
        prompts['last_updated'] = task_data['prompts_updated_at']
    
    return UserPromptsResponse(
        prompts=prompts,
        message="Successfully retrieved prompt configuration"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)