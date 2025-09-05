import boto3
import json
import time

# Create a SageMaker Runtime client in us-west-2
runtime = boto3.client('sagemaker-runtime', region_name='us-west-2')
endpoint_name = "deepseek-llm-r1-distill-llama-70b-inf2-public"

def count_tokens(text):
    # Simple approximation: split by spaces and count words
    # This is a rough estimate - for more accurate counting you'd want to use a proper tokenizer
    return len(text.split())

def predict(payload):
    start_time = time.time()
    
    response = runtime.invoke_endpoint(
        EndpointName=endpoint_name,
        ContentType='application/json',
        Body=json.dumps(payload)
    )
    
    result = json.loads(response['Body'].read().decode())
    end_time = time.time()
    
    # Calculate generation time
    generation_time = end_time - start_time
    
    # Count output tokens
    output_tokens = count_tokens(result[0]['generated_text'])
    
    # Calculate tokens per second
    tokens_per_second = output_tokens / generation_time
    
    return {
        'result': result,
        'generation_time': generation_time,
        'output_tokens': output_tokens,
        'tokens_per_second': tokens_per_second
    }

def run_test(prompt, max_tokens=128):
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": max_tokens
        }
    }
    
    print(f"\nTesting prompt: {prompt}")
    response = predict(payload)
    print(f"Generated text: {response['result'][0]['generated_text']}")
    print(f"Generation time: {response['generation_time']:.2f} seconds")
    print(f"Output tokens: {response['output_tokens']}")
    print(f"Tokens per second: {response['tokens_per_second']:.2f}")

# Run tests
test_prompts = [
    "<|begin_of_sentence|><|User|>what is 10+1.<|Assistant|>",
    "<|begin_of_sentence|><|User|>What is 1+1?<|Assistant|>It's 2.<|end_of_sentence|><|User|>Explain more!<|Assistant|>",
    "<|begin_of_sentence|><|User|>Create a Flappy Bird game in Python.<|Assistant|>"
]

for prompt in test_prompts:
    run_test(prompt)