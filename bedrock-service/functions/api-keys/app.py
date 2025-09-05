import json
import uuid
import boto3
import os
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['API_KEYS_TABLE'])

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def create_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "body": json.dumps(body, cls=DecimalEncoder),
        "headers": {
            'Access-Control-Allow-Origin': os.environ.get('ALLOWED_ORIGINS', '*'),
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE'
        }
    }

def create_error_response(status_code: int, error_code: str, error_message: str) -> dict:
    return create_response(status_code, {
        "success": False,
        "error": {
            "code": error_code,
            "message": error_message
        }
    })

def get_user_info(event):
    """Extract user information from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    
    groups = claims.get('cognito:groups')
    if groups:
        groups = groups.split(',')
    else:
        groups = []
    
    return {
        'sub': claims.get('sub'),
        'email': claims.get('email'),
        'username': claims.get('cognito:username'),
        'groups': groups
    }

def create_api_key(user_info: dict, name: str, expiry_days: int = 30) -> dict:
    """Create a new API key with additional user information"""
    api_key_id = str(uuid.uuid4())
    current_timestamp = int(datetime.utcnow().timestamp())
    expiry_timestamp = current_timestamp + (expiry_days * 24 * 60 * 60)

    # Create the payload
    payload = {
        "sub": user_info['sub'],
        "groups": user_info['groups'],
        "permissions": {
            "rateLimit": 1000
        },
        "exp": expiry_timestamp,
        "iat": current_timestamp,
        "jti": api_key_id
    }

    # Generate API key by hashing the payload
    api_key = hashlib.sha256(json.dumps(payload, cls=DecimalEncoder).encode()).hexdigest()

    item = {
        'userId': user_info['sub'],
        'id': api_key_id,
        'apiKey': api_key,
        'name': name,
        'createdAt': current_timestamp,
        'updatedAt': current_timestamp,
        'ttl': expiry_timestamp,
        'createdBy': user_info['email'],
        'status': 'active',
        'payload': json.dumps(payload, cls=DecimalEncoder)
    }

    table.put_item(Item=item)
    return item

def validate_api_key(api_key: str) -> dict:
    """Validate the API key by checking its hash"""
    try:
        # Query the database for the API key
        response = table.query(
            KeyConditionExpression='apiKey = :apiKey',
            ExpressionAttributeValues={':apiKey': api_key}
        )
        
        if not response.get('Items'):
            return None

        item = response['Items'][0]
        payload = json.loads(item['payload'], cls=DecimalEncoder)

        # Verify the hash matches the payload
        expected_hash = hashlib.sha256(json.dumps(payload, cls=DecimalEncoder).encode()).hexdigest()
        if expected_hash != api_key:
            return None

        return payload

    except Exception as e:
        print(f"Error validating API key: {str(e)}")
        return None

def mask_api_key(api_key: str) -> str:
    """
    Mask API key showing only first 4 and last 6 characters
    Example: abcd...xyz123
    """
    if not api_key or len(api_key) < 11:
        return api_key
    
    return f"{api_key[:4]}...{api_key[-6:]}"

def format_api_key_response(item: dict, mask_key: bool = True) -> dict:
    """
    Format API key response with consistent structure
    Parameters:
        item (dict): The raw item from DynamoDB
        mask_key (bool): Whether to mask the API key or show full key
    """
    formatted_item = {
        'id': item['id'],
        'name': item['name'],
        'status': item['status'],
        'createdAt': item['createdAt'],
        'expiresAt': item['ttl']
    }
    
    # Include API key if present
    if 'apiKey' in item:
        formatted_item['apiKey'] = mask_api_key(item['apiKey']) if mask_key else item['apiKey']
    
    return formatted_item

def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {"success": True})
    
    try:
        user_info = get_user_info(event)
        if not user_info['sub']:
            return create_error_response(401, "UNAUTHORIZED", "User not authenticated")
        
        method = event['httpMethod']
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            name = body.get('name')
            expiry_days = body.get('expiryDays', 30)
            
            if not name:
                return create_error_response(400, "MISSING_NAME", "Name is required for the API key")
            
            if 'paid' not in user_info.get('groups', []) and 'admin' not in user_info.get('groups', []):
                return create_error_response(403, "FORBIDDEN", "Only paid users or admins can create API keys")
    
            api_key = create_api_key(user_info, name, expiry_days)
            
            # Format response with unmasked API key for initial creation
            formatted_response = format_api_key_response(api_key, mask_key=False)
            
            return create_response(200, {
                "success": True,
                "data": formatted_response
            })
            
        elif method == 'GET':
            response = table.query(
                KeyConditionExpression='userId = :userId',
                ExpressionAttributeValues={':userId': user_info['sub']}
            )
            
            # Transform items with masked API keys
            transformed_items = [
                format_api_key_response(item, mask_key=True) 
                for item in response.get('Items', [])
            ]
                
            return create_response(200, {
                "success": True,
                "data": transformed_items
            })
                        
        elif method == 'DELETE':
            api_key_id = event['pathParameters'].get('id')
            if not api_key_id:
                return create_error_response(400, "MISSING_ID", "API key ID is required")
                
            table.delete_item(
                Key={
                    'userId': user_info['sub'],
                    'id': api_key_id
                }
            )
            return create_response(200, {
                "success": True,
                "message": "API key deleted successfully"
            })
            
        else:
            return create_error_response(405, "METHOD_NOT_ALLOWED", f"Method {method} not allowed")
            
    except json.JSONDecodeError:
        return create_error_response(400, "INVALID_JSON", "Invalid JSON in request body")
    except Exception as e:
        print(f"Error: {str(e)}")  # Log the error
        return create_error_response(500, "INTERNAL_ERROR", str(e))