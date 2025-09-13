import json
import boto3
import os
import traceback
from typing import Dict, List, Any, Optional
from decimal import Decimal
import uuid
import time

# Initialize clients
dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')

# Environment variables
AGENTS_TABLE_NAME = os.environ['AGENTS_TABLE']
SHARED_AGENTS_TABLE_NAME = os.environ['SHARED_AGENTS_TABLE']
USER_GROUPS_TABLE_NAME = os.environ['USER_GROUPS_TABLE']
USER_POOL_ID = os.environ['USER_POOL_ID']
IDENTITY_POOL_ID = os.environ.get('IDENTITY_POOL_ID')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')

# Initialize tables
agents_table = dynamodb.Table(AGENTS_TABLE_NAME)
shared_agents_table = dynamodb.Table(SHARED_AGENTS_TABLE_NAME)
user_groups_table = dynamodb.Table(USER_GROUPS_TABLE_NAME)

# Helper class for DynamoDB Decimal conversion
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def convert_floats_to_decimals(obj):
    """Recursively converts all float values to Decimal for DynamoDB compatibility"""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    else:
        return obj

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

def get_user_info(event) -> dict:
    """Extract user information from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    claims = authorizer.get('claims', {})
    
    # Make sure claims is a dictionary, not a string
    if isinstance(claims, str):
        try:
            claims = json.loads(claims)
        except json.JSONDecodeError:
            claims = {}
    
    groups = claims.get('cognito:groups', '')
    if isinstance(groups, str):
        if groups:
            groups = groups.split(',')
        else:
            groups = []
    elif not groups:
        groups = []
    
    return {
        'sub': claims.get('sub', ''),
        'email': claims.get('email', ''),
        'username': claims.get('cognito:username', ''),
        'groups': groups
    }

def check_agent_access(agent_id: str, user_id: str) -> bool:
    """
    Check if user has access to the agent
    - User is the owner
    - Agent is shared with a group user belongs to
    - Agent is public
    """
    try:
        # Check if user is the owner
        response = agents_table.get_item(
            Key={
                'userId': user_id,
                'id': agent_id
            }
        )
        if 'Item' in response:
            return True
        
        # Check if the agent is public
        # First, get the agent data from any user
        # Scan is not ideal for production, consider creating a GSI on agent ID
        scan_response = agents_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('id').eq(agent_id),
            ProjectionExpression="id, userId, visibility",
            Limit=1  # Limit to just one match
        )
        
        for item in scan_response.get('Items', []):
            if item.get('visibility') == 'public':
                print(f"Agent {agent_id} is public, granting access")
                return True
            
        # Check if the agent is shared with any groups user belongs to
        user_groups_response = user_groups_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
        )
        
        if not user_groups_response.get('Items'):
            return False
            
        user_group_ids = [item['groupId'] for item in user_groups_response['Items']]
        
        # Check if agent is shared with any of these groups
        for group_id in user_group_ids:
            shared_agent_response = shared_agents_table.get_item(
                Key={
                    'groupId': group_id,
                    'agentId': agent_id
                }
            )
            if 'Item' in shared_agent_response:
                return True
                
        return False
        
    except Exception as e:
        print(f"Error checking agent access: {str(e)}")
        return False

def list_agents(user_id: str, query_params: dict) -> dict:
    """
    List agents owned by or shared with user, plus public agents
    
    Parameters:
        user_id (str): User ID
        query_params (dict): Query parameters for filtering
    
    Returns:
        dict: Response with agents list
    """
    try:
        # Get agents owned by the user
        owned_agents_response = agents_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
        )
        
        owned_agents = owned_agents_response.get('Items', [])
        
        # Format owned agents
        for agent in owned_agents:
            agent['isOwner'] = True
        
        # Get groups the user belongs to
        user_groups_response = user_groups_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
        )
        
        shared_agents = []
        
        # For each group, get shared agents
        if user_groups_response.get('Items'):
            for group_membership in user_groups_response['Items']:
                group_id = group_membership['groupId']
                
                shared_agents_response = shared_agents_table.query(
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('groupId').eq(group_id)
                )
                
                if shared_agents_response.get('Items'):
                    for shared_agent in shared_agents_response['Items']:
                        # Get the actual agent data
                        agent_response = agents_table.get_item(
                            Key={
                                'userId': shared_agent['sharedBy'],
                                'id': shared_agent['agentId']
                            }
                        )
                        
                        if 'Item' in agent_response:
                            agent_data = agent_response['Item']
                            agent_data['isOwner'] = False
                            agent_data['sharedBy'] = shared_agent['sharedBy']
                            agent_data['sharedVia'] = group_id
                            agent_data['permissions'] = shared_agent.get('permissions', 'read')
                            
                            # Avoid duplicates
                            if not any(a['id'] == agent_data['id'] for a in shared_agents):
                                shared_agents.append(agent_data)
        
        # Get public agents that the user doesn't already own
        public_agents = []
        
        # This scan is not ideal for production, consider creating a GSI on visibility
        public_scan_response = agents_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('visibility').eq('public')
        )
        
        for agent in public_scan_response.get('Items', []):
            # Skip if user already owns this agent
            if agent.get('userId') == user_id:
                continue
                
            # Skip if this agent is already in shared_agents
            if any(a['id'] == agent['id'] for a in shared_agents):
                continue
                
            agent['isOwner'] = False
            agent['isPublic'] = True
            agent['accessType'] = 'public'
            agent['permissions'] = {
                'canView': True,
                'canEdit': False,
                'canDelete': False,
                'canShare': False,
                'canExecute': True
            }
            
            public_agents.append(agent)
        
        # Combine owned, shared and public agents
        all_agents = owned_agents + shared_agents + public_agents
        
        return create_response(200, {
            "success": True,
            "data": all_agents
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def get_agent(agent_id: str, user_id: str) -> dict:
    """
    Get details of a specific agent
    
    Parameters:
        agent_id (str): ID of the agent to retrieve
        user_id (str): ID of the requesting user
    
    Returns:
        dict: Response with agent details
    """
    try:
        # Try to get agent as owned by the user first
        response = agents_table.get_item(
            Key={
                'userId': user_id,
                'id': agent_id
            }
        )
        
        if 'Item' in response:
            agent = response['Item']
            agent['isOwner'] = True
            return create_response(200, {
                "success": True,
                "data": agent
            })
        
        # If not owned, check if the user has access to this agent
        has_access = check_agent_access(agent_id, user_id)
        
        if not has_access:
            # Check if agent exists at all to return proper error code
            scan_response = agents_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('id').eq(agent_id),
                ProjectionExpression="id",
                Limit=1
            )
            
            if not scan_response.get('Items'):
                return create_error_response(404, "AGENT_NOT_FOUND", f"Agent {agent_id} not found")
            else:
                return create_error_response(403, "ACCESS_DENIED", "You don't have access to this agent")
        
        # If not owned, find which group it's shared through
        user_groups_response = user_groups_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
        )
        
        if not user_groups_response.get('Items'):
            return create_error_response(404, "AGENT_NOT_FOUND", f"Agent {agent_id} not found")
        
        for group_membership in user_groups_response['Items']:
            group_id = group_membership['groupId']
            
            shared_agent_response = shared_agents_table.get_item(
                Key={
                    'groupId': group_id,
                    'agentId': agent_id
                }
            )
            
            if 'Item' in shared_agent_response:
                shared_agent = shared_agent_response['Item']
                
                # Get actual agent data
                agent_response = agents_table.get_item(
                    Key={
                        'userId': shared_agent['sharedBy'],
                        'id': agent_id
                    }
                )
                
                if 'Item' in agent_response:
                    agent = agent_response['Item']
                    agent['isOwner'] = False
                    agent['sharedBy'] = shared_agent['sharedBy']
                    agent['sharedVia'] = group_id
                    agent['permissions'] = shared_agent.get('permissions', 'read')
                    
                    return create_response(200, {
                        "success": True,
                        "data": agent
                    })
        
        return create_error_response(404, "AGENT_NOT_FOUND", f"Agent {agent_id} not found")
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def create_agent(body: dict, user_id: str) -> dict:
    """
    Create a new agent
    
    Parameters:
        body (dict): Request body with agent details
        user_id (str): ID of the user creating the agent
    
    Returns:
        dict: Response with created agent details
    """
    try:
        # Required fields validation
        required_fields = ['name', 'systemPrompt', 'modelParams']
        for field in required_fields:
            if field not in body:
                return create_error_response(400, "MISSING_REQUIRED_FIELD", f"'{field}' is required")
        
        # Create agent object
        now = int(time.time() * 1000)  # Current time in milliseconds
        agent_id = body.get('id', str(uuid.uuid4()))
        
        # Convert any float values in modelParams to Decimal
        model_params = convert_floats_to_decimals(body['modelParams'])
        if isinstance(model_params, dict):
            for key, value in model_params.items():
                if isinstance(value, float):
                    model_params[key] = Decimal(str(value))
        
        print(f"DEBUG: Original modelParams from body: {body['modelParams']}")
        print(f"DEBUG: Converted modelParams: {model_params}")
        
        agent = {
            'userId': user_id,
            'id': agent_id,
            'name': body['name'],
            'description': body.get('description', ''),
            'systemPrompt': body['systemPrompt'],
            'modelParams': model_params,  # Use the converted parameters
            'version': body.get('version', 0) + 1,
            'createdAt': body.get('createdAt', now),
            'lastEditedAt': now,
            'type': body.get('type', 'custom')
        }
        
        # Optional fields
        if 'knowledgeBaseId' in body:
            agent['knowledgeBaseId'] = body['knowledgeBaseId']
            
        if 'telegramToken' in body:
            agent['telegramToken'] = body['telegramToken']
            
        # For Bedrock agents
        if body.get('type') == 'bedrock' and 'bedrockAgentId' in body:
            agent['bedrockAgentId'] = body['bedrockAgentId']
            
        if body.get('type') == 'bedrock' and 'bedrockAgentAliasId' in body:
            agent['bedrockAgentAliasId'] = body['bedrockAgentAliasId']
        
        # Save to DynamoDB
        agents_table.put_item(Item=agent)
        
        return create_response(201, {
            "success": True,
            "data": agent
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def update_agent(agent_id: str, body: dict, user_id: str) -> dict:
    """
    Update an existing agent
    
    Parameters:
        agent_id (str): ID of the agent to update
        body (dict): Request body with updated agent details
        user_id (str): ID of the user updating the agent
    
    Returns:
        dict: Response with updated agent details
    """
    try:
        # First check if the user owns the agent
        response = agents_table.get_item(
            Key={
                'userId': user_id,
                'id': agent_id
            }
        )
        
        is_owner = 'Item' in response
        existing_agent = None
        original_owner_id = None
        
        if is_owner:
            existing_agent = response['Item']
        else:
            # If not the owner, check if they have access through a group with write permissions
            user_groups_response = user_groups_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id)
            )
            
            has_write_permission = False
            
            if user_groups_response.get('Items'):
                for group_membership in user_groups_response['Items']:
                    group_id = group_membership['groupId']
                    
                    shared_agent_response = shared_agents_table.get_item(
                        Key={
                            'groupId': group_id,
                            'agentId': agent_id
                        }
                    )
                    
                    if 'Item' in shared_agent_response:
                        shared_agent = shared_agent_response['Item']
                        if shared_agent.get('permissions') == 'write':
                            has_write_permission = True
                            original_owner_id = shared_agent['sharedBy']
                            break
            
            if has_write_permission and original_owner_id:
                # Get the actual agent from the original owner
                agent_response = agents_table.get_item(
                    Key={
                        'userId': original_owner_id,
                        'id': agent_id
                    }
                )
                
                if 'Item' in agent_response:
                    existing_agent = agent_response['Item']
                else:
                    return create_error_response(404, "AGENT_NOT_FOUND", f"Agent {agent_id} not found")
            else:
                # Check if agent exists at all to return proper error code
                scan_response = agents_table.scan(
                    FilterExpression=boto3.dynamodb.conditions.Attr('id').eq(agent_id),
                    ProjectionExpression="id",
                    Limit=1
                )
                
                if not scan_response.get('Items'):
                    return create_error_response(404, "AGENT_NOT_FOUND", f"Agent {agent_id} not found")
                else:
                    return create_error_response(403, "PERMISSION_DENIED", f"You don't have permission to update agent {agent_id}")
        
        # Convert any float values in modelParams to Decimal if provided
        model_params = convert_floats_to_decimals(body.get('modelParams', existing_agent['modelParams']))

        if isinstance(model_params, dict):
            for key, value in model_params.items():
                if isinstance(value, float):
                    model_params[key] = Decimal(str(value))
        
        # Update fields
        updated_agent = {
            'userId': existing_agent['userId'],  # Preserve original owner
            'id': agent_id,
            'name': body.get('name', existing_agent['name']),
            'description': body.get('description', existing_agent.get('description', '')),
            'systemPrompt': body.get('systemPrompt', existing_agent['systemPrompt']),
            'modelParams': model_params,  # Use the converted parameters
            'version': existing_agent.get('version', 0) + 1,
            'createdAt': existing_agent['createdAt'],
            'lastEditedAt': int(time.time() * 1000),
            'type': existing_agent.get('type', 'custom')  # Preserve the original type
        }
        
        # Optional fields
        if 'knowledgeBaseId' in body:
            updated_agent['knowledgeBaseId'] = body['knowledgeBaseId']
        elif 'knowledgeBaseId' in existing_agent:
            updated_agent['knowledgeBaseId'] = existing_agent['knowledgeBaseId']
            
        if 'telegramToken' in body:
            updated_agent['telegramToken'] = body['telegramToken']
        elif 'telegramToken' in existing_agent:
            updated_agent['telegramToken'] = existing_agent['telegramToken']
        
        # Bedrock specific fields - don't allow updating these
        if existing_agent.get('type') == 'bedrock':
            if 'bedrockAgentId' in existing_agent:
                updated_agent['bedrockAgentId'] = existing_agent['bedrockAgentId']
            if 'bedrockAgentAliasId' in existing_agent:
                updated_agent['bedrockAgentAliasId'] = existing_agent['bedrockAgentAliasId']
        
        # Save to DynamoDB
        agents_table.put_item(Item=updated_agent)
        
        # Add shared information for the response if user is not the owner
        if not is_owner:
            updated_agent['isOwner'] = False
            updated_agent['sharedBy'] = original_owner_id
        else:
            updated_agent['isOwner'] = True
            
        return create_response(200, {
            "success": True,
            "data": updated_agent
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def delete_agent(agent_id: str, user_id: str) -> dict:
    """
    Delete an agent
    
    Parameters:
        agent_id (str): ID of the agent to delete
        user_id (str): ID of the user deleting the agent
    
    Returns:
        dict: Response with deletion status
    """
    try:
        # Check if the agent exists and user owns it
        response = agents_table.get_item(
            Key={
                'userId': user_id,
                'id': agent_id
            }
        )
        
        if 'Item' not in response:
            return create_error_response(404, "AGENT_NOT_FOUND", f"Agent {agent_id} not found or you don't have permission to delete it")
        
        # Delete the agent
        agents_table.delete_item(
            Key={
                'userId': user_id,
                'id': agent_id
            }
        )
        
        # Delete all shared references to this agent
        # Note: This could be moved to a separate cleanup function or Lambda
        # if there are many shares or for better performance
        
        # Scan shared_agents_table for this agent ID
        # Note: In production with large tables, consider using a GSI instead
        shared_items = shared_agents_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('agentId').eq(agent_id) & 
                            boto3.dynamodb.conditions.Attr('sharedBy').eq(user_id)
        )
        
        # Delete each shared reference
        for item in shared_items.get('Items', []):
            shared_agents_table.delete_item(
                Key={
                    'groupId': item['groupId'],
                    'agentId': agent_id
                }
            )
        
        return create_response(200, {
            "success": True,
            "message": f"Agent {agent_id} deleted successfully"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def lambda_handler(event, context):
    # Handle preflight CORS requests
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {"success": True})
    
    try:
        method = event['httpMethod']
        path = event['path']
        path_parameters = event.get('pathParameters', {}) or {}
        query_parameters = event.get('queryStringParameters', {}) or {}
        
        # Get user info from authorization context
        user_info = get_user_info(event)
        user_id = user_info.get('sub')
        
        if not user_id:
            return create_error_response(401, "UNAUTHORIZED", "Unable to identify user")
        
        # Parse the path and route to appropriate handler
        if path == '/agents' and method == 'GET':
            return list_agents(user_id, query_parameters)
        elif path == '/agents' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return create_agent(body, user_id)
        elif path.startswith('/agents/') and method == 'GET' and 'agentId' in path_parameters:
            return get_agent(path_parameters['agentId'], user_id)
        elif path.startswith('/agents/') and method == 'PUT' and 'agentId' in path_parameters:
            body = json.loads(event.get('body', '{}'))
            return update_agent(path_parameters['agentId'], body, user_id)
        elif path.startswith('/agents/') and method == 'DELETE' and 'agentId' in path_parameters:
            return delete_agent(path_parameters['agentId'], user_id)
        else:
            return create_error_response(404, "NOT_FOUND", "Resource not found")
            
    except json.JSONDecodeError:
        return create_error_response(400, "INVALID_JSON", "Invalid JSON in request body")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))