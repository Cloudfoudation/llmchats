# bedrock-service/src/event_composer.py

import os
import time
import random
import threading
import asyncio
import functools
import json
import base64
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
from typing import Optional, Dict, Any, List
from decimal import Decimal
from dotenv import load_dotenv
import logging
import warnings
import urllib3
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, Depends, Body
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from pydantic import BaseModel
from handlers.auth import verify_token

import tempfile
import subprocess
from pathlib import Path
import io
import textwrap

# Constants
MODEL_ID = "amazon.nova-reel-v1:0"

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

# Create a thread pool executor for running synchronous code
executor = ThreadPoolExecutor()

# ------------------------------------------------------
# Configuration and Environment Setup
# ------------------------------------------------------

def load_configuration():
    """Load configuration from environment variables or use defaults"""
    config = {
        'TASKS_TABLE_NAME': os.environ.get('EVENT_TASKS_TABLE', 'bedrock-event-composer-tasks'),
        'STORAGE_BUCKET_NAME': os.environ.get('EVENT_MEDIA_STORAGE_BUCKET', 'bedrock-event-media-storage'),
        'TMP_DIR': os.environ.get('TMP_DIR', '/tmp'),
        'AWS_REGION': os.environ.get('AWS_BEDROCK_REGION', 'us-west-2'),
        'CLAUDE_MODEL_ID': "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        'NOVA_REEL_MODEL_ID': "amazon.nova-reel-v1:0",
        'STABILITY_MODEL_ID': "stability.stable-diffusion-xl-v1",
    }
    return config

CONFIG = load_configuration()

# ------------------------------------------------------
# Default Prompt Templates
# ------------------------------------------------------

DEFAULT_ANNOUNCEMENT_SYSTEM_PROMPT = """
You are an announcement generation assistant created to help draft email announcements. When given event details, you can generate lively, fun announcements or more formal, business-like announcements tailored for email distribution.
To generate an announcement, you will be provided with the event name, date/time, location, and type of tone desired (lively/fun or formal/business).
- If any details are missing, you will prompt the user to provide them.
- For a lively/fun tone, you will draft an energetic, concise announcement focusing on key details and excitement.
- For a formal/business tone, you will draft a professional announcement with proper formatting and structure.
- Expect to be provided with an event name, date/time, location, and desired tone. Prompt the user if information is missing. You will draft an email announcement tailored to that tone. If any details are missing, I will request them.
"""

DEFAULT_IMAGE_SYSTEM_PROMPT = """
You are an artistic director specializing in creating visual concepts for events. Your expertise lies in translating event details into compelling visual representations that capture the essence, tone, and purpose of gatherings. You understand how to use symbolism, color theory, composition, and visual storytelling to convey the right atmosphere for different event types.

When provided with an event announcement, you'll create three distinct visual concepts:
1. Professional Business Style - Formal, polished visuals appropriate for corporate events, using clean lines, professional composition, and restrained color palette
2. Creative Artistic Style - Vibrant, expressive visuals with bold colors and artistic elements for social or creative events
3. Minimalist Symbolic Style - Elegant, simplified visuals focusing on core symbolic elements that represent the event's essence

For each concept, you will provide:
1. Visual Theme: The central visual idea or concept
2. Color Palette: Primary and secondary colors that establish the mood
3. Composition: How elements should be arranged in the frame
4. Key Elements: Specific objects or symbols to include
5. Style Reference: Description of visual style (e.g., photorealistic, graphic design, abstract)

Your goal is to create diverse visual options that accurately represent the event while offering different aesthetic approaches. The descriptions should be detailed enough to guide image generation but concise enough to fit within the constraints of image generation models.
"""

DEFAULT_VIDEO_SYSTEM_PROMPT = """
You are an abstract video director specializing in crafting symbolic and evocative video clips for events. You excel at translating the essence of an event into visual metaphors and emotional experiences, using only imagery and motion. You understand the power of symbolism and visual storytelling to convey meaning without explicit text or dates. Your goal is to create short, impactful videos within the 5-9 second timeframe allowed by Luma Ray v2, relying on visuals and audio to communicate the event's spirit. Include people elements to the videos when deemed fit. At least one of the prompts will generate a Cinematic 4k video.

Your task is to analyze the event announcement provided and create three distinct video prompt concepts. Each should include:
1. Visual Symbol: A specific symbol to be used (e.g., growing plant, flowing water, abstract shapes)
2. Visual Action/Movement: Describe the motion (e.g., plant growing upwards, water flowing)
3. Color Palette: Specify colors that reinforce the emotion (e.g., warm tones for celebration)
4. Lighting: Describe lighting to enhance symbolism (e.g., soft light for hope)
5. Symbolic Meaning: Explain what the symbol represents in context of the event
6. Audio Notes: Suggest sound design or music to accompany the visuals
7. Style: Make one of the prompts "Cinematic 4k" quality

Format your response with clear sections for each prompt, using markdown formatting:

**Prompt 1 (Symbolic Visual 1):**
* **Visual Symbol:** [specific symbol]
* **Visual Action/Movement:** [description of motion]
* **Color Palette:** [color palette]
* **Lighting:** [lighting description]
* **Symbolic Meaning:** [what the symbol represents]
* **Audio Notes:** [sound design or music description]
* **Style:** [Cinematic 4k or Abstract]

[Repeat for Prompt 2 and Prompt 3]
"""

# ------------------------------------------------------
# EventStatus Enum Class
# ------------------------------------------------------

class EventStatus:
    """Enumeration of event status values"""
    STARTED = "started"
    ANNOUNCEMENT_READY = "announcement_ready"
    GENERATING_IMAGES = "generating_images"
    IMAGES_READY = "images_ready"
    GENERATING_PROMPTS = "generating_prompts"
    PROMPTS_GENERATED = "prompts_generated"
    GENERATING_VIDEOS = "generating_videos" 
    COMPLETED = "completed"
    ERROR = "error"

# ------------------------------------------------------
# Pydantic Models
# ------------------------------------------------------

class EventRequest(BaseModel):
    event_name: str
    date_time: Optional[str] = None
    location: Optional[str] = None
    tone: Optional[str] = "Lively"

class EventResponse(BaseModel):
    task_id: str
    status: str
    message: str

class VideoPromptResponse(BaseModel):
    task_id: str
    prompts: List[Dict[str, Any]]
    
class EventStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: float = 0.0
    announcement: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
    video_prompts: Optional[List[Dict[str, Any]]] = None
    video_urls: Optional[List[str]] = None
    preview_image_urls: Optional[List[Dict[str, str]]] = None
    created_at: float
    error: Optional[str] = None
    current_step: Optional[str] = None
    # Add these fields for system prompts
    announcement_system_prompt: Optional[str] = None
    image_system_prompt: Optional[str] = None
    video_system_prompt: Optional[str] = None
    # Additional event details
    event_name: Optional[str] = None
    date_time: Optional[str] = None
    location: Optional[str] = None
    tone: Optional[str] = None
    updated_at: Optional[float] = None
# ------------------------------------------------------
# Utility Functions
# ------------------------------------------------------

async def generate_presigned_url(s3_key, bucket_name=None):
    """Generate a presigned URL for an S3 key"""
    try:
        # Check if s3_key contains '%3A' and replace with ':'
        if '%3A' in s3_key:
            s3_key = s3_key.replace('%3A', ':')

        bucket = bucket_name or CONFIG['STORAGE_BUCKET_NAME']
        url = await run_in_threadpool(
            lambda: s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': s3_key},
                ExpiresIn=518400  # 6 days
            )
        )
        return url
    except Exception as e:
        logger.error(f"Error generating presigned URL for {s3_key}: {e}")
        return None

def patch_urllib3():
    """Patch urllib3's response closing to avoid warnings"""
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

