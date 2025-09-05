import json
import boto3
import os
import traceback
import time
import uuid
from typing import Dict, Any, Optional
from datetime import datetime

# Environment variables
REGION_NAME = os.environ['REGION_NAME']
ATTACHMENTS_BUCKET = os.environ['ATTACHMENTS_BUCKET']
BDA_BUCKET = os.environ['BDA_BUCKET']
BEDROCK_KB_ROLE_ARN = os.environ['BEDROCK_KB_ROLE_ARN']
BDA_RESULTS_QUEUE_URL = os.environ.get('BDA_RESULTS_QUEUE_URL', '')
SYNC_SESSIONS_TABLE = os.environ.get('SYNC_SESSIONS_TABLE', '')

# Initialize clients
s3 = boto3.client('s3', config=boto3.session.Config(signature_version='s3v4'))
sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')
bedrock_agent = boto3.client('bedrock-agent', region_name=REGION_NAME)
bda_runtime_client = boto3.client('bedrock-data-automation-runtime', region_name='us-east-1')

# DynamoDB table
if SYNC_SESSIONS_TABLE:
    sync_sessions_table = dynamodb.Table(SYNC_SESSIONS_TABLE)

def lambda_handler(event, context):
    """
    Process BDA jobs asynchronously
    Triggered by SQS messages containing file processing requests
    """
    try:
        print(f"Processing BDA request: {json.dumps(event)}")
        
        # Handle SQS batch
        for record in event.get('Records', []):
            try:
                message_body = json.loads(record['body'])
                process_bda_job(message_body)
            except Exception as e:
                print(f"Error processing record: {e}")
                traceback.print_exc()
                # Continue with other records
                
        return {'statusCode': 200}
        
    except Exception as e:
        print(f"Error in BDA processor: {e}")
        traceback.print_exc()
        return {'statusCode': 500, 'error': str(e)}

def process_bda_job(message: Dict[str, Any]):
    """Process a single BDA job"""
    try:
        session_id = message.get('sessionId', '')
        file_location = message['fileLocation']
        user_info = message['userInfo']
        kb_id = message['knowledgeBaseId']
        data_source_id = message.get('dataSourceId', '')
        message_id = message.get('messageId', '')
        
        print(f"Processing BDA job for file: {file_location} (session: {session_id})")
        
        # Parse S3 location
        parts = file_location.replace('s3://', '').split('/', 1)
        source_bucket = parts[0]
        source_key = parts[1]
        
        # Check if file needs processing based on file type
        file_ext = get_file_extension(source_key)
        should_process = False
        
        if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']:
            should_process = True
        elif file_ext == '.pdf':
            should_process = is_scanned_pdf(s3, source_bucket, source_key)
        
        if not should_process:
            print(f"File {source_key} doesn't need BDA processing (file type)")
            update_session_file_status(session_id, kb_id, data_source_id, 'SKIPPED')
            return
            
        # Check if file has already been processed
        if is_file_already_processed(s3, source_bucket, source_key):
            print(f"File {source_key} has already been processed, skipping BDA processing")
            update_session_file_status(session_id, kb_id, data_source_id, 'SKIPPED')
            return
            
        # Update session status to BDA_PROCESSING when first file starts
        update_session_to_bda_processing(session_id)
        
        # Start BDA processing
        result = process_with_bda_async(file_location, user_info)
        
        if result['status'] == 'SUCCESS':
            print(f"BDA processing completed for {source_key}")
            update_session_file_status(session_id, kb_id, data_source_id, 'SUCCESS')
        else:
            print(f"BDA processing failed for {source_key}: {result.get('error')}")
            update_session_file_status(session_id, kb_id, data_source_id, 'FAILED')
            
    except Exception as e:
        print(f"Error in process_bda_job: {e}")
        traceback.print_exc()
        if session_id and kb_id:
            update_session_file_status(session_id, kb_id, data_source_id, 'ERROR')

