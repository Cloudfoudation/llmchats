# RBAC Enhancement - Role-Based Agent Assignment

**Date:** January 20, 2025  
**Version:** 1.0  
**Status:** Planned  
**Author:** Development Team  

## Overview

Enhancement to existing RBAC system for custom roles with role-based agent assignment. Allows admins to create roles (e.g., "General Inquiries", "COO") and auto-assign agents to users based on their roles.

## Requirements

### Core Needs
- **AI Models**: Open access for all users (government use case)
- **Management Operations**: Role-based access control for:
  - `KNOWLEDGE_BASE` - KB operations
  - `USER_MANAGEMENT` - User admin functions  
  - `AGENT_MANAGEMENT` - Agent operations
  - `FILE_MANAGEMENT` - S3 operations
  - `GROUP_MANAGEMENT` - Group operations

### Role-Agent Assignment
- Create custom roles (e.g., "General Inquiries", "COO")
- Assign specific agents to roles
- Users automatically see role-assigned agents on login
- Seamless agent availability based on user role

## Technical Approach - Minimal Changes

**Extend existing system instead of replacing:**
- **Reuse existing tables**: Groups, UserGroups, SharedAgents
- **Extend existing APIs**: Group Management, Shared Resources
- **Enhance existing authorizer**: Add role permission checks
- **Maintain backward compatibility**: Cognito groups continue to work

## Database Schema Changes

### 1. Groups Table Extension
**Existing table**: `gsis-poc-groups`  
**New fields added**:

```json
{
  "groupId": "general-inquiries",
  "groupName": "General Inquiries",
  "description": "Handle general public inquiries",
  "groupType": "ROLE",           // NEW: distinguish roles from groups
  "permissions": [               // NEW: permission array
    "KNOWLEDGE_BASE:read",
    "AGENT_MANAGEMENT:read",
    "FILE_MANAGEMENT:upload"
  ],
  "createdBy": "admin",
  "createdAt": "2024-01-20T00:00:00Z"
}
```

### 2. SharedAgents Table Extension
**Existing table**: `gsis-poc-shared-agents`  
**New field added**:

```json
{
  "groupId": "general-inquiries",
  "agentId": "agent-123",
  "sharedBy": "admin",
  "sharedAt": "2024-01-20T00:00:00Z",
  "shareType": "ROLE_ASSIGNMENT"  // NEW: distinguish from regular sharing
}
```

## API Extensions

### 1. Group Management API (Extended)

#### Get Roles
```http
GET /groups?type=ROLE
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "groupId": "general-inquiries",
        "groupName": "General Inquiries",
        "groupType": "ROLE",
        "permissions": ["KNOWLEDGE_BASE:read", "AGENT_MANAGEMENT:read"],
        "memberCount": 15,
        "assignedAgents": 2
      }
    ]
  }
}
```

#### Create Role
```http
POST /groups
Authorization: Bearer {token}
Content-Type: application/json

{
  "groupName": "HR Manager",
  "groupType": "ROLE",
  "permissions": ["USER_MANAGEMENT:read", "AGENT_MANAGEMENT:read"]
}
```

### 2. User Dashboard API (New)

#### Get User Dashboard with Role-Based Agents
```http
GET /users/{userId}/dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "user-123",
      "email": "john.doe@gsis.gov.ph"
    },
    "roles": [
      {
        "groupId": "general-inquiries",
        "groupName": "General Inquiries",
        "groupType": "ROLE"
      }
    ],
    "permissions": ["KNOWLEDGE_BASE:read", "AGENT_MANAGEMENT:read"],
    "availableAgents": [
      {
        "agentId": "agent-123",
        "agentName": "Public Information Assistant",
        "assignedViaRole": "general-inquiries"
      }
    ]
  }
}
```

### 3. Agent Assignment API (Extended)

#### Assign Agent to Role
```http
POST /shared-resources
Authorization: Bearer {token}
Content-Type: application/json

{
  "resourceType": "agent",
  "resourceId": "agent-123",
  "groupId": "general-inquiries",
  "shareType": "ROLE_ASSIGNMENT"
}
```

## Authorization Enhancement

### Current Authorizer Extension
The existing custom authorizer will be enhanced to check both Cognito groups and custom roles:

