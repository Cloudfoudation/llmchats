# Function Flow & Parameter Analysis for RBAC Migration

**Date**: 2025-01-13  
**Project**: GSIS Government AI Chat System  
**Purpose**: Document current function requirements and RBAC migration needs

## 🔍 Current System Analysis

### Lambda Functions & Their RBAC Requirements

#### 1. Knowledge Base Management Function
**File**: `/functions/knowledge-base-api/app.py`
**Current User Info Requirements**:
```python
user_info = {
    'sub': 'cognito-user-sub-id',        # Required: DynamoDB primary key
    'username': 'user@example.com',      # Required: KB naming prefix
    'email': 'user@example.com',         # Optional: metadata
    'identityId': 'us-east-1:identity-123', # Required: S3 folder paths
    'groups': ['admin', 'paid']          # Required: access control
}
```

**Functions & Required Permissions**:
```python
# GET /knowledge-bases
def list_knowledge_bases(user_info):
    # Required Permission: kb:read
    # Context: user_info['sub'] for ownership filter
    # Returns: User's KBs + shared KBs

# POST /knowledge-bases  
def create_knowledge_base(user_info, kb_data):
    # Required Permission: kb:create
    # Context: user_info['identityId'] for S3 path
    # Parameters: name, description, tags
    # Returns: KB ID and metadata

# GET /knowledge-bases/{kb_id}
def get_knowledge_base(user_info, kb_id):
    # Required Permission: kb:read
    # Context: Check ownership or shared access
    # Returns: KB details and status

# PUT /knowledge-bases/{kb_id}
def update_knowledge_base(user_info, kb_id, updates):
    # Required Permission: kb:update
    # Context: Must own KB or have shared edit access
    # Returns: Updated KB metadata

# DELETE /knowledge-bases/{kb_id}
def delete_knowledge_base(user_info, kb_id):
    # Required Permission: kb:delete
    # Context: Must own KB
    # Returns: Deletion confirmation
```

**RBAC Adaptation Required**:
```python
# Current group-based check
if 'admin' in user_info['groups'] or 'paid' in user_info['groups']:
    allow_create = True

# New RBAC check
if rbac.check_permission(user_info['sub'], 'kb', 'create', context):
    allow_create = True
```

#### 2. User Management Function
**File**: `/functions/user-management/app.py`
**Current Requirements**:
```python
# Admin-only functions
def list_users(user_info):
    # Current: Check if 'admin' in groups
    # New RBAC: user:read permission
    
def create_user(user_info, user_data):
    # Current: Check if 'admin' in groups  
    # New RBAC: user:create permission
    
def assign_user_groups(user_info, target_user, groups):
    # Current: Check if 'admin' in groups
    # New RBAC: user:assign-role permission
```

**RBAC Adaptation**:
```python
@require_permission('user', 'read')
def list_users(user_info):
    # Implementation remains same
    pass

@require_permission('user', 'create')
def create_user(user_info, user_data):
    # Implementation remains same
    pass

@require_permission('user', 'assign-role')
def assign_user_groups(user_info, target_user, roles):
    # Change from groups to roles
    pass
```

#### 3. Group Management Function
**File**: `/functions/group-management/app.py`
**Current Requirements**:
```python
def create_group(user_info, group_data):
    # Current: Any authenticated user
    # New RBAC: group:create permission
    
def add_member_to_group(user_info, group_id, member_id):
    # Current: Group owner or admin
    # New RBAC: group:manage permission
```

#### 4. Agent Management Function
**File**: `/functions/agent-management/app.py`
**Current Requirements**:
```python
def create_agent(user_info, agent_data):
    # Current: Based on user groups
    # New RBAC: agent:create permission
    
def share_agent(user_info, agent_id, share_data):
    # Current: Owner only
    # New RBAC: agent:share permission
```

#### 5. Document Conversion Function
**File**: `/functions/convert_document/app.py`
**Current Requirements**:
```python
def convert_document(user_info, document_data):
    # Current: Any authenticated user
    # New RBAC: doc:process permission
```