async def run_in_threadpool(func, *args, **kwargs):
    """Run a synchronous function in a thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        executor, functools.partial(func, *args, **kwargs)
    )

def exponential_backoff(attempts, max_attempts=5, base_delay=1, max_delay=60):
    """Calculate exponential backoff time with jitter for retries"""
    if attempts >= max_attempts:
        return None
    
    delay = min(max_delay, (2 ** attempts) * base_delay)
    jitter = random.uniform(0, 0.1 * delay)
    return delay + jitter

def with_retry(func, *args, max_attempts=5, **kwargs):
    """Execute a function with retry logic for AWS API calls"""
    attempts = 0
    last_exception = None
    
    while attempts < max_attempts:
        try:
            return func(*args, **kwargs)
        except (ClientError, boto3.exceptions.Boto3Error) as e:
            # Check for specific errors
            error_code = getattr(e, 'response', {}).get('Error', {}).get('Code')
            error_message = getattr(e, 'response', {}).get('Error', {}).get('Message', '')
            
            # Handle validation error specifically
            if error_code == 'ValidationException' and 'model identifier is invalid' in error_message.lower():
                logger.warning("The model is not available or not enabled for your account.")
                # Allow continuing without media generation
                if 'video' in func.__name__.lower() or 'image' in func.__name__.lower():
                    logger.info("Continuing without generating media.")
                    return None
            
            # Handle throttling exceptions
            if error_code in ['ThrottlingException', 'TooManyRequestsException', 'ServiceUnavailable']:
                attempts += 1
                delay = exponential_backoff(attempts, max_attempts)
                
                if delay is None:
                    last_exception = e
                    break
                    
                logger.info(f"Rate limit reached. Retrying in {delay:.2f} seconds... (Attempt {attempts}/{max_attempts})")
                # Legitimate retry delay for rate limiting
                time.sleep(delay)  # nosemgrep: arbitrary-sleep
            else:
                # Log the error but don't retry for other AWS errors
                logger.warning(f"AWS Error: {error_code} - {error_message}")
                if 'video' in func.__name__.lower() or 'image' in func.__name__.lower():
                    logger.info("Continuing without generating media.")
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

# ------------------------------------------------------
# AWS Service Integration 
# ------------------------------------------------------

def get_dynamodb_table():
    """Get or create the DynamoDB table, ensuring it exists in each worker"""
    table_name = CONFIG['TASKS_TABLE_NAME']
    dynamodb_resource = boto3.resource('dynamodb')
    
    try:
        # Try to access the table
        table = dynamodb_resource.Table(table_name)
        # Test if the table exists
        table.table_status
        return table
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            logger.info(f"Table {table_name} does not exist, creating it...")
            
            # Create the table with GSIs
            table = dynamodb_resource.create_table(
                TableName=table_name,
                KeySchema=[
                    {'AttributeName': 'userId', 'KeyType': 'HASH'},
                    {'AttributeName': 'task_id', 'KeyType': 'RANGE'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'userId', 'AttributeType': 'S'},
                    {'AttributeName': 'task_id', 'AttributeType': 'S'},
                    {'AttributeName': 'userStatus', 'AttributeType': 'S'},
                    {'AttributeName': 'created_at', 'AttributeType': 'N'},
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'UserStatusCreatedAtIndex',
                        'KeySchema': [
                            {'AttributeName': 'userStatus', 'KeyType': 'HASH'},
                            {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'ProvisionedThroughput': {
                            'ReadCapacityUnits': 5,
                            'WriteCapacityUnits': 5
                        }
                    },
                    {
                        'IndexName': 'UserCreatedAtIndex',
                        'KeySchema': [
                            {'AttributeName': 'userId', 'KeyType': 'HASH'},
                            {'AttributeName': 'created_at', 'KeyType': 'RANGE'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'},
                        'ProvisionedThroughput': {
                            'ReadCapacityUnits': 5,
                            'WriteCapacityUnits': 5
                        }
                    }
                ],
                BillingMode='PROVISIONED',
                ProvisionedThroughput={
                    'ReadCapacityUnits': 5,
                    'WriteCapacityUnits': 5
                }
            )
            
            # Wait until table is created
            table.meta.client.get_waiter('table_exists').wait(TableName=table_name)
            return dynamodb_resource.Table(table_name)
        else:
            logger.error(f"Error accessing DynamoDB table: {e}")
            raise

# Initialize global clients
dynamodb = boto3.resource('dynamodb')
tasks_table = None  # Will be initialized at startup
s3_client = boto3.client('s3')
task_cache = {}  # Local cache of tasks

# ------------------------------------------------------
# Task Database Operations
# ------------------------------------------------------

async def save_task_to_db(user_id, task_id, data):
    """Save task data to DynamoDB"""
    try:
        # Get the table for this worker process
        table = get_dynamodb_table()
        
        # Create a copy of the data to avoid modifying the original
        data_copy = data.copy()
        
        # Special handling for complex objects
        if 'video_prompts' in data_copy and isinstance(data_copy['video_prompts'], list):
            # Store a properly serialized version for better retrieval
            try:
                data_copy['video_prompts_json'] = json.dumps(data_copy['video_prompts'])
            except Exception as e:
                logger.warning(f"Failed to JSON serialize video prompts: {e}")
        
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
        current_time = int(time.time())
        cleaned_data['last_updated'] = current_time
        
        # Add last_url_refresh timestamp if it doesn't exist
        if 'last_url_refresh' not in cleaned_data:
            cleaned_data['last_url_refresh'] = current_time
        
        # Add primary key fields
        cleaned_data['userId'] = user_id
        cleaned_data['task_id'] = task_id
        
        # Add the composite userStatus key for GSI
        status = cleaned_data.get('status', 'unknown')
        if isinstance(status, str):
            # Sanitize status value for key
            status = status.replace('#', '-').replace(':', '-')
            cleaned_data['userStatus'] = f"{user_id}#{status}"
        
        cleaned_data['created_at'] = int(cleaned_data['created_at'])
        
        # Add TTL for automatic deletion (10*7 days from now)
        cleaned_data['ttl'] = current_time + 604800*10
        
        # Put the item in DynamoDB
        await run_in_threadpool(
            lambda: table.put_item(Item=cleaned_data)
        )
        
        return True
    except Exception as e:
        logger.error(f"Error saving task to DynamoDB: {e}")
        return False

async def get_task_from_db(user_id, task_id, bypass_cache=False):
    """Get task data from DynamoDB"""
    try:
        # Query DynamoDB directly
        table = get_dynamodb_table()
        response = await run_in_threadpool(
            lambda: table.get_item(Key={'userId': user_id, 'task_id': task_id})
        )
        
        if 'Item' in response:
            return response['Item']
        else:
            return None
    except Exception as e:
        logger.error(f"Error getting task from DynamoDB: {e}")
        return None

async def upload_file_to_s3(file_path, user_id, task_id, file_type):
    """Upload a file to S3 and return the S3 key"""
    try:
        if not os.path.exists(file_path):
            logger.warning(f"File {file_path} does not exist")
            return None
            
        # Determine file extension
        _, file_ext = os.path.splitext(file_path)
        if not file_ext:
            if file_type.startswith('video'):
                file_ext = '.mp4'
            else:
                file_ext = '.png'
            
        # Define S3 key (path)
        s3_key = f"{user_id}/{task_id}/{file_type}{file_ext}"
        
        # Set appropriate content type
        content_type = 'video/mp4' if file_type.startswith('video') else 'image/png'
        
        # Upload file to S3
        with open(file_path, 'rb') as file_data:
            await run_in_threadpool(
                lambda: s3_client.upload_fileobj(
                    file_data, 
                    CONFIG['STORAGE_BUCKET_NAME'], 
                    s3_key,
                    ExtraArgs={'ContentType': content_type}
                )
            )
        
        logger.info(f"Uploaded {file_type} to S3: {s3_key}")
        
        # Delete the local file after successful upload
        try:
            os.remove(file_path)
            logger.info(f"Deleted local file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete local file {file_path}: {e}")
            
        return {
            "s3_key": s3_key,
            "bucket": CONFIG['STORAGE_BUCKET_NAME']
        }
    except Exception as e:
        logger.error(f"Error uploading {file_type} to S3: {e}")
        return None
# ------------------------------------------------------
# Progress Monitoring
# ------------------------------------------------------

class MediaGenerationMonitor:
    """Class to monitor progress of long-running media generation tasks"""
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
            
            logger.info(f"Media generation in progress: {minutes:02d}:{seconds:02d}")
            i = (i + 1) % len(chars)
            # Legitimate polling delay for media generation status
            time.sleep(5)  # nosemgrep: arbitrary-sleep - Less frequent updates when running as API
            
            if elapsed_seconds > self.max_wait:
                logger.warning("Media generation timed out after maximum wait time.")
                self.stop_thread = True
        
        if self.completed:
            logger.info("Media generation completed")
            
    def complete(self):
        self.completed = True
        if self.monitor_thread and threading.current_thread() != self.monitor_thread:
            try:
                self.monitor_thread.join(timeout=1.0)
            except RuntimeError:
                # Handle case where we can't join the thread
                pass
            
    def __del__(self):
        self.stop_thread = True
        # Check to make sure we're not trying to join the current thread
        if self.monitor_thread and self.monitor_thread.is_alive() and threading.current_thread() != self.monitor_thread:
            try:
                self.monitor_thread.join(timeout=0.5)
            except RuntimeError:
                # Ignore the error if we can't join the thread
                pass

# ------------------------------------------------------
# Content Generation: Text, Image, Video
# ------------------------------------------------------

async def generate_announcement(user_id, task_id, user_message):
    """Process user message and generate announcement using Claude"""
    
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise ValueError(f"Task {task_id} not found")
        
    # Get conversation history
    conversation_history = task_data.get('conversation_history', [])
    
    # Get system prompt (from settings or use default)
    system_prompt = task_data.get('announcement_system_prompt', DEFAULT_ANNOUNCEMENT_SYSTEM_PROMPT)
    
    # Create bedrock runtime client
    bedrock_client = boto3.client('bedrock-runtime', region_name=CONFIG['AWS_REGION'])
    
    # Prepare messages for Claude - only include user and assistant messages
    messages = []
    
    # Add conversation history
    for msg in conversation_history:
        messages.append(msg)
        
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    # Invoke Claude model with system as top-level parameter
    try:
        response = await run_in_threadpool(
            lambda: with_retry(
                lambda: bedrock_client.invoke_model(
                    modelId=CONFIG['CLAUDE_MODEL_ID'],
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 1024,
                        "system": system_prompt,  # System prompt as top-level parameter
                        "messages": messages
                    }),
                    contentType="application/json"
                ),
                max_attempts=5
            )
        )
        
        response_body = json.loads(response['body'].read().decode())
        assistant_message = response_body['content'][0]['text']
        
        # Save conversation history
        conversation_history.append({"role": "user", "content": user_message})
        conversation_history.append({"role": "assistant", "content": assistant_message})
        
        # Update task data
        task_data['conversation_history'] = conversation_history
        task_data['current_announcement'] = assistant_message
        
        # Fix: Explicitly convert progress to float before adding
        current_progress = task_data.get('progress', 0)
        if isinstance(current_progress, str):
            try:
                current_progress = float(current_progress)
            except ValueError:
                current_progress = 0.0
        
        # Update the status to indicate the announcement is ready for review
        # Changed: Only update to ANNOUNCEMENT_READY if we have a message and are in started state
        if task_data.get('status') == EventStatus.STARTED and assistant_message:
            task_data['status'] = EventStatus.ANNOUNCEMENT_READY
            task_data['current_step'] = "Announcement ready for review"
        
        task_data['progress'] = min(0.5, current_progress + 0.1)
        
        await save_task_to_db(user_id, task_id, task_data)
        
        return assistant_message
        
    except Exception as e:
        logger.error(f"Error generating announcement: {e}")
        raise

def parse_image_concepts(raw_response):
    """Parse the structured response from Claude to extract the three image concepts"""
    concepts = []
    
    # Simple parsing to extract the three concept sections
    if "Professional Business Style" in raw_response:
        business_section = raw_response.split("Professional Business Style")[1].split("Creative Artistic Style")[0] if "Creative Artistic Style" in raw_response else raw_response.split("Professional Business Style")[1]
        concepts.append({
            "style": "Professional Business Style",
            "description": business_section.strip(),
            "prompt": business_section.strip()[:500]  # Truncate for image generation
        })
    
    if "Creative Artistic Style" in raw_response:
        creative_section = raw_response.split("Creative Artistic Style")[1].split("Minimalist Symbolic Style")[0] if "Minimalist Symbolic Style" in raw_response else raw_response.split("Creative Artistic Style")[1]
        concepts.append({
            "style": "Creative Artistic Style",
            "description": creative_section.strip(),
            "prompt": creative_section.strip()[:500]  # Truncate for image generation
        })
    
    if "Minimalist Symbolic Style" in raw_response:
        minimalist_section = raw_response.split("Minimalist Symbolic Style")[1]
        concepts.append({
            "style": "Minimalist Symbolic Style",
            "description": minimalist_section.strip(),
            "prompt": minimalist_section.strip()[:500]  # Truncate for image generation
        })
    
    # Ensure we have 3 concepts
    while len(concepts) < 3:
        concepts.append({
            "style": f"Concept {len(concepts) + 1}",
            "description": "A visual representation of the event",
            "prompt": "A visual representation of the event"
        })
    
    return concepts

async def create_fallback_image(output_dir, index, concept, user_id, task_id, prefix="fallback_preview_"):
    """Create a fallback image when image generation fails"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Create image with dimensions that are multiples of 64 (1280x768)
        img = Image.new('RGB', (1280, 768), color=(48, 48, 48))
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("Arial", 20)
        except:
            font = ImageFont.load_default()
        
        draw.text((50, 50), f"Style: {concept.get('style', 'Unknown Style')}", fill=(255, 255, 255), font=font)
        
        # Add the description in wrapped text
        description = concept.get("description", "No description available")
        wrapped_text = textwrap.wrap(description, width=60)  # Wider text area for 1280px width
        
        y_position = 100
        for line in wrapped_text[:20]:  # More lines to fill the taller image
            draw.text((50, y_position), line, fill=(200, 200, 255), font=font)
            y_position += 30
            
        if len(wrapped_text) > 20:
            draw.text((50, y_position), "...", fill=(200, 200, 255), font=font)
        
        # Save and upload
        image_filename = f"{prefix}{index+1}.png"
        image_path = os.path.join(output_dir, image_filename)
        img.save(image_path)
        
        # Consistently return the same format for S3 objects
        s3_data = await upload_file_to_s3(image_path, user_id, task_id, f'{prefix}{index+1}')
        return s3_data  # This will be a dict with s3_key and bucket
    except Exception as img_e:
        logger.error(f"Error creating fallback preview image: {img_e}")
        return None
    
