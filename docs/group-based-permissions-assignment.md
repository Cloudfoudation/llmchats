# Group-Based Permissions & Auto-Assignment System

## 1. Permission Management via DynamoDB

### Group Permissions Table
```python
# DynamoDB Table: GroupPermissions
{
    "groupName": "department-finance",  # PK
    "permissions": [
        "kb:create:finance",
        "kb:read:finance", 
        "kb:update:finance",
        "agent:use:financial-analyzer",
        "doc:upload:finance"
    ],
    "autoAssignAgents": [
        "financial-analyzer-v1",
        "budget-assistant-v2"
    ],
    "autoAssignKnowledgeBases": [
        "finance-policies-kb",
        "budget-guidelines-kb"
    ],
    "createdAt": "2025-01-13T10:00:00Z",
    "updatedAt": "2025-01-13T10:00:00Z"
}
```

### Implementation Functions

```python
def get_user_permissions(user_groups: list) -> dict:
    """Get all permissions for user based on their groups"""
    try:
        permissions = set()
        auto_agents = set()
        auto_kbs = set()
        
        # Query GroupPermissions table for each group
        for group in user_groups:
            try:
                response = group_permissions_table.get_item(
                    Key={'groupName': group}
                )
                
                if 'Item' in response:
                    item = response['Item']
                    permissions.update(item.get('permissions', []))
                    auto_agents.update(item.get('autoAssignAgents', []))
                    auto_kbs.update(item.get('autoAssignKnowledgeBases', []))
                    
            except Exception as e:
                print(f"Error getting permissions for group {group}: {e}")
                continue
        
        return {
            'permissions': list(permissions),
            'autoAssignAgents': list(auto_agents),
            'autoAssignKnowledgeBases': list(auto_kbs)
        }
        
    except Exception as e:
        print(f"Error getting user permissions: {e}")
        return {'permissions': [], 'autoAssignAgents': [], 'autoAssignKnowledgeBases': []}

def check_permission(user_groups: list, required_permission: str, context: dict = None) -> bool:
    """Check if user has specific permission"""
    user_perms = get_user_permissions(user_groups)
    permissions = user_perms['permissions']
    
    # Check for admin wildcard
    if '*' in permissions:
        return True
    
    # Check exact match
    if required_permission in permissions:
        return True
    
    # Check wildcard patterns (e.g., kb:* matches kb:create)
    for perm in permissions:
        if perm.endswith(':*'):
            prefix = perm[:-1]  # Remove '*'
            if required_permission.startswith(prefix):
                return True
    
    # Check contextual permissions (e.g., kb:create:finance)
    if context:
        department = context.get('department')
        if department:
            contextual_perm = f"{required_permission}:{department}"
            if contextual_perm in permissions:
                return True
    
    return False
```

## 2. Auto-Assignment System

