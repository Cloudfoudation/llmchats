# agents-service/functions/hr-insight-agent/app.py
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
bedrock = boto3.client('bedrock-runtime', region_name='us-west-2')

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
    """Make request to the HR Insight API"""
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

def generate_insights_from_results(query_type, results, filters=None):
    """
    Use Bedrock to generate insights from the query results
    """
    prompt = f"""You are a HR analytics expert. Analyze the following HR data and provide 
    meaningful insights about {query_type}. 
    
    Data: {json.dumps(results, indent=2)}
    """
    
    if filters:
        prompt += f"\nFilters applied: {json.dumps(filters, indent=2)}"
    
    prompt += """
    
    Please provide:
    1. Key observations
    2. Trends or patterns
    3. Actionable recommendations
    4. Visual representation suggestions
    
    Format your response as a concise report with clear sections.
    """
    
    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2000,
        "temperature": 0.3,
        "messages": [
            {
                "role": "user",
                "content": [{
                    "type": "text",
                    "text": prompt
                }]
            }
        ]
    }
    
    try:
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
            body=json.dumps(request_body)
        )
        insights = json.loads(response['body'].read())['content'][0]['text']
        return insights
    except Exception as e:
        logger.error(f"Error generating insights: {e}", exc_info=True)
        return f"Error generating insights: {str(e)}"

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
                    # Convert properties to the format expected by the API
                    properties = {}
                    for prop in json_content['properties']:
                        prop_name = prop['name']
                        prop_value = prop['value']
                        properties[prop_name] = prop_value
                    
                    request_body = properties
                else:
                    request_body = json_content
        
        # Process the request based on the API path
        if api_path == '/search-query' and http_method == 'POST':
            # Format the request body for search query
            formatted_request = {
                'prompt': request_body.get('prompt', input_text)
            }
            
            # If prompt wasn't in the request body and input_text is also empty, return error
            if not formatted_request['prompt']:
                response_code = 400
                response_body = {"application/json": {"error": "No query prompt provided"}}
            else:
                api_response = make_api_request('post', '/search-query', data=formatted_request)
                response_body = {"application/json": api_response}
                
        elif api_path == '/initialize-db' and http_method == 'POST':
            api_response = make_api_request('post', '/initialize-db')
            response_body = {"application/json": api_response}
                
        elif api_path == '/hr-insights' and http_method == 'POST':
            # First get the underlying data using search-query
            query_type = request_body.get('query_type', 'custom')
            filters = request_body.get('filters', {})
            custom_query = request_body.get('custom_query', '')
            
            # Determine the appropriate SQL query based on insight type
            search_prompt = ""
            if query_type == "salary_distribution":
                search_prompt = "Get all employees with their salaries, job titles, and departments"
            elif query_type == "department_headcount":
                search_prompt = "Count employees per department"
            elif query_type == "tenure_analysis":
                search_prompt = "Get all employees with their hire dates"
            elif query_type == "hiring_trends":
                search_prompt = "Show hire dates of all employees sorted by date"
            else:  # custom
                search_prompt = custom_query or "Get comprehensive employee data including job titles, departments, salaries and hire dates"
            
            # Apply any filters from the request
            if filters:
                if 'department' in filters:
                    search_prompt += f" in the {filters['department']} department"
                if 'salary_range' in filters:
                    min_salary = filters['salary_range'].get('min')
                    max_salary = filters['salary_range'].get('max')
                    if min_salary and max_salary:
                        search_prompt += f" with salaries between {min_salary} and {max_salary}"
                    elif min_salary:
                        search_prompt += f" with salaries above {min_salary}"
                    elif max_salary:
                        search_prompt += f" with salaries below {max_salary}"
                if 'date_range' in filters:
                    start_date = filters['date_range'].get('start_date')
                    end_date = filters['date_range'].get('end_date')
                    if start_date and end_date:
                        search_prompt += f" hired between {start_date} and {end_date}"
                    elif start_date:
                        search_prompt += f" hired after {start_date}"
                    elif end_date:
                        search_prompt += f" hired before {end_date}"
            
            # Get the data using search-query
            search_response = make_api_request('post', '/search-query', data={'prompt': search_prompt})
            
            if search_response.get('success') and search_response.get('results'):
                # Generate insights from the data
                insights = generate_insights_from_results(
                    query_type, 
                    search_response.get('results'),
                    filters
                )
                
                response_body = {
                    "application/json": {
                        "success": True,
                        "insight_type": query_type,
                        "results": search_response.get('results'),
                        "summary": insights
                    }
                }
            else:
                response_code = 400
                response_body = {"application/json": {
                    "success": False,
                    "error": "Could not retrieve data for insights"
                }}
        else:
            response_code = 400
            error_msg = f"{action_group}::{api_path} is not a valid api, try another one."
            response_body = {"application/json": {"error": error_msg}}
        
        # Create the action response 
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