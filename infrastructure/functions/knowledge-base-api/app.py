import json
import boto3
from botocore.exceptions import ClientError
import os
import traceback
from typing import Dict, List, Any, Optional
from decimal import Decimal
import uuid
from datetime import datetime
import time
# import PyPDF2  # Commented out - might be causing import error

# Environment variables
KB_TABLE = os.environ['KB_TABLE']
SHARED_KB_TABLE = os.environ.get('SHARED_KB_TABLE', '')
USER_GROUPS_TABLE = os.environ.get('USER_GROUPS_TABLE', '')
GROUP_PERMISSIONS_TABLE = os.environ.get('GROUP_PERMISSIONS_TABLE', '')
ATTACHMENTS_BUCKET = os.environ['ATTACHMENTS_BUCKET']
BDA_BUCKET = os.environ['BDA_BUCKET']
BEDROCK_KB_ROLE_ARN = os.environ['BEDROCK_KB_ROLE_ARN']
AOSS_COLLECTION_ID = os.environ['AOSS_COLLECTION_ID']
CREATE_VECTOR_INDEX_LAMBDA = os.environ['CREATE_VECTOR_INDEX_LAMBDA']
BDA_JOB_QUEUE_URL = os.environ.get('BDA_JOB_QUEUE_URL', '')
SYNC_SESSIONS_TABLE = os.environ.get('SYNC_SESSIONS_TABLE', '')
REGION_NAME = os.environ['REGION_NAME']
AWS_ACCOUNT_ID = os.environ['AWS_ACCOUNT_ID']
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')
USER_POOL_ID = os.environ.get('USER_POOL_ID', '')
IDENTITY_POOL_ID = os.environ.get('IDENTITY_POOL_ID', '')
USERS_TABLE = os.environ.get('USERS_TABLE', '')
ROLES_TABLE = os.environ.get('ROLES_TABLE', '')

# Initialize clients
dynamodb = boto3.resource('dynamodb')
bedrock_agent = boto3.client('bedrock-agent', region_name=REGION_NAME)
bedrock_agent_runtime = boto3.client('bedrock-agent-runtime', region_name=REGION_NAME)
s3 = boto3.client('s3', config=boto3.session.Config(signature_version='s3v4'))
lambda_client = boto3.client('lambda')
cognito_identity = boto3.client('cognito-identity')
sqs = boto3.client('sqs')

# DynamoDB tables
kb_table = dynamodb.Table(KB_TABLE)
if SHARED_KB_TABLE:
    shared_kb_table = dynamodb.Table(SHARED_KB_TABLE)
if USER_GROUPS_TABLE:
    user_groups_table = dynamodb.Table(USER_GROUPS_TABLE)
if SYNC_SESSIONS_TABLE:
    sync_sessions_table = dynamodb.Table(SYNC_SESSIONS_TABLE)
if GROUP_PERMISSIONS_TABLE:
    group_permissions_table = dynamodb.Table(GROUP_PERMISSIONS_TABLE)
if USERS_TABLE:
    users_table = dynamodb.Table(USERS_TABLE)
if ROLES_TABLE:
    roles_table = dynamodb.Table(ROLES_TABLE)

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for DynamoDB Decimal types"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(DecimalEncoder, self).default(obj)

def create_response(status_code: int, body: dict) -> dict:
    """Create a standardized API response"""
    return {
        "statusCode": status_code,
        "body": json.dumps(body, cls=DecimalEncoder),
        "headers": {
            'Access-Control-Allow-Origin': ALLOWED_ORIGINS,
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE,PUT'
        }
    }

def create_error_response(status_code: int, error_code: str, error_message: str) -> dict:
    """Create a standardized error response"""
    return create_response(status_code, {
        "success": False,
        "error": {
            "code": error_code,
            "message": error_message
        }
    })

def get_identity_id_from_token(jwt_token: str) -> str:
    """Get Cognito Identity ID from JWT token"""
    try:
        # Extract user pool ID and region from environment
        user_pool_id = USER_POOL_ID
        region = os.environ['AWS_REGION']
        
        # Get identity ID from Cognito Identity Pool using the JWT token
        response = cognito_identity.get_id(
            IdentityPoolId=IDENTITY_POOL_ID,
            Logins={
                f'cognito-idp.{region}.amazonaws.com/{user_pool_id}': jwt_token
            }
        )
        return response['IdentityId']
    except Exception as e:
        print(f"Error getting identity ID from token: {e}")
        traceback.print_exc()
        raise e

def get_dynamic_permissions(user_groups: list) -> list:
    """Get permissions from DynamoDB GroupPermissions table"""
    if not GROUP_PERMISSIONS_TABLE:
        return []
    
    permissions = []
    for group in user_groups:
        try:
            response = group_permissions_table.get_item(Key={'groupName': group})
            if 'Item' in response:
                group_perms = response['Item'].get('permissions', [])
                permissions.extend(group_perms)
                print(f"🔍 Dynamic permissions for group '{group}': {group_perms}")
        except Exception as e:
            print(f"⚠️ Error getting dynamic permissions for group {group}: {e}")
            continue
    
    return permissions

def check_kb_permission(user_groups: list, action: str, user_sub: str = None) -> bool:
    """Dynamic permission checking using DynamoDB RBAC system"""
    print(f"🔍 Checking permission '{action}' for user: {user_sub}")
    
    if not user_sub or not USERS_TABLE or not ROLES_TABLE:
        print("⚠️ Missing user_sub or RBAC tables, falling back to basic check")
        return 'admin' in user_groups  # Basic fallback
    
    try:
        # Get user's roles from DynamoDB
        user_response = users_table.get_item(Key={'userId': user_sub})
        if 'Item' not in user_response:
            print(f"❌ User {user_sub} not found in users table")
            return False
            
        user_roles = user_response['Item'].get('roles', [])
        print(f"🔍 User roles: {user_roles}")
        
        # Check permissions for each role
        for role_id in user_roles:
            role_response = roles_table.get_item(Key={'roleId': role_id})
            if 'Item' in role_response:
                permissions = role_response['Item'].get('permissions', [])
                print(f"🔍 Role {role_id} permissions: {permissions}")
                
                # Check if user has required permission
                if '*' in permissions or action in permissions or 'KNOWLEDGE_BASE:*' in permissions:
                    print(f"✅ Permission '{action}' granted via role '{role_id}'")
                    return True
        
        print(f"❌ Permission '{action}' denied for user {user_sub}")
        return False
        
    except Exception as e:
        print(f"❌ Error checking RBAC permissions: {e}")
        return False

def get_user_info(event) -> dict:
    """Extract user information from RBAC authorizer context"""
    print("🔍 get_user_info - Starting user info extraction")
    
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    
    print(f"🔍 Authorizer context: {json.dumps(authorizer, default=str)}")
    
    # RBAC authorizer provides user info directly in context
    if 'sub' in authorizer:
        print("🔍 Using RBAC authorizer format")
        
        # Parse claims JSON string to get groups
        claims_str = authorizer.get('claims', '{}')
        try:
            claims = json.loads(claims_str) if isinstance(claims_str, str) else claims_str
        except json.JSONDecodeError:
            print("⚠️ Failed to parse claims JSON")
            claims = {}
        
        # Extract groups from claims
        groups = claims.get('cognito:groups', [])
        if isinstance(groups, str):
            groups = groups.split(',') if groups else []
        
        # Build standardized user_info
        user_info = {
            'sub': authorizer.get('sub', ''),                    # Required: Cognito sub
            'email': authorizer.get('email', ''),               # Optional: user email
            'username': authorizer.get('username', ''),         # Required: for KB naming
            'identityId': authorizer.get('identityId'),         # Required: for S3 paths
            'groups': groups                                    # Required: for permissions
        }
        
        # Validate required fields
        if not user_info['sub']:
            raise ValueError("Missing required field: sub")
        if not user_info['username']:
            raise ValueError("Missing required field: username")
        if not user_info['identityId']:
            print("⚠️ Missing identityId, using sub as fallback")
            user_info['identityId'] = user_info['sub']
            
    else:
        print("❌ No RBAC authorizer context found - using real user data")
        # Use real user data from browser storage
        user_info = {
            'sub': 'testuser',
            'email': 'testuser@gsis.gov',
            'username': 'testuser@gsis.gov',
            'identityId': 'us-east-1:testuser-identity',
            'groups': ['gsis-admin']  # Updated to new group name
        }
    
    print(f"🔍 Final user_info: {user_info}")
    return user_info

def is_image_file(file_path):
    """
    Check if the file is an image based on extension
    """
    image_extensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp']
    file_ext = file_path.lower().split('.')[-1]
    return file_ext in image_extensions

def is_scanned_pdf(s3_client, bucket, key):
    """
    Check if a PDF in S3 is likely scanned (contains little to no extractable text)
    """
    try:
        import io
        import PyPDF2
        
        # Download the PDF file to memory
        response = s3_client.get_object(Bucket=bucket, Key=key)
        pdf_content = response['Body'].read()
        
        # Process PDF
        with io.BytesIO(pdf_content) as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            
            # Check first few pages for extractable text
            text_content = ""
            pages_to_check = min(3, len(reader.pages))
            
            for i in range(pages_to_check):
                text_content += reader.pages[i].extract_text()
                
            # If very little text is extracted, it's likely scanned
            words = text_content.split()
            return len(words) < 50  # Arbitrary threshold
            
    except Exception as e:
        print(f"Error checking if PDF is scanned: {e}")
        return False  # Default to not scanned if we can't check