### On User Login/Group Change
```python
def auto_assign_resources_on_login(user_info: dict):
    """Auto-assign agents and KBs when user logs in or groups change"""
    try:
        user_id = user_info['sub']
        user_groups = user_info.get('groups', [])
        
        # Get what should be auto-assigned
        user_perms = get_user_permissions(user_groups)
        auto_agents = user_perms['autoAssignAgents']
        auto_kbs = user_perms['autoAssignKnowledgeBases']
        
        # Auto-assign agents
        for agent_id in auto_agents:
            try:
                assign_agent_to_user(user_id, agent_id, 'auto-assigned')
            except Exception as e:
                print(f"Error auto-assigning agent {agent_id}: {e}")
        
        # Auto-assign knowledge bases (share access)
        for kb_id in auto_kbs:
            try:
                share_kb_with_user(user_id, kb_id, 'auto-assigned', {
                    'canView': True,
                    'canEdit': False,  # Auto-assigned KBs are read-only by default
                    'canDelete': False,
                    'canSync': False,
                    'canShare': False
                })
            except Exception as e:
                print(f"Error auto-assigning KB {kb_id}: {e}")
                
        print(f"Auto-assigned {len(auto_agents)} agents and {len(auto_kbs)} KBs to user {user_id}")
        
    except Exception as e:
        print(f"Error in auto-assignment: {e}")

def assign_agent_to_user(user_id: str, agent_id: str, assignment_type: str):
    """Assign an agent to a user"""
    try:
        # Check if assignment already exists
        existing = user_agents_table.get_item(
            Key={'userId': user_id, 'agentId': agent_id}
        )
        
        if 'Item' not in existing:
            user_agents_table.put_item(
                Item={
                    'userId': user_id,
                    'agentId': agent_id,
                    'assignmentType': assignment_type,  # 'auto-assigned' or 'manual'
                    'assignedAt': datetime.utcnow().isoformat(),
                    'permissions': {
                        'canUse': True,
                        'canConfigure': assignment_type == 'manual'
                    }
                }
            )
            print(f"Assigned agent {agent_id} to user {user_id}")
        
    except Exception as e:
        print(f"Error assigning agent: {e}")

def share_kb_with_user(user_id: str, kb_id: str, share_type: str, permissions: dict):
    """Share a knowledge base with a user"""
    try:
        # Create a personal group for the user if it doesn't exist
        personal_group_id = f"user-{user_id}"
        
        # Check if sharing already exists
        existing = shared_kb_table.get_item(
            Key={'groupId': personal_group_id, 'knowledgeBaseId': kb_id}
        )
        
        if 'Item' not in existing:
            shared_kb_table.put_item(
                Item={
                    'groupId': personal_group_id,
                    'knowledgeBaseId': kb_id,
                    'sharedBy': 'system',
                    'shareType': share_type,  # 'auto-assigned' or 'manual'
                    'sharedAt': datetime.utcnow().isoformat(),
                    'permissions': permissions
                }
            )
            
            # Also add user to their personal group
            user_groups_table.put_item(
                Item={
                    'userId': user_id,
                    'groupId': personal_group_id,
                    'role': 'member',
                    'joinedAt': datetime.utcnow().isoformat()
                }
            )
            
            print(f"Shared KB {kb_id} with user {user_id}")
        
    except Exception as e:
        print(f"Error sharing KB: {e}")
```

## 3. Permission Management API

### Create/Update Group Permissions
```python
def update_group_permissions(user_info: dict, body: dict) -> dict:
    """Update permissions for a Cognito group"""
    # Check if user can manage permissions
    if not check_permission(user_info.get('groups', []), 'group:manage-permissions'):
        return create_error_response(403, "INSUFFICIENT_PERMISSIONS", 
            "You don't have permission to manage group permissions")
    
    group_name = body.get('groupName')
    permissions = body.get('permissions', [])
    auto_assign_agents = body.get('autoAssignAgents', [])
    auto_assign_kbs = body.get('autoAssignKnowledgeBases', [])
    
    try:
        # Update group permissions in DynamoDB
        group_permissions_table.put_item(
            Item={
                'groupName': group_name,
                'permissions': permissions,
                'autoAssignAgents': auto_assign_agents,
                'autoAssignKnowledgeBases': auto_assign_kbs,
                'updatedAt': datetime.utcnow().isoformat(),
                'updatedBy': user_info['sub']
            }
        )
        
        # Trigger re-assignment for all users in this group
        trigger_group_reassignment(group_name)
        
        return create_response(200, {
            "success": True,
            "message": f"Permissions updated for group {group_name}"
        })
        
    except Exception as e:
        return create_error_response(500, "UPDATE_FAILED", str(e))

def trigger_group_reassignment(group_name: str):
    """Trigger reassignment for all users in a group"""
    try:
        # Get all users in the group from Cognito
        cognito_client = boto3.client('cognito-idp')
        
        paginator = cognito_client.get_paginator('list_users_in_group')
        page_iterator = paginator.paginate(
            UserPoolId=USER_POOL_ID,
            GroupName=group_name
        )
        
        for page in page_iterator:
            for user in page['Users']:
                username = user['Username']
                
                # Get user's current groups
                user_groups_response = cognito_client.admin_list_groups_for_user(
                    UserPoolId=USER_POOL_ID,
                    Username=username
                )
                
                user_groups = [g['GroupName'] for g in user_groups_response['Groups']]
                
                # Trigger auto-assignment
                user_info = {
                    'sub': username,  # Using username as sub for simplicity
                    'groups': user_groups
                }
                auto_assign_resources_on_login(user_info)
                
    except Exception as e:
        print(f"Error triggering group reassignment: {e}")
```

