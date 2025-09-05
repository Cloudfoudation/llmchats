import json
import sagemaker
import boto3
from sagemaker.huggingface import HuggingFaceModel, get_huggingface_llm_image_uri
from botocore.exceptions import ClientError

# Set region
region = 'us-west-2'
boto3.setup_default_session(region_name=region)
sagemaker_session = sagemaker.Session(boto3.Session(region_name=region))

# Get the specific execution role
iam = boto3.client("iam", region_name=region)
role = iam.get_role(RoleName="AmazonSageMaker-ExecutionRole-20230623T201586")["Role"]["Arn"]

# Initialize SageMaker client
sagemaker_client = boto3.client('sagemaker', region_name=region)

image_uri = get_huggingface_llm_image_uri("huggingface-neuronx", version="0.0.25")
model_id = "deepseek-ai/DeepSeek-R1-Distill-Llama-70B"
endpoint_name = "deepseek-llm-r1-distill-llama-70b-inf2-public"
endpoint_config_name = endpoint_name

# Hub Model configuration
hub = {
    "HF_MODEL_ID": model_id,
    "HF_NUM_CORES": "24",
    "HF_AUTO_CAST_TYPE": "bf16",
    "MAX_BATCH_SIZE": "4",
    "MAX_INPUT_TOKENS": "3686",
    "MAX_TOTAL_TOKENS": "4096",
}

# Delete existing endpoint if it exists
try:
    sagemaker_client.delete_endpoint(EndpointName=endpoint_name)
    print(f"Deleted existing endpoint: {endpoint_name}")
    # Wait for the endpoint to be deleted
    waiter = sagemaker_client.get_waiter('endpoint_deleted')
    waiter.wait(EndpointName=endpoint_name)
except ClientError as e:
    if e.response['Error']['Code'] != 'ValidationException':
        raise e

# Delete existing endpoint configuration if it exists
try:
    sagemaker_client.delete_endpoint_config(EndpointConfigName=endpoint_config_name)
    print(f"Deleted existing endpoint configuration: {endpoint_config_name}")
except ClientError as e:
    if e.response['Error']['Code'] != 'ValidationException':
        raise e

# create Hugging Face Model Class
huggingface_model = HuggingFaceModel(
    image_uri=image_uri,
    env=hub,
    role=role,
    sagemaker_session=sagemaker_session,
    enable_network_isolation=False
)

# deploy model to SageMaker Inference
predictor = huggingface_model.deploy(
    endpoint_name=endpoint_name,
    initial_instance_count=1,
    instance_type="ml.inf2.48xlarge",
    container_startup_health_check_timeout=3600,
    volume_size=512,
)

response = predictor.predict(
    {
        "inputs": "นายกคนปัจจุบันของไทย",
        "parameters": {
            "do_sample": True,
            "max_new_tokens": 128,
            "temperature": 0.7,
            "top_k": 50,
            "top_p": 0.95,
        }
    }
)

print("Response:", response)