async def generate_preview_images(user_id, task_id):
    """Generate three preview images for the event before video prompt generation in parallel"""
    
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise ValueError(f"Task {task_id} not found")
        
    # Get finalized announcement
    announcement = task_data.get('current_announcement')
    if not announcement:
        raise ValueError("No announcement found to generate images from")
    
    # Get image system prompt (from settings or use default)
    system_prompt = task_data.get('image_system_prompt', DEFAULT_IMAGE_SYSTEM_PROMPT)
    
    # Create bedrock runtime client
    bedrock_client = boto3.client('bedrock-runtime', region_name=CONFIG['AWS_REGION'])
    
    # Update status to GENERATING_IMAGES
    task_data['status'] = EventStatus.GENERATING_IMAGES
    task_data['current_step'] = "Generating preview images"
    task_data['progress'] = 0.4
    await save_task_to_db(user_id, task_id, task_data)
    
    # First, get image concepts from Claude
    try:
        # Prepare the prompt for image concept generation
        user_prompt = f"""**Input Event Invitation/Announcement:**
{announcement}

Based on this event announcement, please create three distinct visual concepts as outlined in the system instructions.
For each concept, provide a detailed description that can be used to generate an image.
Make each description approximately 100-150 words, focusing on visual elements and style.
"""

        response = await run_in_threadpool(
            lambda: with_retry(
                lambda: bedrock_client.invoke_model(
                    modelId=CONFIG['CLAUDE_MODEL_ID'],
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 4096,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": user_prompt}
                        ]
                    }),
                    contentType="application/json"
                ),
                max_attempts=5
            )
        )
        
        response_body = json.loads(response['body'].read().decode())
        concepts_raw = response_body['content'][0]['text']
        
        # Extract the three image concepts
        concepts = parse_image_concepts(concepts_raw)
        
        # Store the concepts
        task_data['image_concepts'] = concepts
        await save_task_to_db(user_id, task_id, task_data)
        
    except Exception as e:
        logger.error(f"Error generating image concepts: {e}")
        task_data['error'] = f"Error generating image concepts: {str(e)}"
        task_data['status'] = EventStatus.ERROR
        task_data['current_step'] = "Error generating image concepts"
        await save_task_to_db(user_id, task_id, task_data)
        raise
    
    # Create output directory for images
    output_dir = os.path.join(CONFIG['TMP_DIR'], "output", task_id)
    os.makedirs(output_dir, exist_ok=True)
    
    # Now generate the actual images in parallel
    try:
        # Create tasks for parallel execution
        image_tasks = []
        for i, concept in enumerate(concepts):
            image_tasks.append(generate_single_image(user_id, task_id, i, concept, output_dir))
        
        # Wait for all tasks to complete (run in parallel)
        image_results = await asyncio.gather(*image_tasks)
        
        # Process results
        image_urls = [url for url in image_results if url]
        
        # Update task with image URLs
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        task_data['preview_image_urls'] = image_urls
        task_data['status'] = EventStatus.IMAGES_READY
        task_data['current_step'] = "Preview images ready for feedback"
        task_data['progress'] = 0.55
        await save_task_to_db(user_id, task_id, task_data)
        
        return image_urls
        
    except Exception as e:
        logger.error(f"Error in parallel image generation: {e}")
        task_data['error'] = f"Error generating images: {str(e)}"
        task_data['status'] = EventStatus.ERROR
        task_data['current_step'] = "Error generating images"
        await save_task_to_db(user_id, task_id, task_data)
        raise

async def generate_image_with_nova(prompt, height=1024, width=1024, seed=None, custom_body=None, user_id=None, task_id=None):
    """Generate an image using Amazon Nova Canvas model
    
    Args:
        prompt (str): The prompt text to generate the image
        height (int): Image height
        width (int): Image width
        seed (int): Optional random seed for reproducibility
        custom_body (str): Optional custom JSON body string for the request
        user_id (str): Optional user ID for logging
        task_id (str): Optional task ID for logging
    
    Returns:
        bytes: The raw image bytes if successful, None otherwise
    """
    try:
        # Create a specific bedrock client for nova-canvas (only available in us-east-1)
        bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1')
        
        # Generate a random seed if none provided
        if seed is None:
            seed = random.randint(0, 2147483647)
            
        # Log generating an image
        logger.info(f"Generating image for task {task_id}: prompt length={len(prompt)}")
        if len(prompt) > 50:
            logger.info(f"Prompt preview: {prompt[:50]}...")
        else:
            logger.info(f"Prompt: {prompt}")
            
        # Use custom body if provided, otherwise build standard request
        if not custom_body:
            body = json.dumps({
                "taskType": "TEXT_IMAGE",
                "textToImageParams": {
                    "text": prompt
                },
                "imageGenerationConfig": {
                    "numberOfImages": 1,
                    "height": height,
                    "width": width,
                    "cfgScale": 8.0,
                    "seed": seed,
                    "quality": "premium" 
                }
            })
        else:
            body = custom_body
        
        # Use exponential backoff for retrying API calls
        @exponential_backoff_retry(Exception, max_retries=3)
        def invoke_model(body):
            return bedrock_client.invoke_model(
                modelId="amazon.nova-canvas-v1:0",  
                body=body,
                contentType="application/json",
                accept="application/json"
            )
            
        # Invoke the model with retry logic using a thread pool
        response = await run_in_threadpool(lambda: invoke_model(body))
        
        if not response:
            logger.warning("No response from Nova Canvas model")
            return None
            
        # Parse the response
        response_body = json.loads(response.get("body").read())
        
        # Check for errors
        if "error" in response_body and response_body["error"]:
            logger.error(f"Error in Nova Canvas response: {response_body['error']}")
            return None
            
        # Extract the image data
        base64_image = response_body.get("images")[0]
        image_bytes = base64.b64decode(base64_image)
        
        logger.info(f"Successfully generated image for task {task_id}")
        return image_bytes
        
    except Exception as e:
        logger.error(f"Error generating image with Nova Canvas: {e}")
        return None

def exponential_backoff_retry(exception_to_check, max_retries=5):
    """Decorator for exponential backoff retry logic"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except exception_to_check as e:
                    # Check if it's a throttling exception
                    error_code = getattr(e, 'response', {}).get('Error', {}).get('Code', '')
                    if error_code in ['ThrottlingException', 'TooManyRequestsException', 'ServiceUnavailable']:
                        wait_time = min(2 ** retries, 60)  # Cap at 60 seconds
                        logger.warning(f"Rate limited, retrying in {wait_time}s (attempt {retries+1}/{max_retries})")
                        # Legitimate exponential backoff for throttling
                        time.sleep(wait_time)  # nosemgrep: arbitrary-sleep
                        retries += 1
                    else:
                        # For other AWS errors, don't retry
                        logger.error(f"AWS error: {error_code}: {str(e)}")
                        if "model identifier is invalid" in str(e).lower():
                            logger.warning("Nova Canvas model not available for your account")
                            return None
                        raise
            logger.error(f"Max retries ({max_retries}) exceeded")
            return None
        return wrapper
    return decorator

async def generate_single_image(user_id, task_id, index, concept, output_dir):
    """Generate a single image for a concept (runs in parallel)"""
    try:
        # Update progress for this image individually
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        task_data['current_step'] = f"Generating preview image {index+1} of 3"
        task_data['progress'] = 0.4 + ((index + 1) * 0.05)
        await save_task_to_db(user_id, task_id, task_data)
        
        # Get the prompt for this image
        prompt = concept.get("prompt", "")
        
        # Use Nova Canvas for image generation instead of Stability
        image_bytes = await generate_image_with_nova(
            prompt=prompt,
            height=768,  # Use height that's a multiple of 64
            width=1280,  # Use width that's a multiple of 64
            seed=random.randint(0, 2147483647),
            user_id=user_id,
            task_id=task_id
        )
        
        if image_bytes:
            image_path = os.path.join(output_dir, f"preview_image_{index+1}.png")
            with open(image_path, "wb") as f:
                f.write(image_bytes)
                
            # Upload to S3 and get S3 key
            s3_data = await upload_file_to_s3(image_path, user_id, task_id, f'preview_image_{index+1}')
            if s3_data:
                return {
                    "s3_key": s3_data["s3_key"],
                    "bucket": s3_data["bucket"],
                    "style": concept.get("style", f"Style {index+1}"),
                    "description": concept.get("description", "")
                }
        else:
            # Create fallback image if Nova Canvas generation failed
            image_url = await create_fallback_image(output_dir, index, concept, user_id, task_id)
            if image_url:
                return {
                    "url": image_url,
                    "style": concept.get("style", f"Style {index+1}") + " (Fallback)",
                    "description": "Image generation failed - fallback created"
                }
                
    except Exception as e:
        logger.error(f"Error generating preview image {index+1}: {e}")
        
        # Create fallback image
        image_url = await create_fallback_image(output_dir, index, concept, user_id, task_id)
        if image_url:
            return {
                "url": image_url,
                "style": concept.get("style", f"Style {index+1}") + " (Error)",
                "description": f"Error: {str(e)[:100]}..."
            }
    
    # Return None if all fails (this will be filtered out in the main function)
    return None

async def regenerate_images_with_feedback(user_id, task_id, feedback, selected_images):
    """Generate new images based on user feedback"""
    
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise ValueError(f"Task {task_id} not found")
        
    # Get the original announcement
    announcement = task_data.get('current_announcement')
    if not announcement:
        raise ValueError("No announcement found to generate images from")
    
    # Get image system prompt
    system_prompt = task_data.get('image_system_prompt', DEFAULT_IMAGE_SYSTEM_PROMPT)
    
    # Create bedrock runtime client
    bedrock_client = boto3.client('bedrock-runtime', region_name=CONFIG['AWS_REGION'])
    
    # Create output directory for images
    output_dir = os.path.join(CONFIG['TMP_DIR'], "output", task_id)
    os.makedirs(output_dir, exist_ok=True)
    
    # Prepare a prompt for Claude that includes the user feedback
    user_prompt = f"""**Input Event Invitation/Announcement:**
{announcement}

