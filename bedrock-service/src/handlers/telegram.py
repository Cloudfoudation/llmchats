from typing import Dict
import aiohttp
import logging
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, JSONResponse
import traceback
import json
import boto3
import os
from botocore.config import Config
from models.models import ChatRequest
from handlers.chat import chat
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()

class TelegramHandler:
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
        Fetch bot configuration from DynamoDB agents table
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
                    detail="Bot configuration not found"
                )

            item = response['Item']

            # Extract model parameters
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

            # Convert to Python types
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
                'knowledgeBaseId': item.get('knowledgeBaseId'),
                'telegramToken': item.get('telegramToken')
            }

            # Map model parameters to chat request format
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

    async def send_telegram_chat_action(self, token: str, chat_id: int, action: str):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"https://api.telegram.org/bot{token}/sendChatAction",
                json={
                    "chat_id": chat_id,
                    "action": action
                }
            ) as response:
                return await response.json()

    async def send_telegram_message(self, token: str, chat_id: int, text: str):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text
                }
            ) as response:
                return await response.json()

    async def process_streaming_response(self, response: StreamingResponse, telegram_token: str, chat_id: int):
        buffer = ""
        paragraph = ""
        
        async for chunk in response.body_iterator:
            try:
                # Handle both string and bytes chunks
                if isinstance(chunk, bytes):
                    chunk_str = chunk.decode('utf-8')
                else:
                    chunk_str = chunk
                    
                # Extract content from the JSON data format
                if chunk_str.startswith('data: '):
                    try:
                        # Remove 'data: ' prefix and parse JSON
                        json_str = chunk_str.replace('data: ', '').strip()
                        chunk_data = json.loads(json_str)
                        
                        # Extract the content
                        if 'content' in chunk_data:
                            content = chunk_data['content']
                            buffer += content
                            paragraph += content
                            
                            # Send to Telegram if we have a complete paragraph
                            if '\n\n' in paragraph:
                                paragraphs = paragraph.split('\n\n')
                                # Send all complete paragraphs except the last one
                                for p in paragraphs[:-1]:
                                    if p.strip():
                                        await self.send_telegram_message(telegram_token, chat_id, p.strip())
                                # Keep the last partial paragraph
                                paragraph = paragraphs[-1]
                            
                            # If buffer gets too long, send it and reset
                            if len(buffer) >= 3000:
                                if buffer.strip():
                                    await self.send_telegram_message(telegram_token, chat_id, buffer.strip())
                                buffer = ""
                                paragraph = ""
                                
                    except json.JSONDecodeError:
                        self.logger.error(f"Failed to parse JSON: {chunk_str}")
                        continue
                        
            except Exception as e:
                self.logger.error(f"Error processing chunk: {str(e)}")
                self.logger.error(traceback.format_exc())
                continue
        
        # Send any remaining content
        if paragraph.strip():
            await self.send_telegram_message(telegram_token, chat_id, paragraph.strip())

telegram_handler = TelegramHandler()