#### 6. RBAC Management Function (New)
**File**: `/functions/rbac-management/app.py`
**New Functions Needed**:
```python
def create_role(user_info, role_data):
    # Required Permission: role:create
    # Parameters: roleName, description, permissions[]
    
def assign_role_to_user(user_info, target_user_id, role_id):
    # Required Permission: user:assign-role
    # Parameters: userId, roleId, expiresAt
    
def check_user_permission(user_id, resource, action, context):
    # Internal function - no auth needed
    # Returns: boolean permission result
```

## 🔄 Parameter Mapping for RBAC Migration

### Current Function Signatures
```python
# Current pattern
def function_name(event, context):
    user_info = get_user_info(event)  # From authorizer
    user_id = user_info['sub']
    groups = user_info['groups']
    
    # Group-based permission check
    if 'admin' not in groups:
        return unauthorized_response()
```

### New RBAC Pattern
```python
# New RBAC pattern
def function_name(event, context):
    user_info = get_user_info(event)  # From RBAC authorizer
    user_id = user_info['sub']
    
    # RBAC permission check
    if not rbac.check_permission(user_id, 'resource', 'action', context):
        return unauthorized_response()
```

### Required Context Parameters
```python
# Context for permission evaluation
context = {
    'user_id': user_info['sub'],
    'identity_id': user_info['identityId'],
    'department': user_info.get('department'),
    'resource_owner': resource.get('owner_id'),
    'resource_classification': resource.get('classification'),
    'timestamp': datetime.utcnow().isoformat()
}
```

## 🛠️ Function Modification Requirements

### 1. Update Authorizer Context
**Current RBAC Authorizer Output**:
```python
'context': {
    'sub': claims['sub'],
    'username': claims.get('cognito:username'),
    'email': claims.get('email'),
    'identityId': identity_id,
    'claims': json.dumps(claims)  # Contains groups
}
```

**Enhanced RBAC Authorizer Output**:
```python
'context': {
    'sub': claims['sub'],
    'username': claims.get('cognito:username'),
    'email': claims.get('email'),
    'identityId': identity_id,
    'roles': user_roles,  # From RBAC system
    'permissions': user_permissions,  # Computed permissions
    'department': user_department,
    'claims': json.dumps(claims)
}
```

### 2. Permission Check Middleware
```python
# New middleware decorator
def require_permission(resource, action, context_builder=None):
    def decorator(func):
        def wrapper(event, context):
            user_info = get_user_info(event)
            
            # Build context for permission check
            perm_context = {}
            if context_builder:
                perm_context = context_builder(event, user_info)
            
            # Check permission
            if not rbac.check_permission(
                user_info['sub'], 
                resource, 
                action, 
                perm_context
            ):
                return create_error_response(403, "FORBIDDEN", 
                    f"Missing permission: {resource}:{action}")
            
            return func(event, context)
        return wrapper
    return decorator

# Usage example
@require_permission('kb', 'create')
def create_knowledge_base(event, context):
    # Function implementation
    pass
```

### 3. Context Builders for Complex Permissions
```python
# Context builder for resource-specific permissions
def kb_context_builder(event, user_info):
    kb_id = event.get('pathParameters', {}).get('knowledgeBaseId')
    if kb_id:
        kb = get_knowledge_base_metadata(kb_id)
        return {
            'resource_owner': kb.get('owner_id'),
            'department': kb.get('department'),
            'classification': kb.get('classification')
        }
    return {}

@require_permission('kb', 'update', kb_context_builder)
def update_knowledge_base(event, context):
    # Function implementation
    pass
```

## 📋 Migration Checklist by Function

### Knowledge Base API
- [ ] Replace group checks with RBAC permission checks
- [ ] Update `get_user_info()` to extract roles instead of groups
- [ ] Add context builders for resource-specific permissions
- [ ] Update error messages to reflect permission names
- [ ] Test with different role combinations

### User Management API
- [ ] Replace admin group check with `user:*` permissions
- [ ] Update role assignment logic (groups → roles)
- [ ] Add audit logging for user management actions
- [ ] Implement user search with department filtering