**Previous User Feedback:**
{feedback}

Based on this event announcement and the user's feedback, please create three new visual concepts.
Each concept should build on the user's preferences and address their feedback.
For each concept, provide a detailed description that can be used to generate an image.
Make each description approximately 100-150 words, focusing on visual elements and style.
"""

    # Add details about previously selected images if available
    if selected_images:
        user_prompt += "\n\n**Previously Selected Image Styles:**\n"
        for i, img in enumerate(selected_images):
            style = img.get('style', f"Style {i+1}") if isinstance(img, dict) else f"Style {i+1}"
            description = img.get('description', "No description") if isinstance(img, dict) else "No description"
            user_prompt += f"- {style}: {description[:100]}...\n"

    try:
        # Update progress
        task_data['current_step'] = "Processing feedback and creating new concepts"
        await save_task_to_db(user_id, task_id, task_data)
        
        # Get new concepts from Claude based on feedback
        response = await run_in_threadpool(
            lambda: with_retry(
                lambda: bedrock_client.invoke_model(
                    modelId=CONFIG['CLAUDE_MODEL_ID'],
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 4096,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": user_prompt}
                        ]
                    }),
                    contentType="application/json"
                ),
                max_attempts=5
            )
        )
        
        response_body = json.loads(response['body'].read().decode())
        concepts_raw = response_body['content'][0]['text']
        
        # Extract the three image concepts
        concepts = parse_image_concepts(concepts_raw)
        
        # Store the new concepts
        task_data['image_concepts'] = concepts
        task_data['feedback_concepts_raw'] = concepts_raw
        await save_task_to_db(user_id, task_id, task_data)
        
        # Now generate new images based on the concepts
        image_data = []
        
        # Create tasks for parallel execution of image generation
        image_tasks = []
        for i, concept in enumerate(concepts):
            # Pass selected_images to the regeneration function
            image_tasks.append(regenerate_single_image_with_feedback(
                user_id, task_id, i, concept, feedback, selected_images, output_dir))
        
        # Wait for all tasks to complete (run in parallel)
        image_results = await asyncio.gather(*image_tasks)
        
        # Process results - filter out None values
        image_data = [data for data in image_results if data]
        
        # Update task with new image URLs
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        task_data['preview_image_urls'] = image_data
        task_data['status'] = EventStatus.IMAGES_READY
        task_data['current_step'] = "Revised images ready for review"
        task_data['progress'] = 0.55
        await save_task_to_db(user_id, task_id, task_data)
        
        return image_data
        
    except Exception as e:
        logger.error(f"Error regenerating images with feedback: {e}")
        task_data['error'] = f"Error regenerating images: {str(e)}"
        task_data['status'] = EventStatus.ERROR
        task_data['current_step'] = "Error regenerating images"
        await save_task_to_db(user_id, task_id, task_data)
        raise

def parse_video_prompts(raw_response):
    """
    Parse the structured response from Claude to extract the three video prompts
    """
    prompts = []
    
    # Simple parsing to extract the three prompt sections
    sections = raw_response.split("**Prompt ")
    
    for section in sections[1:]:  # Skip the first split which is before any prompt
        if not section.strip():
            continue
            
        prompt_data = {}
        
        # Extract visual symbol
        if "**Visual Symbol:**" in section:
            symbol_part = section.split("**Visual Symbol:**")[1].split("**")[0].strip()
            prompt_data["visual_symbol"] = symbol_part
            
        # Extract movement
        if "**Visual Action/Movement:**" in section:
            movement_part = section.split("**Visual Action/Movement:**")[1].split("**")[0].strip()
            prompt_data["movement"] = movement_part
            
        # Extract color palette
        if "**Color Palette:**" in section:
            color_part = section.split("**Color Palette:**")[1].split("**")[0].strip()
            prompt_data["color_palette"] = color_part
            
        # Extract lighting
        if "**Lighting:**" in section:
            lighting_part = section.split("**Lighting:**")[1].split("**")[0].strip()
            prompt_data["lighting"] = lighting_part
            
        # Extract symbolic meaning
        if "**Symbolic Meaning:**" in section:
            meaning_part = section.split("**Symbolic Meaning:**")[1].split("**")[0].strip()
            prompt_data["meaning"] = meaning_part
            
        # Extract audio notes
        if "**Audio Notes:**" in section:
            audio_part = section.split("**Audio Notes:**")[1].split("**")[0].strip()
            prompt_data["audio"] = audio_part
            
        # Extract style
        if "**Style:**" in section:
            style_part = section.split("**Style:**")[1].split("**")[0].strip()
            prompt_data["style"] = style_part
        elif "Cinematic" in section:
            prompt_data["style"] = "Cinematic 4k"
        else:
            prompt_data["style"] = "Abstract"
            
        # Construct a prompt string for Nova Canvas - aim for brevity
        # Make this more concise than before, focusing only on key visual elements
        prompt_str = f"Create a {prompt_data.get('visual_symbol', 'symbolic')} with {prompt_data.get('movement', 'fluid movement')}. "
        prompt_str += f"{prompt_data.get('color_palette', 'vibrant')} colors, {prompt_data.get('lighting', 'dynamic')} lighting. "
        
        # Add style but keep it brief
        if "Cinematic" in prompt_data.get("style", ""):
            prompt_str += "Cinematic 4k quality."
        else:
            prompt_str += "Abstract artistic style."
            
        # Ensure the prompt is within the 500 character limit
        if len(prompt_str) > 500:
            prompt_str = prompt_str[:497] + "..."
            
        prompt_data["prompt"] = prompt_str
        prompts.append(prompt_data)
        
        # Limit to 3 prompts
        if len(prompts) >= 3:
            break
            
    # Ensure we have exactly 3 prompts
    while len(prompts) < 3:
        # Fill with generic prompts if needed - keep these very concise
        prompts.append({
            "visual_symbol": "abstract shapes",
            "movement": "flowing motion",
            "color_palette": "vibrant colors",
            "lighting": "dynamic lighting",
            "meaning": "celebration",
            "audio": "uplifting music",
            "style": "Abstract",
            "prompt": "Abstract flowing shapes with vibrant colors and dynamic lighting. Smooth motion, high quality."
        })
        
    return prompts

async def regenerate_single_image_with_feedback(user_id, task_id, index, concept, feedback, selected_images, output_dir):
    """Generate a single image based on feedback with optional conditioning (runs in parallel)"""
    try:
        # Update progress
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        task_data['current_step'] = f"Regenerating image {index+1} of 3 based on feedback"
        task_data['progress'] = 0.4 + ((index + 1) * 0.05)
        await save_task_to_db(user_id, task_id, task_data)
        
        # Get the prompt for this image
        prompt = concept.get("prompt", "")
        
        # Enhance the prompt with the user's feedback
        enhanced_prompt = f"{prompt} {feedback}"
        if len(enhanced_prompt) > 500:  # Keep within reasonable length
            enhanced_prompt = enhanced_prompt[:500]
        
        # Setup basic request parameters
        request_params = {
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {
                "text": enhanced_prompt
            },
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "height": 768,  # Use height that's multiple of 64
                "width": 1280,  # Use width that's multiple of 64
                "cfgScale": 8.0,
                "seed": random.randint(0, 2147483647),
                "quality": "premium"
            }
        }
        
        # If we have selected images, use the first one as conditioning
        condition_image_used = False
        if selected_images and len(selected_images) > 0:
            # Try to find a matching index, or use first image if no matching index
            condition_idx = min(index, len(selected_images) - 1)
            
            # Get the image URL
            if isinstance(selected_images[condition_idx], dict):
                # Get s3_key from the selected image
                s3_key = selected_images[condition_idx].get('s3_key')
                
                # If s3_key doesn't exist but url does, try to extract key from URL
                if not s3_key and 'url' in selected_images[condition_idx]:
                    url = selected_images[condition_idx]['url']
                    # Try to extract key from the URL
                    if 'amazonaws.com/' in url:
                        parts = url.split('amazonaws.com/')
                        if len(parts) > 1:
                            path_parts = parts[1].split('?')
                            s3_key = path_parts[0]
                
                # If we still can't find a key but have a URL, use the URL directly
                image_url = None
                if s3_key:
                    # Generate a presigned URL for the S3 key
                    image_url = await generate_presigned_url(s3_key, CONFIG['STORAGE_BUCKET_NAME'])
                elif 'url' in selected_images[condition_idx]:
                    image_url = selected_images[condition_idx]['url']
            else:
                # Direct URL string
                image_url = selected_images[condition_idx]
                
            if image_url:
                try:
                    # Download the conditioning image
                    import requests
                    response = requests.get(image_url, stream=True)
                    if response.status_code == 200:
                        # Save to temporary file
                        temp_image_path = os.path.join(output_dir, f"condition_image_{index+1}.png")
                        with open(temp_image_path, 'wb') as f:
                            for chunk in response.iter_content(1024):
                                f.write(chunk)
                                
                        # Read image as base64
                        with open(temp_image_path, "rb") as image_file:
                            condition_image_base64 = base64.b64encode(image_file.read()).decode("utf-8")
                            
                        # Add conditioning to request
                        request_params["textToImageParams"]["conditionImage"] = condition_image_base64
                        request_params["textToImageParams"]["controlMode"] = "CANNY_EDGE"  # Use edge detection
                        request_params["textToImageParams"]["controlStrength"] = 0.7  # Medium-high influence
                        
                        condition_image_used = True
                        logger.info(f"Using condition image for regeneration {index+1}")
                except Exception as download_err:
                    logger.error(f"Error downloading condition image: {download_err}")
                    # Continue without conditioning if download fails
        
        # Log what we're doing
        if condition_image_used:
            logger.info(f"Generating image {index+1} with conditioning and prompt: {enhanced_prompt[:50]}...")
        else:
            logger.info(f"Generating image {index+1} from scratch with prompt: {enhanced_prompt[:50]}...")
        
        # Use Nova Canvas for image generation
        body = json.dumps(request_params)
        image_bytes = await generate_image_with_nova(
            prompt=enhanced_prompt,  # Still pass prompt for logging
            height=768,
            width=1280,
            custom_body=body,  # Use our custom request body
            user_id=user_id,
            task_id=task_id
        )
        
        if image_bytes:
            # Save the image
            image_path = os.path.join(output_dir, f"feedback_image_{index+1}.png")
            with open(image_path, "wb") as f:
                f.write(image_bytes)
                
            # Upload to S3
            s3_data = await upload_file_to_s3(image_path, user_id, task_id, f'feedback_image_{index+1}')
            if s3_data:
                return {
                    "s3_key": s3_data["s3_key"],
                    "bucket": s3_data["bucket"],
                    "style": concept.get("style", f"Revised Style {index+1}"),
                    "description": concept.get("description", ""),
                    "feedback_based": "true",
                    "conditioned": "true" if condition_image_used else "false"  # Return as string, not boolean
                }
        else:
            # Create fallback image if Nova Canvas generation failed
            fallback_data = await create_fallback_image(output_dir, index, concept, user_id, task_id, prefix="feedback_fallback_")
            if fallback_data:
                return {
                    "s3_key": fallback_data["s3_key"],
                    "bucket": fallback_data["bucket"],
                    "style": concept.get("style", f"Revised Style {index+1}") + " (Fallback)",
                    "description": "Image generation failed - fallback created",
                    "feedback_based": "true",
                    "conditioned": "false"  # Return as string
                }
                
    except Exception as e:
        logger.error(f"Error generating feedback-based image {index+1}: {e}")
        
        # Create fallback image
        fallback_data = await create_fallback_image(output_dir, index, concept, user_id, task_id, prefix="feedback_error_")
        if fallback_data:
            return {
                "s3_key": fallback_data["s3_key"],
                "bucket": fallback_data["bucket"],
                "style": concept.get("style", f"Revised Style {index+1}") + " (Error)",
                "description": f"Error: {str(e)[:100]}...",
                "feedback_based": "true",
                "conditioned": "false"  # Return as string
            }
    
    # Return None if all fails 
    return None

async def generate_video_prompts_with_feedback(user_id, task_id):
    """Generate video prompts based on the finalized announcement and image feedback"""
    
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise ValueError(f"Task {task_id} not found")
        
    # Get finalized announcement
    announcement = task_data.get('current_announcement')
    if not announcement:
        raise ValueError("No announcement found to generate videos from")
        
    # Get selected images and feedback
    selected_images = task_data.get('selected_images', [])
    image_feedback = task_data.get('image_feedback', "")
    
    # Get video system prompt (from settings or use default)
    system_prompt = task_data.get('video_system_prompt', DEFAULT_VIDEO_SYSTEM_PROMPT)
    
    # Add specific instructions for prompt length limitation
    length_instruction = """
    IMPORTANT: Each video prompt must be 500 characters or less, as there is a strict 512-character limit 
    for the video generation API. Focus on the most essential visual elements and keep descriptions concise.
    The "prompt" field in each output should never exceed 500 characters.
    """
    
    system_prompt = system_prompt + "\n\n" + length_instruction
    
    # Create bedrock runtime client
    bedrock_client = boto3.client('bedrock-runtime', region_name=CONFIG['AWS_REGION'])
    
    # Prepare the prompt for video generation with image feedback context
    user_prompt = f"""**Input Event Invitation/Announcement:**
{announcement}

