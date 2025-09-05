from typing import Union, List, Dict, Optional, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException
from botocore.exceptions import ClientError
from fastapi.responses import StreamingResponse, JSONResponse
import base64
import traceback
import json
import boto3
from botocore.config import Config
from models.models import ChatRequest, Message, Attachment, MessageType
from .auth import verify_token
import logging
import random
from datetime import datetime
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

class ChatHandler:
    def __init__(self):
        self.bedrock_config = Config(
            region_name=os.getenv("AWS_BEDROCK_REGION"),
            retries=dict(max_attempts=3)
        )
        self.bedrock_agent_config = Config(
            region_name=os.getenv("AWS_REGION"),
            retries=dict(max_attempts=3)
        )
        self.bedrock_runtime = boto3.client(
            'bedrock-runtime',
            config=self.bedrock_config
        )
        self.bedrock_agent = boto3.client(
            'bedrock-agent-runtime',
            config=self.bedrock_agent_config
        )
        self.dynamodb = boto3.resource('dynamodb')
        self.agents_table = self.dynamodb.Table(os.getenv("AGENTS_TABLE"))
        self.logger = logging.getLogger(__name__)

    async def get_bot_configuration(self, bot_id: str, user_id: str) -> Dict:
        """
        Fetch bot configuration from DynamoDB agents table using Cognito Identity ID
        """
        try:
            response = self.agents_table.get_item(
                Key={
                    'userId': user_id,
                    'id': bot_id
                }
            )
            
            if 'Item' not in response:
                self.logger.error(f"Bot configuration not found for userId: {user_id}, botId: {bot_id}")
                raise HTTPException(
                    status_code=404, 
                    detail=f"Bot configuration not found"
                )
            
            item = response['Item']

            # Extract model parameters - note that DynamoDB returns native Python types
            model_params = item.get('modelParams', {})
            parsed_model_params = {
                'modelId': model_params.get('modelId', ''),
                'maxTokens': int(model_params.get('maxTokens', 4096)),
                'temperature': float(model_params.get('temperature', 0.7)),
                'topP': float(model_params.get('topP', 0.9)),
                'maxTurns': int(model_params.get('maxTurns', 10)),
            }

            # Optional model parameters
            if 'stopSequences' in model_params:
                parsed_model_params['stopSequences'] = model_params['stopSequences']
            if 'anthropicVersion' in model_params:
                parsed_model_params['anthropicVersion'] = model_params['anthropicVersion']
                
            # Convert to Python types - note that values are already in native format
            bot_config = {
                'id': item['id'],
                'userId': item['userId'],
                'name': item['name'],
                'description': item['description'],
                'systemPrompt': item['systemPrompt'],
                'modelParams': parsed_model_params,
                'createdAt': int(item.get('createdAt', 0)),
                'lastEditedAt': int(item.get('lastEditedAt', 0)),
                'version': int(item.get('version', 1)),
                'knowledgeBaseId': item.get('knowledgeBaseId')
            }

            # Map the model parameters to the chat request format
            bot_config['model'] = bot_config['modelParams']['modelId']
            bot_config['max_tokens'] = bot_config['modelParams']['maxTokens']
            bot_config['temperature'] = bot_config['modelParams']['temperature']
            
            return bot_config
                
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            self.logger.error(f"DynamoDB error: {error_code} - {error_message}")
            if error_code == 'ResourceNotFoundException':
                raise HTTPException(
                    status_code=404,
                    detail=f"Agents table not found: {os.getenv('AGENTS_TABLE')}"
                )
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )

    async def chat(self, chat_request: ChatRequest, token_data: dict):
        """
        Main chat entry point
        """
        try:
            # If using a bot, get its configuration including KB ID
            if chat_request.botId:
                bot_config = await self.get_bot_configuration(chat_request.botId, token_data["user_id"])
                
                # Update chat request with bot configuration
                model_params = bot_config['modelParams']
                chat_request.model = model_params['modelId']
                chat_request.max_tokens = model_params['maxTokens']
                chat_request.temperature = model_params['temperature']
                
                # Get system prompt from bot config
                if bot_config.get('systemPrompt'):
                    chat_request.system_prompts = bot_config['systemPrompt']

                # Get knowledge base ID from bot config
                knowledge_base_id = bot_config.get('knowledgeBaseId')

                self.logger.info(f"Using bot configuration: {bot_config}")
                
                if knowledge_base_id:
                    self.logger.info(f"Using knowledge base: {knowledge_base_id}")
                    
                    if chat_request.stream:
                        return StreamingResponse(
                            self._stream_kb_response(
                                knowledge_base_id,
                                chat_request.conversation_history[-1].content,
                                chat_request.model,
                                chat_request.max_tokens,
                                chat_request.temperature,
                                chat_request.system_prompts,
                                chat_request.conversation_history
                            ),
                            media_type="text/event-stream"
                        )
                    else:
                        return await self._handle_kb_non_streaming(
                            knowledge_base_id,
                            chat_request.conversation_history[-1].content,
                            chat_request.model,
                            chat_request.max_tokens,
                            chat_request.temperature,
                            chat_request.system_prompts,
                            chat_request.conversation_history
                        )

                # Additional model-specific parameters
                if model_params.get('stopSequences'):
                    chat_request.stop_sequences = model_params['stopSequences']
                
                if model_params.get('anthropicVersion'):
                    chat_request.anthropic_version = model_params['anthropicVersion']
                
                if model_params.get('topP'):
                    chat_request.top_p = model_params['topP']
                    
                # Handle image generation parameters if present
                image_params = {k: v for k, v in model_params.items() if k in [
                    'imageSize', 'imageWidth', 'imageHeight', 'numImages',
                    'stylePreset', 'quality', 'steps', 'seed', 'negativePrompt',
                    'aspectRatio', 'outputFormat', 'mode', 'strength',
                    'taskType', 'negativeText', 'cfgScale', 'controlMode',
                    'controlStrength', 'similarityStrength', 'maskPrompt',
                    'maskImage', 'returnMask', 'outpaintingMode', 'colors',
                    'referenceImage'
                ]}
                
                if image_params:
                    chat_request.image_params = image_params
                    
                # Handle video generation parameters if present
                video_params = {k: v for k, v in model_params.items() if k in [
                    'videoQuality', 'videoDimension', 'durationSeconds',
                    'fps', 'videoTaskType'
                ]}
                
                if video_params:
                    chat_request.video_params = video_params
                            
            # Regular chat without KB
            return await self._handle_regular_chat(chat_request)

        except Exception as e:
            self.logger.error(f"Error in chat: {str(e)}")
            self.logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={"error": str(e)}
            )

    async def _handle_non_streaming_response(self, request_body: Dict, model: str) -> JSONResponse:
        try:
            response = self.bedrock_runtime.invoke_model(
                modelId=model,
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            self.logger.info(f"Raw response from model: {response_body}")
            
            if "nova" in model:
                # Nova handling remains the same...
                content = None
                if 'output' in response_body:
                    if 'message' in response_body['output']:
                        message_content = response_body['output']['message'].get('content', [])
                        for content_item in message_content:
                            if isinstance(content_item, dict) and 'text' in content_item:
                                content = content_item['text']
                                break
                                
                if not content:
                    raise ValueError(f"Could not extract content from Nova response: {response_body}")

                usage = response_body.get('usage', {
                    'inputTokens': 0,
                    'outputTokens': 0,
                    'totalTokens': 0
                })
                
                return JSONResponse(content={
                    "completion": content,
                    "usage": {
                        "completion_tokens": usage.get('outputTokens', 0),
                        "prompt_tokens": usage.get('inputTokens', 0),
                        "total_tokens": usage.get('totalTokens', 0)
                    },
                    "stop_reason": response_body.get('stopReason', 'stop'),
                    "model": model,
                    "created": int(datetime.utcnow().timestamp())
                })

            elif "anthropic" in model:
                # Handle both Claude 2 and Claude 3 formats
                content = None
                if 'content' in response_body:
                    # Claude 3 format
                    if isinstance(response_body['content'], list):
                        for content_item in response_body['content']:
                            if content_item.get('type') == 'text':
                                content = content_item.get('text', '')
                                break
                    else:
                        content = response_body['content']
                else:
                    # Claude 2 format
                    content_items = response_body.get('content', [])
                    if isinstance(content_items, list):
                        for item in content_items:
                            if item.get('type') == 'text':
                                content = item.get('text', '')
                                break

                if not content:
                    self.logger.error(f"Unable to extract content from response: {response_body}")
                    raise ValueError(f"Could not extract content from Anthropic response")

                usage = response_body.get('usage', {})
                
                return JSONResponse(content={
                    "completion": content,
                    "usage": {
                        "completion_tokens": usage.get('output_tokens', 0),
                        "prompt_tokens": usage.get('input_tokens', 0),
                        "total_tokens": usage.get('input_tokens', 0) + usage.get('output_tokens', 0)
                    },
                    "stop_reason": response_body.get('stop_reason', 'stop'),
                    "model": model,
                    "created": int(datetime.utcnow().timestamp())
                })

            elif "llama" in model:
                content = response_body.get('generation', '')
                if not content:
                    raise ValueError("Empty response from Llama model")
                    
                return JSONResponse(content={
                    "completion": content,
                    "usage": {
                        "completion_tokens": len(content.split()),
                        "prompt_tokens": len(str(request_body.get('prompt', '')).split()),
                        "total_tokens": len(content.split()) + len(str(request_body.get('prompt', '')).split())
                    },
                    "stop_reason": "stop",
                    "model": model,
                    "created": int(datetime.utcnow().timestamp())
                })

            elif "titan" in model:
                content = (
                    response_body.get('output', {}).get('text', '') or
                    response_body.get('outputText', '')
                )
                
                if not content:
                    raise ValueError("Empty response from Titan model")
                    
                prompt_tokens = len(str(request_body).split())
                completion_tokens = len(content.split())
                
                return JSONResponse(content={
                    "completion": content,
                    "usage": {
                        "completion_tokens": completion_tokens,
                        "prompt_tokens": prompt_tokens,
                        "total_tokens": prompt_tokens + completion_tokens
                    },
                    "stop_reason": "stop",
                    "model": model,
                    "created": int(datetime.utcnow().timestamp())
                })
                
            else:
                raise ValueError(f"Unsupported model: {model}")

        except Exception as e:
            self.logger.error(f"Error in non-streaming response: {str(e)}")
            self.logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500, 
                content={
                    "error": f"Failed to process response: {str(e)}",
                    "raw_response": response_body if 'response_body' in locals() else None
                }
            )

    # Update the _process_messages method in ChatHandler class:
    def _process_messages(self, messages: List[Message]) -> List[Dict]:
        processed_messages = []
        
        for message in messages:
            # For Nova models, we need a simpler format without 'type' field
            if "nova" in self.model:
                msg_dict = {
                    "role": message.role,
                    "content": [{
                        "text": message.content
                    }]
                }
                
                # Handle attachments if present
                if message.attachments:
                    for attachment in message.attachments:
                        if attachment.file_type.startswith('image/'):
                            msg_dict["content"].append({
                                "image": {
                                    "format": "jpeg",
                                    "source": {
                                        "bytes": attachment.file_content
                                    }
                                }
                            })
            else:
                # For other models, keep the type field
                msg_dict = {
                    "role": message.role,
                    "content": []
                }
                
                if isinstance(message.content, str):
                    msg_dict["content"].append({
                        "type": "text",
                        "text": message.content
                    })
                
                if message.attachments:
                    for attachment in message.attachments:
                        if attachment.file_type.startswith('image/'):
                            msg_dict["content"].append({
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": attachment.file_type,
                                    "data": attachment.file_content
                                }
                            })
                        elif attachment.file_type == "text/plain":
                            msg_dict["content"].append({
                                "type": "text",
                                "text": f"\n[Attachment: {attachment.file_name}]\n{base64.b64decode(attachment.file_content).decode('utf-8')}"
                            })
            
            processed_messages.append(msg_dict)
        
        return processed_messages

    def _process_attachments(self, attachments: List[Attachment]) -> List[Dict]:
        processed_attachments = []
        
        for attachment in attachments:
            if attachment.file_type.startswith('image/'):
                processed_attachments.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": attachment.file_type,
                        "data": attachment.file_content
                    }
                })
            elif attachment.file_type == "text/plain":
                processed_attachments.append({
                    "type": "text", 
                    "text": f"\n[Attachment: {attachment.file_name}]\n{base64.b64decode(attachment.file_content).decode('utf-8')}"
                })
            else:
                processed_attachments.append({
                    "type": "text",
                    "text": f"\n[Attachment: {attachment.file_name}]"
                })
                
        return processed_attachments

    async def _handle_regular_chat(self, chat_request: ChatRequest) -> Union[StreamingResponse, JSONResponse]:
        try:
            self.logger.info(f"Processing regular chat with model: {chat_request.model}")
            self.model = chat_request.model
            
            # Process uploaded images if present
            if hasattr(chat_request, 'uploaded_images') and chat_request.uploaded_images and len(chat_request.uploaded_images) > 0:
                self.logger.info(f"Request includes {len(chat_request.uploaded_images)} uploaded images")
                
                # For multimodal models that support image processing
                if any(substr in chat_request.model for substr in ['anthropic.claude-3', 'amazon.nova', 'meta.llama3-2']):
                    self.logger.info(f"Using multimodal model capabilities for images")
                
            # Process messages
            processed_messages = self._process_messages(chat_request.conversation_history)
            
            # Build request body based on model type
            if "anthropic.claude-3" in chat_request.model:
                # Claude 3 specific format
                request_body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": chat_request.max_tokens,
                    "messages": processed_messages,
                    "temperature": chat_request.temperature,
                    "top_p": chat_request.top_p if hasattr(chat_request, 'top_p') else 0.9
                }
                if chat_request.system_prompts:
                    request_body["system"] = chat_request.system_prompts
                    
            elif "anthropic" in chat_request.model:
                # Handle older Claude versions
                request_body = self._build_anthropic_request(
                    processed_messages,
                    chat_request.max_tokens,
                    chat_request.temperature,
                    chat_request.system_prompts
                )
                
            elif "llama" in chat_request.model:
                request_body = self._build_meta_request(
                    processed_messages,
                    chat_request.max_tokens,
                    chat_request.temperature,
                    chat_request.system_prompts
                )
                
            elif "nova" in chat_request.model:
                request_body = self._build_nova_request(
                    chat_request.conversation_history,
                    chat_request.max_tokens,
                    chat_request.temperature,
                    chat_request.system_prompts
                )
                
            elif "titan" in chat_request.model:
                request_body = self._build_amazon_request(
                    processed_messages,
                    chat_request.max_tokens, 
                    chat_request.temperature,
                    chat_request.system_prompts
                )
                
            else:
                raise ValueError(f"Unsupported model: {chat_request.model}")

            # Handle streaming vs non-streaming responses  
            if chat_request.stream:
                return StreamingResponse(
                    self._stream_response(request_body, chat_request.model),
                    media_type="text/event-stream"
                )
            else:
                return await self._handle_non_streaming_response(request_body, chat_request.model)

        except Exception as e:
            self.logger.error(f"Error in regular chat handler: {str(e)}")
            self.logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={"error": str(e)}
            )

    def _build_request_body(self, model: str, messages: List[Dict], max_tokens: int, temperature: float, system_prompt: Optional[str] = None) -> Dict:
        if "anthropic" in model:
            return self._build_anthropic_request(messages, max_tokens, temperature, system_prompt)
        elif "llama" in model:
            return self._build_meta_request(messages, max_tokens, temperature, system_prompt)
        elif "titan" in model:
            return self._build_amazon_request(messages, max_tokens, temperature, system_prompt)
        elif "nova" in model:
            return {
                'schemaVersion': "messages-v1",
                'system': [{
                    'text': system_prompt or "You are a helpful AI assistant."
                }],
                'messages': messages,
                'inferenceConfig': {
                    'max_new_tokens': max_tokens,
                    'temperature': temperature,
                    'top_p': 0.9,
                    'top_k': 50,
                    'stopSequences': []
                }
            }
        else:
            raise ValueError(f"Unsupported model: {model}")

    def _build_anthropic_request(self, messages: List[Dict], max_tokens: int, temperature: float, system_prompt: Optional[str] = None) -> Dict:
        request = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature
        }
        if system_prompt:
            request["system"] = system_prompt
        return request
    
    def _build_meta_request(self, messages: List[Dict], max_tokens: int, temperature: float, system_prompt: Optional[str] = None) -> Dict:
        """
        Build request body for Meta models (Llama)
        """
        def format_llama_conversation(messages: List[Dict], system_prompt: str) -> str:
            conversation = f'<|begin_of_text|><|start_header_id|>system<|end_header_id|>{system_prompt}<|eot_id|>'
            
            for msg in messages:
                conversation += f'<|begin_of_text|><|start_header_id|>{msg["role"]}<|end_header_id|>{msg["content"][0]["text"]}<|eot_id|>'
                
            conversation += '<|start_header_id|>assistant<|end_header_id|>'
            return conversation

        # Base request parameters
        request = {
            'temperature': temperature,
            'top_p': 0.9,
            'max_gen_len': max_tokens
        }

        # Default system prompt if none provided
        system_prompt = system_prompt or "You are a helpful AI assistant."

        # Handle different Llama versions
        model_id = messages[0].get('model_id', '')  # Assuming model_id is passed in first message

        if 'llama3-3' in model_id:
            # Llama 3.3 (latest instruction-tuned model)
            request['prompt'] = format_llama_conversation(messages, system_prompt)
            
        elif 'llama3-2' in model_id:
            # Llama 3.2 (including vision models)
            request['prompt'] = format_llama_conversation(messages, system_prompt)
            
            # Handle images if present
            images = []
            for msg in messages:
                for content in msg.get('content', []):
                    if content.get('type') == 'image':
                        image_data = content.get('source', {}).get('data', '')
                        if image_data:
                            images.append(image_data)
            
            if images:
                request['images'] = images
                
        elif 'llama3-1' in model_id:
            # Llama 3.1
            if 'pretrained' in model_id:
                # Pretrained model format
                request['prompt'] = f'<|begin_of_text|>{messages[-1]["content"][0]["text"]}'
            else:
                # Instruction-tuned model format
                request['prompt'] = format_llama_conversation(messages, system_prompt)
                
        else:
            # Earlier Llama versions (2 and below)
            conversation = ''.join([
                f'<|begin_of_text|><|start_header_id|>{msg["role"]}<|end_header_id|>{msg["content"][0]["text"]}<|eot_id|>'
                for msg in messages
            ])
            request['prompt'] = f'{conversation}<|start_header_id|>assistant<|end_header_id|>'

        return request

    def _build_amazon_request(self, messages: List[Dict], max_tokens: int, temperature: float, system_prompt: Optional[str] = None) -> Dict:
        """
        Build request body for Amazon models (Titan/Nova)
        """
        # Check if using Nova model
        if any(msg.get('model', '').startswith('amazon.nova') for msg in messages):
            # Format system prompt
            system_messages = [{
                'text': system_prompt or "You are a helpful AI assistant."
            }]

            # Format previous messages
            formatted_messages = []
            for msg in messages[:-1]:  # All messages except last
                content = []
                for c in msg.get('content', []):
                    if c.get('type') == 'text':
                        content.append({
                            'text': c.get('text', '')
                        })
                    elif c.get('type') == 'image':
                        content.append({
                            'image': {
                                'format': 'jpeg',
                                'source': {
                                    'bytes': c.get('source', {}).get('data', '')
                                }
                            }
                        })
                formatted_messages.append({
                    'role': msg['role'],
                    'content': content
                })

            # Format current message with any attachments
            current_msg = messages[-1]
            current_content = []
            
            # Add text content
            if any(c.get('type') == 'text' for c in current_msg.get('content', [])):
                current_content.append({
                    'text': next(c.get('text', '') for c in current_msg.get('content', []) 
                            if c.get('type') == 'text')
                })
                
            # Add any image attachments
            for content in current_msg.get('content', []):
                if content.get('type') == 'image':
                    current_content.append({
                        'image': {
                            'format': 'jpeg',
                            'source': {
                                'bytes': content.get('source', {}).get('data', '')
                            }
                        }
                    })

            formatted_messages.append({
                'role': current_msg['role'],
                'content': current_content
            })

            return {
                'schemaVersion': "messages-v1",
                'system': system_messages,
                'messages': formatted_messages,
                'inferenceConfig': {
                    'max_new_tokens': max_tokens,
                    'temperature': temperature,
                    'top_p': 0.9,
                    'top_k': 50,
                    'stopSequences': []
                }
            }

        # Original Titan format...
        system_messages = [{
            'text': system_prompt or "You are a helpful AI assistant."
        }]

        formatted_messages = []
        for msg in messages:
            formatted_content = []
            for content in msg.get('content', []):
                if content.get('type') == 'text':
                    formatted_content.append({
                        'text': content.get('text', '')
                    })
            
            if formatted_content:
                formatted_messages.append({
                    'role': msg['role'],
                    'content': formatted_content
                })

        return {
            'schemaVersion': "messages-v1", 
            'system': system_messages,
            'messages': formatted_messages,
            'inferenceConfig': {
                'max_new_tokens': max_tokens,
                'temperature': temperature,
                'top_p': 0.9,
                'top_k': 50,
                'stopSequences': []
            }
        }

    def _build_amazon_multimodal_request(self, messages: List[Dict], max_tokens: int, temperature: float, system_prompt: Optional[str] = None) -> Dict:
        """
        Build request body for Amazon Titan Image models
        """
        last_message = messages[-1]
        text_content = next((c.get('text', '') for c in last_message.get('content', []) if c.get('type') == 'text'), '')
        image_content = next((c.get('source', {}).get('data', '') for c in last_message.get('content', []) if c.get('type') == 'image'), None)
        
        if not image_content:
            raise ValueError("No image content found in multimodal request")

        request = {
            'taskType': 'TEXT_IMAGE',
            'textToImageParams': {
                'text': text_content,
                'negativeText': "low quality, bad quality, poorly drawn, deformed, blurry, grainy",
                'images': [{
                    'format': 'jpeg',
                    'source': {
                        'bytes': image_content
                    }
                }]
            },
            'imageGenerationConfig': {
                'numberOfImages': 1,
                'height': 1024,
                'width': 1024,
                'cfgScale': 7.5,
                'seed': random.randint(0, 2147483647)
            }
        }

        return request
    
    def _build_nova_request(self, messages: List[Message], max_tokens: int, temperature: float, system_prompt: str = None) -> Dict:
        """
        Build request body for Nova models following the specified schema
        """
        # Format system prompt
        system = [{
            "text": system_prompt or "You are a helpful AI assistant."
        }]

        # Process messages into Nova format
        formatted_messages = []
        for msg in messages:
            message_content = []
            
            # Handle text content
            if msg.content:
                message_content.append({
                    "text": msg.content
                })
                
            # Handle attachments (images/videos)
            if msg.attachments:
                for attachment in msg.attachments:
                    if attachment.file_type.startswith('image/'):
                        # Map file type to Nova format
                        format_map = {
                            'image/jpeg': 'jpeg',
                            'image/png': 'png',
                            'image/gif': 'gif',
                            'image/webp': 'webp'
                        }
                        
                        message_content.append({
                            "image": {
                                "format": format_map.get(attachment.file_type, 'jpeg'),
                                "source": {
                                    "bytes": attachment.file_content
                                }
                            }
                        })
                    elif attachment.file_type.startswith('video/'):
                        # Map video format
                        format_map = {
                            'video/x-matroska': 'mkv',
                            'video/quicktime': 'mov', 
                            'video/mp4': 'mp4',
                            'video/webm': 'webm',
                            'video/3gpp': 'three_gp',
                            'video/x-flv': 'flv',
                            'video/mpeg': 'mpeg'
                        }
                        
                        message_content.append({
                            "video": {
                                "format": format_map.get(attachment.file_type, 'mp4'),
                                "source": {
                                    "bytes": attachment.file_content
                                }
                            }
                        })
            
            formatted_messages.append({
                "role": msg.role,
                "content": message_content
            })

        # Build complete request body
        request_body = {
            "schemaVersion": "messages-v1",
            "system": system,
            "messages": formatted_messages,
            "inferenceConfig": {
                "max_new_tokens": max_tokens,
                "temperature": temperature,
                "top_p": 0.9,
                "top_k": 50,
                "stopSequences": []
            }
        }

        return request_body

    async def _stream_response(self, request_body: Dict, model: str) -> AsyncGenerator[str, None]:
        try:
            response = self.bedrock_runtime.invoke_model_with_response_stream(
                modelId=model,
                body=json.dumps(request_body)
            )
            
            stream = response['body']
            
            for event in stream:
                if 'chunk' in event:
                    chunk_data = json.loads(event['chunk']['bytes'].decode())
                    if "anthropic" in model:
                        if chunk_data.get('delta', {}).get('text'):
                            yield f"data: {json.dumps({'content': chunk_data['delta']['text']})}\n\n"
                    if "nova" in model:
                        if chunk_data.get('contentBlockDelta', {}).get('delta', {}).get('text'):
                            yield f"data: {json.dumps({'content': chunk_data['contentBlockDelta']['delta']['text']})}\n\n"
                    elif "titan" in model:
                        if chunk_data.get('outputText'):
                            yield f"data: {json.dumps({'content': chunk_data['outputText']})}\n\n"
                        elif chunk_data.get('output', {}).get('text'):
                            yield f"data: {json.dumps({'content': chunk_data['output']['text']})}\n\n"
                    else:  # llama models
                        if chunk_data.get('generation'):
                            yield f"data: {json.dumps({'content': chunk_data['generation']})}\n\n"

        except Exception as e:
            self.logger.error(f"Streaming error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    async def _stream_kb_response(self, kb_id: str, question: str, model: str, max_tokens: int, temperature: float, system_prompt: Optional[str], conversation_history: List[Message]) -> AsyncGenerator[str, None]:
        try:
            # First retrieve from knowledge base
            kb_response = self.bedrock_agent.retrieve(
                knowledgeBaseId=kb_id,
                retrievalQuery={'text': question},
                retrievalConfiguration={
                    'vectorSearchConfiguration': {
                        'numberOfResults': 5
                    }
                }
            )

            if not kb_response or 'retrievalResults' not in kb_response:
                yield f"data: {json.dumps({'error': 'No results found in knowledge base'})}\n\n"
                return

            # Process retrieved documents
            citations = []
            context_chunks = []
            for idx, result in enumerate(kb_response.get('retrievalResults', []), 1):
                if result.get('content', {}).get('text'):
                    citations.append({
                        'content': result['content']['text'],
                        'location': result.get('location')
                    })
                    context_chunks.append(f"Document[{idx}]: {result['content']['text']}")

            if not context_chunks:
                yield f"data: {json.dumps({'error': 'No valid content found in knowledge base results'})}\n\n"
                return

            # Send citations first in a separate event
            yield f"data: {json.dumps({'citations': citations})}\n\n"

            # Build prompt with retrieved context
            kb_prompt = f"""
            Use the following documents to answer the question. Cite sources using [n].
            
            Sources:
            {' '.join(context_chunks)}
            
            Question: {question}
            
            Answer with citations:
            """.strip()

            # Build request body based on model type
            if "anthropic" in model:
                request_body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": max_tokens,
                    "messages": [
                        {
                            "role": "user",
                            "content": [{
                                "type": "text",
                                "text": kb_prompt
                            }]
                        }
                    ],
                    "temperature": temperature
                }
                if system_prompt:
                    request_body["system"] = system_prompt
                    
            elif "nova" in model:
                request_body = {
                    'schemaVersion': "messages-v1",
                    'system': [{
                        'text': system_prompt or "You are a helpful AI assistant."
                    }],
                    'messages': [{
                        'role': 'user',
                        'content': [{
                            'text': kb_prompt
                        }]
                    }],
                    'inferenceConfig': {
                        'max_new_tokens': max_tokens,
                        'temperature': temperature,
                        'top_p': 0.9,
                        'top_k': 50,
                        'stopSequences': []
                    }
                }
                
            elif "llama" in model:
                request_body = {
                    "prompt": f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>{system_prompt or 'You are a helpful AI assistant.'}<|eot_id|><|begin_of_text|><|start_header_id|>user<|end_header_id|>{kb_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>",
                    "max_gen_len": max_tokens,
                    "temperature": temperature,
                    "top_p": 0.9
                }
                
            elif "titan" in model:
                request_body = {
                    "schemaVersion": "messages-v1",
                    "system": [{
                        "text": system_prompt or "You are a helpful AI assistant."
                    }],
                    "messages": [{
                        "role": "user",
                        "content": [{
                            "text": kb_prompt
                        }]
                    }],
                    "inferenceConfig": {
                        "max_new_tokens": max_tokens,
                        "temperature": temperature,
                        "top_p": 0.9,
                        "top_k": 50,
                        "stopSequences": []
                    }
                }
            else:
                raise ValueError(f"Unsupported model: {model}")

            # Stream response
            response = self.bedrock_runtime.invoke_model_with_response_stream(
                modelId=model,
                body=json.dumps(request_body)
            )

            if not response or 'body' not in response:
                yield f"data: {json.dumps({'error': 'No response from model'})}\n\n"
                return

            stream = response['body']
            for event in stream:
                if 'chunk' in event:
                    try:
                        chunk_data = json.loads(event['chunk']['bytes'].decode())
                        
                        if "anthropic" in model:
                            if chunk_data.get('delta', {}).get('text'):
                                yield f"data: {json.dumps({'content': chunk_data['delta']['text']})}\n\n"
                        elif "nova" in model:
                            if chunk_data.get('contentBlockDelta', {}).get('delta', {}).get('text'):
                                yield f"data: {json.dumps({'content': chunk_data['contentBlockDelta']['delta']['text']})}\n\n"
                        elif "titan" in model:
                            if chunk_data.get('outputText'):
                                yield f"data: {json.dumps({'content': chunk_data['outputText']})}\n\n"
                            elif chunk_data.get('output', {}).get('text'):
                                yield f"data: {json.dumps({'content': chunk_data['output']['text']})}\n\n"
                        elif "llama" in model:
                            if chunk_data.get('generation'):
                                yield f"data: {json.dumps({'content': chunk_data['generation']})}\n\n"
                        
                    except json.JSONDecodeError as e:
                        self.logger.error(f"Failed to decode chunk: {e}")
                        continue

        except Exception as e:
            error_message = f"KB streaming error: {str(e)}"
            self.logger.error(error_message)
            self.logger.error(traceback.format_exc())
            yield f"data: {json.dumps({'error': error_message})}\n\n"

    async def _handle_kb_non_streaming(
        self,
        kb_id: str,
        question: str,
        model: str,
        max_tokens: int,
        temperature: float,
        system_prompt: Optional[str],
        conversation_history: List[Dict]
    ) -> JSONResponse:
        """
        Handle non-streaming knowledge base query responses
        """
        try:
            # Retrieve relevant documents from knowledge base
            kb_response = self.bedrock_agent.retrieve(
                knowledgeBaseId=kb_id,
                retrievalQuery={
                    'text': question
                },
                retrievalConfiguration={
                    'vectorSearchConfiguration': {
                        'numberOfResults': 5,
                        'overrideSearchType': 'HYBRID'
                    }
                }
            )

            # Process retrieved documents
            citations = []
            context_chunks = []
            
            for idx, result in enumerate(kb_response.get('retrievalResults', []), 1):
                if result.get('content', {}).get('text'):
                    citations.append({
                        'content': result['content']['text'],
                        'location': result.get('location')
                    })
                    context_chunks.append(f"Document[{idx}]: {result['content']['text']}")

            if not context_chunks:
                return JSONResponse(
                    content={
                        "content": "No relevant information found in the knowledge base.",
                        "citations": []
                    }
                )

            # Build prompt with retrieved context
            prompt = (
                "Use the following documents to answer the question. When citing information, "
                "use [n] where n is the document number.\n\n"
                f"Sources:\n"
                f"{chr(10).join(context_chunks)}\n\n"
                f"Question: {question}\n\n"
                "Answer with citations:"
            ).strip()

            # Build model request based on provider
            if "anthropic" in model:
                request_body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": max_tokens,
                    "messages": [
                        {
                            "role": "user",
                            "content": [{
                                "type": "text",
                                "text": prompt
                            }]
                        }
                    ],
                    "temperature": temperature
                }
                if system_prompt:
                    request_body["system"] = system_prompt

            elif "llama" in model:
                request_body = {
                    "prompt": f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>{system_prompt or 'You are a helpful AI assistant.'}<|eot_id|><|begin_of_text|><|start_header_id|>user<|end_header_id|>{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>",
                    "max_gen_len": max_tokens,
                    "temperature": temperature,
                    "top_p": 0.9
                }

            elif "titan" in model:
                request_body = {
                    "schemaVersion": "messages-v1",
                    "system": [{
                        "text": system_prompt or "You are a helpful AI assistant."
                    }],
                    "messages": [
                        {
                            "role": "user",
                            "content": [{
                                "text": prompt
                            }]
                        }
                    ],
                    "inferenceConfig": {
                        "max_new_tokens": max_tokens,
                        "temperature": temperature,
                        "top_p": 0.9,
                        "top_k": 50,
                        "stopSequences": []
                    }
                }
            else:
                raise ValueError(f"Unsupported model: {model}")

            # Invoke model
            response = self.bedrock_runtime.invoke_model(
                modelId=model,
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            
            # Extract content based on model provider
            if "anthropic" in model:
                if model.startswith("anthropic.claude-3"):
                    content = response_body.get('content', [])[0].get('text', '') if response_body.get('content') else ''
                else:
                    content = response_body.get('completion', '')
            elif "llama" in model:
                content = response_body.get('generation', '')
            elif "titan" in model:
                content = (response_body.get('output', {}).get('text', '') or 
                        response_body.get('outputText', '') or
                        response_body.get('results', [{}])[0].get('outputText', ''))
            else:
                logger.error(f"Unsupported model: {model}")
                raise ValueError(f"Unsupported model: {model}")

            return JSONResponse(content={
                "content": content,
                "citations": citations,
                "metadata": {
                    "citations": citations,
                    "guardrailAction": None
                }
            })

        except Exception as e:
            logger.error(f"Error in KB non-streaming handler: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Knowledge base query failed: {str(e)}"
            )        

chat_handler = ChatHandler()

@router.post("/chat")
async def chat(request: ChatRequest, token_data: dict = Depends(verify_token)):
    """
    Process chat request with potential image uploads
    """
    try:
        # Convert uploaded images (if any) to message attachments
        if hasattr(request, 'uploaded_images') and request.uploaded_images:
            # Create attachments from the uploaded images
            attachments = []
            for idx, image_data_url in enumerate(request.uploaded_images):
                # Parse the data URL to extract content type and base64 data
                parts = image_data_url.split(',')
                if len(parts) != 2:
                    continue
                    
                header, image_base64 = parts
                content_type = header.split(';')[0].split(':')[1] if ':' in header else 'image/jpeg'
                
                # Create an attachment
                attachment = Attachment(
                    file_name=f"uploaded_image_{idx}.jpg",
                    file_type=content_type,
                    file_size=len(image_base64),
                    file_content=image_base64
                )
                attachments.append(attachment)
            
            # If we have attachments and history, add them to the last user message
            if attachments and request.conversation_history:
                last_msg = request.conversation_history[-1]
                if last_msg.role == 'user':
                    last_msg.attachments = attachments
                    
                    # For multimodal models, we need to ensure the message indicates it contains images
                    last_msg.type = MessageType.MULTIMODAL 
        
        # Process the request with the updated conversation history
        return await chat_handler.chat(request, token_data)
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
