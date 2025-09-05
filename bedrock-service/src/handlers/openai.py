import os
from fastapi import HTTPException, Depends, APIRouter
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
import boto3
import json
import time
from botocore.exceptions import ClientError
import logging
from fastapi.responses import StreamingResponse
import traceback
from handlers.auth import verify_token

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Dict[str, str]]
    stream: Optional[bool] = False
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 1.0
    n: Optional[int] = 1
    max_tokens: Optional[int] = None
    presence_penalty: Optional[float] = 0
    frequency_penalty: Optional[float] = 0

def format_claude_messages(messages):
    formatted_messages = []
    system_message = None
    
    for message in messages:
        if message["role"] == "system":
            system_message = message["content"]
        elif message["role"] in ["user", "assistant"]:
            formatted_messages.append({
                "role": message["role"],
                "content": [{"type": "text", "text": message["content"]}]
            })
    
    return system_message, formatted_messages

def format_llama_messages(messages):
    formatted_prompt = "<|begin_of_text|>"
    for message in messages:
        role = message.get('role', '')
        content = message.get('content', '')
        formatted_prompt += f"\n<|start_header_id|>{role}<|end_header_id|>\n{content}\n<|eot_id|>"
    formatted_prompt += "\n<|start_header_id|>assistant<|end_header_id|>"
    return formatted_prompt

def format_deepseek_messages(messages):
    formatted_prompt = "<｜begin▁of▁sentence｜>"
    system_message = None
    
    for message in messages:
        if message["role"] == "system":
            system_message = message["content"]
        elif message["role"] == "user":
            formatted_prompt += f"<｜User｜>{message['content']}"
        elif message["role"] == "assistant":
            formatted_prompt += f"<｜Assistant｜>{message['content']}"
    
    if system_message:
        formatted_prompt = formatted_prompt.replace("<｜begin▁of▁sentence｜>", f"<｜begin▁of▁sentence｜>{system_message}")
        
    formatted_prompt += "<｜Assistant｜>"
    return formatted_prompt

def generate_streaming_response(response, model, stream=True):
    chat_id = f"chatcmpl-{os.urandom(12).hex()}"
    created_time = int(time.time())
    system_fingerprint = f"fp_{os.urandom(5).hex()}"
    is_sagemaker_endpoint = "sagemaker" in model.lower()

    yield "data: " + json.dumps({
        "id": chat_id,
        "object": "chat.completion.chunk",
        "created": created_time,
        "model": model,
        "system_fingerprint": system_fingerprint,
        "choices": [
            {
                "index": 0,
                "delta": {"role": "assistant"},
                "finish_reason": None
            }
        ]
    }) + "\n\n"

    try:
        if stream:
            for event in response['body']:
                chunk = json.loads(event['chunk']['bytes'].decode())
                    
                if "claude-3" in model.lower():
                    if chunk['type'] == 'content_block_delta':
                        content = chunk['delta'].get('text', '')
                        if content:
                            yield "data: " + json.dumps({
                                "id": chat_id,
                                "object": "chat.completion.chunk",
                                "created": created_time,
                                "model": model,
                                "system_fingerprint": system_fingerprint,
                                "choices": [
                                    {
                                        "index": 0,
                                        "delta": {"content": content},
                                        "finish_reason": None
                                    }
                                ]
                            }) + "\n\n"
                elif is_sagemaker_endpoint:
                    if 'token' in chunk:
                            content = chunk['token']['text']
                            if content:
                                yield "data: " + json.dumps({
                                    "id": chat_id,
                                    "object": "chat.completion.chunk",
                                    "created": created_time,
                                    "model": model,
                                    "system_fingerprint": system_fingerprint,
                                    "choices": [
                                        {
                                            "index": 0,
                                            "delta": {"content": content},
                                            "finish_reason": None
                                        }
                                    ]
                                }) + "\n\n"
                elif "llama" in model.lower():
                    if 'generation' in chunk:
                        content = chunk['generation']
                        if content:
                            yield "data: " + json.dumps({
                                "id": chat_id,
                                "object": "chat.completion.chunk",
                                "created": created_time,
                                "model": model,
                                "system_fingerprint": system_fingerprint,
                                "choices": [
                                    {
                                        "index": 0,
                                        "delta": {"content": content},
                                        "finish_reason": None
                                    }
                                ]
                            }) + "\n\n"
                else:
                    if 'completion' in chunk:
                        content = chunk['completion']
                        if content:
                            yield "data: " + json.dumps({
                                "id": chat_id,
                                "object": "chat.completion.chunk",
                                "created": created_time,
                                "model": model,
                                "system_fingerprint": system_fingerprint,
                                "choices": [
                                    {
                                        "index": 0,
                                        "delta": {"content": content},
                                        "finish_reason": None
                                    }
                                ]
                            }) + "\n\n"
        else:
            content = json.loads(response['body'].read())
            if "claude-3" in model.lower():
                content = content['content'][0]['text']
            elif "llama" in model.lower():
                content = content['generation']
            else:
                content = content['completion']
            yield "data: " + json.dumps({
                "id": chat_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": model,
                "system_fingerprint": system_fingerprint,
                "choices": [
                    {
                        "index": 0,
                        "delta": {"content": content},
                        "finish_reason": None
                    }
                ]
            }) + "\n\n"

        yield "data: " + json.dumps({
            "id": chat_id,
            "object": "chat.completion.chunk",
            "created": created_time,
            "model": model,
            "system_fingerprint": system_fingerprint,
            "choices": [
                {
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop"
                }
            ]
        }) + "\n\n"

        yield "data: [DONE]\n\n"
    except ClientError as e:
        print(f"Bedrock ClientError: {e}")
        yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
    except Exception as e:
        print(f"Error in generate_streaming_response: {str(e)}")
        yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"


