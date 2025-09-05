import requests
import json
import time
import datetime
import sseclient

# List of chat-capable Bedrock models (same as test1.py)
CHAT_MODELS = [
    "us.amazon.nova-lite-v1:0",
    "us.amazon.nova-micro-v1:0",
    "us.amazon.nova-pro-v1:0",
    # "amazon.titan-text-express-v1",
    "anthropic.claude-v2:1",
    "anthropic.claude-v2",
    "anthropic.claude-3-haiku-20240307-v1:0",
    # "anthropic.claude-3-opus-20240229-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-instant-v1",
    # "anthropic.claude-instant-v1:2",
    # "anthropic.claude-v2:0",
    "meta.llama3-8b-instruct-v1:0",
    "meta.llama3-70b-instruct-v1:0",
    "meta.llama3-1-8b-instruct-v1:0",
    "meta.llama3-1-70b-instruct-v1:0",
    "meta.llama3-1-405b-instruct-v1:0",
    "us.meta.llama3-2-1b-instruct-v1:0",
    "us.meta.llama3-2-3b-instruct-v1:0",
    "us.meta.llama3-2-11b-instruct-v1:0",
    "us.meta.llama3-2-90b-instruct-v1:0",
    "us.meta.llama3-3-70b-instruct-v1:0"
]

def verify_stream_response(response_chunk):
    """
    Verify if a streaming response chunk is valid
    Returns: (bool, str) - (is_valid, error_message)
    """
    try:
        if not response_chunk:
            return False, "Empty response chunk"

        # Debug logging
        print(f"\nDebug - Response chunk structure: {json.dumps(response_chunk, indent=2)}")

        if 'error' in response_chunk:
            return False, f"Error in response chunk: {response_chunk['error']}"

        # Handle Nova model responses
        if 'chunk' in response_chunk:
            chunk_content = response_chunk['chunk'].get('bytes', b'').decode()
            try:
                chunk_data = json.loads(chunk_content)
                if chunk_data.get('contentBlockDelta', {}).get('delta', {}).get('text'):
                    return True, "Response chunk valid"
            except json.JSONDecodeError:
                pass

        # Handle content field directly
        if 'content' in response_chunk:
            if response_chunk['content']:
                return True, "Response chunk valid"

        # Handle delta field directly
        if 'delta' in response_chunk:
            if response_chunk['delta'].get('text'):
                return True, "Response chunk valid"

        # Handle outputText field (Titan)
        if 'outputText' in response_chunk:
            if response_chunk['outputText']:
                return True, "Response chunk valid"

        # Handle generation field (Llama)
        if 'generation' in response_chunk:
            if response_chunk['generation']:
                return True, "Response chunk valid"

        return False, f"Missing or invalid content in chunk: {str(response_chunk)}"

    except Exception as e:
        return False, f"Verification error: {str(e)}\nChunk: {str(response_chunk)}"

