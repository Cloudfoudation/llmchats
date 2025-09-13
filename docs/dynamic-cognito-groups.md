# Dynamic Cognito Group Management

## Create Groups Dynamically

```bash
# Create government roles as Cognito groups
aws cognito-idp create-group \
    --group-name "department-finance" \
    --user-pool-id $USER_POOL_ID \
    --description "Finance Department Access" \
    --precedence 10

aws cognito-idp create-group \
    --group-name "department-hr" \
    --user-pool-id $USER_POOL_ID \
    --description "HR Department Access" \
    --precedence 11

aws cognito-idp create-group \
    --group-name "role-analyst" \
    --user-pool-id $USER_POOL_ID \
    --description "Data Analyst Role" \
    --precedence 20

aws cognito-idp create-group \
    --group-name "role-manager" \
    --user-pool-id $USER_POOL_ID \
    --description "Manager Role" \
    --precedence 15
```

## Assign Users to Groups

```bash
# Assign user to multiple groups
aws cognito-idp admin-add-user-to-group \
    --user-pool-id $USER_POOL_ID \
    --username "testuser" \
    --group-name "department-finance"

aws cognito-idp admin-add-user-to-group \
    --user-pool-id $USER_POOL_ID \
    --username "testuser" \
    --group-name "role-analyst"
```

## Dynamic Permission Checking

```python
def check_user_permissions(user_groups, required_permissions):
    """
    Check if user has required permissions based on group membership
    """
    # Define group-to-permission mapping
    GROUP_PERMISSIONS = {
        'admin': ['*'],  # Admin has all permissions
        'government-admin': [
            'kb:create', 'kb:read', 'kb:update', 'kb:delete', 'kb:share',
            'user:read', 'user:assign-role'
        ],
        'department-finance': [
            'kb:create:finance', 'kb:read:finance', 'kb:update:finance',
            'doc:upload:finance', 'doc:read:finance'
        ],
        'department-hr': [
            'kb:create:hr', 'kb:read:hr', 'kb:update:hr',
            'doc:upload:hr', 'doc:read:hr'
        ],
        'role-analyst': [
            'kb:read', 'kb:create:own', 'doc:upload', 'doc:process',
            'ai:invoke:analysis'
        ],
        'role-manager': [
            'kb:read', 'kb:create', 'kb:update:own', 'kb:share:department',
            'user:read:department'
        ],
        'role-viewer': [
            'kb:read:shared', 'doc:read:public'
        ]
    }
    
    user_permissions = set()
    
    # Collect all permissions from user's groups
    for group in user_groups:
        group_perms = GROUP_PERMISSIONS.get(group, [])
        if '*' in group_perms:  # Admin has all permissions
            return True
        user_permissions.update(group_perms)
    
    # Check if user has all required permissions
    for perm in required_permissions:
        if not any(
            user_perm == perm or 
            user_perm.endswith(':*') and perm.startswith(user_perm[:-1]) or
            perm in user_permissions
            for user_perm in user_permissions
        ):
            return False
    
    return True

# Usage in Knowledge Base function
def create_knowledge_base(user_info: dict, body: dict) -> dict:
    user_groups = user_info.get('groups', [])
    
    # Check if user can create knowledge bases
    if not check_user_permissions(user_groups, ['kb:create']):
        return create_error_response(403, "INSUFFICIENT_PERMISSIONS", 
            "You don't have permission to create knowledge bases")
    
    # Proceed with KB creation...
```

## API Functions for Group Management

```python
# Add to User Management API
def create_group(user_info: dict, body: dict) -> dict:
    """Create a new Cognito group"""
    if not check_user_permissions(user_info.get('groups', []), ['group:create']):
        return create_error_response(403, "INSUFFICIENT_PERMISSIONS", 
            "You don't have permission to create groups")
    
    group_name = body.get('groupName')
    description = body.get('description', '')
    precedence = body.get('precedence', 100)
    
    try:
        cognito_client = boto3.client('cognito-idp')
        response = cognito_client.create_group(
            GroupName=group_name,
            UserPoolId=USER_POOL_ID,
            Description=description,
            Precedence=precedence
        )
        
        return create_response(201, {
            "success": True,
            "data": response['Group']
        })
    except Exception as e:
        return create_error_response(500, "GROUP_CREATION_FAILED", str(e))

def assign_user_to_group(user_info: dict, body: dict) -> dict:
    """Assign user to a group"""
    if not check_user_permissions(user_info.get('groups', []), ['user:assign-group']):
        return create_error_response(403, "INSUFFICIENT_PERMISSIONS", 
            "You don't have permission to assign users to groups")
    
    username = body.get('username')
    group_name = body.get('groupName')
    
    try:
        cognito_client = boto3.client('cognito-idp')
        cognito_client.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID,
            Username=username,
            GroupName=group_name
        )
        
        return create_response(200, {
            "success": True,
            "message": f"User {username} added to group {group_name}"
        })
    except Exception as e:
        return create_error_response(500, "GROUP_ASSIGNMENT_FAILED", str(e))

def list_user_groups(user_info: dict, username: str) -> dict:
    """List groups for a user"""
    try:
        cognito_client = boto3.client('cognito-idp')
        response = cognito_client.admin_list_groups_for_user(
            UserPoolId=USER_POOL_ID,
            Username=username
        )
        
        return create_response(200, {
            "success": True,
            "data": {
                "groups": response['Groups']
            }
        })
    except Exception as e:
        return create_error_response(500, "LIST_GROUPS_FAILED", str(e))
```

## Benefits of Dynamic Groups

1. **Flexible Role Assignment** - Create roles as needed
2. **Real-time Permission Changes** - No code deployment needed
3. **Granular Permissions** - Department + Role combinations
4. **Audit Trail** - Cognito tracks group membership changes
5. **Scalable** - No hardcoded limitations

## Example Group Structure

```
Groups:
├── admin                    # System admin
├── government-admin         # Government administrator  
├── department-finance       # Finance department access
├── department-hr           # HR department access
├── department-it           # IT department access
├── role-manager            # Management role
├── role-analyst            # Analyst role
├── role-viewer             # Read-only role
└── project-classified      # Special project access
```

## User Assignment Examples

```bash
# Finance Manager
aws cognito-idp admin-add-user-to-group --user-pool-id $USER_POOL_ID --username "john.doe" --group-name "department-finance"
aws cognito-idp admin-add-user-to-group --user-pool-id $USER_POOL_ID --username "john.doe" --group-name "role-manager"

# HR Analyst  
aws cognito-idp admin-add-user-to-group --user-pool-id $USER_POOL_ID --username "jane.smith" --group-name "department-hr"
aws cognito-idp admin-add-user-to-group --user-pool-id $USER_POOL_ID --username "jane.smith" --group-name "role-analyst"

# Cross-department viewer
aws cognito-idp admin-add-user-to-group --user-pool-id $USER_POOL_ID --username "bob.wilson" --group-name "role-viewer"
```

This approach gives you maximum flexibility while maintaining security!