import json
import boto3
import os
import traceback
from typing import Dict, List, Any, Optional
from decimal import Decimal
import time
from datetime import datetime

# Initialize clients
dynamodb = boto3.resource('dynamodb')
cognito_identity = boto3.client('cognito-identity')

# Environment variables
SHARED_KB_TABLE = os.environ['SHARED_KB_TABLE']
SHARED_AGENTS_TABLE = os.environ['SHARED_AGENTS_TABLE']
USER_GROUPS_TABLE = os.environ['USER_GROUPS_TABLE']
GROUPS_TABLE = os.environ['GROUPS_TABLE']
KB_TABLE = os.environ['KB_TABLE']
AGENTS_TABLE = os.environ['AGENTS_TABLE']
USER_POOL_ID = os.environ['USER_POOL_ID']
IDENTITY_POOL_ID = os.environ['IDENTITY_POOL_ID']
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')

# DynamoDB tables
shared_kb_table = dynamodb.Table(SHARED_KB_TABLE)
shared_agents_table = dynamodb.Table(SHARED_AGENTS_TABLE)
user_groups_table = dynamodb.Table(USER_GROUPS_TABLE)
groups_table = dynamodb.Table(GROUPS_TABLE)
kb_table = dynamodb.Table(KB_TABLE)
agents_table = dynamodb.Table(AGENTS_TABLE)

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for DynamoDB Decimal types"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
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

def get_user_info(event) -> dict:
    """Extract user information from Cognito authorizer context"""
    request_context = event.get('requestContext', {})
    authorizer = request_context.get('authorizer', {})
    
    # The authorizer passes user info in the context
    user_info = {
        'sub': authorizer.get('sub'),
        'email': authorizer.get('email'),
        'username': authorizer.get('username'),
        'groups': authorizer.get('groups', '').split(',') if authorizer.get('groups') else []
    }
    
    # Get the original JWT token from the event
    jwt_token = None
    auth_header = event.get('headers', {}).get('Authorization') or event.get('headers', {}).get('authorization')
    if auth_header and auth_header.startswith('Bearer '):
        jwt_token = auth_header[7:]
    
    # If claims are available as JSON string, parse them
    claims_str = authorizer.get('claims')
    if claims_str:
        try:
            claims = json.loads(claims_str)
            user_info.update({
                'sub': claims.get('sub', user_info['sub']),
                'email': claims.get('email', user_info['email']),
                'username': claims.get('cognito:username', user_info['username']),
            })
        except json.JSONDecodeError:
            pass
    
    # Get the identity ID for S3 operations (but use sub for ownership checks)
    if jwt_token:
        try:
            user_info['identityId'] = get_identity_id_from_token(jwt_token)
            print(f"Mapped token to identityId {user_info['identityId']}")
        except Exception as e:
            print(f"Failed to get identityId from token: {e}")
            # Fallback: use sub as identityId
            user_info['identityId'] = user_info['sub']
    else:
        print("No JWT token found, using sub as identityId")
        user_info['identityId'] = user_info['sub']
    
    return user_info

def check_group_permission(sub: str, group_id: str, required_role: str = 'member') -> bool:
    """Check if user has required permission for a group"""
    try:
        response = user_groups_table.get_item(
            Key={
                'userId': sub,  # Use sub for UserGroups table
                'groupId': group_id
            }
        )
        
        if 'Item' not in response:
            return False
        
        user_role = response['Item'].get('role', 'member')
        role_hierarchy = {'owner': 4, 'admin': 3, 'member': 2, 'viewer': 1}
        
        return role_hierarchy.get(user_role, 0) >= role_hierarchy.get(required_role, 0)
    except Exception as e:
        print(f"Error checking group permission: {e}")
        return False