## 4. Integration with Knowledge Base Functions

### Updated KB Creation with Group Context
```python
def create_knowledge_base(user_info: dict, body: dict) -> dict:
    """Create KB with group-based permissions"""
    user_groups = user_info.get('groups', [])
    
    # Determine department context from groups
    department = None
    for group in user_groups:
        if group.startswith('department-'):
            department = group.replace('department-', '')
            break
    
    # Check permission with context
    context = {'department': department} if department else {}
    
    if not check_permission(user_groups, 'kb:create', context):
        return create_error_response(403, "INSUFFICIENT_PERMISSIONS", 
            "You don't have permission to create knowledge bases")
    
    # Add department tag to KB if applicable
    tags = body.get('tags', {})
    if department:
        tags['department'] = department
        tags['autoAssignToGroups'] = [f'department-{department}']
    
    # Proceed with KB creation...
    # After creation, auto-assign to relevant groups
    if 'autoAssignToGroups' in tags:
        for group in tags['autoAssignToGroups']:
            auto_assign_kb_to_group(kb_id, group)
```

## 5. Admin Interface for Permission Management

### Frontend API Calls
```javascript
// Get group permissions
const getGroupPermissions = async (groupName) => {
    const response = await fetch(`/api/groups/${groupName}/permissions`);
    return response.json();
};

// Update group permissions
const updateGroupPermissions = async (groupName, permissions) => {
    const response = await fetch(`/api/groups/${groupName}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            groupName,
            permissions: permissions.permissions,
            autoAssignAgents: permissions.autoAssignAgents,
            autoAssignKnowledgeBases: permissions.autoAssignKnowledgeBases
        })
    });
    return response.json();
};

// Example usage
const financePermissions = {
    permissions: [
        'kb:create:finance',
        'kb:read:finance',
        'kb:update:finance',
        'agent:use:financial-analyzer',
        'doc:upload:finance'
    ],
    autoAssignAgents: [
        'financial-analyzer-v1',
        'budget-assistant-v2'
    ],
    autoAssignKnowledgeBases: [
        'finance-policies-kb',
        'budget-guidelines-kb'
    ]
};

await updateGroupPermissions('department-finance', financePermissions);
```

## 6. Example Group Configurations

```python
# Finance Department
FINANCE_CONFIG = {
    'groupName': 'department-finance',
    'permissions': [
        'kb:create:finance', 'kb:read:finance', 'kb:update:finance',
        'agent:use:financial-analyzer', 'agent:use:budget-assistant',
        'doc:upload:finance', 'doc:process:finance'
    ],
    'autoAssignAgents': ['financial-analyzer-v1', 'budget-assistant-v2'],
    'autoAssignKnowledgeBases': ['finance-policies-kb', 'budget-guidelines-kb']
}

# HR Department  
HR_CONFIG = {
    'groupName': 'department-hr',
    'permissions': [
        'kb:create:hr', 'kb:read:hr', 'kb:update:hr',
        'agent:use:hr-assistant', 'doc:upload:hr'
    ],
    'autoAssignAgents': ['hr-policy-assistant'],
    'autoAssignKnowledgeBases': ['hr-handbook-kb', 'employee-policies-kb']
}

# Analyst Role (cross-department)
ANALYST_CONFIG = {
    'groupName': 'role-analyst', 
    'permissions': [
        'kb:read', 'kb:create:own', 'doc:upload', 'doc:process',
        'agent:use:data-analyzer', 'ai:invoke:analysis'
    ],
    'autoAssignAgents': ['data-analyzer-v1', 'report-generator'],
    'autoAssignKnowledgeBases': []  # No auto-assign, depends on department
}
```

This system provides:
- **Dynamic permission management** via DynamoDB
- **Automatic resource assignment** based on group membership  
- **Contextual permissions** (department-specific access)
- **Real-time updates** when group permissions change
- **Admin interface** for managing permissions
- **Audit trail** of all assignments and changes