def update_session_to_bda_processing(session_id: str):
    """Update session status from PREPARING to BDA_PROCESSING when first file starts"""
    try:
        if not SYNC_SESSIONS_TABLE or not session_id:
            print("No sync sessions table configured or no session ID")
            return
            
        # Only update if status is currently PREPARING
        sync_sessions_table.update_item(
            Key={'sessionId': session_id},
            UpdateExpression="SET #status = :new_status, updatedAt = :timestamp",
            ConditionExpression="#status = :current_status",
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':new_status': 'BDA_PROCESSING',
                ':current_status': 'PREPARING',
                ':timestamp': datetime.utcnow().isoformat()
            }
        )
        print(f"Updated session {session_id} status from PREPARING to BDA_PROCESSING")
        
    except sync_sessions_table.exceptions.ConditionalCheckFailedException:
        # Session is not in PREPARING state - this is fine, might already be updated
        print(f"Session {session_id} is not in PREPARING state - skipping status update")
    except Exception as e:
        print(f"Error updating session to BDA_PROCESSING: {e}")
        traceback.print_exc()

def update_session_file_status(session_id: str, kb_id: str, data_source_id: str, file_status: str):
    """Update session with file completion status and check if all files are done"""
    try:
        if not SYNC_SESSIONS_TABLE or not session_id:
            print("No sync sessions table configured or no session ID")
            return
            
        print(f"Updating session {session_id} with file status: {file_status}")
        
        # Update the session counters atomically
        update_expression = "SET updatedAt = :timestamp"
        expression_values = {':timestamp': datetime.utcnow().isoformat()}
        
        if file_status in ['SUCCESS', 'SKIPPED']:
            update_expression += ", completedFiles = completedFiles + :inc"
            expression_values[':inc'] = 1
        elif file_status in ['FAILED', 'ERROR']:
            update_expression += ", failedFiles = failedFiles + :inc"
            expression_values[':inc'] = 1
        
        # Update the session
        response = sync_sessions_table.update_item(
            Key={'sessionId': session_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )
        
        session = response['Attributes']
        total_files = session.get('totalFiles', 0)
        completed_files = session.get('completedFiles', 0)
        failed_files = session.get('failedFiles', 0)
        processed_files = completed_files + failed_files
        
        print(f"Session {session_id}: {processed_files}/{total_files} files processed")
        
        # Check if all files are processed
        if processed_files >= total_files and total_files > 0:
            print(f"All files processed for session {session_id}. Starting ingestion job.")
            start_ingestion_for_session(session_id, kb_id, data_source_id)
        
    except Exception as e:
        print(f"Error updating session file status: {e}")
        traceback.print_exc()

def start_ingestion_for_session(session_id: str, kb_id: str, data_source_id: str):
    """Start ingestion job when all BDA processing is complete"""
    try:
        print(f"Starting ingestion job for session {session_id}")
        
        # Start ingestion job
        job_response = bedrock_agent.start_ingestion_job(
            knowledgeBaseId=kb_id,
            dataSourceId=data_source_id,
            clientToken=str(uuid.uuid4())
        )
        
        job_data = job_response['ingestionJob']
        ingestion_job_id = job_data['ingestionJobId']
        
        print(f"Started ingestion job {ingestion_job_id} for session {session_id}")
        
        # Update session status
        sync_sessions_table.update_item(
            Key={'sessionId': session_id},
            UpdateExpression="SET #status = :status, ingestionJobId = :job_id, updatedAt = :timestamp",
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'INGESTION_STARTED',
                ':job_id': ingestion_job_id,
                ':timestamp': datetime.utcnow().isoformat()
            }
        )
        
        print(f"Updated session {session_id} status to INGESTION_STARTED")
        
    except Exception as e:
        print(f"Error starting ingestion for session {session_id}: {e}")
        traceback.print_exc()
        
        # Update session with error status
        try:
            sync_sessions_table.update_item(
                Key={'sessionId': session_id},
                UpdateExpression="SET #status = :status, errorMessage = :error, updatedAt = :timestamp",
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'INGESTION_FAILED',
                    ':error': str(e),
                    ':timestamp': datetime.utcnow().isoformat()
                }
            )
        except Exception as update_error:
            print(f"Error updating session with failure status: {update_error}")

