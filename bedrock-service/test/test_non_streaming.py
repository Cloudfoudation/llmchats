import requests
import json
import time
import datetime

# List of chat-capable Bedrock models
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

def verify_response(response_data):
    """
    Verify if the response is valid and contains expected content
    Returns: (bool, str) - (is_valid, error_message)
    """
    try:
        # Check if response is empty
        if not response_data:
            return False, "Empty response"

        # Check if response contains error messages
        if 'error' in response_data:
            return False, f"Error in response: {response_data['error']}"

        # Check if response contains expected fields (adjust based on actual API response structure)
        expected_fields = ['completion', 'model', 'usage']  # Adjust these fields based on actual response structure
        missing_fields = [field for field in expected_fields if field not in response_data]
        
        if missing_fields:
            return False, f"Missing expected fields: {', '.join(missing_fields)}"

        # Check if completion is empty
        if not response_data.get('completion'):
            return False, "Empty completion in response"

        return True, "Response valid"

    except Exception as e:
        return False, f"Verification error: {str(e)}"

def test_bedrock_models(token, prompt, max_retries=1, retry_delay=5):
    url = 'http://localhost:8000/chat'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    results = {}
    successful_models = []
    failed_models = []

    for model in CHAT_MODELS:
        print(f"\n{'='*50}")
        print(f"Testing model: {model}")
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
            "stream": False,
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
                response = requests.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    response_data = response.json()
                    is_valid, validation_message = verify_response(response_data)
                    
                    if is_valid:
                        results[model] = {
                            'status': 'success',
                            'response': response_data,
                            'validation': validation_message
                        }
                        successful_models.append(model)
                        print(f"✅ Success! Response validated.")
                        break
                    else:
                        print(f"⚠️ Response validation failed: {validation_message}")
                        if retry_count == max_retries - 1:
                            results[model] = {
                                'status': 'validation_error',
                                'error': validation_message,
                                'raw_response': response_data
                            }
                            failed_models.append((model, f"Validation Error: {validation_message}"))
                
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
        print("\nResponse details:")
        print(json.dumps(results[model], indent=2))

        # Ask user if they want to continue to next model
        # if model != CHAT_MODELS[-1]:
        #     continue_test = input("\nContinue to next model? (y/n): ").lower()
        #     if continue_test != 'y':
        #         break

    return results, successful_models, failed_models

def main():
    print("Bedrock Models Testing Script")
    print("="*50)
    
    # Get token from user
    token = input("Please enter your API token: ")
    
    # Get prompt from user
    prompt = input("Enter your prompt (or press Enter for default prompt): ")
    if not prompt:
        prompt = "Summarize the Philippine Civil Code"
    
    # Run the tests
    print("\nStarting model tests...")
    results, successful_models, failed_models = test_bedrock_models(token, prompt)
    
    # Generate summary report
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save detailed results to JSON
    results_filename = f"bedrock_test_results_{timestamp}.json"
    with open(results_filename, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Generate and save summary report
    summary_filename = f"bedrock_test_summary_{timestamp}.txt"
    with open(summary_filename, 'w') as f:
        f.write("BEDROCK MODELS TEST SUMMARY\n")
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