@router.post("/telegram/{user_id}/{bot_id}")
async def telegram_webhook(user_id: str, bot_id: str, request: Request):
    try:
        # Get the bot configuration 
        bot_config = await telegram_handler.get_bot_configuration(bot_id, user_id)
        telegram_token = bot_config.get('telegramToken')
        
        if not telegram_token:
            raise HTTPException(status_code=404, detail="Telegram token not found for this bot")

        # Parse the incoming Telegram message
        telegram_update = await request.json()
        message = telegram_update.get('message', {})
        chat_id = message.get('chat', {}).get('id')
        text = message.get('text', '')
        
        # Check for images in the message
        photos = message.get('photo', [])
        uploaded_images = []
        
        if not chat_id:
            return {"ok": True}
        
        # Start typing indicator
        await telegram_handler.send_telegram_chat_action(telegram_token, chat_id, "typing")

        # Process photos if present
        if photos:
            # Get the largest photo (last in the array)
            largest_photo = photos[-1]
            file_id = largest_photo.get('file_id')
            
            if file_id:
                try:
                    # Get file path from Telegram
                    async with aiohttp.ClientSession() as session:
                        async with session.get(
                            f"https://api.telegram.org/bot{telegram_token}/getFile",
                            params={"file_id": file_id}
                        ) as response:
                            file_info = await response.json()
                            if file_info.get("ok") and "result" in file_info:
                                file_path = file_info["result"]["file_path"]
                                
                                # Download the file
                                async with session.get(
                                    f"https://api.telegram.org/file/bot{telegram_token}/{file_path}"
                                ) as img_response:
                                    if img_response.status == 200:
                                        img_data = await img_response.read()
                                        
                                        # Convert to base64
                                        import base64
                                        content_type = "image/jpeg"
                                        if file_path.endswith(".png"):
                                            content_type = "image/png"
                                        elif file_path.endswith(".webp"):
                                            content_type = "image/webp"
                                        
                                        base64_image = f"data:{content_type};base64,{base64.b64encode(img_data).decode('utf-8')}"
                                        uploaded_images.append(base64_image)
                                        logger.info(f"Successfully processed image from Telegram")
                                    else:
                                        logger.error(f"Failed to download image: {img_response.status}")
                except Exception as e:
                    logger.error(f"Error downloading image: {str(e)}")
                    logger.error(traceback.format_exc())
        
        if not text and not uploaded_images:
            return {"ok": True}
            
        # If no text but has image, set a default prompt
        if not text and uploaded_images:
            text = "Please analyze this image."

        try:
            # Create chat request with proper model parameters from bot config
            model_params = bot_config.get('modelParams', {})
            
            # Check if model supports image processing
            model_id = model_params.get('modelId', '')
            supports_images = any(substr in model_id for substr in ['anthropic.claude-3', 'amazon.nova', 'meta.llama3-2'])
            
            if uploaded_images and not supports_images:
                # If model doesn't support images, inform the user
                await telegram_handler.send_telegram_message(
                    telegram_token, 
                    chat_id, 
                    "I'm sorry, but this bot doesn't use a model that supports image analysis. Please try with a text message instead."
                )
                return {"ok": True}
            
            chat_request = ChatRequest(
                conversation_history=[{"role": "user", "content": text}],
                model=model_params.get('modelId', 'anthropic.claude-3-sonnet-20240229-v1:0'),
                stream=True,
                temperature=float(model_params.get('temperature', 0.7)),
                max_tokens=int(model_params.get('maxTokens', 4096)),
                system_prompts=bot_config.get('systemPrompt', ''),
                modelParams=model_params,
                botId=bot_id,  # This is key - chat handler uses this to get KB config
                # Add uploaded images if present
                uploaded_images=uploaded_images
            )

            # Add any additional model-specific parameters
            if model_params.get('stopSequences'):
                chat_request.stop_sequences = model_params['stopSequences']
            if model_params.get('anthropicVersion'):
                chat_request.anthropic_version = model_params['anthropicVersion']
            if model_params.get('topP'):
                chat_request.top_p = model_params['topP']

            # Get response from chat handler
            response = await chat(chat_request, {"user_id": user_id, "role": "user"})

            # Process streaming response
            if isinstance(response, StreamingResponse):
                await telegram_handler.process_streaming_response(response, telegram_token, chat_id)
                return {"ok": True}
            else:
                # Handle non-streaming response
                content = None
                citations = None
                
                if isinstance(response, JSONResponse):
                    response_data = response.body.decode()
                    response_json = json.loads(response_data)
                    
                    # Handle KB response format
                    if bot_config.get('knowledgeBaseId'):
                        content = response_json.get('content', '')
                        citations = response_json.get('metadata', {}).get('citations', [])
                    else:
                        # Handle regular model responses
                        if "anthropic" in model_params.get('modelId', ''):
                            content = response_json.get('completion', '')
                        elif "nova" in model_params.get('modelId', ''):
                            content = response_json.get('output', {}).get('message', {}).get('content', '')
                        elif "llama" in model_params.get('modelId', ''):
                            content = response_json.get('generation', '')
                        elif "titan" in model_params.get('modelId', ''):
                            content = (response_json.get('output', {}).get('text', '') or 
                                    response_json.get('outputText', ''))

                if content:
                    # Send main content
                    paragraphs = content.split('\n\n')
                    for p in paragraphs:
                        if p.strip():
                            await telegram_handler.send_telegram_message(telegram_token, chat_id, p.strip())
                    
                    # Send citations if present
                    if citations:
                        citation_text = "\n\nSources:\n" + "\n".join([
                            f"[{i+1}] {citation.get('content', '')} ({citation.get('location', '')})"
                            for i, citation in enumerate(citations)
                        ])
                        await telegram_handler.send_telegram_message(telegram_token, chat_id, citation_text)

            return {"ok": True}

        finally:
            # Stop typing indicator
            await telegram_handler.send_telegram_chat_action(telegram_token, chat_id, "")

    except Exception as e:
        logger.error(f"Error in Telegram webhook: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )
