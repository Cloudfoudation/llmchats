import requests
import json
import time
from typing import Dict, Any, List, Tuple

def verify_openai_stream_response(chunk_data: Dict[str, Any]) -> Tuple[bool, str]:
    """Verify that the streaming response chunk matches OpenAI format"""
    required_fields = ['id', 'object', 'created', 'model', 'choices']
    
    # Check required fields
    for field in required_fields:
        if field not in chunk_data:
            return False, f"Missing required field: {field}"
    
    # Verify choices structure
    if not isinstance(chunk_data['choices'], list):
        return False, "choices must be a list"
    
    for choice in chunk_data['choices']:
        if 'index' not in choice:
            return False, "Missing index in choice"
        if 'delta' not in choice:
            return False, "Missing delta in choice"
            
    return True, "Valid chunk"

def test_openai_compatibility(
    token: str, 
    prompt: str, 
    models: List[str],
    max_retries: int = 1, 
    retry_delay: int = 5
):
    """
    Test OpenAI compatibility endpoints for both streaming and non-streaming responses
    """
    url = 'http://localhost:8000/v1/chat/completions'
    headers = {
        'X-Api-Key': f'{token}',
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    results = {}
    successful_models = []
    failed_models = []

    for model in models:
        print(f"\n{'='*50}")
        print(f"Testing OpenAI compatibility for model: {model}")
        print(f"{'='*50}")

        # Test both streaming and non-streaming
        for stream_mode in [True, False]:
            print(f"\nTesting {'streaming' if stream_mode else 'non-streaming'} mode")
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": stream_mode,
                "temperature": 0.7,
                "max_tokens": 4096
            }

            retry_count = 0
            while retry_count < max_retries:
                try:
                    print(f"Attempt {retry_count + 1}/{max_retries}...")
                    
                    if stream_mode:
                        # Streaming request
                        headers['Accept'] = 'text/event-stream'
                        response = requests.post(url, headers=headers, json=payload, stream=True)
                        
                        if response.status_code == 200:
                            full_response = ""
                            chunks_received = 0
                            valid_stream = True

                            print("Receiving stream:")
                            for line in response.iter_lines():
                                if line:
                                    try:
                                        # Decode the line and remove "data: " prefix
                                        line = line.decode('utf-8')
                                        if line.startswith('data: '):
                                            data = line[6:]  # Remove "data: " prefix
                                            
                                            if data == "[DONE]":
                                                break
                                                
                                            try:
                                                chunk_data = json.loads(data)
                                                is_valid, validation_message = verify_openai_stream_response(chunk_data)
                                                
                                                if is_valid:
                                                    chunks_received += 1
                                                    if 'choices' in chunk_data and chunk_data['choices']:
                                                        content = chunk_data['choices'][0].get('delta', {}).get('content', '')
                                                        if content:
                                                            full_response += content
                                                            print(content, end='', flush=True)
                                                else:
                                                    print(f"\n⚠️ Invalid chunk: {validation_message}")
                                                    print(f"Chunk data: {chunk_data}")
                                            except json.JSONDecodeError as e:
                                                print(f"\n⚠️ Invalid JSON in chunk: {data}")
                                                print(f"Error: {str(e)}")
                                                
                                    except Exception as e:
                                        print(f"\n⚠️ Error processing line: {str(e)}")
                                        continue

                            print("\n")
                            if chunks_received > 0:
                                results[f"{model}_stream"] = {
                                    'status': 'success',
                                    'chunks_received': chunks_received,
                                    'full_response': full_response
                                }
                                successful_models.append(f"{model} (streaming)")
                                print(f"✅ Streaming Success! Received {chunks_received} chunks")
                                break
                            
                    else:
                        # Non-streaming request
                        headers.pop('Accept', None)
                        response = requests.post(url, headers=headers, json=payload)
                        
                        if response.status_code == 200:
                            response_data = response.json()
                            results[f"{model}_non_stream"] = {
                                'status': 'success',
                                'response': response_data
                            }
                            successful_models.append(f"{model} (non-streaming)")
                            print("✅ Non-streaming Success!")
                            print("Response:", json.dumps(response_data, indent=2))
                            break
                        
                    if response.status_code != 200:
                        print(f"❌ Error: Status code {response.status_code}")
                        if retry_count == max_retries - 1:
                            error_type = "stream" if stream_mode else "non_stream"
                            results[f"{model}_{error_type}"] = {
                                'status': 'error',
                                'error': f'Status code: {response.status_code}',
                                'message': response.text
                            }
                            failed_models.append((f"{model} ({'streaming' if stream_mode else 'non-streaming'})", 
                                               f"HTTP Error {response.status_code}"))

                except Exception as e:
                    print(f"❌ Exception: {str(e)}")
                    if retry_count == max_retries - 1:
                        error_type = "stream" if stream_mode else "non_stream"
                        results[f"{model}_{error_type}"] = {
                            'status': 'error',
                            'error': str(e)
                        }
                        failed_models.append((f"{model} ({'streaming' if stream_mode else 'non-streaming'})", 
                                           f"Exception: {str(e)}"))

                if retry_count < max_retries - 1:
                    print(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                retry_count += 1

    return results, successful_models, failed_models

# Example usage:
if __name__ == "__main__":
    # Replace with your actual values
    TOKEN = ""
    PROMPT = "Which is greater, 3.11 or 3.2?"
    MODELS = [
        "arn:aws:sagemaker:us-west-2:808491074893:endpoint/deepseek-llm-r1-distill-llama-70b",
        "arn:aws:sagemaker:us-west-2:808491074893:endpoint/deepseek-llm-r1-distill-qwen-32b",
        # "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "meta.llama3-1-70b-instruct-v1:0"
    ]
    
    results, successful, failed = test_openai_compatibility(TOKEN, PROMPT, MODELS)
    
    print("\n=== Final Results ===")
    print("\nSuccessful tests:")
    for model in successful:
        print(f"✅ {model}")
    
    print("\nFailed tests:")
    for model, error in failed:
        print(f"❌ {model}: {error}")