bedrock = boto3.client('bedrock-runtime', region_name='us-west-2')

@router.post("/v1/chat/completions")
async def create_completion(request: ChatCompletionRequest, token_data: dict = Depends(verify_token)):
    try:
        user_id = token_data["user_id"]
        role = token_data["role"]

        model = request.model
        if "deepseek" in model.lower():
            model = f"arn:aws:sagemaker:{os.getenv('AWS_BEDROCK_REGION')}:{os.getenv('AWS_ACCOUNT_ID')}:endpoint/{model}"

        messages = request.messages
        stream = request.stream
        
        # Set default max_tokens
        max_tokens = request.max_tokens or 4096
        
        is_sagemaker_endpoint = "sagemaker" in model.lower()
        
        if "llama" in model.lower() or is_sagemaker_endpoint:
            max_tokens = min(max_tokens, 2048)
        else:
            max_tokens = min(max_tokens, 4096)
        
        if "claude" in model.lower():
            system_message, formatted_messages = format_claude_messages(messages)
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": request.temperature,
                "messages": formatted_messages,
            }
            if system_message:
                body["system"] = system_message
        elif is_sagemaker_endpoint:
            formatted_prompt = format_deepseek_messages(messages)
            top_p = min(max(request.top_p or 0.9, 0.01), 0.99)
            body = {
                "inputs": formatted_prompt,
                "parameters": {
                    "max_new_tokens": max_tokens,
                    "temperature": min(max(request.temperature or 0.7, 0.01), 2.0),
                    "top_p": top_p,
                    "do_sample": True,
                    "return_full_text": False,
                    "stream": stream
                }
            }
        elif "llama" in model.lower():
            formatted_prompt = format_llama_messages(messages)
            body = {
                "prompt": formatted_prompt,
                "max_gen_len": max_tokens,
                "temperature": request.temperature,
                "top_p": request.top_p,
            }
        else:
            raise ValueError(f"Unsupported model: {model}")

        body = json.dumps(body)

        if stream:
            print (body)
            response = bedrock.invoke_model_with_response_stream(
                modelId=model,
                body=body,
                accept='application/json',
                contentType='application/json'
            )

            return StreamingResponse(
                generate_streaming_response(response, model, stream),
                media_type="text/event-stream",
                headers={
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Transfer-Encoding": "chunked",
                }
            )           
        else:
            response = bedrock.invoke_model(
                modelId=model,
                body=body
            )
            # Process non-streaming response
            content = json.loads(response['body'].read())
            if "claude-3" in model.lower():
                content = content['content'][0]['text']
            elif is_sagemaker_endpoint:
                content = content['generated_text']
            elif "llama" in model.lower():
                content = content['generation']
            else:
                content = content['completion']
            
            # Prepare OpenAI-like response
            openai_response = {
                "id": f"chatcmpl-{os.urandom(12).hex()}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": model,
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": content
                        },
                        "finish_reason": "stop"
                    }
                ],
                "usage": {
                    "prompt_tokens": -1,
                    "completion_tokens": -1,
                    "total_tokens": -1
                }
            }
            
            return openai_response

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))