```python
def lambda_handler(event, context):
    # ... existing code ...
    
    # Get user's Cognito groups (existing)
    cognito_groups = claims.get('cognito:groups', [])
    
    # NEW: Get custom role groups from DynamoDB
    user_role_groups = get_user_role_groups(claims['sub'])
    
    # Combine permissions from both systems
    all_permissions = (
        get_cognito_permissions(cognito_groups) + 
        get_role_permissions(user_role_groups)
    )
    
    # Check if user has required permissions
    if has_required_permissions(all_permissions, event['methodArn']):
        return generate_policy('Allow', ...)
    else:
        return generate_policy('Deny', ...)
```

## Permission System

### Permission Format
```
CATEGORY:ACTION
```

### Available Permissions
- `KNOWLEDGE_BASE:create|read|update|delete`
- `USER_MANAGEMENT:create|read|update|delete`
- `AGENT_MANAGEMENT:create|read|update|delete`
- `FILE_MANAGEMENT:upload|download|delete`
- `GROUP_MANAGEMENT:create|read|update|delete`

### Wildcard Support
- `KNOWLEDGE_BASE:*` - All knowledge base operations
- `*:*` - All operations (admin level)

## Example Use Cases

### Use Case 1: General Inquiries Role
```json
{
  "groupId": "general-inquiries",
  "groupName": "General Inquiries",
  "groupType": "ROLE",
  "permissions": [
    "KNOWLEDGE_BASE:read",
    "AGENT_MANAGEMENT:read",
    "FILE_MANAGEMENT:upload"
  ],
  "assignedAgents": ["public-info-agent", "faq-agent"]
}
```

**User Experience:**
- User logs in with "General Inquiries" role
- Automatically sees Public Info Agent and FAQ Agent
- Can read knowledge bases and upload files
- Cannot create/modify agents or manage users

### Use Case 2: COO Role
```json
{
  "groupId": "coo",
  "groupName": "Chief Operating Officer", 
  "groupType": "ROLE",
  "permissions": [
    "KNOWLEDGE_BASE:*",
    "USER_MANAGEMENT:*",
    "AGENT_MANAGEMENT:*",
    "FILE_MANAGEMENT:*",
    "GROUP_MANAGEMENT:*"
  ],
  "assignedAgents": ["executive-agent", "analytics-agent"]
}
```

**User Experience:**
- User logs in with "COO" role
- Sees Executive Agent and Analytics Agent
- Has full administrative access to all systems
- Can create roles and assign agents to other users

## Implementation Timeline

### Week 1: Database & Backend
- [ ] Database schema updates (add columns to existing tables)
- [ ] API endpoint extensions (extend Group Management API)
- [ ] Authorization enhancements (update custom authorizer)
- [ ] Unit tests

### Week 2: Frontend Integration
- [ ] Role management UI (extend existing Group Management)
- [ ] User dashboard updates (show role-based agents)
- [ ] Agent assignment interface (admin functionality)
- [ ] Integration tests

### Week 3: Testing & Deployment
- [ ] End-to-end testing
- [ ] Security validation
- [ ] Performance testing
- [ ] Production deployment

## Success Metrics

- [ ] Zero breaking changes to existing functionality
- [ ] Role-based agents appear automatically on user login
- [ ] Admin can create custom roles with specific permissions
- [ ] Agent assignment to roles works seamlessly
- [ ] All existing Cognito group functionality preserved

## Security Considerations

### Access Control
- Only admin users can create/modify roles
- Role assignments require admin privileges
- Permission validation on all API calls
- Fail-secure authorization (deny by default)

### Data Protection
- Existing DynamoDB encryption maintained
- API authentication through Cognito JWT tokens
- IAM policies restrict direct database access
- Audit trail for all role assignments

## Benefits

### For Administrators
- Create custom roles for specific departments/functions
- Assign relevant agents to roles automatically
- Granular permission control
- Easy user onboarding with pre-configured agent access

### For End Users
- Immediate access to relevant agents upon login
- No manual agent selection needed
- Role-appropriate functionality visibility
- Consistent experience across sessions

### For System
- Minimal code changes to existing functionality
- Backward compatibility maintained
- Scalable role and permission system
- Reuses existing infrastructure

## Rollback Plan

If issues arise during deployment:
1. **Database**: New columns are optional, existing data unaffected
2. **APIs**: New endpoints can be disabled, existing endpoints unchanged
3. **Authorization**: Fallback to Cognito-only authorization
4. **Frontend**: Role features can be hidden via feature flags

---

**Next Steps:**
1. Review and approve this enhancement plan
2. Begin Phase 1 implementation
3. Set up development environment for testing
4. Create detailed implementation tickets

**Change Log:**
- 2025-01-20: Initial documentation created
- Status: Awaiting approval for implementation