def process_with_bda_async(s3_location: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process file with BDA asynchronously
    Returns immediately after starting the job, doesn't wait
    """
    try:
        # Parse S3 location
        parts = s3_location.replace('s3://', '').split('/', 1)
        source_bucket = parts[0]
        source_key = parts[1]
        
        print(f"Starting BDA processing for s3://{source_bucket}/{source_key}")
        
        # Stage file to BDA bucket (us-east-1)
        staging_key = f"staging/{user_info['identityId']}/{os.path.basename(source_key)}"
        
        # Copy to BDA bucket
        s3.copy_object(
            CopySource={'Bucket': source_bucket, 'Key': source_key},
            Bucket=BDA_BUCKET,
            Key=staging_key
        )
        
        staging_location = f"s3://{BDA_BUCKET}/{staging_key}"
        print(f"File staged to: {staging_location}")
        
        # Get account ID for the profile ARN
        sts_client = boto3.client('sts')
        account_id = sts_client.get_caller_identity()['Account']
        
        # Initialize BDA client for project management
        bda_client = boto3.client('bedrock-data-automation', region_name='us-east-1')
        
        # Setup BDA project with standard output config for images
        standard_output_config = {
            "image": {
                "extraction": {
                    "category": {
                        "state": "ENABLED",
                        "types": ["CONTENT_MODERATION", "TEXT_DETECTION"]
                    },
                    "boundingBox": {"state": "ENABLED"}
                },
                "generativeField": {
                    "state": "ENABLED",
                    "types": ["IMAGE_SUMMARY", "IAB"]
                }
            }
        }
        
        # Create or get BDA project
        project_name = "image_processing_bda_project"
        project_arn = None
        
        try:
            # Check if project already exists
            existing_projects = bda_client.list_data_automation_projects()
            project_exists = False
            
            for project in existing_projects.get("projects", []):
                if project["projectName"] == project_name:
                    project_exists = True
                    project_arn = project["projectArn"]
                    print(f"Using existing BDA project: {project_arn}")
                    break
                    
            if not project_exists:
                print(f"Creating new BDA project: {project_name}")
                response = bda_client.create_data_automation_project(
                    projectName=project_name,
                    projectDescription="Project for image processing with BDA",
                    projectStage='LIVE',
                    standardOutputConfiguration=standard_output_config
                )
                project_arn = response["projectArn"]
                print(f"Created BDA project: {project_arn}")
                
        except Exception as project_error:
            print(f"Error managing BDA project: {project_error}")
            # If project creation fails, we'll skip BDA processing
            return {
                'status': 'FAILED',
                'error': f'Unable to create or access BDA project: {str(project_error)}'
            }
        
        # Prepare BDA request - only proceed if we have a project
        if not project_arn:
            return {
                'status': 'FAILED',
                'error': 'No BDA project available for processing'
            }
        
        output_prefix = f"processed/{user_info['identityId']}/{int(time.time())}/"
        
        request_payload = {
            "inputConfiguration": {
                "s3Uri": staging_location
            },
            "outputConfiguration": {
                "s3Uri": f"s3://{BDA_BUCKET}/{output_prefix}"
            },
            "dataAutomationConfiguration": {
                "dataAutomationProjectArn": project_arn,
                "stage": "LIVE"
            },
            "dataAutomationProfileArn": f"arn:aws:bedrock:us-east-1:{account_id}:data-automation-profile/us.data-automation-v1"
        }
        
        print(f"Invoking BDA with payload: {json.dumps(request_payload, default=str)}")
        
        # Start BDA job (async)
        bda_response = bda_runtime_client.invoke_data_automation_async(
            **request_payload
        )        
        
        invocation_arn = bda_response['invocationArn']
        print(f"BDA job started with ARN: {invocation_arn}")
        
        # Wait for completion (with timeout)
        completion_result = wait_for_bda_completion(invocation_arn)
        
        if completion_result['status'] != 'Success':
            return {
                'status': 'FAILED',
                'error': completion_result.get('error_message', 'BDA processing failed'),
                'invocation_arn': invocation_arn
            }
        
        # Process successful result
        output_location = process_bda_output(completion_result, source_bucket, source_key, user_info)
        
        # Cleanup staging file
        cleanup_staging_file(BDA_BUCKET, staging_key)
        
        return {
            'status': 'SUCCESS',
            'processed_location': output_location,
            'invocation_arn': invocation_arn
        }
        
    except Exception as e:
        print(f"Error in BDA processing: {e}")
        traceback.print_exc()
        return {
            'status': 'ERROR',
            'error': str(e)
        }

def wait_for_bda_completion(invocation_arn: str, max_attempts: int = 60, delay_seconds: int = 5) -> Dict[str, Any]:
    """Wait for BDA job completion with extended timeout for async processing"""
    for attempt in range(max_attempts):
        try:
            response = bda_runtime_client.get_data_automation_status(invocationArn=invocation_arn)
            status = response.get('status')
            
            if status == 'Success':
                return response
            elif status in ['ClientError', 'ServiceError']:
                return {
                    'status': status,
                    'error_type': response.get('errorType'),
                    'error_message': response.get('errorMessage')
                }
            elif status in ['Created', 'InProgress']:
                print(f"BDA job status: {status}. Checking again... (attempt {attempt + 1}/{max_attempts})")
                # Use exponential backoff instead of fixed sleep
                import random
                backoff_delay = min(delay_seconds * (2 ** min(attempt, 4)), 30) + random.uniform(0, 1)
                # Legitimate exponential backoff delay for BDA job polling
                time.sleep(backoff_delay)  # nosemgrep: arbitrary-sleep
            else:
                print(f"Unexpected BDA job status: {status}")
                # Reduced delay for unexpected status
                time.sleep(min(delay_seconds, 2))  # nosemgrep: arbitrary-sleep
                
        except Exception as e:
            print(f"Error checking BDA job status: {e}")
            if attempt == max_attempts - 1:
                return {
                    'status': 'Error',
                    'error_type': 'StatusCheckError',
                    'error_message': str(e)
                }
            # Minimal delay on error to prevent tight retry loops
            time.sleep(1)  # nosemgrep: arbitrary-sleep
            
    return {
        'status': 'Timeout',
        'error_type': 'JobTimeout',
        'error_message': f'Job did not complete within {max_attempts * delay_seconds} seconds'
    }

def process_bda_output(completion_result: Dict[str, Any], source_bucket: str, source_key: str, user_info: Dict[str, Any]) -> str:
    """Process BDA output and copy back to original location"""
    try:
        # Get the job metadata S3 location
        job_metadata_s3_location = completion_result['outputConfiguration']['s3Uri']
        
        print(f"Reading metadata from: {job_metadata_s3_location}")
        
        # Parse the metadata S3 URI
        metadata_parts = job_metadata_s3_location.replace('s3://', '').split('/', 1)
        metadata_bucket = metadata_parts[0]
        metadata_key = metadata_parts[1]
        
        # Read job metadata from S3
        response = s3.get_object(Bucket=metadata_bucket, Key=metadata_key)
        job_metadata = json.loads(response['Body'].read().decode('utf-8'))
        print(f"Job metadata: {json.dumps(job_metadata)}")
        
        # Parse the output metadata to find the standard output path
        standard_output_path = None
        
        # Look for standard output in the metadata structure
        if 'output_metadata' in job_metadata:
            for asset in job_metadata['output_metadata']:
                if 'segment_metadata' in asset:
                    for segment in asset['segment_metadata']:
                        if 'standard_output_path' in segment:
                            standard_output_path = segment['standard_output_path']
                            break
                if standard_output_path:
                    break
        
        if not standard_output_path:
            raise Exception("No standard output path found in BDA results metadata")
            
        print(f"Found standard output path: {standard_output_path}")
        
        # Parse the standard output S3 URI
        output_parts = standard_output_path.replace('s3://', '').split('/', 1)
        output_bucket = output_parts[0]
        output_key = output_parts[1]
        
        # Determine destination in original bucket with proper naming
        # Keep full original filename including extension, then add .processed.json
        original_filename = os.path.basename(source_key)  # e.g., "document.pdf"
        dest_key = f"{os.path.dirname(source_key)}/{original_filename}.processed.json"
        dest_location = f"s3://{source_bucket}/{dest_key}"
        
        # Copy processed content back to original bucket with metadata
        copy_source = {'Bucket': output_bucket, 'Key': output_key}
        
        s3.copy_object(
            CopySource=copy_source,
            Bucket=source_bucket,
            Key=dest_key,
            Metadata={
                'original-file': original_filename,
                'processing-type': 'BDA',
                'processed-timestamp': datetime.utcnow().isoformat(),
                'user-identity': user_info.get('identityId', ''),
                'content-type': 'application/json'
            },
            MetadataDirective='REPLACE'
        )
        
        print(f"BDA output copied to: {dest_location}")
        
        # Cleanup BDA output files
        try:
            s3.delete_object(Bucket=output_bucket, Key=output_key)
            s3.delete_object(Bucket=metadata_bucket, Key=metadata_key)
            print(f"Cleaned up BDA output files")
        except Exception as cleanup_error:
            print(f"Warning: Failed to cleanup BDA output files: {cleanup_error}")
        
        return dest_location
        
    except Exception as e:
        print(f"Error processing BDA output: {e}")
        raise e

def cleanup_staging_file(bucket: str, key: str):
    """Clean up staging file"""
    try:
        s3.delete_object(Bucket=bucket, Key=key)
        print(f"Cleaned up staging file: s3://{bucket}/{key}")
    except Exception as e:
        print(f"Error cleaning up staging file: {e}")

def cleanup_bda_outputs(output_docs: list):
    """Clean up BDA output files"""
    for doc in output_docs:
        try:
            output_location = doc['s3Location']
            parts = output_location.replace('s3://', '').split('/', 1)
            bucket = parts[0]
            key = parts[1]
            s3.delete_object(Bucket=bucket, Key=key)
            print(f"Cleaned up BDA output: {output_location}")
        except Exception as e:
            print(f"Error cleaning up BDA output {doc.get('s3Location', 'unknown')}: {e}")

def send_completion_message(kb_id: str, file_location: str, status: str, user_info: Dict[str, Any], message_id: str, result: Dict[str, Any] = None):
    """Send completion message to results queue"""
    try:
        if not BDA_RESULTS_QUEUE_URL:
            print("No results queue configured, skipping completion message")
            return
            
        message = {
            'messageId': message_id,
            'knowledgeBaseId': kb_id,
            'fileLocation': file_location,
            'status': status,
            'userInfo': user_info,
            'timestamp': datetime.utcnow().isoformat(),
            'result': result or {}
        }
        
        sqs.send_message(
            QueueUrl=BDA_RESULTS_QUEUE_URL,
            MessageBody=json.dumps(message)
        )
        
        print(f"Sent completion message for {file_location}: {status}")
        
    except Exception as e:
        print(f"Error sending completion message: {e}")

def is_file_already_processed(s3_client, bucket: str, key: str) -> bool:
    """
    Check if file has already been processed by BDA
    
    Returns True if:
    - A processed file exists (.processed.json suffix)
    - The processed file is up-to-date (not older than original file)
    
    Returns False if:
    - No processed file exists
    - Original file is newer than processed file
    - Any error occurs during checking (safer to reprocess)
    """
    # Generate the expected processed file key (same logic as in process_bda_output)
    original_filename = os.path.basename(key)
    dir_path = os.path.dirname(key)
    
    # Handle root directory case
    if dir_path:
        processed_key = f"{dir_path}/{original_filename}.processed.json"
    else:
        processed_key = f"{original_filename}.processed.json"
    
    try:
        # Check if the processed file exists
        processed_response = s3_client.head_object(Bucket=bucket, Key=processed_key)
        processed_modified = processed_response['LastModified']
        
        # Also check the original file's modification time
        original_response = s3_client.head_object(Bucket=bucket, Key=key)
        original_modified = original_response['LastModified']
        
        # If original file is newer than processed file, we need to reprocess
        if original_modified > processed_modified:
            print(f"Original file {key} is newer than processed file {processed_key} - reprocessing needed")
            return False
        
        print(f"Found existing processed file: {processed_key} (up to date)")
        return True
        
    except s3_client.exceptions.ClientError as e:
        if e.response['Error']['Code'] == '404':
            # File doesn't exist, not processed yet
            print(f"Processed file not found: {processed_key} (file needs processing)")
            return False
        else:
            # Some other error occurred (permissions, etc.)
            print(f"Error checking if file is processed: {e}")
            # Default to not processed if we can't determine (safer to reprocess than skip)
            return False
    except Exception as e:
        print(f"Unexpected error checking processed file: {e}")
        return False

def get_file_extension(file_path: str) -> str:
    """Get file extension from path"""
    return os.path.splitext(file_path)[1].lower()

def is_scanned_pdf(s3_client, bucket: str, key: str) -> bool:
    """Check if PDF is scanned (simplified check)"""
    try:
        # Download a small portion to check
        response = s3_client.get_object(Bucket=bucket, Key=key, Range='bytes=0-10240')
        content = response['Body'].read()
        
        # Simple heuristic: if PDF contains minimal text content, likely scanned
        text_indicators = [b'/Font', b'/Text', b'BT', b'ET']
        text_count = sum(1 for indicator in text_indicators if indicator in content)
        
        # If very few text indicators, likely scanned
        return text_count < 2
        
    except Exception as e:
        print(f"Error checking if PDF is scanned: {e}")
        # Default to processing if uncertain
        return True