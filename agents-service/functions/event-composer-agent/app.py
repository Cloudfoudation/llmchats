# bedrock-service/functions/event-composer-agent/app.py
import json
import logging
import os
import boto3
import requests
from urllib.parse import urljoin
import time

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
API_BASE_URL = os.environ.get('API_BASE_URL')
AUTH_TOKEN_SECRET_NAME = os.environ.get('INTERNAL_AUTH_TOKEN_SECRET')

# AWS clients
secrets_manager = boto3.client('secretsmanager')

# Cache the token to avoid repeated calls to Secrets Manager
_internal_token_cache = None
_token_expiry = 0

def get_auth_token():
    """
    Get the internal authentication token from Secrets Manager
    with caching to improve performance
    """
    global _internal_token_cache, _token_expiry
    current_time = int(time.time())
    
    # If we have a cached token that's still valid, use it
    if _internal_token_cache and current_time < _token_expiry:
        return _internal_token_cache
    
    try:
        # Get token from Secrets Manager
        response = secrets_manager.get_secret_value(SecretId=AUTH_TOKEN_SECRET_NAME)
        secret_data = json.loads(response['SecretString'])
        token = secret_data['token']
        
        # Cache the token for 1 hour
        _internal_token_cache = token
        _token_expiry = current_time + 3600
        
        return token
    except Exception as e:
        logger.error(f"Error getting auth token: {e}")
        raise

def make_api_request(method, endpoint, data=None, params=None):
    """Make request to the Event Composer API"""
    token = get_auth_token()
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'X-Internal-Auth': 'true'  # Special header to indicate internal service call
    }
    
    url = f"{API_BASE_URL}{endpoint}"
    
    try:
        if method.lower() == 'get':
            response = requests.get(url, headers=headers, params=params)
        elif method.lower() == 'post':
            response = requests.post(url, headers=headers, json=data)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
            
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {e}")
        if hasattr(e, 'response') and e.response:
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        raise

def get_parameter_value(parameters, param_name):
    """Helper function to extract parameter value by name"""
    for param in parameters:
        if param['name'] == param_name:
            return param['value']
    return None

def lambda_handler(event, context):
    """Lambda handler for the Bedrock Agent action group"""
    try:
        # Print the received event to the logs
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract the necessary information from the event
        action_group = event.get('actionGroup')
        api_path = event.get('apiPath')
        http_method = event.get('httpMethod')
        parameters = event.get('parameters', [])
        input_text = event.get('inputText', '')
        
        logger.info(f"Action Group: {action_group}, API Path: {api_path}, HTTP Method: {http_method}")
        logger.info(f"Input Text: {input_text}")
        
        # Initialize response variables
        response_code = 200
        response_body = {}
        
        # Extract request body if it exists
        request_body = {}
        if 'requestBody' in event and 'content' in event['requestBody']:
            content = event['requestBody']['content']
            if 'application/json' in content:
                json_content = content['application/json']
                
                # Check if the content has properties
                if 'properties' in json_content:
                    # Convert properties to the format expected by the event_composer.py
                    properties = {}
                    for prop in json_content['properties']:
                        prop_name = prop['name']
                        prop_value = prop['value']
                        properties[prop_name] = prop_value
                    
                    request_body = properties
                else:
                    request_body = json_content
        
        # Add user ID if available
        session_id = event.get('sessionId', 'unknown-session')
        request_body['user_id'] = session_id
        
        # Process the request based on the API path
        if api_path == '/start' and http_method == 'POST':
            # Format the request body to match EventRequest model
            formatted_request = {
                'event_name': request_body.get('event_name', ''),
                'date_time': request_body.get('date_time', None),
                'location': request_body.get('location', None),
                'tone': request_body.get('tone', 'Lively')
            }
            api_response = make_api_request('post', '/start', data=formatted_request)
            response_body = {"application/json": api_response}
            
        elif '/chat' in api_path and http_method == 'POST':
            # Extract task_id from parameters
            task_id = get_parameter_value(parameters, 'task_id')
            
            if task_id:
                # Format the request for chat endpoint
                chat_request = {'message': request_body.get('message', '')}
                api_response = make_api_request('post', f'/{task_id}/chat', data=chat_request)
                response_body = {"application/json": api_response}
            else:
                response_code = 400
                response_body = {"application/json": {"error": "Missing task_id parameter"}}
                
        elif '/generate-video-prompts' in api_path and http_method == 'POST':
            # Extract task_id from parameters
            task_id = get_parameter_value(parameters, 'task_id')
            
            if task_id:
                api_response = make_api_request('post', f'/{task_id}/generate-video-prompts')
                response_body = {"application/json": api_response}
            else:
                response_code = 400
                response_body = {"application/json": {"error": "Missing task_id parameter"}}
                
        elif '/generate-videos' in api_path and http_method == 'POST':
            # Extract task_id from parameters
            task_id = get_parameter_value(parameters, 'task_id')
            
            if task_id:
                api_response = make_api_request('post', f'/{task_id}/generate-videos')
                response_body = {"application/json": api_response}
            else:
                response_code = 400
                response_body = {"application/json": {"error": "Missing task_id parameter"}}
                
        elif '/accept-announcement' in api_path and http_method == 'POST':
            # Extract task_id from parameters
            task_id = get_parameter_value(parameters, 'task_id')
            
            if task_id:
                api_response = make_api_request('post', f'/{task_id}/accept-announcement')
                response_body = {"application/json": api_response}
            else:
                response_code = 400
                response_body = {"application/json": {"error": "Missing task_id parameter"}}
                
        elif '/status' in api_path and http_method == 'GET':
            # Extract task_id from parameters
            task_id = get_parameter_value(parameters, 'task_id')
            
            if task_id:
                api_response = make_api_request('get', f'/{task_id}/status')
                response_body = {"application/json": api_response}
            else:
                response_code = 400
                response_body = {"application/json": {"error": "Missing task_id parameter"}}
                
        elif api_path == '/tasks' and http_method == 'GET':
            # Extract query params from parameters array
            query_params = {}
            for param in parameters:
                query_params[param['name']] = param['value']
                
            api_response = make_api_request('get', '/tasks', params=query_params)
            response_body = {"application/json": api_response}
            
        else:
            response_code = 400
            error_msg = f"{action_group}::{api_path} is not a valid api, try another one."
            response_body = {"application/json": {"error": error_msg}}
        
        # Create the action response following the sample format
        action_response = {
            "actionGroup": action_group,
            "apiPath": api_path,
            "httpMethod": http_method,
            "httpStatusCode": response_code,
            "responseBody": response_body
        }
        
        # Return the final response
        api_response = {"messageVersion": "1.0", "response": action_response}
        logger.info(f"Response: {json.dumps(api_response)}")
        
        return api_response
        
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        
        # Return a properly formatted error response
        error_response = {
            "messageVersion": "1.0",
            "response": {
                "actionGroup": event.get('actionGroup', 'unknown'),
                "apiPath": event.get('apiPath', 'unknown'),
                "httpMethod": event.get('httpMethod', 'unknown'),
                "httpStatusCode": 500,
                "responseBody": {
                    "application/json": {
                        "error": str(e)
                    }
                }
            }
        }
        
        return error_response