### Group Management API
- [ ] Rename to "Team Management" or keep as collaboration groups
- [ ] Update permissions from group-based to role-based
- [ ] Add department-level group restrictions
- [ ] Implement group approval workflows

### Agent Management API
- [ ] Replace group checks with `agent:*` permissions
- [ ] Add department-level agent sharing
- [ ] Implement agent approval for sensitive operations
- [ ] Add agent usage audit logging

### Document API
- [ ] Add document classification support
- [ ] Implement department-based document access
- [ ] Add document processing permissions
- [ ] Implement document retention policies

### New RBAC Management API
- [ ] Create role CRUD operations
- [ ] Implement permission template system
- [ ] Add role assignment workflows
- [ ] Create permission audit dashboard
- [ ] Implement role expiration handling

## 🔧 Implementation Priority

### Phase 1: Core RBAC Infrastructure
1. **RBAC Management API** - Create roles and permissions
2. **Enhanced Authorizer** - Extract roles and permissions
3. **Permission Middleware** - Centralized permission checking

### Phase 2: Function Migration
1. **Knowledge Base API** - Most critical for users
2. **User Management API** - Required for role assignment
3. **Agent Management API** - Secondary priority

### Phase 3: Advanced Features
1. **Group/Team Management** - Collaboration features
2. **Document API** - Enhanced classification
3. **Audit & Reporting** - Compliance features

## 🧪 Testing Strategy

### Unit Tests
```python
def test_permission_check():
    # Test various permission combinations
    assert rbac.check_permission('user1', 'kb', 'create', {}) == True
    assert rbac.check_permission('user2', 'kb', 'delete', {'owner': 'user1'}) == False

def test_role_assignment():
    # Test role assignment and permission inheritance
    assign_role('user1', 'analyst')
    assert has_permission('user1', 'kb', 'read') == True
```

### Integration Tests
```python
def test_kb_creation_with_rbac():
    # Test knowledge base creation with different roles
    response = create_kb_as_user('analyst-user', kb_data)
    assert response.status_code == 201
    
    response = create_kb_as_user('viewer-user', kb_data)
    assert response.status_code == 403
```

### Load Tests
```python
def test_permission_check_performance():
    # Test permission check latency under load
    start_time = time.time()
    for i in range(1000):
        rbac.check_permission(f'user{i}', 'kb', 'read', {})
    duration = time.time() - start_time
    assert duration < 1.0  # Should complete in under 1 second
```

## 📊 Function Parameter Summary

### Knowledge Base Functions
| Function | Current Groups | New Permission | Context Required |
|----------|---------------|----------------|------------------|
| list_knowledge_bases | any authenticated | kb:read | user_id |
| create_knowledge_base | admin, paid | kb:create | identity_id, department |
| get_knowledge_base | any authenticated | kb:read | resource_owner |
| update_knowledge_base | owner, admin | kb:update | resource_owner |
| delete_knowledge_base | owner, admin | kb:delete | resource_owner |

### User Management Functions
| Function | Current Groups | New Permission | Context Required |
|----------|---------------|----------------|------------------|
| list_users | admin | user:read | department |
| create_user | admin | user:create | target_department |
| update_user | admin | user:update | target_user_id |
| assign_roles | admin | user:assign-role | target_user_id |

### Agent Management Functions
| Function | Current Groups | New Permission | Context Required |
|----------|---------------|----------------|------------------|
| create_agent | any authenticated | agent:create | department |
| share_agent | owner | agent:share | resource_owner |
| update_agent | owner, admin | agent:update | resource_owner |

### Document Functions
| Function | Current Groups | New Permission | Context Required |
|----------|---------------|----------------|------------------|
| convert_document | any authenticated | doc:process | classification |
| upload_document | any authenticated | doc:upload | department |
| download_document | any authenticated | doc:read | resource_owner |

This comprehensive analysis provides the roadmap for migrating all existing functions to the new RBAC system while maintaining security and functionality.