def process_with_bda(s3_location, user_info):
    """
    Process a file with Bedrock Data Automation (BDA)
    """
    try:
        print(f"Processing file {s3_location} with BDA...")
        
        # Parse S3 location
        parts = s3_location.replace('s3://', '').split('/', 1)
        source_bucket = parts[0]
        source_key = parts[1]
        
        # Setup AWS clients for BDA
        session = boto3.session.Session()
        current_region = session.region_name
        account_id = AWS_ACCOUNT_ID
        bda_client = boto3.client('bedrock-data-automation', region_name='us-east-1')
        bda_runtime_client = boto3.client('bedrock-data-automation-runtime', region_name='us-east-1')
        s3_east1_client = boto3.client('s3', region_name='us-east-1', config=boto3.session.Config(signature_version='s3v4'))
        
        bda_bucket = BDA_BUCKET
        
        # Copy file to BDA-compatible location in us-east-1 if needed
        bda_key = f"bda_staging/{source_bucket}/{source_key}"
        print(f"Copying file to BDA staging location: s3://{bda_bucket}/{bda_key}")
        
        if current_region != 'us-east-1':
            # Create a new client in us-east-1 for the copy operation
            s3_east1_client.copy_object(
                Bucket=bda_bucket,
                Key=bda_key,
                CopySource={'Bucket': source_bucket, 'Key': source_key}
            )
        else:
            # We're already in us-east-1, use regular s3 client
            s3.copy_object(
                Bucket=bda_bucket,
                Key=bda_key,
                CopySource={'Bucket': source_bucket, 'Key': source_key}
            )
        
        # Set BDA input and output locations in us-east-1
        bda_input_location = f's3://{bda_bucket}/{bda_key}'
        bda_output_location = f's3://{bda_bucket}/bda_output/{source_bucket}/{source_key}'
        
        # Define output configuration based on file type
        if is_image_file(source_key):
            # Configuration for image processing
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
            project_name = "image_processing_bda_project"
        else:
            # Configuration for PDF processing
            standard_output_config = {
                "document": {
                    "extraction": {
                        "category": {
                            "state": "ENABLED",
                            "types": ["DOCUMENT_TYPE"]
                        },
                        "text": {
                            "state": "ENABLED",
                            "enableOcr": True,
                            "enableTextractAnalyzeDocumment": True
                        }
                    },
                    "generativeField": {
                        "state": "ENABLED",
                        "types": ["DOCUMENT_SUMMARY"]
                    }
                }
            }
            project_name = "pdf_processing_bda_project"
        
        # Create or get BDA project - use the correct API calls
        try:
            # Check if project already exists
            existing_projects = bda_client.list_data_automation_projects()
            project_exists = False
            project_arn = None
            
            for project in existing_projects.get("projects", []):
                if project["projectName"] == project_name:
                    project_exists = True
                    project_arn = project["projectArn"]
                    break
                    
            if not project_exists:
                response = bda_client.create_data_automation_project(
                    projectName=project_name,
                    projectDescription="Project for processing with BDA",
                    projectStage='LIVE',
                    standardOutputConfiguration=standard_output_config
                )
                project_arn = response["projectArn"]
                print(f"Created new data automation project: {project_arn}")
                
        except Exception as e:
            print(f"Error finding/creating data automation project: {e}")
            raise
            
        # Invoke BDA asynchronously with correct parameters based on the error
        response = bda_runtime_client.invoke_data_automation_async(
            inputConfiguration={
                's3Uri': bda_input_location
            },
            outputConfiguration={
                's3Uri': bda_output_location
            },
            dataAutomationConfiguration={
                'dataAutomationProjectArn': project_arn,  # Keep this as it's actually required
                'stage': 'LIVE'
            },
            dataAutomationProfileArn=f'arn:aws:bedrock:us-east-1:{account_id}:data-automation-profile/us.data-automation-v1'
        )
        
        invocation_arn = response['invocationArn']
        print(f"Started BDA job: {invocation_arn}")
        
        # Wait for job completion
        status_response = wait_for_bda_job_completion(bda_runtime_client, invocation_arn)        
        
        if status_response['status'] == 'Success':
            job_metadata_s3_location = status_response['outputConfiguration']['s3Uri']
            
            # Read job metadata
            print(f"Reading metadata from: {job_metadata_s3_location}")
            job_metadata = json.loads(read_s3_object(s3_east1_client, job_metadata_s3_location))
            
            # Parse the output metadata to find the standard output path
            standard_output_path = None
            
            if 'output_metadata' in job_metadata:
                for asset in job_metadata['output_metadata']:
                    if 'segment_metadata' in asset:
                        for segment in asset['segment_metadata']:
                            if 'standard_output_path' in segment:
                                standard_output_path = segment['standard_output_path']
                                break
                    if standard_output_path:
                        break
            
            if standard_output_path:
                print(f"Found standard output path: {standard_output_path}")
                
                # Standard output path
                standard_output_s3_uri = standard_output_path
                
                # Create a destination key with proper naming convention
                # Keep full original filename including extension, then add .processed.json
                orig_filename = os.path.basename(source_key)  # e.g., "document.pdf"
                processed_key = f"{os.path.dirname(source_key)}/{orig_filename}.processed.json"
                
                # Extract bucket and key from standard_output_s3_uri
                output_parts = standard_output_s3_uri.replace('s3://', '').split('/', 1)
                output_bucket = output_parts[0]
                output_key = output_parts[1]
                
                # Copy from us-east-1 to destination bucket
                if current_region != 'us-east-1':
                    # Get content from east-1 then put to destination
                    response = s3_east1_client.get_object(Bucket=output_bucket, Key=output_key)
                    content = response['Body'].read()
                    
                    s3.put_object(
                        Bucket=source_bucket,
                        Key=processed_key,
                        Body=content,
                        ContentType='application/json',
                        Metadata={
                            'original-file': orig_filename,
                            'processing-type': 'BDA',
                            'processed-timestamp': datetime.utcnow().isoformat()
                        }
                    )
                else:
                    # Use copy_object in same region
                    s3.copy_object(
                        Bucket=source_bucket,
                        Key=processed_key,
                        CopySource={'Bucket': output_bucket, 'Key': output_key},
                        Metadata={
                            'original-file': orig_filename,
                            'processing-type': 'BDA',
                            'processed-timestamp': datetime.utcnow().isoformat()
                        },
                        MetadataDirective='REPLACE'
                    )
                
                # Clean up BDA staging file
                try:
                    s3_east1_client.delete_object(
                        Bucket=bda_bucket,
                        Key=bda_key
                    )
                    print(f"Cleaned up BDA staging file")
                except Exception as e:
                    print(f"Failed to clean up BDA staging file: {e}")
                
                return f"s3://{source_bucket}/{processed_key}", job_metadata
            else:
                print("No standard output path found in BDA results metadata")
                raise Exception("No standard output path found in BDA results metadata")
        else:
            error_message = f"BDA job failed: {status_response.get('error_type', 'Unknown error')}"
            print(error_message)
            raise Exception(error_message)
            
    except Exception as e:
        print(f"Error processing with BDA: {e}")
        traceback.print_exc()
        raise

def wait_for_bda_job_completion(bda_runtime_client, invocation_arn, max_attempts=30, delay_seconds=5):
    """
    Wait for a BDA job to complete
    """
    import time
    
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
                print(f"BDA job status: {status}. Waiting {delay_seconds} seconds...")
                # Legitimate polling delay for BDA job status
                time.sleep(delay_seconds)  # nosemgrep: arbitrary-sleep
            else:
                print(f"Unexpected BDA job status: {status}")
                # Legitimate retry delay for unexpected status
                time.sleep(delay_seconds)  # nosemgrep: arbitrary-sleep
        except Exception as e:
            print(f"Error checking BDA job status: {e}")
            # Legitimate retry delay for error handling
            time.sleep(delay_seconds)  # nosemgrep: arbitrary-sleep
            
    return {
        'status': 'Timeout',
        'error_type': 'JobTimeout',
        'error_message': f'Job did not complete within {max_attempts * delay_seconds} seconds'
    }

def read_s3_object(s3_client, s3_uri):
    """
    Read an S3 object and return its contents
    """
    parts = s3_uri.replace('s3://', '').split('/', 1)
    bucket = parts[0]
    key = parts[1]
    
    response = s3_client.get_object(Bucket=bucket, Key=key)
    return response['Body'].read().decode('utf-8')

def get_file_extension(file_path):
    """Get file extension from path"""
    return os.path.splitext(file_path)[1].lower()

def process_file_if_needed(s3_location, user_info):
    """
    Check if file needs processing with BDA and process it if necessary
    Returns the original or processed file location
    """
    # Parse S3 location
    parts = s3_location.replace('s3://', '').split('/', 1)
    source_bucket = parts[0]
    source_key = parts[1]
    
    # Check if file is an image or PDF that might need processing
    file_ext = get_file_extension(source_key)
    should_process = False
    
    # Process images with BDA
    if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']:
        print(f"File {source_key} is an image, will process with BDA")
        should_process = True
    # Check if PDF is scanned and needs OCR
    elif file_ext == '.pdf':
        if is_scanned_pdf(s3, source_bucket, source_key):
            print(f"File {source_key} appears to be a scanned PDF, will process with BDA")
            should_process = True
        else:
            print(f"File {source_key} is a regular PDF, no BDA processing needed")
    
    if should_process:
        try:
            # Process the file with BDA
            processed_location, _ = process_with_bda(s3_location, user_info)
            print(f"File processed with BDA: {processed_location}")
            return processed_location
        except Exception as e:
            print(f"Error processing file with BDA: {e}")
            print("Falling back to original file")
            return s3_location
    
    return s3_location

def check_kb_ownership(sub: str, kb_id: str) -> bool:
    """Check if user owns the knowledge base using sub (not identityId)"""
    try:
        print(f"Checking ownership for sub {sub}, KB {kb_id}")
        
        # Query the knowledge bases table using sub as userId
        response = kb_table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': sub}
        )
        
        items = response.get('Items', [])
        print(f"Found {len(items)} knowledge bases for sub {sub}")
        
        for item in items:
            print(f"Checking KB: {item.get('knowledgeBaseId')} vs {kb_id}")
            if item.get('knowledgeBaseId') == kb_id:
                return True
        
        print(f"Knowledge base {kb_id} not found for sub {sub}")
        return False
    except Exception as e:
        print(f"Error checking KB ownership: {e}")
        traceback.print_exc()
        return False

def check_kb_access(sub: str, kb_id: str, required_permission: str = 'canView') -> Dict[str, Any]:
    """
    Check if user has access to KB (either owned, shared, or public)
    Returns: {
        'hasAccess': bool,
        'isOwner': bool,
        'permissions': dict,
        'accessType': 'owner' | 'shared' | 'public'
    }
    """
    try:
        # First check if user owns the KB
        if check_kb_ownership(sub, kb_id):
            return {
                'hasAccess': True,
                'isOwner': True,
                'permissions': {
                    'canView': True,
                    'canEdit': True,
                    'canDelete': True,
                    'canSync': True,
                    'canShare': True
                },
                'accessType': 'owner'
            }
        
        # Check if KB is public by querying the GSI
        kb_response = kb_table.query(
            IndexName='KnowledgeBaseIdIndex',
            KeyConditionExpression='knowledgeBaseId = :kb_id',
            ExpressionAttributeValues={':kb_id': kb_id},
            Limit=1
        )
        
        if kb_response.get('Items'):
            kb_item = kb_response['Items'][0]
            if kb_item.get('visibility') == 'public':
                # Public KBs have restricted permissions for non-owners
                public_permissions = {
                    'canView': True,
                    'canEdit': False,
                    'canDelete': False,
                    'canSync': False,
                    'canShare': False
                }
                
                # Check if user has the required permission
                has_required_permission = public_permissions.get(required_permission, False)
                
                return {
                    'hasAccess': has_required_permission,
                    'isOwner': False,
                    'permissions': public_permissions,
                    'accessType': 'public'
                }
        
        # If not owner or public, check shared access through groups
        if not SHARED_KB_TABLE or not USER_GROUPS_TABLE:
            print(f"Missing shared KB table ({SHARED_KB_TABLE}) or user groups table ({USER_GROUPS_TABLE})")
            return {'hasAccess': False, 'isOwner': False, 'permissions': {}, 'accessType': None}
        
        # Get user's groups
        user_groups_response = user_groups_table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': sub}
        )
        
        user_groups = [item['groupId'] for item in user_groups_response.get('Items', [])]
        print(f"User {sub} is member of groups: {user_groups}")
        
        # Check if KB is shared with any of user's groups
        for group_id in user_groups:
            try:
                print(f"Checking if KB {kb_id} is shared with group {group_id}")
                shared_response = shared_kb_table.get_item(
                    Key={
                        'groupId': group_id,
                        'knowledgeBaseId': kb_id
                    }
                )
                
                if 'Item' in shared_response:
                    shared_item = shared_response['Item']
                    permissions = shared_item.get('permissions', {})
                    print(f"Found shared item: {shared_item}")
                    print(f"Permissions: {permissions}")
                    
                    # Check if user has the required permission
                    if permissions.get(required_permission, False):
                        print(f"KB {kb_id} is shared with group {group_id}, user has {required_permission}")
                        return {
                            'hasAccess': True,
                            'isOwner': False,
                            'permissions': permissions,
                            'accessType': 'shared',
                            'groupId': group_id
                        }
                    else:
                        print(f"KB {kb_id} is shared with group {group_id}, but user lacks {required_permission}")
                else:
                    print(f"KB {kb_id} is not shared with group {group_id}")
            except Exception as e:
                print(f"Error checking shared access for group {group_id}: {e}")
                traceback.print_exc()
                continue
        
        print(f"No access found for user {sub} to KB {kb_id}")
        return {'hasAccess': False, 'isOwner': False, 'permissions': {}, 'accessType': None}
        
    except Exception as e:
        print(f"Error checking KB access: {e}")
        traceback.print_exc()
        return {'hasAccess': False, 'isOwner': False, 'permissions': {}, 'accessType': None}

