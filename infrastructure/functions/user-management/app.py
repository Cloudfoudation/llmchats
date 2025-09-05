import json
import boto3
import os
import traceback
from typing import Dict, List, Any, Optional

# Initialize Cognito client
cognito = boto3.client('cognito-idp')
USER_POOL_ID = os.environ['USER_POOL_ID']
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')

def create_response(status_code: int, body: dict) -> dict:
    """Create a standardized API response"""
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
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

def list_users(query_params: dict) -> dict:
    """
    List users in the Cognito user pool with pagination
    
    Parameters:
        query_params (dict): Query parameters including limit and pagination token
    
    Returns:
        dict: Response with users list and pagination token
    """
    try:
        # Extract query parameters for pagination
        limit = int(query_params.get('limit', '50'))
        pagination_token = query_params.get('paginationToken')
        filter_expression = query_params.get('filter')
        
        # Prepare the API call parameters
        params = {
            'UserPoolId': USER_POOL_ID,
            'Limit': min(limit, 60)  # Cap at 60 (Cognito max is around 60)
        }
        
        if pagination_token:
            params['PaginationToken'] = pagination_token
        
        if filter_expression:
            params['Filter'] = filter_expression
            
        # Call Cognito API
        response = cognito.list_users(**params)
        
        # Process and transform the user data
        users = []
        for user in response.get('Users', []):
            user_attributes = {attr['Name']: attr['Value'] for attr in user.get('Attributes', [])}
            
            # Get the groups for this user
            try:
                groups_response = cognito.admin_list_groups_for_user(
                    Username=user['Username'],
                    UserPoolId=USER_POOL_ID
                )
                groups = [group['GroupName'] for group in groups_response.get('Groups', [])]
            except Exception as e:
                groups = []
            
            users.append({
                'username': user['Username'],
                'email': user_attributes.get('email', ''),
                'status': user['UserStatus'],
                'enabled': user['Enabled'],
                'createdAt': user['UserCreateDate'].isoformat(),
                'lastModifiedAt': user['UserLastModifiedDate'].isoformat(),
                'groups': groups
            })
        
        result = {
            'users': users
        }
        
        # Add pagination token if exists
        if 'PaginationToken' in response:
            result['paginationToken'] = response['PaginationToken']
        
        return create_response(200, {
            "success": True,
            "data": result
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def get_user(username: str) -> dict:
    """
    Get details of a specific user
    
    Parameters:
        username (str): Username of the user to retrieve
    
    Returns:
        dict: Response with user details
    """
    try:
        # Get user attributes
        user_response = cognito.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=username
        )
        
        user_attributes = {attr['Name']: attr['Value'] for attr in user_response.get('UserAttributes', [])}
        
        # Get user groups
        groups_response = cognito.admin_list_groups_for_user(
            Username=username,
            UserPoolId=USER_POOL_ID
        )
        groups = [group['GroupName'] for group in groups_response.get('Groups', [])]
        
        user_details = {
            'username': user_response['Username'],
            'email': user_attributes.get('email', ''),
            'status': user_response['UserStatus'],
            'enabled': user_response['Enabled'],
            'createdAt': user_response['UserCreateDate'].isoformat(),
            'lastModifiedAt': user_response['UserLastModifiedDate'].isoformat(),
            'groups': groups,
            'attributes': user_attributes
        }
        
        return create_response(200, {
            "success": True,
            "data": user_details
        })
        
    except cognito.exceptions.UserNotFoundException:
        return create_error_response(404, "USER_NOT_FOUND", f"User {username} not found")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def create_user(body: dict) -> dict:
    """
    Create a new user in Cognito
    
    Parameters:
        body (dict): Request body with user details
    
    Returns:
        dict: Response with created user details
    """
    try:
        username = body.get('username')
        email = body.get('email')
        temp_password = body.get('temporaryPassword')
        groups = body.get('groups', [])
        send_invite = body.get('sendInvite', True)
        
        # Use username if provided, otherwise use email
        if (not username or username.strip() == "") and (not email or email.strip() == ""):
            return create_error_response(400, "MISSING_USERNAME_OR_EMAIL", "Username or email is required")
        
        # Use username if provided, otherwise fall back to email
        cognito_username = username.strip() if username and username.strip() else email.strip() if email else ""
        user_email = email.strip() if email and email.strip() else username.strip() if username else ""
        
        # Validate email format if provided
        if user_email and "@" not in user_email:
            return create_error_response(400, "INVALID_EMAIL", "Invalid email format")
        
        if not cognito_username:
            return create_error_response(400, "MISSING_USERNAME", "Username is required")
        
        # Prepare user attributes
        user_attributes = [
            {'Name': 'email', 'Value': user_email},
            {'Name': 'email_verified', 'Value': 'true'}
        ]
        
        # Add additional attributes if provided
        for key, value in body.get('attributes', {}).items():
            if key not in ['email', 'email_verified']:
                user_attributes.append({'Name': key, 'Value': str(value)})
        
        # Create user in Cognito
        create_params = {
            'UserPoolId': USER_POOL_ID,
            'Username': cognito_username,
            'UserAttributes': user_attributes,
            'MessageAction': 'SUPPRESS',  # Always suppress for new user creation
        }
        
        if temp_password:
            create_params['TemporaryPassword'] = temp_password
        
        response = cognito.admin_create_user(**create_params)
        
        # Add user to groups if specified
        for group in groups:
            cognito.admin_add_user_to_group(
                UserPoolId=USER_POOL_ID,
                Username=cognito_username,
                GroupName=group
            )
        
        user_attributes = {attr['Name']: attr['Value'] for attr in response['User'].get('Attributes', [])}
        
        user_details = {
            'username': response['User']['Username'],
            'email': user_attributes.get('email', ''),
            'status': response['User']['UserStatus'],
            'enabled': response['User']['Enabled'],
            'createdAt': response['User']['UserCreateDate'].isoformat(),
            'groups': groups
        }
        
        return create_response(201, {
            "success": True,
            "data": user_details
        })
        
    except cognito.exceptions.UsernameExistsException:
        return create_error_response(409, "USER_EXISTS", "A user with this username/email already exists")
    except cognito.exceptions.InvalidPasswordException as e:
        return create_error_response(400, "INVALID_PASSWORD", str(e))
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def delete_user(username: str) -> dict:
    """
    Delete a user from Cognito
    
    Parameters:
        username (str): Username of the user to delete
    
    Returns:
        dict: Response with deletion status
    """
    try:
        cognito.admin_delete_user(
            UserPoolId=USER_POOL_ID,
            Username=username
        )
        
        return create_response(200, {
            "success": True,
            "message": f"User {username} deleted successfully"
        })
        
    except cognito.exceptions.UserNotFoundException:
        return create_error_response(404, "USER_NOT_FOUND", f"User {username} not found")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def update_user_groups(username: str, body: dict) -> dict:
    """
    Update a user's group memberships
    
    Parameters:
        username (str): Username of the user to update
        body (dict): Request body with groups configuration
    
    Returns:
        dict: Response with updated user groups
    """
    try:
        add_to_groups = body.get('addToGroups', [])
        remove_from_groups = body.get('removeFromGroups', [])
        set_groups = body.get('setGroups')
        
        # Check if the user exists
        try:
            cognito.admin_get_user(
                UserPoolId=USER_POOL_ID,
                Username=username
            )
        except cognito.exceptions.UserNotFoundException:
            return create_error_response(404, "USER_NOT_FOUND", f"User {username} not found")
        
        # Get current groups
        current_groups_response = cognito.admin_list_groups_for_user(
            Username=username,
            UserPoolId=USER_POOL_ID
        )
        current_groups = [group['GroupName'] for group in current_groups_response.get('Groups', [])]
        
        # If setGroups is provided, it overrides add/remove operations
        if set_groups is not None:
            groups_to_add = [group for group in set_groups if group not in current_groups]
            groups_to_remove = [group for group in current_groups if group not in set_groups]
        else:
            groups_to_add = [group for group in add_to_groups if group not in current_groups]
            groups_to_remove = [group for group in remove_from_groups if group in current_groups]
        
        # Add user to new groups
        for group in groups_to_add:
            cognito.admin_add_user_to_group(
                UserPoolId=USER_POOL_ID,
                Username=username,
                GroupName=group
            )
        
        # Remove user from groups
        for group in groups_to_remove:
            cognito.admin_remove_user_from_group(
                UserPoolId=USER_POOL_ID,
                Username=username,
                GroupName=group
            )
        
        # Get updated groups
        updated_groups_response = cognito.admin_list_groups_for_user(
            Username=username,
            UserPoolId=USER_POOL_ID
        )
        updated_groups = [group['GroupName'] for group in updated_groups_response.get('Groups', [])]
        
        return create_response(200, {
            "success": True,
            "data": {
                "username": username,
                "previousGroups": current_groups,
                "currentGroups": updated_groups,
                "added": groups_to_add,
                "removed": groups_to_remove
            }
        })
        
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def get_current_user_profile(event) -> dict:
    """
    Get the current user's profile information
    
    Returns:
        dict: Response with user profile data
    """
    try:
        # Get user info from Cognito authorizer context
        user_info = get_user_info(event)
        username = user_info['username']
        
        if not username:
            return create_error_response(401, "UNAUTHORIZED", "Unable to identify user")
        
        # Get user attributes from Cognito
        user_response = cognito.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=username
        )
        
        user_attributes = {attr['Name']: attr['Value'] for attr in user_response.get('UserAttributes', [])}
        
        # Parse profile JSON if it exists
        profile_data = {}
        if 'profile' in user_attributes:
            try:
                profile_data = json.loads(user_attributes['profile'])
            except json.JSONDecodeError:
                profile_data = {}
        
        profile = {
            'email': user_attributes.get('email', ''),
            'fullName': profile_data.get('fullName', ''),
            'genre': profile_data.get('genre', ''),
            'givenName': user_attributes.get('given_name', ''),
            'familyName': user_attributes.get('family_name', ''),
            'picture': user_attributes.get('picture', '')
        }
        
        return create_response(200, {
            "success": True,
            "data": profile
        })
        
    except cognito.exceptions.UserNotFoundException:
        return create_error_response(404, "USER_NOT_FOUND", "User not found")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))

