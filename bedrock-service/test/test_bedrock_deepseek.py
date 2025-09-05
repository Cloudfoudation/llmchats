import json
import boto3
from botocore.config import Config

# Configuration
REGION_NAME = 'us-west-2'
MODEL_ARN = 'arn:aws:bedrock:us-west-2:808491074893:imported-model/mjpdsms3v4kk'
MODEL_ARN = 'arn:aws:sagemaker:us-west-2:808491074893:endpoint/deepseek-llm-r1-distill-llama-8b'

# Configure retry settings
config = Config(
    retries={
        'total_max_attempts': 10,
        'mode': 'standard'
    }
)

# Test inputs
system_prompt = "You are a helpful AI assistant."
user_input = "What is the color of the sky?"
conversation_history = "" # Empty for first message

# Format the prompt according to DeepSeek's expected format
formatted_prompt = f"<｜begin▁of▁sentence｜>{system_prompt}{conversation_history}<｜User｜>{user_input}<｜Assistant｜><｜end▁of▁sentence｜><｜Assistant｜>"

# Initialize Bedrock Runtime client
session = boto3.session.Session()
br_runtime = session.client(
    service_name='bedrock-runtime',
    region_name=REGION_NAME,
    config=config
)

# Invoke the model with streaming
try:
    response = br_runtime.invoke_model_with_response_stream(
        modelId=MODEL_ARN,
        body=json.dumps({
            'prompt': formatted_prompt,
            'max_gen_len': 2048,
            'temperature': 0.7,
            'top_p': 0.9,
            'stream': True
        }),
        accept="application/json",
        contentType="application/json"
    )
    
    # Process the streaming response
    full_response = ""

    for event in response.get('body'):
        # Decode and parse the event data
        chunk = json.loads(event['chunk']['bytes'].decode())
        
        if 'generation' in chunk:
            text = chunk['generation']
            full_response += text
            print(text, end='', flush=True)
        elif 'choices' in chunk and len(chunk['choices']) > 0:
            text = chunk['choices'][0]['text']
            full_response += text
            print(text, end='', flush=True)

    print("\n\nFull response:", full_response)

except Exception as e:
    print(e)
    print(e.__repr__())