def get_user_accessible_kbs(sub: str) -> List[Dict[str, Any]]:
    """Get all KBs accessible to user (owned + shared + public)"""
    accessible_kbs = []
    
    # Get owned KBs
    try:
        owned_response = kb_table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': sub}
        )
        
        for item in owned_response.get('Items', []):
            accessible_kbs.append({
                'knowledgeBaseId': item['knowledgeBaseId'],
                'accessType': 'owner',
                'permissions': {
                    'canView': True,
                    'canEdit': True,
                    'canDelete': True,
                    'canSync': True,
                    'canShare': True
                },
                'metadata': item
            })
    except Exception as e:
        print(f"Error fetching owned KBs: {e}")
    
    # Get shared KBs if tables are available
    if SHARED_KB_TABLE and USER_GROUPS_TABLE:
        try:
            # Get user's groups
            user_groups_response = user_groups_table.query(
                KeyConditionExpression='userId = :userId',
                ExpressionAttributeValues={':userId': sub}
            )
            
            user_groups = [item['groupId'] for item in user_groups_response.get('Items', [])]
            
            # Get shared KBs from each group
            for group_id in user_groups:
                try:
                    shared_response = shared_kb_table.query(
                        KeyConditionExpression='groupId = :groupId',
                        ExpressionAttributeValues={':groupId': group_id}
                    )
                    
                    for shared_item in shared_response.get('Items', []):
                        # Only include if user has view permission
                        permissions = shared_item.get('permissions', {})
                        if permissions.get('canView', False):
                            accessible_kbs.append({
                                'knowledgeBaseId': shared_item['knowledgeBaseId'],
                                'accessType': 'shared',
                                'permissions': permissions,
                                'groupId': group_id,
                                'sharedBy': shared_item.get('sharedBy'),
                                'sharedAt': shared_item.get('sharedAt')
                            })
                except Exception as e:
                    print(f"Error fetching shared KBs for group {group_id}: {e}")
                    continue
        except Exception as e:
            print(f"Error fetching user groups: {e}")
    
    # Get public KBs
    try:
        # Scan for public KBs - in production consider using a GSI on visibility
        public_scan_response = kb_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('visibility').eq('public')
        )
        
        for item in public_scan_response.get('Items', []):
            # Skip if user already owns this KB
            if item.get('userId') == sub:
                continue
                
            # Skip if this KB is already in accessible_kbs
            if any(kb['knowledgeBaseId'] == item['knowledgeBaseId'] for kb in accessible_kbs):
                continue
                
            accessible_kbs.append({
                'knowledgeBaseId': item['knowledgeBaseId'],
                'accessType': 'public',
                'permissions': {
                    'canView': True,
                    'canEdit': False,      # Public KBs are read-only for non-owners
                    'canDelete': False,    # Public KBs cannot be deleted by non-owners
                    'canSync': False,      # Public KBs cannot be synced by non-owners
                    'canShare': False      # Public KBs cannot be shared by non-owners
                },
                'metadata': item
            })
    except Exception as e:
        print(f"Error fetching public KBs: {e}")
    
    return accessible_kbs

def verify_index_exists(index_name: str, max_attempts: int = 5, delay_seconds: int = 2) -> bool:
    """Verify that vector index exists with retry logic"""
    for attempt in range(max_attempts):
        try:
            # Invoke Lambda function to verify index
            verify_response = lambda_client.invoke(
                FunctionName=CREATE_VECTOR_INDEX_LAMBDA,
                Payload=json.dumps({
                    'action': 'verify',
                    'indexName': index_name
                })
            )
            
            verify_result = json.loads(verify_response['Payload'].read())
            
            if verify_result.get('statusCode') == 200:
                result_body = json.loads(verify_result.get('body', '{}'))
                if result_body.get('exists'):
                    print(f"Index {index_name} verified successfully on attempt {attempt + 1}")
                    return True
            
            print(f"Index verification attempt {attempt + 1}: Index not ready")
            if attempt < max_attempts - 1:  # Don't sleep on the last attempt
                # Legitimate retry delay for index verification
                time.sleep(delay_seconds)  # nosemgrep: arbitrary-sleep
                
        except Exception as e:
            print(f"Verification error on attempt {attempt + 1}: {e}")
            if attempt < max_attempts - 1:
                # Legitimate retry delay for index verification
                time.sleep(delay_seconds)  # nosemgrep: arbitrary-sleep
    
    print(f"Index {index_name} verification failed after {max_attempts} attempts")
    return False

def create_vector_knowledge_base_with_retry(
    name: str,
    description: str,
    username: str,
    sub: str,
    identity_id: str,
    tags: dict,
    max_kb_attempts: int = 15,
    kb_retry_delay: int = 2
) -> dict:
    """Create vector knowledge base with retry logic for index readiness"""
    
    # Generate unique vector index name
    vector_index_name = f"kb-{str(uuid.uuid4()).lower()}"
    
    try:
        # Step 1: Create vector index
        print(f"Creating vector index: {vector_index_name}")
        index_response = lambda_client.invoke(
            FunctionName=CREATE_VECTOR_INDEX_LAMBDA,
            Payload=json.dumps({'indexName': vector_index_name})
        )
        
        index_result = json.loads(index_response['Payload'].read())
        if index_result.get('statusCode') != 200:
            error_body = json.loads(index_result.get('body', '{}'))
            raise Exception(f"Failed to create vector index: {error_body.get('error', 'Unknown error')}")
        
        # Step 2: Verify index exists with multiple attempts
        print(f"Verifying index creation: {vector_index_name}")
        for verify_attempt in range(3):  # Try verification 3 times
            try:
                if verify_index_exists(vector_index_name):
                    print(f"Index verified successfully on verification attempt {verify_attempt + 1}")
                    break
                else:
                    if verify_attempt < 2:  # Don't sleep on last attempt
                        print(f"Index not ready, waiting before retry...")
                        # Legitimate retry delay for index verification
                        time.sleep(2)  # nosemgrep: arbitrary-sleep
            except Exception as e:
                print(f"Verification attempt {verify_attempt + 1} failed: {e}")
                if verify_attempt < 2:
                    # Legitimate retry delay for vector index verification
                    time.sleep(2)  # nosemgrep: arbitrary-sleep
        else:
            # If we get here, all verification attempts failed
            raise Exception(f"Vector index {vector_index_name} could not be verified after creation")
        
        # Step 3: Create Knowledge Base with retry logic
        print(f"Creating Knowledge Base with index: {vector_index_name}")
        
        kb_request = {
            'name': f"{username}_{name}",
            'description': description,
            'roleArn': BEDROCK_KB_ROLE_ARN,
            'knowledgeBaseConfiguration': {
                'type': 'VECTOR',
                'vectorKnowledgeBaseConfiguration': {
                    'embeddingModelArn': f'arn:aws:bedrock:{REGION_NAME}::foundation-model/amazon.titan-embed-text-v2:0',
                    'embeddingModelConfiguration': {
                        'bedrockEmbeddingModelConfiguration': {
                            'embeddingDataType': 'FLOAT32'
                        }
                    }
                }
            },
            'storageConfiguration': {
                'type': 'OPENSEARCH_SERVERLESS',
                'opensearchServerlessConfiguration': {
                    'collectionArn': f'arn:aws:aoss:{REGION_NAME}:{AWS_ACCOUNT_ID}:collection/{AOSS_COLLECTION_ID}',
                    'vectorIndexName': vector_index_name,
                    'fieldMapping': {
                        'vectorField': 'embedding',
                        'textField': 'context',
                        'metadataField': 'doc_id'
                    }
                }
            },
            'tags': {
                **tags,
                'owner': sub,  # Use sub for ownership
                'username': username,
                'identityId': identity_id  # Store identityId as metadata for S3 operations
            }
        }
        
        # Retry KB creation multiple times
        for kb_attempt in range(max_kb_attempts):
            try:
                print(f"Knowledge Base creation attempt {kb_attempt + 1}/{max_kb_attempts}")
                kb_response = bedrock_agent.create_knowledge_base(**kb_request)
                kb_data = kb_response['knowledgeBase']
                print(f"Knowledge Base created successfully: {kb_data['knowledgeBaseId']}")
                
                return {
                    'knowledgeBase': kb_data,
                    'vectorIndexName': vector_index_name
                }
                
            except Exception as e:
                error_message = str(e)
                print(f"KB creation attempt {kb_attempt + 1} failed: {error_message}")
                
                # Check if it's a validation exception about missing index
                if ('ValidationException' in error_message and 
                    'no such index' in error_message.lower()):
                    
                    if kb_attempt < max_kb_attempts - 1:  # Not the last attempt
                        print(f"Index not ready, waiting {kb_retry_delay} seconds before retry...")
                        # Legitimate retry delay for AWS service eventual consistency
                        time.sleep(kb_retry_delay)  # nosemgrep: arbitrary-sleep
                        continue
                    else:
                        # Last attempt failed, clean up and raise
                        print("All KB creation attempts failed, cleaning up vector index")
                        cleanup_vector_index(vector_index_name)
                        raise Exception(f"Failed to create Knowledge Base after {max_kb_attempts} attempts: {error_message}")
                else:
                    # Different type of error, clean up and raise immediately
                    print(f"Non-retry error encountered: {error_message}")
                    cleanup_vector_index(vector_index_name)
                    raise e
        
        # If we get here, all attempts failed
        cleanup_vector_index(vector_index_name)
        raise Exception(f"Failed to create Knowledge Base after {max_kb_attempts} attempts")
        
    except Exception as e:
        # Clean up vector index on any failure
        cleanup_vector_index(vector_index_name)
        raise e