def check_resource_ownership(sub: str, resource_id: str, resource_type: str) -> bool:
    """Check if user owns the resource using sub (not identityId)"""
    try:
        print(f"Checking ownership for sub {sub}, resource {resource_id}, type {resource_type}")
        
        if resource_type == 'knowledge-base':
            # Query the knowledge bases table using sub as partition key
            response = kb_table.query(
                KeyConditionExpression='userId = :userId',
                ExpressionAttributeValues={':userId': sub}
            )
            
            # Check if any of the returned items have the matching knowledgeBaseId
            items = response.get('Items', [])
            print(f"Found {len(items)} knowledge bases for sub {sub}")
            
            for item in items:
                print(f"Checking KB: {item.get('knowledgeBaseId')} vs {resource_id}")
                if item.get('knowledgeBaseId') == resource_id:
                    return True
                    
        elif resource_type == 'agent':
            # Query the agents table using sub as partition key
            response = agents_table.query(
                KeyConditionExpression='userId = :userId',
                ExpressionAttributeValues={':userId': sub}
            )
            
            # Check if any of the returned items have the matching agent id
            items = response.get('Items', [])
            print(f"Found {len(items)} agents for sub {sub}")
            
            for item in items:
                # Check both 'id' and 'agentId' fields to be safe
                agent_id = item.get('id') or item.get('agentId')
                print(f"Checking agent: {agent_id} vs {resource_id}")
                if agent_id == resource_id:
                    return True
        
        print(f"Resource {resource_id} not found for sub {sub}")
        return False
        
    except Exception as e:
        print(f"Error checking resource ownership: {e}")
        traceback.print_exc()
        return False

