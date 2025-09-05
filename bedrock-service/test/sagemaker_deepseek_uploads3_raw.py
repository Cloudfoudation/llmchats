import json
import boto3
import os
from huggingface_hub import HfApi, hf_hub_download, login
from huggingface_hub.constants import ENDPOINT
from botocore.exceptions import ClientError
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor
import threading

# Set region and create AWS clients
region = 'us-west-2'
s3_client = boto3.client('s3', region_name=region)
bedrock_client = boto3.client('bedrock', region_name=region)

# Model details
model_id = "deepseek-ai/DeepSeek-R1"
bucket_name = "trungntt-bedrock-artifacts-w2"  # Replace with your S3 bucket name
s3_prefix = "models/deepseek-r1"  # S3 folder path for model artifacts

# Get Hugging Face token from environment variable
HF_TOKEN = os.getenv('HUGGING_FACE_TOKEN')

# Model configuration for Inferentia2
model_config = {
    "HF_MODEL_ID": model_id,
    "HF_NUM_CORES": "24",
    "HF_AUTO_CAST_TYPE": "bf16",
    "MAX_BATCH_SIZE": "4",
    "MAX_INPUT_TOKENS": "3686",
    "MAX_TOTAL_TOKENS": "4096",
}

def setup_huggingface_auth():
    """Set up Hugging Face authentication"""
    if not HF_TOKEN:
        raise ValueError("Please set the HUGGING_FACE_TOKEN environment variable")
    login(token=HF_TOKEN)

def upload_config_to_s3():
    """Upload model configuration directly to S3"""
    config_key = f"{s3_prefix}/neuron_config.json"
    s3_client.put_object(
        Bucket=bucket_name,
        Key=config_key,
        Body=json.dumps(model_config)
    )

def upload_file_to_s3(file_info):
    """Stream a single file from Hugging Face to S3"""
    filename, revision = file_info
    s3_key = f"{s3_prefix}/{filename}"
    
    try:
        # Get the download URL and make an authenticated request
        url = hf_hub_download(
            repo_id=model_id,
            filename=filename,
            token=HF_TOKEN,
            local_files_only=False,
            resume_download=True,
            local_dir="/tmp"
        )
        
        # Upload file to S3
        s3_client.upload_file(
            url,
            bucket_name,
            s3_key
        )
        
        # Clean up the temporary file
        os.remove(url)
        
        print(f"Successfully uploaded {filename} to S3")
        
    except Exception as e:
        print(f"Error uploading {filename}: {str(e)}")
        raise e

def main():
    # Set up Hugging Face authentication
    setup_huggingface_auth()

    # Upload config file
    print("Uploading model configuration...")
    upload_config_to_s3()
    
    # Get model files information from Hugging Face
    print(f"Getting file list from {model_id}...")
    hf_api = HfApi(token=HF_TOKEN)
    model_files = hf_api.list_repo_files(model_id)
    
    # Prepare file information
    file_info = [(filename, "main") for filename in model_files]
    
    # Upload files in parallel
    print("Uploading model files to S3...")
    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(upload_file_to_s3, file_info)
    
    print("Upload completed successfully")

if __name__ == "__main__":
    main()