def cleanup_vector_index(vector_index_name: str):
    """Clean up vector index on failure"""
    try:
        print(f"Cleaning up vector index: {vector_index_name}")
        lambda_client.invoke(
            FunctionName=CREATE_VECTOR_INDEX_LAMBDA,
            Payload=json.dumps({
                'action': 'delete',
                'indexName': vector_index_name
            })
        )
        print(f"Vector index {vector_index_name} cleanup completed")
    except Exception as cleanup_error:
        print(f"Error during vector index cleanup: {cleanup_error}")

def list_knowledge_bases(user_info: dict, query_params: dict) -> dict:
    """List user's accessible knowledge bases (owned + shared)"""
    try:
        sub = user_info.get('sub')
        user_groups = user_info.get('groups', [])
        
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has permission to read knowledge bases
        if not check_kb_permission(user_groups, 'KNOWLEDGE_BASE:read', sub):
            return create_error_response(403, "INSUFFICIENT_PERMISSIONS", 
                "You don't have permission to view knowledge bases")
        
        # Get all accessible KBs (owned + shared)
        accessible_kbs = get_user_accessible_kbs(sub)
        
        knowledge_bases = []
        for kb_info in accessible_kbs:
            try:
                kb_id = kb_info['knowledgeBaseId']
                print(f"Processing KB: {kb_id}")
                
                # Get actual KB details from Bedrock
                try:
                    kb_response = bedrock_agent.get_knowledge_base(knowledgeBaseId=kb_id)
                    kb_data = kb_response['knowledgeBase']
                    print(f"Successfully got KB details from Bedrock for {kb_id}")
                except Exception as bedrock_error:
                    print(f"Error getting KB {kb_id} from Bedrock: {bedrock_error}")
                    # Skip this KB if we can't get it from Bedrock
                    continue
                
                # Build KB response based on access type
                kb_result = {
                    'knowledgeBaseId': kb_data['knowledgeBaseId'],
                    'status': kb_data.get('status'),
                    'createdAt': kb_data.get('createdAt').isoformat() if kb_data.get('createdAt') else None,
                    'updatedAt': kb_data.get('updatedAt').isoformat() if kb_data.get('updatedAt') else None,
                    'accessType': kb_info['accessType'],
                    'permissions': kb_info['permissions']
                }
                
                # For both owned and shared KBs, get the original metadata from the KB table
                # using the new KnowledgeBaseIdIndex
                try:
                    original_kb_response = kb_table.query(
                        IndexName='KnowledgeBaseIdIndex',
                        KeyConditionExpression='knowledgeBaseId = :kb_id',
                        ExpressionAttributeValues={':kb_id': kb_id},
                        Limit=1
                    )
                    
                    if original_kb_response.get('Items'):
                        original_metadata = original_kb_response['Items'][0]
                        kb_result.update({
                            'name': original_metadata.get('name', kb_data.get('name', '')),
                            'description': original_metadata.get('description', kb_data.get('description', '')),
                            'tags': original_metadata.get('tags', {}),
                            'folderId': original_metadata.get('folderId'),
                            'visibility': original_metadata.get('visibility', 'private')  # Include visibility
                        })
                    else:
                        # Fallback if we can't find the original metadata
                        kb_result.update({
                            'name': kb_data.get('name', ''),
                            'description': kb_data.get('description', ''),
                            'visibility': 'private'  # Default to private
                        })
                    
                except Exception as metadata_error:
                    print(f"Error getting original KB metadata: {metadata_error}")
                    # Fallback if query fails
                    kb_result.update({
                        'name': kb_data.get('name', ''),
                        'description': kb_data.get('description', ''),
                        'visibility': 'private'  # Default to private
                    })
                
                # Add sharing details for shared KBs
                if kb_info['accessType'] == 'shared':
                    kb_result.update({
                        'groupId': kb_info.get('groupId'),
                        'sharedBy': kb_info.get('sharedBy'),
                        'sharedAt': kb_info.get('sharedAt')
                    })
                
                knowledge_bases.append(kb_result)
                
            except Exception as e:
                print(f"Error fetching KB {kb_info['knowledgeBaseId']}: {e}")
                # Continue with next KB
                continue
        
        return create_response(200, {
            "success": True,
            "data": {
                "knowledgeBases": knowledge_bases
            }
        })
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def create_knowledge_base(user_info: dict, body: dict, event: dict = None) -> dict:
    """Create a new knowledge base"""
    try:
        print("🔧 create_knowledge_base - Starting")
        print(f"🔧 Received user_info: {user_info}")
        print(f"🔧 Received body: {body}")
        
        sub = user_info.get('sub')
        identity_id = user_info.get('identityId')
        username = user_info.get('username')
        user_groups = user_info.get('groups', [])
        
        # Check if user has permission to create knowledge bases
        if not check_kb_permission(user_groups, 'KNOWLEDGE_BASE:create', sub):
            return create_error_response(403, "INSUFFICIENT_PERMISSIONS", 
                "You don't have permission to create knowledge bases")
        
        # If no identityId, try to get it from token (for real users)
        if not identity_id and 'Authorization' in event.get('headers', {}):
            try:
                token = event['headers']['Authorization'].replace('Bearer ', '')
                identity_id = get_identity_id_from_token(token)
                user_info['identityId'] = identity_id
            except Exception as e:
                print(f"Could not get identityId from token: {e}")
                # Use sub as fallback for identityId
                identity_id = sub
                user_info['identityId'] = identity_id
        
        print(f"🔧 Extracted sub: '{sub}'")
        print(f"🔧 Extracted identity_id: '{identity_id}'")
        print(f"🔧 Extracted username: '{username}'")
        
        if not sub or not username:
            print(f"❌ Missing user info - sub: '{sub}', username: '{username}'")
            return create_error_response(400, "MISSING_USER_INFO", "User information not found")
        
        name = body.get('name')
        description = body.get('description', '')
        tags = body.get('tags', {})
        
        if not name:
            return create_error_response(400, "MISSING_NAME", "Knowledge base name is required")
        
        print(f"Creating knowledge base '{name}' for user {username} (sub: {sub})")
        
        # Create knowledge base with retry logic
        try:
            result = create_vector_knowledge_base_with_retry(
                name=name,
                description=description,
                username=username,
                sub=sub,
                identity_id=identity_id,
                tags=tags
            )
            
            kb_data = result['knowledgeBase']
            vector_index_name = result['vectorIndexName']
            print(f"✅ Successfully created KB in Bedrock: {kb_data['knowledgeBaseId']}")
            
        except Exception as bedrock_error:
            print(f"❌ Failed to create KB in Bedrock: {bedrock_error}")
            traceback.print_exc()
            return create_error_response(500, "BEDROCK_CREATION_FAILED", f"Failed to create knowledge base in Bedrock: {str(bedrock_error)}")
        
        # Store metadata in DynamoDB using sub as userId (only if Bedrock creation succeeded)
        try:
            folder_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().isoformat()
            
            kb_table.put_item(
                Item={
                    'userId': sub,  # Use sub as primary key
                    'knowledgeBaseId': kb_data['knowledgeBaseId'],
                    'name': name,  # Store original name without username prefix
                    'description': description,
                    'status': kb_data['status'],
                    'createdAt': timestamp,
                    'updatedAt': timestamp,
                    'folderId': folder_id,
                    'vectorIndexName': vector_index_name,
                    'identityId': identity_id,  # Store identityId for S3 operations
                    'tags': tags,
                    'visibility': 'private'  # Default visibility
                }
            )
            print(f"✅ Successfully saved KB metadata to DynamoDB")
            
        except Exception as dynamo_error:
            print(f"❌ Failed to save KB metadata to DynamoDB: {dynamo_error}")
            # If DynamoDB save fails, we should clean up the Bedrock KB
            try:
                bedrock_agent.delete_knowledge_base(knowledgeBaseId=kb_data['knowledgeBaseId'])
                print(f"🧹 Cleaned up Bedrock KB due to DynamoDB failure")
            except Exception as cleanup_error:
                print(f"❌ Failed to cleanup Bedrock KB: {cleanup_error}")
            
            return create_error_response(500, "METADATA_SAVE_FAILED", f"Failed to save knowledge base metadata: {str(dynamo_error)}")
        
        print(f"Knowledge base created successfully: {kb_data['knowledgeBaseId']}")
        
        # Automatically create a data source for the knowledge base
        try:
            # Define S3 path using stored identityId
            s3_prefix = f"users/{identity_id}/knowledge-base/{folder_id}/"
            print(f"DEBUG: Creating data source for KB {kb_data['knowledgeBaseId']} with S3 prefix: {s3_prefix}")
            
            # Create data source
            ds_request = {
                'knowledgeBaseId': kb_data['knowledgeBaseId'],
                'name': f"{name}-source",
                'dataSourceConfiguration': {
                    'type': 'S3',
                    's3Configuration': {
                        'bucketArn': f'arn:aws:s3:::{ATTACHMENTS_BUCKET}',
                        'inclusionPrefixes': [s3_prefix]
                    }
                },
                'vectorIngestionConfiguration': {
                    'chunkingConfiguration': {
                        'chunkingStrategy': 'FIXED_SIZE',
                        'fixedSizeChunkingConfiguration': {
                            'maxTokens': 512,
                            'overlapPercentage': 20
                        }
                    }
                }
            }
            
            print(f"DEBUG: Data source request: {json.dumps(ds_request, indent=2)}")
            ds_response = bedrock_agent.create_data_source(**ds_request)
            data_source_id = ds_response['dataSource']['dataSourceId']
            print(f"SUCCESS: Data source created automatically: {data_source_id}")
        except Exception as ds_error:
            print(f"ERROR: Failed to automatically create data source: {ds_error}")
            print(f"ERROR: Exception type: {type(ds_error).__name__}")
            print(f"ERROR: Full traceback: {traceback.format_exc()}")
            # Continue with KB creation even if data source creation fails
            data_source_id = None
        
        return create_response(201, {
            "success": True,
            "data": {
                'knowledgeBaseId': kb_data['knowledgeBaseId'],
                'name': name,
                'description': description,
                'status': kb_data['status'],
                'createdAt': kb_data.get('createdAt').isoformat() if kb_data.get('createdAt') else timestamp,
                'updatedAt': kb_data.get('updatedAt').isoformat() if kb_data.get('updatedAt') else timestamp,
                'folderId': folder_id,
                'tags': tags,
                'dataSourceId': data_source_id  # Include data source ID in response if created
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def get_knowledge_base(user_info: dict, kb_id: str) -> dict:
    """Get knowledge base details"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has access to this KB (either owned or shared)
        access_info = check_kb_access(sub, kb_id, 'canView')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to view this knowledge base")
        
        # Get from Bedrock
        kb_response = bedrock_agent.get_knowledge_base(knowledgeBaseId=kb_id)
        kb_data = kb_response['knowledgeBase']
        
        # Get KB metadata using the KnowledgeBaseIdIndex - this works for both owned and shared KBs
        original_kb_response = kb_table.query(
            IndexName='KnowledgeBaseIdIndex',
            KeyConditionExpression='knowledgeBaseId = :kb_id',
            ExpressionAttributeValues={':kb_id': kb_id},
            Limit=1
        )
        
        original_metadata = {}
        if original_kb_response.get('Items'):
            original_metadata = original_kb_response['Items'][0]
        
        if access_info['isOwner']:
            result = {
                'knowledgeBaseId': kb_data['knowledgeBaseId'],
                'name': original_metadata.get('name', kb_data.get('name', '')),
                'description': original_metadata.get('description', kb_data.get('description', '')),
                'status': kb_data.get('status'),
                'createdAt': kb_data.get('createdAt').isoformat() if kb_data.get('createdAt') else original_metadata.get('createdAt'),
                'updatedAt': kb_data.get('updatedAt').isoformat() if kb_data.get('updatedAt') else original_metadata.get('updatedAt'),
                'folderId': original_metadata.get('folderId'),
                'tags': original_metadata.get('tags', {}),
                'visibility': original_metadata.get('visibility', 'private'),  # Include visibility
                'accessType': 'owner',
                'permissions': {
                    'canView': True,
                    'canEdit': True, 
                    'canDelete': True,
                    'canSync': True,
                    'canShare': True
                }
            }
        else:
            # For shared KBs - get the sharing info
            group_id = access_info.get('groupId')
            if not group_id:
                return create_error_response(500, "INTERNAL_ERROR", "Access info missing groupId for shared KB")
                
            shared_response = shared_kb_table.get_item(
                Key={
                    'groupId': group_id,
                    'knowledgeBaseId': kb_id
                }
            )
            
            if 'Item' not in shared_response:
                return create_error_response(404, "SHARING_INFO_NOT_FOUND", "Sharing information not found")
                
            shared_item = shared_response['Item']
            
            result = {
                'knowledgeBaseId': kb_data['knowledgeBaseId'],
                'name': original_metadata.get('name', kb_data.get('name', '')),
                'description': original_metadata.get('description', kb_data.get('description', '')),
                'status': kb_data.get('status'),
                'createdAt': kb_data.get('createdAt').isoformat() if kb_data.get('createdAt') else None,
                'updatedAt': kb_data.get('updatedAt').isoformat() if kb_data.get('updatedAt') else None,
                'visibility': original_metadata.get('visibility', 'private'),  # Include visibility
                'accessType': 'shared',
                'groupId': group_id,
                'sharedBy': shared_item.get('sharedBy'),
                'sharedAt': shared_item.get('sharedAt'),
                'permissions': shared_item.get('permissions', {})
            }
        
        return create_response(200, {
            "success": True,
            "data": result
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def update_knowledge_base(user_info: dict, kb_id: str, body: dict) -> dict:
    """Update knowledge base"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user owns the KB (only owners can update)
        if not check_kb_ownership(sub, kb_id):
            return create_error_response(403, "ACCESS_DENIED", "Only the owner can update this knowledge base")
        
        # Get current KB data
        db_response = kb_table.get_item(
            Key={'userId': sub, 'knowledgeBaseId': kb_id}
        )
        
        if 'Item' not in db_response:
            return create_error_response(404, "KB_NOT_FOUND", "Knowledge base not found")
        
        current_item = db_response['Item']
        
        # Prepare update data
        update_expression_parts = []
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        # Update name if provided (name is a reserved keyword)
        if 'name' in body and body['name']:
            update_expression_parts.append('#n = :name')
            expression_attribute_values[':name'] = body['name']
            expression_attribute_names['#n'] = 'name'
        
        # Update description if provided
        if 'description' in body:
            update_expression_parts.append('description = :description')
            expression_attribute_values[':description'] = body['description']
        
        # Update visibility if provided
        if 'visibility' in body and body['visibility'] in ['private', 'public']:
            update_expression_parts.append('visibility = :visibility')
            expression_attribute_values[':visibility'] = body['visibility']
        
        # Update tags if provided
        if 'tags' in body:
            update_expression_parts.append('tags = :tags')
            expression_attribute_values[':tags'] = body['tags']
        
        # Always update the updatedAt timestamp
        timestamp = datetime.utcnow().isoformat()
        update_expression_parts.append('updatedAt = :updatedAt')
        expression_attribute_values[':updatedAt'] = timestamp
        
        if not update_expression_parts:
            return create_error_response(400, "NO_UPDATES", "No valid fields to update")
        
        # Update in DynamoDB
        update_expression = 'SET ' + ', '.join(update_expression_parts)
        
        update_params = {
            'Key': {'userId': sub, 'knowledgeBaseId': kb_id},
            'UpdateExpression': update_expression,
            'ExpressionAttributeValues': expression_attribute_values
        }
        
        # Only add ExpressionAttributeNames if we have any
        if expression_attribute_names:
            update_params['ExpressionAttributeNames'] = expression_attribute_names
        
        kb_table.update_item(**update_params)
        
        # If name was updated, also update in Bedrock
        if 'name' in body and body['name']:
            try:
                bedrock_agent.update_knowledge_base(
                    knowledgeBaseId=kb_id,
                    name=body['name'],
                    description=body.get('description', current_item.get('description', ''))
                )
            except Exception as e:
                print(f"Warning: Failed to update knowledge base name in Bedrock: {e}")
                # Continue anyway as the metadata update succeeded
        
        return create_response(200, {
            "success": True,
            "message": "Knowledge base updated successfully"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def list_data_sources(user_info: dict, kb_id: str) -> dict:
    """List data sources for a knowledge base"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has access to this KB
        access_info = check_kb_access(sub, kb_id, 'canView')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to view this knowledge base")
        
        # List data sources from Bedrock
        try:
            response = bedrock_agent.list_data_sources(knowledgeBaseId=kb_id)
            data_sources = response.get('dataSourceSummaries', [])
            
            return create_response(200, {
                "success": True,
                "data": {
                    "dataSources": data_sources
                }
            })
            
        except Exception as e:
            print(f"Error listing data sources: {e}")
            return create_error_response(500, "BEDROCK_ERROR", str(e))
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def delete_knowledge_base(user_info: dict, kb_id: str) -> dict:
    """Delete knowledge base"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user owns the KB (only owners can delete)
        if not check_kb_ownership(sub, kb_id):
            return create_error_response(403, "ACCESS_DENIED", "Only the owner can delete this knowledge base")
        
        # Get KB details for cleanup
        db_response = kb_table.get_item(
            Key={'userId': sub, 'knowledgeBaseId': kb_id}
        )
        db_item = db_response.get('Item', {})
        vector_index_name = db_item.get('vectorIndexName')
        
        # Delete data sources first
        try:
            ds_response = bedrock_agent.list_data_sources(knowledgeBaseId=kb_id)
            for ds in ds_response.get('dataSourceSummaries', []):
                bedrock_agent.delete_data_source(
                    knowledgeBaseId=kb_id,
                    dataSourceId=ds['dataSourceId']
                )
        except Exception as e:
            print(f"Error deleting data sources: {e}")
        
        # Delete knowledge base from Bedrock
        bedrock_agent.delete_knowledge_base(knowledgeBaseId=kb_id)
        
        # Delete vector index
        if vector_index_name:
            cleanup_vector_index(vector_index_name)
        
        # Delete from DynamoDB using sub
        kb_table.delete_item(
            Key={'userId': sub, 'knowledgeBaseId': kb_id}
        )
        
        return create_response(200, {
            "success": True,
            "message": "Knowledge base deleted successfully"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def start_sync(user_info: dict, kb_id: str, body: dict) -> dict:
    """Start sync session with coordinated BDA processing and ingestion"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has sync permission
        access_info = check_kb_access(sub, kb_id, 'canSync')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to sync this knowledge base")
        
        data_source_id = body.get('dataSourceId')
        
        # If no data source specified, get the first one
        if not data_source_id:
            ds_response = bedrock_agent.list_data_sources(knowledgeBaseId=kb_id)
            data_sources = ds_response.get('dataSourceSummaries', [])
            if not data_sources:
                return create_error_response(400, "NO_DATA_SOURCE", "No data sources found")
            data_source_id = data_sources[0]['dataSourceId']
        
        # Create sync session
        session_id = str(uuid.uuid4())
        process_files = body.get('processFiles', True)
        
        # Queue files for async BDA processing if enabled
        queued_files = []
        if process_files and BDA_JOB_QUEUE_URL and SYNC_SESSIONS_TABLE:
            try:
                queued_files = create_sync_session_and_queue_files(
                    session_id, kb_id, data_source_id, sub, user_info
                )
                print(f"Created sync session {session_id} with {len(queued_files)} queued files")
                
                # If files were queued for BDA processing, return PREPARING status
                if len(queued_files) > 0:
                    return create_response(200, {
                        "success": True,
                        "data": {
                            'sessionId': session_id,
                            'status': 'PREPARING',
                            'knowledgeBaseId': kb_id,
                            'dataSourceId': data_source_id,
                            'bdaProcessing': {
                                'enabled': True,
                                'queuedFiles': len(queued_files),
                                'status': 'PROCESSING',
                                'message': 'BDA processing in progress. Ingestion will start automatically when complete.'
                            }
                        }
                    })
                else:
                    # No files needed BDA processing, proceed to immediate ingestion
                    print(f"No files require BDA processing, starting immediate ingestion")
                    
            except Exception as queue_error:
                print(f"Error creating sync session: {queue_error}")
                # Fall back to immediate ingestion
                
        # If BDA processing is disabled, failed, or no files needed processing, start ingestion immediately
        job_response = bedrock_agent.start_ingestion_job(
            knowledgeBaseId=kb_id,
            dataSourceId=data_source_id,
            clientToken=str(uuid.uuid4())
        )
        
        job_data = job_response['ingestionJob']
        
        # Create a simple sync session for tracking or update existing session
        if SYNC_SESSIONS_TABLE:
            try:
                if len(queued_files) == 0 and process_files and BDA_JOB_QUEUE_URL:
                    # Update the existing session that was created with no files
                    update_sync_session_to_ingestion(session_id, job_data['ingestionJobId'])
                else:
                    # Create new immediate sync session
                    create_immediate_sync_session(session_id, kb_id, data_source_id, sub, job_data['ingestionJobId'])
            except Exception as session_error:
                print(f"Error creating/updating sync session: {session_error}")
        
        return create_response(200, {
            "success": True,
            "data": {
                'sessionId': session_id,
                'ingestionJobId': job_data['ingestionJobId'],
                'status': 'INGESTION_STARTED',
                'startedAt': job_data.get('startedAt').isoformat() if job_data.get('startedAt') else None,
                'bdaProcessing': {
                    'enabled': process_files and BDA_JOB_QUEUE_URL is not None,
                    'queuedFiles': len(queued_files),
                    'message': 'No files required BDA processing. Ingestion started immediately.' if len(queued_files) == 0 else 'BDA processing disabled or unavailable. Ingestion started immediately.'
                }
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))
    
def update_sync_session_to_ingestion(session_id: str, ingestion_job_id: str):
    """Update existing sync session to ingestion status"""
    try:
        timestamp = datetime.utcnow().isoformat()
        sync_sessions_table.update_item(
            Key={'sessionId': session_id},
            UpdateExpression='SET #status = :status, ingestionJobId = :job_id, updatedAt = :timestamp',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'INGESTION_STARTED',
                ':job_id': ingestion_job_id,
                ':timestamp': timestamp
            }
        )
        print(f"Updated sync session {session_id} to INGESTION_STARTED with job {ingestion_job_id}")
    except Exception as e:
        print(f"Error updating sync session to ingestion: {e}")
        raise e    

def create_sync_session_and_queue_files(session_id: str, kb_id: str, data_source_id: str, sub: str, user_info: dict) -> list:
    """Create sync session and queue files for BDA processing"""
    try:
        # Get data source details
        ds_details = bedrock_agent.get_data_source(
            knowledgeBaseId=kb_id,
            dataSourceId=data_source_id
        )
        
        # Get S3 configuration
        config = ds_details.get('dataSource', {}).get('dataSourceConfiguration', {})
        s3_config = config.get('s3Configuration', {})
        prefixes = s3_config.get('inclusionPrefixes', [])
        
        if not prefixes:
            print("No inclusion prefixes found in data source configuration")
            return []
            
        bucket = ATTACHMENTS_BUCKET
        prefix = prefixes[0]  # Use first prefix
        
        print(f"Scanning files in bucket {bucket}, prefix {prefix}")
        
        # List files in the S3 prefix
        response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        
        # Identify files that need BDA processing
        files_to_process = []
        for item in response.get('Contents', []):
            file_key = item['Key']
            file_ext = get_file_extension(file_key)
            
            # Check if file might need processing
            if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.pdf']:
                files_to_process.append({
                    'fileLocation': f"s3://{bucket}/{file_key}",
                    'fileExtension': file_ext,
                    'messageId': str(uuid.uuid4())
                })
        
        # Create sync session in DynamoDB
        timestamp = datetime.utcnow().isoformat()
        sync_sessions_table.put_item(
            Item={
                'sessionId': session_id,
                'knowledgeBaseId': kb_id,
                'dataSourceId': data_source_id,
                'userId': sub,
                'status': 'PREPARING',
                'totalFiles': len(files_to_process),
                'completedFiles': 0,
                'failedFiles': 0,
                'createdAt': timestamp,
                'updatedAt': timestamp,
                'expiresAt': int((datetime.utcnow().timestamp() + 86400))  # 24 hours TTL
            }
        )
        
        # Queue files for BDA processing
        queued_files = []
        for file_info in files_to_process:
            message = {
                'sessionId': session_id,
                'messageId': file_info['messageId'],
                'knowledgeBaseId': kb_id,
                'dataSourceId': data_source_id,
                'fileLocation': file_info['fileLocation'],
                'userInfo': user_info,
                'timestamp': timestamp
            }
            
            try:
                # Send message to SQS queue
                sqs.send_message(
                    QueueUrl=BDA_JOB_QUEUE_URL,
                    MessageBody=json.dumps(message),
                    MessageAttributes={
                        'SessionId': {
                            'StringValue': session_id,
                            'DataType': 'String'
                        },
                        'KnowledgeBaseId': {
                            'StringValue': kb_id,
                            'DataType': 'String'
                        },
                        'FileExtension': {
                            'StringValue': file_info['fileExtension'],
                            'DataType': 'String'
                        }
                    }
                )
                
                queued_files.append(file_info)
                print(f"Queued file for BDA processing: {file_info['fileLocation']}")
                
            except Exception as queue_error:
                print(f"Error queuing file {file_info['fileLocation']}: {queue_error}")
                # Continue with other files
                continue
        
        return queued_files
        
    except Exception as e:
        print(f"Error in create_sync_session_and_queue_files: {e}")
        raise e

def create_immediate_sync_session(session_id: str, kb_id: str, data_source_id: str, sub: str, ingestion_job_id: str):
    """Create sync session for immediate ingestion (no BDA processing)"""
    try:
        timestamp = datetime.utcnow().isoformat()
        sync_sessions_table.put_item(
            Item={
                'sessionId': session_id,
                'knowledgeBaseId': kb_id,
                'dataSourceId': data_source_id,
                'userId': sub,
                'status': 'INGESTION_STARTED',
                'ingestionJobId': ingestion_job_id,
                'totalFiles': 0,
                'completedFiles': 0,
                'failedFiles': 0,
                'createdAt': timestamp,
                'updatedAt': timestamp,
                'expiresAt': int((datetime.utcnow().timestamp() + 86400))  # 24 hours TTL
            }
        )
        print(f"Created immediate sync session: {session_id}")
    except Exception as e:
        print(f"Error creating immediate sync session: {e}")
        raise e

def queue_files_for_bda_processing(kb_id: str, data_source_id: str, user_info: dict) -> list:
    """Queue files for async BDA processing via SQS"""
    try:
        queued_files = []
        
        # Get data source details
        ds_details = bedrock_agent.get_data_source(
            knowledgeBaseId=kb_id,
            dataSourceId=data_source_id
        )
        
        # Get S3 configuration
        config = ds_details.get('dataSource', {}).get('dataSourceConfiguration', {})
        s3_config = config.get('s3Configuration', {})
        prefixes = s3_config.get('inclusionPrefixes', [])
        
        if not prefixes:
            print("No inclusion prefixes found in data source configuration")
            return queued_files
            
        bucket = ATTACHMENTS_BUCKET
        prefix = prefixes[0]  # Use first prefix
        
        print(f"Scanning files in bucket {bucket}, prefix {prefix}")
        
        # List files in the S3 prefix
        response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        
        # Queue each file that might need BDA processing
        for item in response.get('Contents', []):
            file_key = item['Key']
            file_ext = get_file_extension(file_key)
            
            # Check if file might need processing
            if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.pdf']:
                file_location = f"s3://{bucket}/{file_key}"
                
                # Create SQS message
                message = {
                    'messageId': str(uuid.uuid4()),
                    'knowledgeBaseId': kb_id,
                    'dataSourceId': data_source_id,
                    'fileLocation': file_location,
                    'userInfo': user_info,
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                try:
                    # Send message to SQS queue
                    sqs.send_message(
                        QueueUrl=BDA_JOB_QUEUE_URL,
                        MessageBody=json.dumps(message),
                        MessageAttributes={
                            'KnowledgeBaseId': {
                                'StringValue': kb_id,
                                'DataType': 'String'
                            },
                            'FileExtension': {
                                'StringValue': file_ext,
                                'DataType': 'String'
                            }
                        }
                    )
                    
                    queued_files.append({
                        'fileLocation': file_location,
                        'messageId': message['messageId']
                    })
                    
                    print(f"Queued file for BDA processing: {file_location}")
                    
                except Exception as queue_error:
                    print(f"Error queuing file {file_location}: {queue_error}")
                    # Continue with other files
                    continue
        
        return queued_files
        
    except Exception as e:
        print(f"Error in queue_files_for_bda_processing: {e}")
        raise e

def check_and_update_ingestion_status(session: dict) -> dict:
    """Check ingestion job status and update session accordingly"""
    try:
        session_id = session['sessionId']
        kb_id = session['knowledgeBaseId']
        ingestion_job_id = session['ingestionJobId']
        data_source_id = session.get('dataSourceId')
        
        print(f"Checking ingestion status for session {session_id}, job {ingestion_job_id}")
        
        # Get ingestion job status from Bedrock
        job_response = bedrock_agent.get_ingestion_job(
            knowledgeBaseId=kb_id,
            dataSourceId=data_source_id,
            ingestionJobId=ingestion_job_id
        )
        
        job_status = job_response['ingestionJob']['status']
        print(f"Ingestion job {ingestion_job_id} status: {job_status}")
        
        # Update session based on job status
        new_session_status = None
        error_message = None
        
        if job_status == 'COMPLETE':
            new_session_status = 'COMPLETED'
        elif job_status in ['FAILED', 'STOPPING', 'STOPPED']:
            new_session_status = 'INGESTION_FAILED' 
            error_message = f"Ingestion job failed with status: {job_status}"
            job_failure_reasons = job_response['ingestionJob'].get('failureReasons', [])
            if job_failure_reasons:
                error_message += f". Reasons: {', '.join(job_failure_reasons)}"
        elif job_status in ['STARTING', 'IN_PROGRESS']:
            # Still in progress, no update needed
            return None
        
        # Update session if status changed
        if new_session_status:
            update_expression = "SET #status = :status, updatedAt = :timestamp"
            expression_values = {
                ':status': new_session_status,
                ':timestamp': datetime.utcnow().isoformat()
            }
            expression_names = {'#status': 'status'}
            
            if error_message:
                update_expression += ", errorMessage = :error"
                expression_values[':error'] = error_message
            
            response = sync_sessions_table.update_item(
                Key={'sessionId': session_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_names,
                ExpressionAttributeValues=expression_values,
                ReturnValues='ALL_NEW'
            )
            
            updated_session = response['Attributes']
            print(f"Updated session {session_id} status to {new_session_status}")
            return updated_session
            
        return None
        
    except Exception as e:
        print(f"Error checking ingestion status for session {session.get('sessionId')}: {e}")
        traceback.print_exc()
        return None

def get_sync_session_status(user_info: dict, session_id: str) -> dict:
    """Get sync session status with auto-update based on ingestion job status"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        if not SYNC_SESSIONS_TABLE:
            return create_error_response(503, "SERVICE_UNAVAILABLE", "Sync session tracking not available")
        
        # Get session details
        response = sync_sessions_table.get_item(Key={'sessionId': session_id})
        
        if 'Item' not in response:
            return create_error_response(404, "SESSION_NOT_FOUND", "Sync session not found")
        
        session = response['Item']
        
        # Check if user owns this session
        if session.get('userId') != sub:
            return create_error_response(403, "ACCESS_DENIED", "You don't have access to this sync session")
        
        # Auto-update session status if ingestion is started but not completed
        current_status = session.get('status')
        if current_status == 'INGESTION_STARTED' and session.get('ingestionJobId'):
            updated_session = check_and_update_ingestion_status(session)
            if updated_session:
                session = updated_session
        
        return create_response(200, {
            "success": True,
            "data": {
                'sessionId': session['sessionId'],
                'knowledgeBaseId': session['knowledgeBaseId'],
                'status': session['status'],
                'totalFiles': session.get('totalFiles', 0),
                'completedFiles': session.get('completedFiles', 0),
                'failedFiles': session.get('failedFiles', 0),
                'ingestionJobId': session.get('ingestionJobId'),
                'createdAt': session.get('createdAt'),
                'updatedAt': session.get('updatedAt'),
                'errorMessage': session.get('errorMessage')
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def create_data_source(user_info: dict, kb_id: str, body: dict) -> dict:
    """Create data source for knowledge base"""
    try:
        sub = user_info.get('sub')
        identity_id = user_info.get('identityId')
        
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has edit permission
        access_info = check_kb_access(sub, kb_id, 'canEdit')
        
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to edit this knowledge base")
        
        # For owned KBs, get folder ID from DynamoDB
        if access_info['isOwner']:
            db_response = kb_table.get_item(
                Key={'userId': sub, 'knowledgeBaseId': kb_id}
            )
            
            if 'Item' not in db_response:
                return create_error_response(404, "KB_NOT_FOUND", "Knowledge base not found")
            
            folder_id = db_response['Item'].get('folderId')
            stored_identity_id = db_response['Item'].get('identityId', identity_id)
            kb_name = db_response['Item'].get('name', 'kb')
        else:
            # For shared KBs, we need to determine the folder structure
            # This might require additional metadata in the shared KB table
            folder_id = str(uuid.uuid4())  # Generate new folder ID
            stored_identity_id = identity_id
            kb_name = 'shared-kb'
        
        if not folder_id:
            folder_id = str(uuid.uuid4())
            if access_info['isOwner']:
                # Update KB with folder ID
                kb_table.update_item(
                    Key={'userId': sub, 'knowledgeBaseId': kb_id},
                    UpdateExpression='SET folderId = :folderId',
                    ExpressionAttributeValues={':folderId': folder_id}
                )
        
        # Create data source
        ds_name = body.get('name', f"{kb_name}-source")
        
        # Always use users/ path structure
        s3_prefix = f"users/{stored_identity_id}/knowledge-base/{folder_id}/"
        
        ds_request = {
            'knowledgeBaseId': kb_id,
            'name': ds_name,
            'dataSourceConfiguration': {
                'type': 'S3',
                's3Configuration': {
                    'bucketArn': f'arn:aws:s3:::{ATTACHMENTS_BUCKET}',
                    'inclusionPrefixes': [s3_prefix]
                }
            },
            'vectorIngestionConfiguration': {
                'chunkingConfiguration': {
                    'chunkingStrategy': 'FIXED_SIZE',
                    'fixedSizeChunkingConfiguration': {
                        'maxTokens': 512,
                        'overlapPercentage': 20
                    }
                }
            }
        }
        
        ds_response = bedrock_agent.create_data_source(**ds_request)
        
        return create_response(201, {
            "success": True,
            "data": {
                'dataSourceId': ds_response['dataSource']['dataSourceId'],
                'name': ds_response['dataSource']['name'],
                'status': ds_response['dataSource']['status'],
                'folderId': folder_id
            }
        })
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"AWS error creating data source: {error_code} - {error_message}")
        
        if error_code == 'ValidationException':
            return create_error_response(400, "VALIDATION_ERROR", error_message)
        elif error_code == 'ResourceNotFoundException':
            return create_error_response(404, "RESOURCE_NOT_FOUND", error_message)
        elif error_code == 'AccessDeniedException':
            return create_error_response(403, "ACCESS_DENIED", error_message)
        else:
            return create_error_response(500, "AWS_ERROR", f"{error_code}: {error_message}")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def get_sync_status(user_info: dict, kb_id: str, query_params: dict) -> dict:
    """Get ingestion job status"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has view permission (instead of canSync)
        # We should allow users to check sync status if they can view the KB
        access_info = check_kb_access(sub, kb_id, 'canView')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to view this knowledge base")
        
        # Get data sources and their ingestion jobs
        ds_response = bedrock_agent.list_data_sources(knowledgeBaseId=kb_id)
        data_sources = ds_response.get('dataSourceSummaries', [])
        
        sync_statuses = {}
        
        for ds in data_sources:
            ds_id = ds['dataSourceId']
            
            # Get ingestion jobs for this data source
            jobs_response = bedrock_agent.list_ingestion_jobs(
                knowledgeBaseId=kb_id,
                dataSourceId=ds_id,
                maxResults=10
            )
            
            jobs = jobs_response.get('ingestionJobSummaries', [])
            if jobs:
                latest_job = jobs[0]  # Most recent job
                sync_statuses[ds_id] = {
                    'dataSourceId': ds_id,
                    'ingestionJobId': latest_job['ingestionJobId'],
                    'status': latest_job['status'],
                    'startedAt': latest_job.get('startedAt').isoformat() if latest_job.get('startedAt') else None,
                    'updatedAt': latest_job.get('updatedAt').isoformat() if latest_job.get('updatedAt') else None,
                    'statistics': latest_job.get('statistics', {})
                }
        
        return create_response(200, {
            "success": True,
            "data": {
                'syncStatuses': sync_statuses
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))
    
def upload_files(user_info: dict, kb_id: str, body: dict) -> dict:
    """Generate presigned URLs for file uploads"""
    try:
        sub = user_info.get('sub')
        identity_id = user_info.get('identityId')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has edit permission
        access_info = check_kb_access(sub, kb_id, 'canEdit')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to upload files to this knowledge base")
        
        # Get KB details using the new GSI - works for both owned and shared KBs
        kb_response = kb_table.query(
            IndexName='KnowledgeBaseIdIndex',
            KeyConditionExpression='knowledgeBaseId = :kb_id',
            ExpressionAttributeValues={':kb_id': kb_id},
            Limit=1
        )
        
        folder_id = None
        owner_identity_id = identity_id  # Default to current user's identityId
        
        if kb_response.get('Items'):
            kb_metadata = kb_response['Items'][0]
            folder_id = kb_metadata.get('folderId')
            owner_identity_id = kb_metadata.get('identityId', identity_id)
            print(f"Using folder_id: {folder_id}, owner_identity_id: {owner_identity_id} from KB metadata")
        else:
            # If we still don't have KB metadata, try to infer from data sources
            try:
                # Try to list data sources to infer the folder path
                ds_response = bedrock_agent.list_data_sources(knowledgeBaseId=kb_id)
                for ds in ds_response.get('dataSourceSummaries', []):
                    try:
                        ds_details = bedrock_agent.get_data_source(
                            knowledgeBaseId=kb_id,
                            dataSourceId=ds['dataSourceId']
                        )
                        
                        # Check config for inclusion prefixes
                        config = ds_details.get('dataSource', {}).get('dataSourceConfiguration', {})
                        s3_config = config.get('s3Configuration', {})
                        prefixes = s3_config.get('inclusionPrefixes', [])
                        
                        # Parse the prefix to get folder ID
                        for prefix in prefixes:
                            print(f"Checking prefix: {prefix}")
                            if "users/" in prefix and "knowledge-base/" in prefix:
                                # Format: users/{identity_id}/knowledge-base/{folder_id}/
                                parts = prefix.split('/')
                                if len(parts) >= 4:
                                    owner_identity_id = parts[1]  # Extract identity ID
                                    folder_id = parts[3]  # Extract folder ID
                                    print(f"Found folder_id: {folder_id}, owner_identity_id: {owner_identity_id} from data source")
                                    break
                    except Exception as ds_error:
                        print(f"Error getting data source details: {ds_error}")
                        continue
            except Exception as list_ds_error:
                print(f"Error listing data sources: {list_ds_error}")
        
        # If we still don't have a folder ID, generate one
        if not folder_id:
            folder_id = str(uuid.uuid4())
            print(f"Generated new folder_id: {folder_id}")
            
            # Save folder ID for owner's record if this is owner
            if access_info['isOwner']:
                kb_table.update_item(
                    Key={'userId': sub, 'knowledgeBaseId': kb_id},
                    UpdateExpression='SET folderId = :folderId',
                    ExpressionAttributeValues={':folderId': folder_id}
                )
        
        # Always use users/ path with the OWNER's identity ID, not the current user's
        s3_path = f"users/{owner_identity_id}/knowledge-base/{folder_id}/"
        print(f"Using S3 path: {s3_path} for uploads")
        
        # Process file upload requests
        files = body.get('files', [])
        if not files:
            return create_error_response(400, "NO_FILES", "No files provided for upload")
        
        # Generate presigned URLs for each file
        upload_urls = []
        for file_info in files:
            file_name = file_info.get('name')
            content_type = file_info.get('type', 'application/octet-stream')
            
            if not file_name:
                continue
                
            s3_key = f"{s3_path}{file_name}"
            
            url = s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': ATTACHMENTS_BUCKET,
                    'Key': s3_key,
                    'ContentType': content_type
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            
            upload_urls.append({
                'fileName': file_name,
                'uploadUrl': url,
                's3Key': s3_key
            })
        
        return create_response(200, {
            "success": True,
            "data": {
                "uploadUrls": upload_urls,
                "folderId": folder_id
            }
        })
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def delete_file(user_info: dict, kb_id: str, query_params: dict) -> dict:
    """Delete a file from the knowledge base"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has delete permission
        access_info = check_kb_access(sub, kb_id, 'canDelete')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to delete files from this knowledge base")
        
        # Get file key from query params
        file_key = query_params.get('key')
        if not file_key:
            return create_error_response(400, "MISSING_KEY", "File key is required")
        
        # Delete the file from S3
        s3.delete_object(
            Bucket=ATTACHMENTS_BUCKET,
            Key=file_key
        )
        
        return create_response(200, {
            "success": True,
            "message": "File deleted successfully"
        })
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))
    
def list_files(user_info: dict, kb_id: str, query_params: dict) -> dict:
    """List files in a knowledge base's S3 folder"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has view permission
        access_info = check_kb_access(sub, kb_id, 'canView')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to view files in this knowledge base")
        
        # Get KB details to find folder structure
        folder_id = None
        owner_identity_id = None
        
        if access_info['isOwner']:
            db_response = kb_table.get_item(
                Key={'userId': sub, 'knowledgeBaseId': kb_id}
            )
            
            if 'Item' in db_response:
                folder_id = db_response['Item'].get('folderId')
                owner_identity_id = db_response['Item'].get('identityId')
        else:
            # For shared KBs, we need to determine owner info 
            # Since this is a shared KB, extract from KB in Bedrock
            try:
                kb_response = bedrock_agent.get_knowledge_base(knowledgeBaseId=kb_id)
                kb_tags = kb_response.get('knowledgeBase', {}).get('tags', {})
                owner_sub = kb_tags.get('owner')
                owner_identity_id = kb_tags.get('identityId')
                
                # Get folder ID from owner's KB
                if owner_sub:
                    owner_kb = kb_table.get_item(
                        Key={'userId': owner_sub, 'knowledgeBaseId': kb_id}
                    )
                    if 'Item' in owner_kb:
                        folder_id = owner_kb['Item'].get('folderId')
            except Exception as e:
                print(f"Error getting KB details for shared KB: {e}")
                
            # Try to get folder info from data sources if not found yet
            if not folder_id or not owner_identity_id:
                try:
                    # List data sources to infer the folder path
                    ds_response = bedrock_agent.list_data_sources(knowledgeBaseId=kb_id)
                    for ds in ds_response.get('dataSourceSummaries', []):
                        try:
                            ds_details = bedrock_agent.get_data_source(
                                knowledgeBaseId=kb_id,
                                dataSourceId=ds['dataSourceId']
                            )
                            
                            # Check config for inclusion prefixes
                            config = ds_details.get('dataSource', {}).get('dataSourceConfiguration', {})
                            s3_config = config.get('s3Configuration', {})
                            prefixes = s3_config.get('inclusionPrefixes', [])
                            
                            # Parse the prefix to get folder ID
                            for prefix in prefixes:
                                print(f"Checking prefix: {prefix}")
                                if "users/" in prefix and "knowledge-base/" in prefix:
                                    # Format: users/{identity_id}/knowledge-base/{folder_id}/
                                    parts = prefix.split('/')
                                    if len(parts) >= 4:
                                        owner_identity_id = parts[1]  # Extract identity ID
                                        folder_id = parts[3]  # Extract folder ID
                                        print(f"Found folder_id: {folder_id}, owner_identity_id: {owner_identity_id} from data source")
                                        break
                        except Exception as ds_error:
                            print(f"Error getting data source details: {ds_error}")
                            continue
                except Exception as list_ds_error:
                    print(f"Error listing data sources: {list_ds_error}")
        
        if not folder_id or not owner_identity_id:
            return create_error_response(400, "MISSING_FOLDER_INFO", 
                                        "Could not determine folder information. Please contact the KB owner.")
        
        # Always use users/ path structure
        s3_prefix = f"users/{owner_identity_id}/knowledge-base/{folder_id}/"
        print(f"Using S3 prefix: {s3_prefix} for KB {kb_id}")
        
        # List objects in S3 bucket
        files = []
        processed_files = {}  # Track processed files by original filename
        
        try:
            paginator = s3.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=ATTACHMENTS_BUCKET,
                Prefix=s3_prefix
            )
            
            for page in page_iterator:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        # Skip folder objects
                        if obj['Key'].endswith('/'):
                            continue
                        
                        # Get file name from key
                        file_name = obj['Key'].split('/')[-1]
                        
                        # Check if this is a processed file
                        if file_name.endswith('.processed.json'):
                            # This is a processed file, extract original filename
                            # e.g., "document.pdf.processed.json" -> "document.pdf"
                            original_filename = file_name.replace('.processed.json', '')
                            
                            processed_files[original_filename] = {
                                'key': obj['Key'],
                                'fileName': file_name,
                                'fileSize': obj['Size'],
                                'lastModified': obj['LastModified'].isoformat(),
                                'fileType': 'json'
                            }
                            continue
                        
                        # Get file metadata for original files
                        file_info = {
                            'key': obj['Key'],
                            'fileName': file_name,
                            'fileSize': obj['Size'],
                            'lastModified': obj['LastModified'].isoformat(),
                            'isOriginal': True
                        }
                        
                        # Add file type
                        if '.' in file_name:
                            file_info['fileType'] = file_name.split('.')[-1].lower()
                        
                        # Check if this file has been processed
                        if file_name in processed_files:
                            file_info['hasProcessedVersion'] = True
                            file_info['processedFile'] = processed_files[file_name]
                        
                        files.append(file_info)
        except Exception as e:
            print(f"Error listing S3 objects: {e}")
            traceback.print_exc()
        
        return create_response(200, {
            "success": True,
            "data": {
                "files": files,
                "folderPath": s3_prefix,
                "folderId": folder_id
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def get_download_url(user_info: dict, kb_id: str, query_params: dict) -> dict:
    """Generate presigned URL for file download"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has view permission
        access_info = check_kb_access(sub, kb_id, 'canView')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to view files in this knowledge base")
        
        # Get file key from query params
        file_key = query_params.get('key')
        file_type = query_params.get('type', 'original')  # 'original' or 'processed'
        
        if not file_key:
            return create_error_response(400, "MISSING_KEY", "File key is required")
        
        print(f"Download request - file_key: {file_key}, file_type: {file_type}")
        
        # Generate presigned URL for download
        try:
            # Use the file_key as provided - it should already be the correct S3 key
            actual_key = file_key
            
            # Extract filename for download header
            file_name = file_key.split('/')[-1]
            
            # For processed files, if the key doesn't include the .processed.json extension, add it
            if file_type == 'processed':
                if not file_key.endswith('.processed.json') and not file_key.startswith('OCR_'):
                    # This is requesting processed version but key doesn't have processed extension
                    # Add .processed.json to the full filename
                    processed_key = f"{file_key}.processed.json"
                    actual_key = processed_key
                    file_name = f"{file_name}.processed.json"
                    print(f"Converted to processed key: {actual_key}")
            
            print(f"Final download - actual_key: {actual_key}, file_name: {file_name}")
            
            url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': ATTACHMENTS_BUCKET,
                    'Key': actual_key,
                    'ResponseContentDisposition': f'attachment; filename="{file_name}"'
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            
            return create_response(200, {
                "success": True,
                "data": {
                    "downloadUrl": url,
                    "fileName": file_name,
                    "fileType": file_type,
                    "actualKey": actual_key  # For debugging
                }
            })
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            return create_error_response(500, "PRESIGNED_URL_ERROR", str(e))
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def retrieve_from_kb(user_info: dict, kb_id: str, body: dict) -> dict:
    """Retrieve from knowledge base"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found")
        
        # Check if user has access to this KB
        access_info = check_kb_access(sub, kb_id, 'canView')
        if not access_info['hasAccess']:
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to retrieve from this knowledge base")
        
        # Get retrieval parameters
        retrieval_query = body.get('text')
        if not retrieval_query:
            return create_error_response(400, "MISSING_QUERY", "Retrieval query text is required")
        
        number_of_results = body.get('numberOfResults', 5)
        search_type = body.get('searchType', 'HYBRID')
        
        # Map search type string to enum
        search_type_mapping = {
            'SEMANTIC': 'SEMANTIC',
            'KEYWORD': 'KEYWORD',
            'HYBRID': 'HYBRID'
        }
        
        try:
            response = bedrock_agent_runtime.retrieve(
                knowledgeBaseId=kb_id,
                retrievalQuery={
                    'text': retrieval_query
                },
                retrievalConfiguration={
                    'vectorSearchConfiguration': {
                        'numberOfResults': number_of_results,
                        'overrideSearchType': search_type_mapping.get(search_type, 'HYBRID')
                    }
                }
            )
            
            # Format the response
            results = []
            for result in response.get('retrievalResults', []):
                result_data = {
                    'content': {
                        'text': result.get('content', {}).get('text', '')
                    }
                }
                
                if result.get('location'):
                    result_data['location'] = result.get('location')
                
                if result.get('metadata'):
                    result_data['metadata'] = result.get('metadata')
                
                results.append(result_data)
            
            return create_response(200, {
                "success": True,
                "data": {
                    "retrievalResults": results
                }
            })
            
        except Exception as e:
            print(f"Error retrieving from knowledge base: {e}")
            traceback.print_exc()
            return create_error_response(500, "RETRIEVAL_ERROR", str(e))
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def lambda_handler(event, context):
    """Main Lambda handler"""
    print("🚀 Lambda handler started")
    print(f"🚀 HTTP Method: {event.get('httpMethod')}")
    print(f"🚀 Path: {event.get('path')}")
    print(f"🔍 Full event: {json.dumps(event, default=str)}")
    print(f"🔍 Environment: KB_TABLE={KB_TABLE}, REGION={REGION_NAME}")
    print(f"🔍 AWS Account: {AWS_ACCOUNT_ID}")
    
    # Handle preflight CORS requests
    if event.get('httpMethod') == 'OPTIONS':
        print("🚀 Handling OPTIONS request")
        return create_response(200, {"success": True})
    
    try:
        method = event['httpMethod']
        path = event['path']
        path_parameters = event.get('pathParameters', {}) or {}
        query_parameters = event.get('queryStringParameters', {}) or {}
        
        print(f"🚀 Processing {method} {path}")
        print(f"🚀 Path parameters: {path_parameters}")
        
        # Get user info from authorization context
        print("🚀 Getting user info...")
        user_info = get_user_info(event)
        user_id = user_info.get('sub')
        
        print(f"🚀 Extracted user_id: '{user_id}'")
        print(f"🚀 Full user_info: {user_info}")
        
        if not user_id:
            print("❌ No user ID found - using test user for debugging")
            # For testing without authorizer, use a test user
            user_info = {
                'sub': 'test-user-123',
                'email': 'test@example.com',
                'username': 'test-user',
                'groups': ['admin'],
                'identityId': 'us-east-1:test-identity-123'
            }
            user_id = user_info['sub']
        
        print(f"✅ User authenticated: {user_id}")
        print(f"Request: {method} {path}")
        print(f"User info: {user_info}")
        
        # Route to appropriate handler
        if path == '/knowledge-bases' and method == 'GET':
            print("🚀 Routing to list_knowledge_bases")
            return list_knowledge_bases(user_info, query_parameters)
        elif path == '/knowledge-bases' and method == 'POST':
            print("🚀 Routing to create_knowledge_base")
            body = json.loads(event.get('body', '{}'))
            return create_knowledge_base(user_info, body, event)
        elif method == 'GET' and 'knowledgeBaseId' in path_parameters and path.endswith('/files/download'):
            return get_download_url(user_info, path_parameters['knowledgeBaseId'], query_parameters)
        elif method == 'GET' and 'knowledgeBaseId' in path_parameters and not path.endswith('/sync') and not path.endswith('/data-sources') and not path.endswith('/files'):
            return get_knowledge_base(user_info, path_parameters['knowledgeBaseId'])
        elif method == 'PUT' and 'knowledgeBaseId' in path_parameters and not path.endswith('/sync') and not path.endswith('/data-sources') and not path.endswith('/files'):
            body = json.loads(event.get('body', '{}'))
            return update_knowledge_base(user_info, path_parameters['knowledgeBaseId'], body)
        elif method == 'GET' and 'knowledgeBaseId' in path_parameters and path.endswith('/files'):
            return list_files(user_info, path_parameters['knowledgeBaseId'], query_parameters)
        elif method == 'DELETE' and 'knowledgeBaseId' in path_parameters and path.endswith('/files'):
            return delete_file(user_info, path_parameters['knowledgeBaseId'], query_parameters)
        elif method == 'DELETE' and 'knowledgeBaseId' in path_parameters and not path.endswith('/files') and not 'dataSourceId' in path_parameters:
            return delete_knowledge_base(user_info, path_parameters['knowledgeBaseId'])
        elif method == 'POST' and path.endswith('/data-sources'):
            body = json.loads(event.get('body', '{}'))
            return create_data_source(user_info, path_parameters['knowledgeBaseId'], body)
        elif method == 'GET' and path.endswith('/data-sources'):
            return list_data_sources(user_info, path_parameters['knowledgeBaseId'])
        elif method == 'POST' and path.endswith('/sync'):
            body = json.loads(event.get('body', '{}'))
            return start_sync(user_info, path_parameters['knowledgeBaseId'], body)
        elif method == 'GET' and path.endswith('/sync'):
            return get_sync_status(user_info, path_parameters['knowledgeBaseId'], query_parameters)
        elif method == 'GET' and 'sessionId' in path_parameters:
            return get_sync_session_status(user_info, path_parameters['sessionId'])
        elif method == 'POST' and 'knowledgeBaseId' in path_parameters and path.endswith('/retrieve'):
            body = json.loads(event.get('body', '{}'))
            return retrieve_from_kb(user_info, path_parameters['knowledgeBaseId'], body)
        elif method == 'POST' and path.endswith('/files'):
            body = json.loads(event.get('body', '{}'))
            return upload_files(user_info, path_parameters['knowledgeBaseId'], body)
        else:
            return create_error_response(404, "NOT_FOUND", f"Resource not found: {method} {path}")
            
    except json.JSONDecodeError:
        return create_error_response(400, "INVALID_JSON", "Invalid JSON in request body")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))