**User Image Preferences:**
The user has selected specific visual styles from preview images.
"""

    # Add details about selected images
    if selected_images:
        user_prompt += "\nSelected image styles include: "
        styles = [img.get('style', 'unknown style') for img in selected_images]
        user_prompt += ", ".join(styles)
        
    # Add user feedback if provided
    if image_feedback:
        user_prompt += f"\n\nAdditional user feedback: {image_feedback}"
        
    user_prompt += """

Please analyze this event announcement and the user's visual preferences to create three distinct video prompt concepts.
Remember that each prompt must be under 500 characters - focus on the most essential visual elements and be concise.
"""
    
    # Invoke Claude model with system as top-level parameter
    try:
        # Update the status if needed
        if task_data.get('status') != EventStatus.GENERATING_PROMPTS:
            task_data['status'] = EventStatus.GENERATING_PROMPTS
            task_data['current_step'] = "Generating video prompts with feedback"
            await save_task_to_db(user_id, task_id, task_data)
        
        response = await run_in_threadpool(
            lambda: with_retry(
                lambda: bedrock_client.invoke_model(
                    modelId=CONFIG['CLAUDE_MODEL_ID'],
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 4096,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": user_prompt}
                        ]
                    }),
                    contentType="application/json"
                ),
                max_attempts=5
            )
        )
        
        response_body = json.loads(response['body'].read().decode())
        video_prompts_raw = response_body['content'][0]['text']
        
        # Parse the structured output to extract the three prompts
        prompts = parse_video_prompts(video_prompts_raw)
        
        # Ensure all prompts are within length limits
        for prompt in prompts:
            if 'prompt' in prompt and len(prompt['prompt']) > 500:
                prompt['prompt'] = prompt['prompt'][:497] + "..."
                logger.warning(f"Truncated prompt from {len(prompt['prompt'])} to 500 characters")
        
        # Update task data
        task_data['video_prompts'] = prompts
        task_data['video_prompts_raw'] = video_prompts_raw
        task_data['status'] = EventStatus.PROMPTS_GENERATED
        task_data['current_step'] = "Video prompts ready"
        task_data['progress'] = 0.7
        await save_task_to_db(user_id, task_id, task_data)
        
        return prompts
        
    except Exception as e:
        logger.error(f"Error generating video prompts: {e}")
        task_data['error'] = f"Error generating video prompts: {str(e)}"
        task_data['status'] = EventStatus.ERROR
        task_data['current_step'] = "Error generating video prompts"
        await save_task_to_db(user_id, task_id, task_data)
        raise

async def generate_videos(user_id, task_id):
    """Generate videos based on the prompts and preview images using Amazon Nova Reel"""
    
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise ValueError(f"Task {task_id} not found")
        
    # Get video prompts
    prompts = task_data.get('video_prompts', [])
    if not prompts or len(prompts) == 0:
        raise ValueError("No video prompts found")
        
    # Get preview images (to use as starting frames)
    preview_images = task_data.get('preview_image_urls', [])
    selected_images = task_data.get('selected_images', [])
    
    # Determine which images to use (selected ones or all available ones)
    image_urls_to_use = selected_images if selected_images else preview_images
    
    # Create output directory for fallback static images if needed
    output_dir = os.path.join(CONFIG['TMP_DIR'], "output", task_id)
    os.makedirs(output_dir, exist_ok=True)
    
    # Import textwrap here to ensure it's available
    import textwrap
    
    # Create bedrock runtime client for Nova Reel - ONLY available in us-east-1
    bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    video_urls = []
    job_arns = []
    
    # Start a media generation monitor
    monitor = MediaGenerationMonitor(max_wait=900)  # 15 minutes max for videos
    monitor.start_monitoring()
    
    try:
        # Update task status to generating videos
        task_data['status'] = EventStatus.GENERATING_VIDEOS
        task_data['current_step'] = "Starting video generation"
        await save_task_to_db(user_id, task_id, task_data)
        
        # First, download the images to use as input frames
        images_downloaded = []
        for i, image_data in enumerate(image_urls_to_use):
            try:
                # Handle image URL regardless of whether it's a string or dictionary
                image_url = None
                if isinstance(image_data, dict):
                    if 's3_key' in image_data and 'bucket' in image_data:
                        # Generate a presigned URL from s3_key and bucket
                        image_url = await generate_presigned_url(
                            image_data['s3_key'], image_data['bucket'])
                    elif 'url' in image_data:
                        # Direct URL
                        image_url = image_data['url']
                else:
                    # Direct URL string
                    image_url = image_data
                
                if not image_url:
                    logger.warning(f"Could not determine URL for image {i+1}")
                    continue
                    
                # Download the image
                import requests
                response = requests.get(image_url, stream=True)
                if response.status_code == 200:
                    # Save to local file
                    image_path = os.path.join(output_dir, f"input_frame_{i+1}.png")
                    with open(image_path, 'wb') as f:
                        for chunk in response.iter_content(1024):
                            f.write(chunk)
                            
                    # Resize image to exactly 1280x720 for Nova Reel
                    try:
                        from PIL import Image
                        img = Image.open(image_path)
                        img = img.resize((1280, 720), Image.LANCZOS)
                        img.save(image_path)
                        images_downloaded.append({
                            'path': image_path,
                            'index': i
                        })
                        logger.info(f"Downloaded and resized image {i+1} to 1280x720")
                    except Exception as resize_err:
                        logger.error(f"Error resizing image {i+1}: {resize_err}")
                else:
                    logger.warning(f"Failed to download image {i+1}: HTTP {response.status_code}")
            except Exception as e:
                logger.error(f"Error downloading image {i+1}: {e}")
        
        # If we have no images, generate without images
        if not images_downloaded:
            logger.warning("No images available for image-to-video. Falling back to text-to-video.")
        
        # Submit all video generation jobs asynchronously
        for i, prompt in enumerate(prompts):
            # Update progress
            progress_value = 0.7 + ((i + 1) * 0.05)  # Small increment for job submission
            task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
            task_data['progress'] = progress_value
            task_data['current_prompt_index'] = i
            task_data['current_step'] = f"Generating video {i+1} of {len(prompts)}"
            await save_task_to_db(user_id, task_id, task_data)
            
            # Use the prompt to generate the video
            prompt_text = prompt.get("prompt", "")
            
            # Truncate the prompt to 500 characters (to stay safely under the 512 limit)
            if len(prompt_text) > 500:
                original_prompt = prompt_text
                prompt_text = prompt_text[:497] + "..."
                logger.warning(f"Prompt {i+1} truncated from {len(original_prompt)} to {len(prompt_text)} characters")
                
            try:
                # Configure the S3 output path (using the configured bucket)
                s3_output_uri = f"s3://{CONFIG['STORAGE_BUCKET_NAME']}/videos/"
                
                # Generate a random seed between 0 and 2,147,483,647
                seed = random.randint(0, 2147483647)
                
                # Set up the model input parameters
                model_input = {
                    "taskType": "TEXT_VIDEO",
                    "textToVideoParams": {
                        "text": prompt_text
                    },
                    "videoGenerationConfig": {
                        "durationSeconds": 6,
                        "fps": 24,
                        "dimension": "1280x720",
                        "seed": seed
                    }
                }
                
                # Add image if available for this prompt
                # Match image index with prompt index when possible
                image_for_prompt = None
                for img in images_downloaded:
                    if img['index'] == i:
                        # Exact index match is best
                        image_for_prompt = img
                        break
                
                # If no exact match, use any available image
                if not image_for_prompt and images_downloaded:
                    image_for_prompt = images_downloaded[i % len(images_downloaded)]
                
                # Add image to the request if we have one
                if image_for_prompt:
                    with open(image_for_prompt['path'], "rb") as f:
                        input_image_bytes = f.read()
                        input_image_base64 = base64.b64encode(input_image_bytes).decode("utf-8")
                    
                    model_input["textToVideoParams"]["images"] = [
                        {
                            "format": "png",
                            "source": {
                                "bytes": input_image_base64
                            }
                        }
                    ]
                    logger.info(f"Adding image to video prompt {i+1}")
                
                # Invoke the model asynchronously
                response = await run_in_threadpool(
                    lambda: with_retry(
                        lambda: bedrock_client.start_async_invoke(
                            modelId=MODEL_ID,
                            modelInput=model_input,
                            outputDataConfig={"s3OutputDataConfig": {"s3Uri": s3_output_uri}}
                        ),
                        max_attempts=3
                    )
                )
                
                if response and "invocationArn" in response:
                    invocation_arn = response["invocationArn"]
                    s3_prefix = invocation_arn.split('/')[-1]
                    s3_location = f"{s3_output_uri}{s3_prefix}"
                    
                    job_arns.append({
                        "arn": invocation_arn,
                        "index": i,
                        "s3_prefix": f"videos/{s3_prefix}"
                    })
                    logger.info(f"Submitted video generation job {i+1} with ARN: {invocation_arn}")
                    logger.info(f"Video will be saved to: {s3_location}/output.mp4")
                else:
                    logger.warning(f"Failed to start video generation job for prompt {i+1}")
                    raise Exception("Failed to get invocationArn")
                    
            except Exception as e:
                logger.error(f"Error starting video job for prompt {i+1}: {e}")
                
                # Create fallback image if video generation fails
                try:
                    from PIL import Image, ImageDraw, ImageFont
                    
                    # Create colored background
                    img = Image.new('RGB', (1280, 720), color=(32, 32, 64))
                    draw = ImageDraw.Draw(img)
                    
                    # Try to use a system font
                    try:
                        font = ImageFont.truetype("Arial", 20)
                    except:
                        font = ImageFont.load_default()
                        
                    # Add title
                    draw.text((50, 50), "Video Generation Failed", fill=(255, 255, 255), font=font)
                    
                    # Split text to multiple lines
                    wrapped_text = textwrap.wrap(prompt_text, width=40)
                    
                    y_position = 100
                    for line in wrapped_text:
                        draw.text((50, y_position), line, fill=(255, 255, 255), font=font)
                        y_position += 30
                        
                    # Add error message
                    error_msg = str(e)
                    if len(error_msg) > 100:
                        error_msg = error_msg[:100] + "..."
                    draw.text((50, y_position + 20), f"Error: {error_msg}", fill=(255, 200, 200), font=font)
                    
                    # Save the image
                    image_filename = f"fallback_image_{i+1}.png"
                    image_path = os.path.join(output_dir, image_filename)
                    img.save(image_path)
                    
                    # Upload to S3
                    fallback_url = await upload_file_to_s3(
                        image_path, user_id, task_id, f'fallback_image_{i+1}')
                    
                    if fallback_url:
                        video_urls.append(fallback_url)
                except Exception as img_e:
                    logger.error(f"Error creating fallback image for prompt {i+1}: {img_e}")
        
        # Clean up input frame images
        for img_data in images_downloaded:
            try:
                os.remove(img_data['path'])
                logger.debug(f"Removed temporary input frame: {img_data['path']}")
            except Exception as e:
                logger.warning(f"Failed to remove temporary input frame: {e}")
        
        # Now poll for job completion if we have any jobs submitted
        if job_arns:
            completed_jobs = []
            max_poll_attempts = 180  # 15 minutes with 5-second intervals
            poll_attempts = 0
            
            while job_arns and poll_attempts < max_poll_attempts:
                poll_attempts += 1
                
                # Wait between polls
                await asyncio.sleep(5)
                
                # Update task progress
                task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
                task_data['current_step'] = f"Processing videos: {len(completed_jobs)} of {len(completed_jobs) + len(job_arns)} complete"
                task_data['progress'] = 0.8 + (0.2 * (len(completed_jobs) / (len(completed_jobs) + len(job_arns))))
                await save_task_to_db(user_id, task_id, task_data)
                
                # Check status of all pending jobs
                remaining_jobs = []
                for job_info in job_arns:
                    try:
                        # Query job status following your working code
                        job_status = await run_in_threadpool(
                            lambda: bedrock_client.get_async_invoke(
                                invocationArn=job_info["arn"]
                            )
                        )
                        
                        status = job_status.get("status")
                        logger.info(f"Job {job_info['index'] + 1} status: {status}")
                        
                        if status == "Completed":
                            completed_jobs.append(job_info)
                            
                            # Update progress
                            task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
                            current_progress = float(task_data.get('progress', 0.8))
                            task_data['progress'] = min(0.9, current_progress + 0.1)
                            task_data['current_step'] = f"Video {job_info['index']+1} completed"
                            await save_task_to_db(user_id, task_id, task_data)
                            
                            logger.info(f"Video generation job {job_info['index']+1} completed successfully")
                        elif status == "Failed":
                            failure_reason = job_status.get("failureMessage", "Unknown error")
                            logger.warning(f"Video generation job {job_info['index']+1} failed: {failure_reason}")
                            
                            # Create fallback for failed job
                            try:
                                from PIL import Image, ImageDraw, ImageFont
                                
                                index = job_info["index"]
                                prompt_text = prompts[index].get("prompt", "") if index < len(prompts) else ""
                                
                                img = Image.new('RGB', (1280, 720), color=(64, 32, 32))
                                draw = ImageDraw.Draw(img)
                                
                                try:
                                    font = ImageFont.truetype("Arial", 20)
                                except:
                                    font = ImageFont.load_default()
                                
                                # Add error text
                                draw.text((50, 50), f"Video generation failed: {failure_reason}", 
                                        fill=(255, 200, 200), font=font)
                                
                                wrapped_text = textwrap.wrap(prompt_text, width=50)
                                
                                y_position = 120
                                for line in wrapped_text:
                                    draw.text((50, y_position), line, fill=(255, 255, 255), font=font)
                                    y_position += 30
                                
                                # Save and upload
                                image_filename = f"error_image_{index+1}.png"
                                image_path = os.path.join(output_dir, image_filename)
                                img.save(image_path)
                                
                                fallback_url = await upload_file_to_s3(
                                    image_path, user_id, task_id, f'error_image_{index+1}')
                                
                                if fallback_url:
                                    video_urls.append(fallback_url)
                            except Exception as img_e:
                                logger.error(f"Error creating error image for failed job {index+1}: {img_e}")
                        else:
                            # Job still in progress
                            remaining_jobs.append(job_info)
                            
                    except Exception as e:
                        logger.error(f"Error checking job status for {job_info['arn']}: {e}")
                        remaining_jobs.append(job_info)
                
                # Update the list of pending jobs
                job_arns = remaining_jobs
                
                # Log progress
                if job_arns:
                    logger.info(f"Still waiting for {len(job_arns)} jobs to complete. Poll attempt {poll_attempts}/{max_poll_attempts}")
            
            # Process completed jobs to get video URLs
            for job_info in completed_jobs:
                index = job_info["index"]
                s3_prefix = job_info["s3_prefix"]
                
                # The output video will be at s3://{bucket}/{s3_prefix}/output.mp4
                s3_key = f"{s3_prefix}/output.mp4"
                
                try:
                    # Check if the file exists in S3
                    try:
                        await run_in_threadpool(
                            lambda: s3_client.head_object(
                                Bucket=CONFIG['STORAGE_BUCKET_NAME'], 
                                Key=s3_key
                            )
                        )
                        file_exists = True
                        logger.info(f"Video file exists at s3://{CONFIG['STORAGE_BUCKET_NAME']}/{s3_key}")
                    except Exception as s3e:
                        logger.warning(f"Error checking if video file exists: {s3e}")
                        file_exists = False
                    
                    if file_exists:
                        # Generate presigned URL (valid for 6 days)
                        url = await run_in_threadpool(
                            lambda: s3_client.generate_presigned_url(
                                'get_object',
                                Params={'Bucket': CONFIG['STORAGE_BUCKET_NAME'], 'Key': s3_key},
                                ExpiresIn=518400  # 6 days in seconds
                            )
                        )
                        
                        video_urls.append(url)
                        logger.info(f"Generated presigned URL for video {index+1}")
                    else:
                        logger.warning(f"Expected video file not found in S3 for job {index+1}")
                        
                        # Create a fallback image for this missing file
                        try:
                            from PIL import Image, ImageDraw, ImageFont
                            
                            img = Image.new('RGB', (1280, 720), color=(32, 64, 32))
                            draw = ImageDraw.Draw(img)
                            
                            try:
                                font = ImageFont.truetype("Arial", 20)
                            except:
                                font = ImageFont.load_default()
                                
                            draw.text((50, 50), "Video file not found in S3", fill=(200, 255, 200), font=font)
                            
                            # Get the prompt for this index
                            if index < len(prompts):
                                prompt_text = prompts[index].get("prompt", "")
                                wrapped_text = textwrap.wrap(prompt_text, width=50)
                                
                                y_position = 120
                                for line in wrapped_text:
                                    draw.text((50, y_position), line, fill=(255, 255, 255), font=font)
                                    y_position += 30
                            
                            # Save and upload the image
                            image_filename = f"missing_video_{index+1}.png"
                            image_path = os.path.join(output_dir, image_filename)
                            img.save(image_path)
                            
                            fallback_url = await upload_file_to_s3(
                                image_path, user_id, task_id, f'missing_video_{index+1}')
                            
                            if fallback_url:
                                video_urls.append(fallback_url)
                        except Exception as img_e:
                            logger.error(f"Error creating missing file image for job {index+1}: {img_e}")
                        
                except Exception as e:
                    logger.error(f"Error generating presigned URL for video {index+1}: {e}")
    
    except Exception as e:
        logger.error(f"Error in video generation process: {e}")
        task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
        task_data['error'] = f"Error generating videos: {str(e)}"
        task_data['status'] = EventStatus.ERROR
        task_data['current_step'] = "Error generating videos"
        await save_task_to_db(user_id, task_id, task_data)
        
    finally:
        # Complete the monitoring
        monitor.complete()
    
    # Make sure we have at least one URL for each prompt, create placeholder images if needed
    if len(video_urls) < len(prompts):
        logger.warning(f"Not enough videos generated. Creating placeholder images to fill the gaps.")
        
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # Figure out which prompts don't have videos
            for i, prompt in enumerate(prompts):
                if i >= len(video_urls):
                    # Create placeholder image
                    img = Image.new('RGB', (1280, 720), color=(48, 48, 48))
                    draw = ImageDraw.Draw(img)
                    
                    try:
                        font = ImageFont.truetype("Arial", 20)
                    except:
                        font = ImageFont.load_default()
                    
                    draw.text((50, 50), "Video generation unavailable", fill=(255, 255, 255), font=font)
                    
                    prompt_text = prompt.get("prompt", "")
                    wrapped_text = textwrap.wrap(prompt_text, width=50)
                    
                    y_position = 120
                    for line in wrapped_text:
                        draw.text((50, y_position), line, fill=(200, 200, 255), font=font)
                        y_position += 30
                    
                    # Save and upload
                    image_filename = f"placeholder_{i+1}.png"
                    image_path = os.path.join(output_dir, image_filename)
                    img.save(image_path)
                    
                    placeholder_url = await upload_file_to_s3(
                        image_path, user_id, task_id, f'placeholder_{i+1}')
                    
                    if placeholder_url:
                        video_urls.append(placeholder_url)
        except Exception as e:
            logger.error(f"Error creating placeholder images: {e}")
        
    # Update task data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    task_data['video_urls'] = video_urls
    if video_urls:
        task_data['status'] = EventStatus.COMPLETED
        task_data['current_step'] = "All videos completed"
        task_data['progress'] = 1.0
    else:
        task_data['status'] = EventStatus.ERROR
        task_data['current_step'] = "Failed to generate videos"
        task_data['progress'] = 0.8
    await save_task_to_db(user_id, task_id, task_data)
    
    return video_urls

# ------------------------------------------------------
# FastAPI App Setup
# ------------------------------------------------------

# Create FastAPI app
app = FastAPI(
    title="Event Composer API",
    description="API for generating event announcements and related videos using AWS Bedrock and Claude AI",
    version="1.0.0",
)

# ------------------------------------------------------
# API Endpoints
# ------------------------------------------------------

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
        tasks_table = dynamodb.Table(CONFIG['TASKS_TABLE_NAME'])
        
        # Check if table exists, if not create it
        try:
            tasks_table.table_status
            logger.info(f"Connected to DynamoDB table: {CONFIG['TASKS_TABLE_NAME']}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                logger.info(f"Table {CONFIG['TASKS_TABLE_NAME']} does not exist, creating it...")
                
                # Create the table
                table = dynamodb.create_table(
                    TableName=CONFIG['TASKS_TABLE_NAME'],
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
                table.meta.client.get_waiter('table_exists').wait(TableName=CONFIG['TASKS_TABLE_NAME'])
                tasks_table = dynamodb.Table(CONFIG['TASKS_TABLE_NAME'])
                logger.info(f"Created DynamoDB table: {CONFIG['TASKS_TABLE_NAME']}")
            else:
                raise
    except Exception as e:
        logger.error(f"Error connecting to DynamoDB: {e}")
        raise
    
    # Check if S3 bucket exists, if not create it
    try:
        s3_client.head_bucket(Bucket=CONFIG['STORAGE_BUCKET_NAME'])
        logger.info(f"Connected to S3 bucket: {CONFIG['STORAGE_BUCKET_NAME']}")
    except ClientError as e:
        error_code = int(e.response['Error']['Code'])
        if error_code == 404:  # Bucket not found
            logger.info(f"Bucket {CONFIG['STORAGE_BUCKET_NAME']} does not exist, creating it...")
            try:
                # Create the bucket in the current region
                region = CONFIG['AWS_REGION']
                
                if region == 'us-east-1':
                    s3_client.create_bucket(Bucket=CONFIG['STORAGE_BUCKET_NAME'])
                else:
                    location = {'LocationConstraint': region}
                    s3_client.create_bucket(
                        Bucket=CONFIG['STORAGE_BUCKET_NAME'],
                        CreateBucketConfiguration=location
                    )
                
                # Configure the bucket to block public access
                s3_client.put_public_access_block(
                    Bucket=CONFIG['STORAGE_BUCKET_NAME'],
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
                    Bucket=CONFIG['STORAGE_BUCKET_NAME'],
                    LifecycleConfiguration=lifecycle_config
                )
                
                logger.info(f"Created S3 bucket: {CONFIG['STORAGE_BUCKET_NAME']}")
            except Exception as bucket_error:
                logger.error(f"Failed to create bucket: {bucket_error}")
                raise
        else:
            logger.error(f"Error checking S3 bucket: {e}")
            raise

    # Make sure the local temporary directory exists
    os.makedirs(CONFIG['TMP_DIR'], exist_ok=True)

@app.get("/", response_class=JSONResponse)
async def root():
    return {"message": "Welcome to the Event Composer API", "version": "1.0.0"}

@app.get("/health", response_class=JSONResponse)
async def health_check():
    """Health check endpoint for load balancer"""
    try:
        # Verify DynamoDB connection by testing a simple operation
        await run_in_threadpool(lambda: tasks_table.scan(Limit=1))
        
        # Verify S3 connection
        await run_in_threadpool(lambda: s3_client.list_objects_v2(Bucket=CONFIG['STORAGE_BUCKET_NAME'], MaxKeys=1))
        
        return {"status": "healthy", "timestamp": time.time()}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e), "timestamp": time.time()}
        )

@app.post("/start", response_model=EventResponse)
async def start_event_composer(request: EventRequest, background_tasks: BackgroundTasks, token_data: dict = Depends(verify_token)):
    """Start a new event composer task"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    task_id = str(uuid4())
    
    # Initialize task data
    initial_message = f"I'd like to create an announcement for {request.event_name}"
    if request.date_time:
        initial_message += f" happening on {request.date_time}"
    if request.location:
        initial_message += f" at {request.location}"
    initial_message += f". I prefer a {request.tone} tone."
    
    task_data = {
        'status': EventStatus.STARTED,
        'progress': 0.0,
        'event_name': request.event_name,
        'date_time': request.date_time,
        'location': request.location,
        'tone': request.tone,
        'conversation_history': [],
        'announcement_system_prompt': DEFAULT_ANNOUNCEMENT_SYSTEM_PROMPT,
        'image_system_prompt': DEFAULT_IMAGE_SYSTEM_PROMPT,
        'video_system_prompt': DEFAULT_VIDEO_SYSTEM_PROMPT,
        'created_at': int(time.time()),
        'current_step': 'Starting conversation'
    }
    
    # Save task data
    await save_task_to_db(user_id, task_id, task_data)
    
    # Start first conversation
    background_tasks.add_task(generate_announcement, user_id, task_id, initial_message)
    
    return EventResponse(
        task_id=task_id,
        status=EventStatus.STARTED,
        message=f"Event composer started for: {request.event_name}"
    )