def update_current_user_profile(event, body: dict) -> dict:
    """
    Update the current user's profile information
    
    Parameters:
        body (dict): Request body with profile updates
    
    Returns:
        dict: Response with updated profile data
    """
    try:
        # Get user info from Cognito authorizer context
        user_info = get_user_info(event)
        username = user_info['username']
        
        if not username:
            return create_error_response(401, "UNAUTHORIZED", "Unable to identify user")
        
        # Extract profile fields from request
        full_name = body.get('fullName', '').strip()
        genre = body.get('genre', '').strip()
        
        # Validate inputs
        if full_name and len(full_name) > 256:
            return create_error_response(400, "INVALID_INPUT", "Full name must be 256 characters or less")
        
        if genre and len(genre) > 50:
            return create_error_response(400, "INVALID_INPUT", "Genre must be 50 characters or less")
        
        # Get current profile data
        try:
            user_response = cognito.admin_get_user(
                UserPoolId=USER_POOL_ID,
                Username=username
            )
            user_attributes = {attr['Name']: attr['Value'] for attr in user_response.get('UserAttributes', [])}
            
            # Parse existing profile data
            current_profile = {}
            if 'profile' in user_attributes:
                try:
                    current_profile = json.loads(user_attributes['profile'])
                except json.JSONDecodeError:
                    current_profile = {}
        except cognito.exceptions.UserNotFoundException:
            return create_error_response(404, "USER_NOT_FOUND", "User not found")
        
        # Update profile fields
        if full_name is not None:
            current_profile['fullName'] = full_name
        if genre is not None:
            current_profile['genre'] = genre
        
        # Update user attributes in Cognito
        attributes_to_update = [
            {
                'Name': 'profile',
                'Value': json.dumps(current_profile)
            }
        ]
        
        cognito.admin_update_user_attributes(
            UserPoolId=USER_POOL_ID,
            Username=username,
            UserAttributes=attributes_to_update
        )
        
        # Return updated profile
        updated_profile = {
            'email': user_attributes.get('email', ''),
            'fullName': current_profile.get('fullName', ''),
            'genre': current_profile.get('genre', ''),
            'givenName': user_attributes.get('given_name', ''),
            'familyName': user_attributes.get('family_name', ''),
            'picture': user_attributes.get('picture', '')
        }
        
        return create_response(200, {
            "success": True,
            "data": updated_profile,
            "message": "Profile updated successfully"
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
        
        # Parse the path and route to appropriate handler
        if path == '/profile' and method == 'GET':
            return get_current_user_profile(event)
        elif path == '/profile' and method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            return update_current_user_profile(event, body)
        elif path == '/users' and method == 'GET':
            return list_users(query_parameters)
        elif path == '/users' and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return create_user(body)
        elif path.startswith('/users/') and method == 'GET' and 'username' in path_parameters:
            return get_user(path_parameters['username'])
        elif path.startswith('/users/') and method == 'DELETE' and 'username' in path_parameters:
            return delete_user(path_parameters['username'])
        elif path.endswith('/groups') and method == 'PUT' and 'username' in path_parameters:
            body = json.loads(event.get('body', '{}'))
            return update_user_groups(path_parameters['username'], body)
        else:
            return create_error_response(404, "NOT_FOUND", "Resource not found")
            
    except json.JSONDecodeError:
        return create_error_response(400, "INVALID_JSON", "Invalid JSON in request body")
    except Exception as e:
        traceback.print_exc()
        return create_error_response(500, "INTERNAL_ERROR", str(e))