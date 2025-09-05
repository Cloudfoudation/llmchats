import json
import boto3
import os
import traceback
from typing import Dict, List, Any, Optional
from decimal import Decimal
import uuid
from datetime import datetime

# Initialize clients
dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')
cognito_identity = boto3.client('cognito-identity')

# Environment variables
GROUPS_TABLE = os.environ['GROUPS_TABLE']
USER_GROUPS_TABLE = os.environ['USER_GROUPS_TABLE']
SHARED_AGENTS_TABLE = os.environ['SHARED_AGENTS_TABLE']
SHARED_KB_TABLE = os.environ['SHARED_KB_TABLE']
USER_POOL_ID = os.environ['USER_POOL_ID']
IDENTITY_POOL_ID = os.environ['IDENTITY_POOL_ID']
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')

# DynamoDB tables
groups_table = dynamodb.Table(GROUPS_TABLE)
user_groups_table = dynamodb.Table(USER_GROUPS_TABLE)
shared_agents_table = dynamodb.Table(SHARED_AGENTS_TABLE)
shared_kb_table = dynamodb.Table(SHARED_KB_TABLE)

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
    
    # Get the identity ID for resource ownership checks
    if jwt_token:
        try:
            user_info['identityId'] = get_identity_id_from_token(jwt_token)
            print(f"Mapped token to identityId {user_info['identityId']}")
        except Exception as e:
            print(f"Failed to get identityId from token: {e}")
            # Fallback: use sub as identityId (this might work if they're the same)
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