@app.post("/{task_id}/chat", response_class=JSONResponse)
async def chat(task_id: str, message: str = Body(..., embed=True), token_data: dict = Depends(verify_token)):
    """Process a chat message in an ongoing event composer task"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
        
    # Get task data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Generate response
    try:
        response = await generate_announcement(user_id, task_id, message)
        return {"message": response, "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/{task_id}/accept-announcement", response_class=JSONResponse)
async def accept_announcement(task_id: str, background_tasks: BackgroundTasks, token_data: dict = Depends(verify_token)):
    """Mark an announcement as accepted and automatically generate preview images"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
        
    # Get task data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if there is an announcement to accept
    if not task_data.get('current_announcement'):
        raise HTTPException(status_code=400, detail="No announcement available to accept")
    
    # Update the status to GENERATING_IMAGES to indicate we're now working on preview images
    task_data['status'] = EventStatus.GENERATING_IMAGES
    task_data['current_step'] = "Announcement approved, generating preview images"
    task_data['progress'] = 0.3
    
    # Save the updated task
    await save_task_to_db(user_id, task_id, task_data)
    
    # Start generating preview images in the background
    background_tasks.add_task(generate_preview_images, user_id, task_id)
    
    return {
        "task_id": task_id,
        "status": EventStatus.GENERATING_IMAGES,
        "message": "Announcement accepted, generating preview images"
    }