def test_bedrock_streaming(token, prompt, max_retries=1, retry_delay=5):
    url = 'http://localhost:8000/chat'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
    }
    results = {}
    successful_models = []
    failed_models = []

    for model in CHAT_MODELS:
        print(f"\n{'='*50}")
        print(f"Testing streaming for model: {model}")
        print(f"{'='*50}")

        payload = {
            "conversation_history": [
                {
                    "role": "user",
                    "content": prompt,
                    "type": "text"
                }
            ],
            "model": model,
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 4096,
            "modelParams": {
                "modelId": model,
                "temperature": 0.7,
                "maxTokens": 4096,
                "topP": 0.9
            }
        }

        retry_count = 0
        while retry_count < max_retries:
            try:
                print(f"Attempt {retry_count + 1}/{max_retries}...")
                response = requests.post(url, headers=headers, json=payload, stream=True)
                
                if response.status_code == 200:
                    client = sseclient.SSEClient(response)
                    full_response = ""
                    chunks_received = 0
                    valid_stream = True

                    print("Receiving stream:")
                    for event in client.events():
                        if event.data:
                            try:
                                chunk_data = json.loads(event.data)
                                is_valid, validation_message = verify_stream_response(chunk_data)
                                
                                if is_valid:
                                    chunks_received += 1
                                    if 'delta' in chunk_data:
                                        full_response += chunk_data['delta']
                                        print(chunk_data['delta'], end='', flush=True)
                                else:
                                    valid_stream = False
                                    print(f"\n⚠️ Invalid chunk: {validation_message}")
                                    break
                            except json.JSONDecodeError:
                                valid_stream = False
                                print(f"\n⚠️ Invalid JSON in chunk")
                                break

                    print("\n")
                    if valid_stream and chunks_received > 0:
                        results[model] = {
                            'status': 'success',
                            'chunks_received': chunks_received,
                            'full_response': full_response
                        }
                        successful_models.append(model)
                        print(f"✅ Success! Received {chunks_received} valid chunks")
                        break
                    else:
                        if retry_count == max_retries - 1:
                            results[model] = {
                                'status': 'stream_error',
                                'error': 'Invalid or empty stream'
                            }
                            failed_models.append((model, "Stream validation failed"))
                
                else:
                    print(f"❌ Error: Status code {response.status_code}")
                    if retry_count == max_retries - 1:
                        results[model] = {
                            'status': 'error',
                            'error': f'Status code: {response.status_code}',
                            'message': response.text
                        }
                        failed_models.append((model, f"HTTP Error {response.status_code}"))

            except Exception as e:
                print(f"❌ Exception: {str(e)}")
                if retry_count == max_retries - 1:
                    results[model] = {
                        'status': 'error',
                        'error': str(e)
                    }
                    failed_models.append((model, f"Exception: {str(e)}"))

            if retry_count < max_retries - 1:
                print(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            retry_count += 1

        # Print detailed results
        print("\nStream test results:")
        print(json.dumps(results[model], indent=2))

        # Ask user if they want to continue to next model
        # if model != CHAT_MODELS[-1]:
        #     continue_test = input("\nContinue to next model? (y/n): ").lower()
        #     if continue_test != 'y':
        #         break

    return results, successful_models, failed_models

def main():
    print("Bedrock Streaming Tests")
    print("="*50)
    
    token = input("Please enter your API token: ")
    
    prompt = input("Enter your prompt (or press Enter for default prompt): ")
    if not prompt:
        prompt = "Summarize the Philippine Civil Code"
    
    print("\nStarting streaming tests...")
    results, successful_models, failed_models = test_bedrock_streaming(token, prompt)
    
    # Generate summary report
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save detailed results
    results_filename = f"bedrock_streaming_results_{timestamp}.json"
    with open(results_filename, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Generate and save summary
    summary_filename = f"bedrock_streaming_summary_{timestamp}.txt"
    with open(summary_filename, 'w') as f:
        f.write("BEDROCK STREAMING TEST SUMMARY\n")
        f.write("="*50 + "\n\n")
        
        f.write("SUCCESSFUL MODELS:\n")
        f.write("-"*30 + "\n")
        for model in successful_models:
            f.write(f"✅ {model}\n")
        
        f.write("\nFAILED MODELS:\n")
        f.write("-"*30 + "\n")
        for model, error in failed_models:
            f.write(f"❌ {model}: {error}\n")
        
        f.write(f"\nTotal models tested: {len(successful_models) + len(failed_models)}")
        f.write(f"\nSuccessful: {len(successful_models)}")
        f.write(f"\nFailed: {len(failed_models)}")

    print(f"\nDetailed results saved to: {results_filename}")
    print(f"Summary report saved to: {summary_filename}")

    # Print summary to console
    print("\nTEST SUMMARY")
    print("="*50)
    print(f"Total models tested: {len(successful_models) + len(failed_models)}")
    print(f"Successful: {len(successful_models)}")
    print(f"Failed: {len(failed_models)}")

if __name__ == "__main__":
    main()