def list_groups(user_info: dict, query_params: dict) -> dict:
    """List groups that the user has access to"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
            
        limit = int(query_params.get('limit', '50'))
        
        print(f"Querying groups for sub: {sub}")  # Debug log
        
        # Get user's group memberships using sub
        response = user_groups_table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': sub}
        )
        
        user_groups = response.get('Items', [])
        groups = []
        
        for membership in user_groups:
            group_id = membership['groupId']
            
            # Get group details
            group_response = groups_table.get_item(
                Key={'groupId': group_id}
            )
            
            if 'Item' in group_response:
                group_item = group_response['Item']
                groups.append({
                    'groupId': group_item['groupId'],
                    'groupName': group_item['groupName'],
                    'description': group_item.get('description', ''),
                    'createdBy': group_item['createdBy'],
                    'createdAt': group_item['createdAt'],
                    'memberCount': group_item.get('memberCount', 0),
                    'userRole': membership['role'],
                    'joinedAt': membership['joinedAt']
                })
        
        # Sort by creation date (newest first)
        groups.sort(key=lambda x: x['createdAt'], reverse=True)
        
        return create_response(200, {
            "success": True,
            "data": {
                "groups": groups[:limit]
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def create_group(user_info: dict, body: dict) -> dict:
    """Create a new group"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
            
        group_name = body.get('groupName')
        description = body.get('description', '')
        
        if not group_name:
            return create_error_response(400, "MISSING_GROUP_NAME", "Group name is required")
        
        # Generate unique group ID
        group_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Create group using sub as createdBy
        groups_table.put_item(
            Item={
                'groupId': group_id,
                'groupName': group_name,
                'description': description,
                'createdBy': sub,  # Use sub for Groups table
                'createdAt': timestamp,
                'memberCount': 1
            }
        )
        
        # Add creator as owner using sub
        user_groups_table.put_item(
            Item={
                'userId': sub,  # Use sub for UserGroups table
                'groupId': group_id,
                'role': 'owner',
                'joinedAt': timestamp,
                'permissions': {
                    'canManageMembers': True,
                    'canManageKB': True,
                    'canManageAgents': True,
                    'canDelete': True
                }
            }
        )
        
        group_details = {
            'groupId': group_id,
            'groupName': group_name,
            'description': description,
            'createdBy': sub,
            'createdAt': timestamp,
            'memberCount': 1,
            'userRole': 'owner'
        }
        
        return create_response(201, {
            "success": True,
            "data": group_details
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def get_group(user_info: dict, group_id: str) -> dict:
    """Get details of a specific group"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        # Check if user has access to this group
        if not check_group_permission(sub, group_id, 'viewer'):
            return create_error_response(403, "ACCESS_DENIED", "You don't have access to this group")
        
        # Get group details
        response = groups_table.get_item(
            Key={'groupId': group_id}
        )
        
        if 'Item' not in response:
            return create_error_response(404, "GROUP_NOT_FOUND", f"Group {group_id} not found")
        
        group_item = response['Item']
        
        # Get user's role in this group using sub
        user_membership = user_groups_table.get_item(
            Key={
                'userId': sub,  # Use sub for UserGroups table
                'groupId': group_id
            }
        )
        
        user_role = user_membership.get('Item', {}).get('role', 'viewer')
        
        group_details = {
            'groupId': group_item['groupId'],
            'groupName': group_item['groupName'],
            'description': group_item.get('description', ''),
            'createdBy': group_item['createdBy'],
            'createdAt': group_item['createdAt'],
            'memberCount': group_item.get('memberCount', 0),
            'userRole': user_role
        }
        
        return create_response(200, {
            "success": True,
            "data": group_details
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def update_group(user_info: dict, group_id: str, body: dict) -> dict:
    """Update group details"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        # Check if user has admin access
        if not check_group_permission(sub, group_id, 'admin'):
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to update this group")
        
        # Get current group
        response = groups_table.get_item(
            Key={'groupId': group_id}
        )
        
        if 'Item' not in response:
            return create_error_response(404, "GROUP_NOT_FOUND", f"Group {group_id} not found")
        
        # Update group
        update_expression = "SET updatedAt = :updatedAt"
        expression_values = {':updatedAt': datetime.utcnow().isoformat()}
        
        if 'groupName' in body:
            update_expression += ", groupName = :groupName"
            expression_values[':groupName'] = body['groupName']
        
        if 'description' in body:
            update_expression += ", description = :description"
            expression_values[':description'] = body['description']
        
        groups_table.update_item(
            Key={'groupId': group_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        return create_response(200, {
            "success": True,
            "message": "Group updated successfully"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def delete_group(user_info: dict, group_id: str) -> dict:
    """Delete a group"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        # Check if user is owner
        if not check_group_permission(sub, group_id, 'owner'):
            return create_error_response(403, "ACCESS_DENIED", "Only group owners can delete groups")
        
        # Get all members to remove them
        response = user_groups_table.query(
            IndexName='GroupMembersIndex',
            KeyConditionExpression='groupId = :groupId',
            ExpressionAttributeValues={':groupId': group_id}
        )
        
        # Delete all member relationships
        for item in response.get('Items', []):
            user_groups_table.delete_item(
                Key={
                    'userId': item['userId'],
                    'groupId': group_id
                }
            )
        
        # Delete shared agents for this group
        shared_agents_response = shared_agents_table.query(
            KeyConditionExpression='groupId = :groupId',
            ExpressionAttributeValues={':groupId': group_id}
        )
        
        for agent in shared_agents_response.get('Items', []):
            shared_agents_table.delete_item(
                Key={
                    'groupId': group_id,
                    'agentId': agent['agentId']
                }
            )
        
        # Delete shared knowledge bases for this group
        shared_kb_response = shared_kb_table.query(
            KeyConditionExpression='groupId = :groupId',
            ExpressionAttributeValues={':groupId': group_id}
        )
        
        for kb in shared_kb_response.get('Items', []):
            shared_kb_table.delete_item(
                Key={
                    'groupId': group_id,
                    'knowledgeBaseId': kb['knowledgeBaseId']
                }
            )
        
        # Delete the group
        groups_table.delete_item(
            Key={'groupId': group_id}
        )
        
        return create_response(200, {
            "success": True,
            "message": "Group deleted successfully"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def get_identity_id_from_sub_via_cognito(sub: str) -> str:
    """
    Helper function to get identityId from sub by looking up the user in Cognito
    and then converting their token to identityId
    """
    try:
        # This is a more complex approach - we'd need to generate a token for the user
        # For now, we'll use the simpler approach of assuming sub == identityId for some cases
        # or storing the mapping in our database
        return sub  # Fallback for now
    except Exception as e:
        print(f"Error converting sub to identityId: {e}")
        return sub

def add_member(user_info: dict, group_id: str, body: dict) -> dict:
    """Add a member to the group"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        new_member_email = body.get('email')
        role = body.get('role', 'member')
        
        if not new_member_email:
            return create_error_response(400, "MISSING_EMAIL", "Member email is required")
        
        # Check if user has admin access
        if not check_group_permission(sub, group_id, 'admin'):
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to add members")
        
        # Get new member's sub from Cognito
        try:
            cognito_response = cognito.admin_get_user(
                UserPoolId=USER_POOL_ID,
                Username=new_member_email
            )
            # Extract sub from UserAttributes
            new_member_sub = None
            for attr in cognito_response.get('UserAttributes', []):
                if attr['Name'] == 'sub':
                    new_member_sub = attr['Value']
                    break
            
            if not new_member_sub:
                return create_error_response(404, "USER_NOT_FOUND", "User ID not found")
            
            # For UserGroups table, we use the sub directly
            new_member_sub_for_groups = new_member_sub
                
        except cognito.exceptions.UserNotFoundException:
            return create_error_response(404, "USER_NOT_FOUND", f"User {new_member_email} not found")
        
        # Check if user is already a member
        existing_membership = user_groups_table.get_item(
            Key={
                'userId': new_member_sub_for_groups,  # Use sub for UserGroups table
                'groupId': group_id
            }
        )
        
        if 'Item' in existing_membership:
            return create_error_response(409, "ALREADY_MEMBER", "User is already a member of this group")
        
        # Add member
        timestamp = datetime.utcnow().isoformat()
        member_permissions = {
            'canManageMembers': role in ['admin', 'owner'],
            'canManageKB': role in ['admin', 'owner', 'member'],
            'canManageAgents': role in ['admin', 'owner', 'member'],
            'canDelete': role == 'owner'
        }
        
        user_groups_table.put_item(
            Item={
                'userId': new_member_sub_for_groups,  # Use sub for UserGroups table
                'groupId': group_id,
                'role': role,
                'joinedAt': timestamp,
                'permissions': member_permissions
            }
        )
        
        # Update member count
        groups_table.update_item(
            Key={'groupId': group_id},
            UpdateExpression='ADD memberCount :inc',
            ExpressionAttributeValues={':inc': 1}
        )
        
        return create_response(200, {
            "success": True,
            "data": {
                "userId": new_member_sub_for_groups,
                "email": new_member_email,
                "role": role,
                "joinedAt": timestamp
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def remove_member(user_info: dict, group_id: str, member_user_id: str) -> dict:
    """Remove a member from the group"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        # Check if user has admin access
        if not check_group_permission(sub, group_id, 'admin'):
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to remove members")
        
        # Can't remove yourself if you're the owner (need to transfer ownership first)
        if sub == member_user_id:
            user_role = user_groups_table.get_item(
                Key={
                    'userId': sub,  # Use sub for UserGroups table
                    'groupId': group_id
                }
            ).get('Item', {}).get('role')
            
            if user_role == 'owner':
                return create_error_response(400, "CANNOT_REMOVE_OWNER", "Group owner cannot remove themselves")
        
        # Remove member
        user_groups_table.delete_item(
            Key={
                'userId': member_user_id,
                'groupId': group_id
            }
        )
        
        # Update member count
        groups_table.update_item(
            Key={'groupId': group_id},
            UpdateExpression='ADD memberCount :dec',
            ExpressionAttributeValues={':dec': -1}
        )
        
        return create_response(200, {
            "success": True,
            "message": "Member removed successfully"
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def list_members(user_info: dict, group_id: str) -> dict:
    """List all members of a group"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        # Check if user has access to this group
        if not check_group_permission(sub, group_id, 'viewer'):
            return create_error_response(403, "ACCESS_DENIED", "You don't have access to this group")
        
        # Get all members using the GSI
        response = user_groups_table.query(
            IndexName='GroupMembersIndex',
            KeyConditionExpression='groupId = :groupId',
            ExpressionAttributeValues={':groupId': group_id}
        )
        
        members = []
        
        # Create a mapping of user IDs to populate later
        user_info_map = {}
        
        for item in response.get('Items', []):
            members.append({
                'userId': item['userId'], 
                'email': None,  # Will be updated
                'username': None,  # Will be updated
                'role': item['role'],
                'joinedAt': item['joinedAt'],
                'permissions': item.get('permissions', {})
            })
            
            # Add this user ID to our lookup map
            user_info_map[item['userId']] = len(members) - 1
        
        # For each unique user ID, lookup the user info from Cognito
        for user_id in user_info_map:
            try:
                # Look up user in Cognito using their sub (user_id)
                user_response = cognito.list_users(
                    UserPoolId=USER_POOL_ID,
                    Filter=f'sub = "{user_id}"'
                )
                
                if user_response['Users']:
                    user = user_response['Users'][0]
                    user_attrs = {attr['Name']: attr['Value'] for attr in user['Attributes']}
                    
                    # Update the member info with email and username
                    member_idx = user_info_map[user_id]
                    members[member_idx]['email'] = user_attrs.get('email')
                    members[member_idx]['username'] = user.get('Username')
                    
            except Exception as e:
                print(f"Error looking up user {user_id}: {e}")
                # Continue with the next user if one fails
                continue
        
        return create_response(200, {
            "success": True,
            "data": {
                "members": members
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def update_member_role(user_info: dict, group_id: str, member_user_id: str, body: dict) -> dict:
    """Update a member's role in the group"""
    try:
        sub = user_info.get('sub')
        if not sub:
            return create_error_response(400, "MISSING_SUB", "User sub not found in request")
        
        new_role = body.get('role')
        
        if not new_role:
            return create_error_response(400, "MISSING_ROLE", "Role is required")
        
        # Check if user has admin access
        if not check_group_permission(sub, group_id, 'admin'):
            return create_error_response(403, "ACCESS_DENIED", "You don't have permission to update member roles")
        
        # Can't change your own role if you're the owner
        if sub == member_user_id:
            user_role = user_groups_table.get_item(
                Key={
                    'userId': sub,  # Use sub for UserGroups table
                    'groupId': group_id
                }
            ).get('Item', {}).get('role')
            
            if user_role == 'owner':
                return create_error_response(400, "CANNOT_CHANGE_OWNER_ROLE", "Group owner cannot change their own role")
        
        # Update member role
        permissions = {
            'canManageMembers': new_role in ['admin', 'owner'],
            'canManageKB': new_role in ['admin', 'owner', 'member'],
            'canManageAgents': new_role in ['admin', 'owner', 'member'],
            'canDelete': new_role == 'owner'
        }
        
        user_groups_table.update_item(
            Key={
                'userId': member_user_id,
                'groupId': group_id
            },
            UpdateExpression='SET #role = :role, #perms = :permissions',
            ExpressionAttributeNames={
                '#role': 'role',
                '#perms': 'permissions'
            },
            ExpressionAttributeValues={
                ':role': new_role,
                ':permissions': permissions
            }
        )
        
        return create_response(200, {
            "success": True,
            "message": "Member role updated successfully"
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
        
        print(f"DEBUG: Method: {method}, Path: {path}, PathParams: {path_parameters}")
        print(f"DEBUG: User info: {user_info}")
        
        # Route to appropriate handler
        if path == '/groups' and method == 'GET':
            return list_groups(user_info, query_parameters)
        elif path == '/groups' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return create_group(user_info, body)
        elif method == 'GET' and 'groupId' in path_parameters and path.endswith('/members'):
            return list_members(user_info, path_parameters['groupId'])
        elif method == 'POST' and 'groupId' in path_parameters and path.endswith('/members'):
            body = json.loads(event.get('body', '{}'))
            return add_member(user_info, path_parameters['groupId'], body)
        elif method == 'DELETE' and 'groupId' in path_parameters and 'userId' in path_parameters:
            return remove_member(user_info, path_parameters['groupId'], path_parameters['userId'])
        elif method == 'PUT' and 'groupId' in path_parameters and 'userId' in path_parameters:
            body = json.loads(event.get('body', '{}'))
            return update_member_role(user_info, path_parameters['groupId'], path_parameters['userId'], body)
        elif method == 'GET' and 'groupId' in path_parameters and not path.endswith('/members'):
            return get_group(user_info, path_parameters['groupId'])
        elif method == 'PUT' and 'groupId' in path_parameters and not 'userId' in path_parameters:
            body = json.loads(event.get('body', '{}'))
            return update_group(user_info, path_parameters['groupId'], body)
        elif method == 'DELETE' and 'groupId' in path_parameters and not 'userId' in path_parameters:
            return delete_group(user_info, path_parameters['groupId'])
        else:
            return create_error_response(404, "NOT_FOUND", f"Resource not found: {method} {path}")
            
    except json.JSONDecodeError:
        return create_error_response(400, "INVALID_JSON", "Invalid JSON in request body")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))