@app.get("/{task_id}/preview-images", response_class=JSONResponse)
async def get_preview_images(task_id: str, token_data: dict = Depends(verify_token)):
    """Get the preview images for an event"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
        
    # Get task data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Get the preview images
    preview_images = task_data.get('preview_image_urls', [])
    
    return {
        "task_id": task_id,
        "preview_images": preview_images,
        "status": task_data.get('status')
    }

@app.post("/{task_id}/image-feedback", response_class=JSONResponse)
async def provide_image_feedback(
    task_id: str, 
    selected_images: List[int] = Body(..., description="List of selected image indices (0-based)"),
    feedback: Optional[str] = Body(None, description="Optional feedback about the selected images"),
    regenerate: bool = Body(True, description="Whether to regenerate images based on feedback"),
    background_tasks: BackgroundTasks = None,
    token_data: dict = Depends(verify_token)
):
    """
    Provide feedback on generated preview images.
    If regenerate=True, new images will be generated based on the feedback.
    """
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
        
    # Get task data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Validate if we're in the correct state
    if task_data.get('status') != EventStatus.IMAGES_READY:
        raise HTTPException(status_code=400, detail="Task not in the correct state for image feedback")
        
    # Check if we have images
    preview_images = task_data.get('preview_image_urls', [])
    if not preview_images:
        raise HTTPException(status_code=400, detail="No preview images available")
        
    # Store the selected images and feedback
    selected = []
    for idx in selected_images:
        if idx >= 0 and idx < len(preview_images):
            selected.append(preview_images[idx])
    
    task_data['selected_images'] = selected
    task_data['image_feedback'] = feedback
    
    if regenerate and feedback:
        # Set status to regenerating images
        task_data['status'] = EventStatus.GENERATING_IMAGES
        task_data['current_step'] = "Regenerating images based on feedback"
        task_data['progress'] = 0.4  # Reset progress a bit
        
        # Fix for the feedback_iterations type issue
        # Convert feedback_iterations to int if it's a string, or use 0 as default
        current_iterations = task_data.get('feedback_iterations', 0)
        if isinstance(current_iterations, str):
            try:
                current_iterations = int(current_iterations)
            except ValueError:
                current_iterations = 0
                
        task_data['feedback_iterations'] = current_iterations + 1
        await save_task_to_db(user_id, task_id, task_data)
        
        # Start regenerating images in the background
        if background_tasks:
            background_tasks.add_task(regenerate_images_with_feedback, user_id, task_id, feedback, selected)
        
        return {
            "task_id": task_id,
            "message": "Feedback received, regenerating images",
            "regenerating": True,
            "selected_images": len(selected)
        }
    else:
        # Just store feedback without regenerating
        task_data['current_step'] = "Image feedback received"
        await save_task_to_db(user_id, task_id, task_data)
        
        return {
            "task_id": task_id,
            "message": "Image feedback received",
            "regenerating": False,
            "selected_images": len(selected)
        }

@app.post("/{task_id}/accept-images", response_class=JSONResponse)
async def accept_images(task_id: str, background_tasks: BackgroundTasks, token_data: dict = Depends(verify_token)):
    """
    Accept the current images and move to video prompt generation
    """
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Get task data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Validate if we're in the correct state
    if task_data.get('status') != EventStatus.IMAGES_READY:
        raise HTTPException(status_code=400, detail="Task not in the correct state for image acceptance")
    
    # Update status to generating prompts
    task_data['status'] = EventStatus.GENERATING_PROMPTS
    task_data['current_step'] = "Processing image feedback"
    task_data['progress'] = 0.6
    await save_task_to_db(user_id, task_id, task_data)
    
    # Start generating video prompts based on the feedback
    if background_tasks:
        background_tasks.add_task(generate_video_prompts_with_feedback, user_id, task_id)
    
    return {
        "task_id": task_id,
        "message": "Images accepted, generating video prompts",
    }

@app.post("/{task_id}/generate-videos", response_class=JSONResponse)
async def create_videos(task_id: str, background_tasks: BackgroundTasks, token_data: dict = Depends(verify_token)):
    """Generate videos from the prompts"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
        
    # Get task data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if not task_data.get('video_prompts'):
        raise HTTPException(status_code=400, detail="Video prompts not generated yet")
        
    # Update status
    task_data['status'] = EventStatus.GENERATING_VIDEOS
    task_data['progress'] = 0.7
    task_data['current_step'] = "Starting video generation"
    await save_task_to_db(user_id, task_id, task_data)
    
    # Start video generation in background
    background_tasks.add_task(generate_videos, user_id, task_id)
    
    return {"task_id": task_id, "status": EventStatus.GENERATING_VIDEOS, "message": "Video generation started"}