def share_resource(user_info: dict, body: dict) -> dict:
    """Share a resource with a group or make it public/private"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        resource_id = body.get('resourceId')
        resource_type = body.get('resourceType')
        group_id = body.get('groupId')  # Can be null for public sharing or private setting
        permissions = body.get('permissions', {})
        visibility = body.get('visibility', 'private')  # New field: 'private', 'public'
        
        print(f"Share request: sub={sub}, resource={resource_id}, type={resource_type}, group={group_id}, visibility={visibility}")
        
        if not all([resource_id, resource_type]):
            return create_error_response(400, "MISSING_REQUIRED_FIELDS", 
                                       "resourceId and resourceType are required")
        
        if resource_type not in ['knowledge-base', 'agent']:
            return create_error_response(400, "INVALID_RESOURCE_TYPE", 
                                       "resourceType must be 'knowledge-base' or 'agent'")
        
        # Check if user owns the resource using sub
        if not check_resource_ownership(sub, resource_id, resource_type):
            return create_error_response(403, "ACCESS_DENIED", "You don't own this resource")
        
        # Validate visibility value
        if visibility not in ['private', 'public']:
            return create_error_response(400, "INVALID_VISIBILITY", 
                                       "visibility must be 'private' or 'public'")
        
        timestamp = datetime.utcnow().isoformat()
        
        # Handle public/private visibility setting
        if visibility == 'public' or visibility == 'private':
            # Update the resource's visibility in its own table
            try:
                if resource_type == 'knowledge-base':
                    # Update knowledge base visibility
                    kb_response = kb_table.update_item(
                        Key={
                            'userId': sub,
                            'knowledgeBaseId': resource_id
                        },
                        UpdateExpression='SET visibility = :visibility, updatedAt = :timestamp',
                        ExpressionAttributeValues={
                            ':visibility': visibility,
                            ':timestamp': timestamp
                        },
                        ReturnValues='UPDATED_NEW'
                    )
                    
                elif resource_type == 'agent':
                    # Update agent visibility
                    agent_response = agents_table.update_item(
                        Key={
                            'userId': sub,
                            'id': resource_id
                        },
                        UpdateExpression='SET visibility = :visibility, lastEditedAt = :timestamp',
                        ExpressionAttributeValues={
                            ':visibility': visibility,
                            ':timestamp': int(time.time() * 1000)  # Use milliseconds timestamp to match agent schema
                        },
                        ReturnValues='UPDATED_NEW'
                    )
                    
                    # If setting to public and agent has a KB, update KB visibility too
                    if visibility == 'public':
                        try:
                            agent_get_response = agents_table.get_item(
                                Key={
                                    'userId': sub,
                                    'id': resource_id
                                }
                            )
                            
                            if 'Item' in agent_get_response and 'knowledgeBaseId' in agent_get_response['Item']:
                                kb_id = agent_get_response['Item']['knowledgeBaseId']
                                
                                # Check if user owns the KB before updating
                                if check_resource_ownership(sub, kb_id, 'knowledge-base'):
                                    kb_table.update_item(
                                        Key={
                                            'userId': sub,
                                            'knowledgeBaseId': kb_id
                                        },
                                        UpdateExpression='SET visibility = :visibility, updatedAt = :timestamp',
                                        ExpressionAttributeValues={
                                            ':visibility': visibility,
                                            ':timestamp': timestamp
                                        }
                                    )
                                    print(f"Also updated KB {kb_id} visibility to {visibility}")
                        except Exception as kb_update_error:
                            print(f"Error updating associated KB visibility: {kb_update_error}")
                
                # If just changing visibility (no group sharing), return success
                if not group_id:
                    return create_response(200, {
                        "success": True,
                        "message": f"{resource_type.replace('-', ' ').title()} visibility set to {visibility}"
                    })
                
            except Exception as visibility_error:
                print(f"Error updating visibility: {visibility_error}")
                return create_error_response(500, "VISIBILITY_UPDATE_ERROR", f"Failed to update visibility: {str(visibility_error)}")
        
        # For group sharing, ensure group_id is provided
        if not group_id:
            return create_error_response(400, "MISSING_GROUP_ID", 
                                       "groupId is required when sharing with a group")
        
        # Continue with group sharing logic
        # Check if user has permission to share with this group
        if not check_group_permission(sub, group_id, 'member'):
            return create_error_response(403, "ACCESS_DENIED", "You don't have access to this group")
        
        # Default permissions
        default_permissions = {
            'canView': True,
            'canEdit': permissions.get('canEdit', True),
            'canDelete': permissions.get('canDelete', False),
            'canShare': permissions.get('canShare', False)
        }
        
        if resource_type == 'agent':
            default_permissions['canExecute'] = permissions.get('canExecute', True)
        elif resource_type == 'knowledge-base':
            default_permissions['canSync'] = permissions.get('canSync', True)
        
        # Check if already shared
        if resource_type == 'knowledge-base':
            existing_response = shared_kb_table.get_item(
                Key={
                    'groupId': group_id,
                    'knowledgeBaseId': resource_id
                }
            )
            if 'Item' in existing_response:
                return create_error_response(409, "ALREADY_SHARED", "Resource is already shared with this group")
        else:  # agent
            existing_response = shared_agents_table.get_item(
                Key={
                    'groupId': group_id,
                    'agentId': resource_id
                }
            )
            if 'Item' in existing_response:
                return create_error_response(409, "ALREADY_SHARED", "Resource is already shared with this group")
        
        # Get resource metadata for enriching shared records
        resource_metadata = None
        
        if resource_type == 'knowledge-base':
            # Use the KB GSI to get resource metadata by ID
            kb_response = kb_table.query(
                IndexName='KnowledgeBaseIdIndex',
                KeyConditionExpression='knowledgeBaseId = :resId',
                ExpressionAttributeValues={':resId': resource_id},
                Limit=1
            )
            if kb_response.get('Items'):
                resource_metadata = kb_response['Items'][0]
        
        # Share the resource with group
        share_item = {
            'groupId': group_id,
            'sharedBy': sub,  # Use sub for shared resource tracking
            'sharedAt': timestamp,
            'permissions': default_permissions,
            'status': 'active'
        }
        
        # Add additional metadata if available
        if resource_metadata:
            share_item['resourceName'] = resource_metadata.get('name')
            share_item['resourceDescription'] = resource_metadata.get('description')
        
        if resource_type == 'knowledge-base':
            share_item['knowledgeBaseId'] = resource_id
            shared_kb_table.put_item(Item=share_item)
        else:  # agent
            share_item['agentId'] = resource_id
            shared_agents_table.put_item(Item=share_item)
            
            # Also share the knowledge base if this agent has one
            try:
                # Get agent details to check if it has a knowledge base
                agent_response = agents_table.get_item(
                    Key={
                        'userId': sub,
                        'id': resource_id
                    }
                )
                
                if 'Item' in agent_response and 'knowledgeBaseId' in agent_response['Item']:
                    kb_id = agent_response['Item']['knowledgeBaseId']
                    print(f"Agent has knowledge base {kb_id}, checking if it needs to be shared")
                    
                    # Check if this KB is already shared with this group
                    kb_existing_response = shared_kb_table.get_item(
                        Key={
                            'groupId': group_id,
                            'knowledgeBaseId': kb_id
                        }
                    )
                    
                    if 'Item' not in kb_existing_response:
                        print(f"Automatically sharing associated knowledge base {kb_id}")
                        
                        # Create KB sharing permissions based on agent permissions
                        kb_permissions = {
                            'canView': True,  # Always allow viewing
                            'canEdit': default_permissions.get('canEdit', False),
                            'canDelete': default_permissions.get('canDelete', False),
                            'canShare': default_permissions.get('canShare', False),
                            'canSync': default_permissions.get('canEdit', False)  # If you can edit the agent, you can sync KB
                        }
                        
                        # Get KB metadata if available
                        kb_metadata = None
                        kb_response = kb_table.query(
                            IndexName='KnowledgeBaseIdIndex',
                            KeyConditionExpression='knowledgeBaseId = :resId',
                            ExpressionAttributeValues={':resId': kb_id},
                            Limit=1
                        )
                        if kb_response.get('Items'):
                            kb_metadata = kb_response['Items'][0]
                        
                        # Create sharing record for KB
                        kb_share_item = {
                            'groupId': group_id,
                            'knowledgeBaseId': kb_id,
                            'sharedBy': sub,
                            'sharedAt': timestamp,
                            'permissions': kb_permissions,
                            'status': 'active',
                            'autoShared': True,  # Mark as automatically shared with agent
                            'parentResourceType': 'agent',
                            'parentResourceId': resource_id
                        }
                        
                        # Add KB metadata if available
                        if kb_metadata:
                            kb_share_item['resourceName'] = kb_metadata.get('name')
                            kb_share_item['resourceDescription'] = kb_metadata.get('description')
                        
                        # Create the KB sharing record
                        shared_kb_table.put_item(Item=kb_share_item)
                        print(f"Successfully shared associated knowledge base {kb_id}")
                    else:
                        print(f"Knowledge base {kb_id} is already shared with group {group_id}")
                
            except Exception as kb_share_error:
                # Log error but don't fail the original agent sharing
                print(f"Error while trying to share associated knowledge base: {kb_share_error}")
                traceback.print_exc()
        
        return create_response(201, {
            "success": True,
            "message": f"{resource_type.replace('-', ' ').title()} shared successfully with group"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def unshare_resource(user_info: dict, resource_id: str, group_id: str, resource_type: str) -> dict:
    """Unshare a resource from a group"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        # Check if user owns the resource or has admin rights in the group
        has_ownership = check_resource_ownership(sub, resource_id, resource_type)
        has_group_admin = check_group_permission(sub, group_id, 'admin')
        
        if not (has_ownership or has_group_admin):
            return create_error_response(403, "ACCESS_DENIED", 
                                       "You need to own the resource or be a group admin")
        
        # Unshare the resource
        if resource_type == 'knowledge-base':
            shared_kb_table.delete_item(
                Key={
                    'groupId': group_id,
                    'knowledgeBaseId': resource_id
                }
            )
        else:  # agent
            shared_agents_table.delete_item(
                Key={
                    'groupId': group_id,
                    'agentId': resource_id
                }
            )
        
        return create_response(200, {
            "success": True,
            "message": f"{resource_type.replace('-', ' ').title()} unshared successfully"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def update_shared_resource(user_info: dict, resource_id: str, group_id: str, resource_type: str, body: dict) -> dict:
    """Update shared resource permissions"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        # Get the permissions from the request body
        permissions = body.get('permissions', {})
        
        # Check if user owns the resource or has admin rights in the group
        has_ownership = check_resource_ownership(sub, resource_id, resource_type)
        has_group_admin = check_group_permission(sub, group_id, 'admin')
        
        if not (has_ownership or has_group_admin):
            return create_error_response(403, "ACCESS_DENIED", 
                                       "You need to own the resource or be a group admin")
        
        # Ensure canView is always true - this is required for users to see shared resources
        if resource_type == 'knowledge-base':
            permissions['canView'] = True
            
        # Update permissions
        update_expression = "SET #permissions = :permissions, updatedAt = :updatedAt"
        expression_attribute_names = {
            '#permissions': 'permissions'
        }
        expression_values = {
            ':permissions': permissions,
            ':updatedAt': datetime.utcnow().isoformat()
        }
        
        if resource_type == 'knowledge-base':
            shared_kb_table.update_item(
                Key={
                    'groupId': group_id,
                    'knowledgeBaseId': resource_id
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_values
            )
        else:  # agent
            shared_agents_table.update_item(
                Key={
                    'groupId': group_id,
                    'agentId': resource_id
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_values
            )
        
        return create_response(200, {
            "success": True,
            "message": "Permissions updated successfully"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))
    
def list_resources_shared_to_me(user_info: dict, query_params: dict) -> dict:
    """List resources shared to the current user"""
    try:
        user_sub = user_info.get('sub')
        if not user_sub:
            return create_error_response(400, "MISSING_USER_SUB", "User sub not found in request")
        
        resource_type = query_params.get('type')
        group_id = query_params.get('groupId')
        
        print(f"Listing resources shared to user sub: {user_sub}")
        
        # Get user's groups using sub as userId
        user_groups_response = user_groups_table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': user_sub}
        )
        
        user_groups = [item['groupId'] for item in user_groups_response.get('Items', [])]
        print(f"Found user groups: {user_groups}")
        
        shared_resources = []
        
        # Get shared knowledge bases
        if not resource_type or resource_type == 'knowledge-base':
            for ug_id in user_groups:
                if group_id and ug_id != group_id:
                    continue
                    
                kb_response = shared_kb_table.query(
                    KeyConditionExpression='groupId = :groupId',
                    ExpressionAttributeValues={':groupId': ug_id}
                )
                
                for item in kb_response.get('Items', []):
                    kb_id = item['knowledgeBaseId']
                    
                    # Use the GSI to get the original KB details by ID
                    original_kb_response = kb_table.query(
                        IndexName='KnowledgeBaseIdIndex',
                        KeyConditionExpression='knowledgeBaseId = :kb_id',
                        ExpressionAttributeValues={':kb_id': kb_id},
                        Limit=1
                    )
                    
                    kb_name = item.get('resourceName', '')
                    kb_description = item.get('resourceDescription', '')
                    
                    # If shared record doesn't have name/description, get it from original KB record
                    if original_kb_response.get('Items'):
                        original_kb = original_kb_response['Items'][0]
                        if not kb_name:
                            kb_name = original_kb.get('name', '')
                        if not kb_description:
                            kb_description = original_kb.get('description', '')
                    
                    # Get group details
                    group_response = groups_table.get_item(Key={'groupId': ug_id})
                    group_info = group_response.get('Item', {})
                    
                    shared_resources.append({
                        'id': kb_id,
                        'name': kb_name,
                        'description': kb_description,
                        'groupId': ug_id,
                        'type': 'knowledge-base',
                        'sharedBy': item['sharedBy'],
                        'sharedAt': item['sharedAt'],
                        'permissions': item.get('permissions', {}),
                        'status': item.get('status', 'active'),
                        'group': {
                            'groupId': ug_id,
                            'groupName': group_info.get('groupName', 'Unknown')
                        }
                    })
        
        # Get shared agents
        if not resource_type or resource_type == 'agent':
            for ug_id in user_groups:
                if group_id and ug_id != group_id:
                    continue
                    
                agent_response = shared_agents_table.query(
                    KeyConditionExpression='groupId = :groupId',
                    ExpressionAttributeValues={':groupId': ug_id}
                )
                
                for item in agent_response.get('Items', []):
                    # Get group details
                    group_response = groups_table.get_item(Key={'groupId': ug_id})
                    group_info = group_response.get('Item', {})
                    
                    shared_resources.append({
                        'id': item['agentId'],
                        'groupId': ug_id,
                        'type': 'agent',
                        'sharedBy': item['sharedBy'],
                        'sharedAt': item['sharedAt'],
                        'permissions': item.get('permissions', {}),
                        'status': item.get('status', 'active'),
                        'group': {
                            'groupId': ug_id,
                            'groupName': group_info.get('groupName', 'Unknown')
                        }
                    })
        
        return create_response(200, {
            "success": True,
            "data": {
                "resources": shared_resources,
                "userSub": user_sub  # Include for debugging
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def list_shared_resources(user_info: dict, query_params: dict) -> dict:
    """List shared resources for user's groups"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        resource_type = query_params.get('type')
        group_id = query_params.get('groupId')
        
        # Get user's groups using sub
        user_groups_response = user_groups_table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': sub}
        )
        
        user_groups = [item['groupId'] for item in user_groups_response.get('Items', [])]
        
        shared_resources = []
        
        # Get shared knowledge bases
        if not resource_type or resource_type == 'knowledge-base':
            for ug_id in user_groups:
                if group_id and ug_id != group_id:
                    continue
                    
                kb_response = shared_kb_table.query(
                    KeyConditionExpression='groupId = :groupId',
                    ExpressionAttributeValues={':groupId': ug_id}
                )
                
                for item in kb_response.get('Items', []):
                    # Get group details
                    group_response = groups_table.get_item(Key={'groupId': ug_id})
                    group_info = group_response.get('Item', {})
                    
                    shared_resources.append({
                        'id': item['knowledgeBaseId'],
                        'groupId': ug_id,
                        'type': 'knowledge-base',
                        'sharedBy': item['sharedBy'],
                        'sharedAt': item['sharedAt'],
                        'permissions': item.get('permissions', {}),
                        'status': item.get('status', 'active'),
                        'group': {
                            'groupId': ug_id,
                            'groupName': group_info.get('groupName', 'Unknown')
                        }
                    })
        
        # Get shared agents
        if not resource_type or resource_type == 'agent':
            for ug_id in user_groups:
                if group_id and ug_id != group_id:
                    continue
                    
                agent_response = shared_agents_table.query(
                    KeyConditionExpression='groupId = :groupId',
                    ExpressionAttributeValues={':groupId': ug_id}
                )
                
                for item in agent_response.get('Items', []):
                    # Get group details
                    group_response = groups_table.get_item(Key={'groupId': ug_id})
                    group_info = group_response.get('Item', {})
                    
                    shared_resources.append({
                        'id': item['agentId'],
                        'groupId': ug_id,
                        'type': 'agent',
                        'sharedBy': item['sharedBy'],
                        'sharedAt': item['sharedAt'],
                        'permissions': item.get('permissions', {}),
                        'status': item.get('status', 'active'),
                        'group': {
                            'groupId': ug_id,
                            'groupName': group_info.get('groupName', 'Unknown')
                        }
                    })
        
        return create_response(200, {
            "success": True,
            "data": {
                "resources": shared_resources
            }
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
        
        # Get user info from authorizer
        user_info = get_user_info(event)
        
        print(f"Request: {method} {path}")
        print(f"User info: {user_info}")
        
        # Route to appropriate handler
        if path == '/shared-resources' and method == 'GET':
            return list_shared_resources(user_info, query_parameters)
        elif path == '/shared-resources/shared-to-me' and method == 'GET':
            return list_resources_shared_to_me(user_info, query_parameters)
        elif path == '/shared-resources' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return share_resource(user_info, body)
        elif path.startswith('/shared-resources/') and method == 'DELETE':
            # Parse path: /shared-resources/{resourceType}/{resourceId}/groups/{groupId}
            path_parts = path.split('/')
            if len(path_parts) >= 6:
                resource_type = path_parts[2]
                resource_id = path_parts[3]
                group_id = path_parts[5]
                return unshare_resource(user_info, resource_id, group_id, resource_type)
        elif path.startswith('/shared-resources/') and method == 'PUT':
            # Parse path: /shared-resources/{resourceType}/{resourceId}/groups/{groupId}
            path_parts = path.split('/')
            if len(path_parts) >= 6:
                resource_type = path_parts[2]
                resource_id = path_parts[3]
                group_id = path_parts[5]
                body = json.loads(event.get('body', '{}'))
                return update_shared_resource(user_info, resource_id, group_id, resource_type, body)
        
        return create_error_response(404, "NOT_FOUND", "Resource not found")
            
    except json.JSONDecodeError:
        return create_error_response(400, "INVALID_JSON", "Invalid JSON in request body")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))