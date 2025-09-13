import json
import boto3
import os
import uuid
from datetime import datetime

# Initialize clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
USERS_TABLE = os.environ.get('USERS_TABLE')
ROLES_TABLE = os.environ.get('ROLES_TABLE') 
ROLE_AGENTS_TABLE = os.environ.get('ROLE_AGENTS_TABLE')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')

# DynamoDB tables
users_table = dynamodb.Table(USERS_TABLE)
roles_table = dynamodb.Table(ROLES_TABLE)
role_agents_table = dynamodb.Table(ROLE_AGENTS_TABLE)

def create_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
        "headers": {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE,PUT',
            'Access-Control-Allow-Credentials': 'false'
        }
    }

def create_role(body: dict) -> dict:
    try:
        role_id = str(uuid.uuid4())
        role_name = body.get('roleName')
        description = body.get('description', '')
        permissions = body.get('permissions', [])
        
        if not role_name:
            return create_response(400, {"success": False, "error": "Role name is required"})
        
        role_item = {
            'roleId': role_id,
            'roleName': role_name,
            'description': description,
            'permissions': permissions,
            'createdAt': datetime.now().isoformat(),
            'updatedAt': datetime.now().isoformat()
        }
        
        roles_table.put_item(Item=role_item)
        
        return create_response(201, {"success": True, "data": role_item})
        
    except Exception as e:
        return create_response(500, {"success": False, "error": str(e)})

def list_roles() -> dict:
    try:
        response = roles_table.scan()
        roles = response.get('Items', [])
        
        return create_response(200, {"success": True, "data": {"roles": roles}})
        
    except Exception as e:
        return create_response(500, {"success": False, "error": str(e)})

def assign_agent_to_role(role_id: str, body: dict) -> dict:
    try:
        agent_id = body.get('agentId')
        
        if not agent_id:
            return create_response(400, {"success": False, "error": "Agent ID is required"})
        
        role_agents_table.put_item(Item={
            'roleId': role_id,
            'agentId': agent_id,
            'assignedAt': datetime.now().isoformat()
        })
        
        return create_response(200, {"success": True, "message": "Agent assigned to role"})
        
    except Exception as e:
        return create_response(500, {"success": False, "error": str(e)})

def get_user_dashboard(user_id: str) -> dict:
    try:
        # Get user roles
        user_response = users_table.get_item(Key={'userId': user_id})
        user = user_response.get('Item', {})
        user_roles = user.get('roles', [])
        
        permissions = []
        available_agents = []
        
        # Get permissions and agents for each role
        for role_id in user_roles:
            role_response = roles_table.get_item(Key={'roleId': role_id})
            role = role_response.get('Item')
            
            if role:
                permissions.extend(role.get('permissions', []))
                
                # Get agents for this role
                agent_response = role_agents_table.query(
                    KeyConditionExpression='roleId = :roleId',
                    ExpressionAttributeValues={':roleId': role_id}
                )
                
                for agent_item in agent_response.get('Items', []):
                    available_agents.append({
                        'agentId': agent_item['agentId'],
                        'assignedViaRole': role_id,
                        'roleName': role.get('roleName')
                    })
        
        return create_response(200, {
            "success": True,
            "data": {
                "user": user,
                "permissions": list(set(permissions)),
                "availableAgents": available_agents
            }
        })
        
    except Exception as e:
        return create_response(500, {"success": False, "error": str(e)})

def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {"success": True})
    
    try:
        method = event['httpMethod']
        path = event['path']
        path_parameters = event.get('pathParameters', {}) or {}
        
        body = {}
        if event.get('body'):
            body = json.loads(event['body'])
        
        # Route requests
        if path == '/roles' and method == 'GET':
            return list_roles()
        elif path == '/roles' and method == 'POST':
            return create_role(body)
        elif path.endswith('/agents') and method == 'POST' and 'roleId' in path_parameters:
            return assign_agent_to_role(path_parameters['roleId'], body)
        elif path.endswith('/dashboard') and method == 'GET' and 'userId' in path_parameters:
            return get_user_dashboard(path_parameters['userId'])
        else:
            return create_response(404, {"success": False, "error": "Not found"})
            
    except Exception as e:
        return create_response(500, {"success": False, "error": str(e)})