@app.get("/{task_id}/status", response_model=EventStatusResponse)
async def get_event_status(task_id: str, token_data: dict = Depends(verify_token)):
    """Get the current status of an event composition task with optimized URL handling"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    # Get task data with cache bypass to ensure fresh data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")

    # Initialize response data with basic fields
    response = {
        "task_id": task_id,
        "status": task_data.get("status", "unknown"),
        "progress": float(task_data.get("progress", 0.0)) if isinstance(task_data.get("progress"), (str, Decimal)) else task_data.get("progress", 0.0),
        "announcement": task_data.get("current_announcement"),
        "conversation_history": task_data.get("conversation_history", []),
        "video_prompts": task_data.get("video_prompts"),
        "created_at": int(task_data.get("created_at", time.time())),
        "error": task_data.get("error"),
        "current_step": task_data.get("current_step"),
        "announcement_system_prompt": task_data.get("announcement_system_prompt", DEFAULT_ANNOUNCEMENT_SYSTEM_PROMPT),
        "image_system_prompt": task_data.get("image_system_prompt", DEFAULT_IMAGE_SYSTEM_PROMPT),
        "video_system_prompt": task_data.get("video_system_prompt", DEFAULT_VIDEO_SYSTEM_PROMPT),
        "event_name": task_data.get("event_name", ""),
        "date_time": task_data.get("date_time"),
        "location": task_data.get("location"),
        "tone": task_data.get("tone"),
        "updated_at": task_data.get("last_updated", task_data.get("created_at", int(time.time())))
    }

    # Batch generate presigned URLs for all media
    async def process_media_items(items, is_video=False):
        if not items:
            return []
        
        processed_items = []
        tasks = []

        for item in items:
            if isinstance(item, dict):
                s3_key = item.get('s3_key')
                bucket = item.get('bucket', CONFIG['STORAGE_BUCKET_NAME'])
                
                if s3_key:
                    tasks.append(generate_presigned_url(s3_key, bucket))
                    processed_items.append(item.copy())
            elif isinstance(item, str) and ('http://' in item or 'https://' in item):
                # Already a URL
                if is_video:
                    processed_items.append(item)
                else:
                    processed_items.append({'url': item})
                tasks.append(None)
            else:
                logger.warning(f"Invalid media item format: {item}")
                continue

        # Wait for all URL generation tasks to complete
        urls = await asyncio.gather(*[t for t in tasks if t is not None])
        url_index = 0

        # Combine URLs with item data
        result = []
        for i, item in enumerate(processed_items):
            if tasks[i] is not None:
                if urls[url_index]:
                    if is_video:
                        result.append(urls[url_index])  # For videos, just add the URL string
                    else:
                        item_copy = item.copy()
                        item_copy['url'] = urls[url_index]
                        if 's3_key' in item_copy:
                            del item_copy['s3_key']
                        if 'bucket' in item_copy:
                            del item_copy['bucket']
                        result.append(item_copy)
                url_index += 1
            else:
                if is_video:
                    result.append(item)  # For videos, add the existing URL string
                else:
                    result.append(item)  # For images, add the existing item

        return result

    try:
        # Process all media types concurrently
        video_urls, preview_images, selected_images = await asyncio.gather(
            process_media_items(task_data.get('video_urls', []), is_video=True),
            process_media_items(task_data.get('preview_image_urls', [])),
            process_media_items(task_data.get('selected_images', []))
        )

        # Update response with processed media
        response.update({
            "video_urls": video_urls,
            "preview_image_urls": preview_images,
            "selected_images": selected_images
        })

    except Exception as e:
        logger.error(f"Error processing media URLs for task {task_id}: {e}")
        # Continue with partial data if some URLs failed
        response.update({
            "video_urls": [],
            "preview_image_urls": [],
            "selected_images": [],
            "error": f"Error processing media URLs: {str(e)}"
        })

    return response

@app.put("/{task_id}/system-prompts", response_class=JSONResponse)
async def update_system_prompts(
    task_id: str, 
    announcement_prompt: Optional[str] = Body(None), 
    video_prompt: Optional[str] = Body(None),
    image_prompt: Optional[str] = Body(None),
    token_data: dict = Depends(verify_token)
):
    """Update the system prompts for announcement, image and video generation"""
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
        
    # Get task data
    task_data = await get_task_from_db(user_id, task_id, bypass_cache=True)
    if not task_data:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Update prompts if provided
    if announcement_prompt:
        task_data['announcement_system_prompt'] = announcement_prompt
        
    if video_prompt:
        task_data['video_system_prompt'] = video_prompt
        
    if image_prompt:
        task_data['image_system_prompt'] = image_prompt
        
    # Save changes
    await save_task_to_db(user_id, task_id, task_data)
    
    return {
        "task_id": task_id, 
        "message": "System prompts updated",
        "announcement_prompt_updated": announcement_prompt is not None,
        "video_prompt_updated": video_prompt is not None,
        "image_prompt_updated": image_prompt is not None
    }

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def decimal_serializer(obj):
    """Helper function to convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

@app.get("/tasks")
async def list_tasks(
    last_evaluated_key: Optional[str] = Query(None, description="Last evaluated key for pagination"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(25, le=100, description="Number of items per page"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order (asc/desc)"),
    token_data: dict = Depends(verify_token)
):
    """
    List event composer tasks with pagination, filtering by status, and ordering by created_at
    """
    user_id = token_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Valid authentication required")
    
    try:
        # Get table reference
        table = get_dynamodb_table()
        
        # Determine which index to use based on whether status is provided
        if status:
            # Use the composite key index when filtering by status
            index_name = "UserStatusCreatedAtIndex"
            composite_key = f"{user_id}#{status}"
            key_condition = Key('userStatus').eq(composite_key)
        else:
            # Use the regular index for all tasks by creation date
            index_name = "UserCreatedAtIndex"
            key_condition = Key('userId').eq(user_id)
        
        # Build the query parameters
        query_params = {
            'IndexName': index_name,
            'KeyConditionExpression': key_condition,
            'ScanIndexForward': sort_order == "asc",  # True for ascending
            'Limit': limit
        }
        
        # Add pagination token if provided
        if last_evaluated_key:
            try:
                decoded_key = json.loads(base64.b64decode(last_evaluated_key.encode()).decode())
                query_params['ExclusiveStartKey'] = decoded_key
            except Exception as e:
                logger.error(f"Error decoding pagination token: {e}")
                raise HTTPException(status_code=400, detail="Invalid pagination token")
        
        # Execute query
        response = await run_in_threadpool(lambda: table.query(**query_params))
        
        # First, convert all Decimal types to float for JSON serialization
        # This handles both the items and LastEvaluatedKey
        response_json = json.loads(json.dumps(response, default=decimal_serializer))
        
        # Process results
        items = response_json.get('Items', [])
        
        # Generate pagination token
        next_token = None
        if 'LastEvaluatedKey' in response:
            # Convert any Decimal types to string first to ensure proper serialization
            last_key_json = {}
            for k, v in response['LastEvaluatedKey'].items():
                if isinstance(v, Decimal):
                    last_key_json[k] = float(v)
                else:
                    last_key_json[k] = v
            
            next_token = base64.b64encode(json.dumps(last_key_json).encode()).decode()
        
        result = []
        for task in items:
            # Convert Decimal to float for JSON serialization
            task_dict = {}
            for key, value in task.items():
                if isinstance(value, Decimal):
                    task_dict[key] = float(value)
                else:
                    task_dict[key] = value
            
            # Add minimal required fields
            result.append({
                "task_id": task_dict.get("task_id"),
                "event_name": task_dict.get("event_name", "Unnamed event"),
                "status": task_dict.get("status", "unknown"),
                "progress": task_dict.get("progress", 0.0),
                "created_at": task_dict.get("created_at", 0),
                "current_step": task_dict.get("current_step", ""),
                "updated_at": task_dict.get("last_updated", task_dict.get("created_at", 0))
            })

        return {
            'tasks': result,
            'next_token': next_token,
            'count': len(items)
        }
    
    except Exception as e:
        logger.error(f"Error listing tasks: {e}", exc_info=True)  # Added exc_info for better debugging
        raise HTTPException(status_code=500, detail=str(e))