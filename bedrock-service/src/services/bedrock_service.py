import json
from typing import Dict, Any, AsyncGenerator
from config import bedrock_runtime
from utils import format_chunk
import time

async def stream_response(request_body: Dict[str, Any], model: str) -> AsyncGenerator[str, None]:
    response = bedrock_runtime.invoke_model_with_response_stream(
        modelId=model,
        body=json.dumps(request_body)
    )

    for event in response.get('body'):
        chunk = json.loads(event['chunk']['bytes'])
        formatted_chunk = format_chunk(chunk, model)
        if formatted_chunk:
            yield json.dumps(formatted_chunk) + "\n"

    yield json.dumps({
        "id": f"chatcmpl-{int(time.time())}",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "delta": {},
                "finish_reason": "stop"
            }
        ]
    }) + "\n"

async def non_streaming_response(request_body: Dict[str, Any], model: str) -> Dict[str, Any]:
    response = bedrock_runtime.invoke_model(
        modelId=model,
        body=json.dumps(request_body)
    )
    response_body = json.loads(response['body'].read())
    
    if 'anthropic' in model.lower():
        content = response_body.get('content', '')
    elif 'llama' in model.lower():
        content = response_body.get('generation', '')
    elif 'mistral' in model.lower():
        content = response_body.get('outputs', [{}])[0].get('text', '')
    else:
        raise ValueError(f"Unsupported model: {model}")
    
    return {
        "id": f"chatcmpl-{int(time.time())}",
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
        ]
    }