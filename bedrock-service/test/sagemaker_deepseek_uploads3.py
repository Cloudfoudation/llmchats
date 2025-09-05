import json
import boto3
import os
import subprocess
from huggingface_hub import snapshot_download
from botocore.exceptions import ClientError

# Set region and create AWS clients
region = 'us-west-2'
s3_client = boto3.client('s3', region_name=region)
bedrock_client = boto3.client('bedrock', region_name=region)

# Model details
model_id = "deepseek-ai/DeepSeek-R1-Distill-Llama-70B"
bucket_name = "trungntt-bedrock-artifacts-w2"
s3_prefix = "models/deepseek-70b"

# Model configuration for Inferentia2
model_config = {
    "HF_MODEL_ID": model_id,
    "HF_NUM_CORES": "24",
    "HF_AUTO_CAST_TYPE": "bf16",
    "MAX_BATCH_SIZE": "4",
    "MAX_INPUT_TOKENS": "3686",
    "MAX_TOTAL_TOKENS": "4096",
}

def download_model():
    print(f"Downloading model {model_id}...")
    local_path = snapshot_download(
        repo_id=model_id,
        local_dir="./model_artifacts",
        local_dir_use_symlinks=False
    )
    
    # Save model configuration
    config_path = os.path.join(local_path, "neuron_config.json")
    with open(config_path, 'w') as f:
        json.dump(model_config, f)
        
    return local_path

def create_tar_archive(local_path):
    print("Creating tar archive...")
    tar_path = "model.tar.gz"
    
    # Change to the parent directory of model_artifacts
    original_dir = os.getcwd()
    os.chdir(os.path.dirname(local_path))
    
    # Create tar.gz archive using secure subprocess call
    model_dir_name = os.path.basename(local_path)
    tar_full_path = os.path.join(original_dir, tar_path)
    subprocess.run([
        "tar", "-czf", tar_full_path, model_dir_name + "/"
    ], check=True)
    
    # Return to original directory
    os.chdir(original_dir)
    return tar_path

def upload_to_s3(tar_path):
    print(f"Uploading model archive to S3...")
    s3_key = f"{s3_prefix}/model.tar.gz"
    
    # Use AWS CLI for upload with progress monitoring - secure subprocess call
    s3_uri = f"s3://{bucket_name}/{s3_key}"
    subprocess.run([
        "aws", "s3", "cp", tar_path, s3_uri, "--region", region
    ], check=True)
    
    return s3_uri

def main():
    try:
        # Download model locally
        local_path = download_model()
        print(f"Model downloaded to: {local_path}")
        
        # Create tar archive
        tar_path = create_tar_archive(local_path)
        print(f"Created archive: {tar_path}")
        
        # Upload to S3
        s3_path = upload_to_s3(tar_path)
        print(f"Model uploaded successfully to: {s3_path}")
        
        # Clean up local files using secure subprocess calls
        print("Cleaning up local files...")
        import shutil
        
        # Remove directory safely
        if os.path.exists(local_path):
            shutil.rmtree(local_path)
            
        # Remove tar file safely
        if os.path.exists(tar_path):
            os.remove(tar_path)
        
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {e.cmd}")
        print(f"Return code: {e.returncode}")
        print(f"Output: {e.output}")
        raise
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise

if __name__ == "__main__":
    main()