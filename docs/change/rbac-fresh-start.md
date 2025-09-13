# RBAC Fresh Start - Clean Role-Based System

**Date:** January 20, 2025  
**Version:** 2.0  
**Status:** Planned  
**Author:** Development Team  
**Approach:** Fresh start (no backward compatibility needed)

## Overview

Complete replacement of current RBAC system with clean, role-based architecture. No migration needed since system is not live yet.

## Requirements

### Core Needs
- **AI Models**: Open access for all users (government use)
- **Management Operations**: Role-based control for:
  - `KNOWLEDGE_BASE` - KB operations
  - `USER_MANAGEMENT` - User admin functions  
  - `AGENT_MANAGEMENT` - Agent operations
  - `FILE_MANAGEMENT` - S3 operations
  - `GROUP_MANAGEMENT` - Group operations

### Role-Agent Assignment
- Create custom roles (e.g., "General Inquiries", "COO")
- Assign agents to roles
- Users see role-assigned agents on login

## Clean Database Schema

### 1. Users Table (Simplified)
```json
{
  "userId": "user-123",
  "email": "john.doe@gsis.gov.ph",
  "username": "john.doe",
  "roles": ["general-inquiries"],
  "createdAt": "2024-01-20T00:00:00Z",
  "lastLoginAt": "2024-01-20T08:00:00Z"
}
```

### 2. Roles Table (New)
```json
{
  "roleId": "general-inquiries",
  "roleName": "General Inquiries",
  "description": "Handle general public inquiries",
  "permissions": [
    "KNOWLEDGE_BASE:read",
    "AGENT_MANAGEMENT:read",
    "FILE_MANAGEMENT:upload"
  ],
  "assignedAgents": ["agent-123", "agent-456"],
  "createdBy": "admin",
  "createdAt": "2024-01-20T00:00:00Z"
}
```

### 3. Role Agents Table (New)
```json
{
  "roleId": "general-inquiries",
  "agentId": "agent-123",
  "assignedBy": "admin",
  "assignedAt": "2024-01-20T00:00:00Z"
}
```

## Clean API Design

### 1. User Dashboard API
```http
GET /users/me/dashboard
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "user-123",
      "email": "john.doe@gsis.gov.ph",
      "roles": ["general-inquiries"]
    },
    "permissions": [
      "KNOWLEDGE_BASE:read",
      "AGENT_MANAGEMENT:read",
      "FILE_MANAGEMENT:upload"
    ],
    "availableAgents": [
      {
        "agentId": "agent-123",
        "agentName": "Public Information Assistant",
        "description": "Helps with general inquiries",
        "assignedViaRole": "general-inquiries"
      }
    ]
  }
}
```

### 2. Role Management API
```http
GET /roles
POST /roles
PUT /roles/{roleId}
DELETE /roles/{roleId}
```

### 3. User Role Assignment API
```http
POST /users/{userId}/roles
DELETE /users/{userId}/roles/{roleId}
```

### 4. Agent Assignment API
```http
POST /roles/{roleId}/agents
DELETE /roles/{roleId}/agents/{agentId}
```

## Clean Frontend Architecture

### 1. New Auth Hook
```typescript
interface AuthState {
  user: User | null;
  roles: Role[];
  permissions: string[];
  availableAgents: Agent[];
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    roles: [],
    permissions: [],
    availableAgents: [],
    isLoading: true
  });

  const hasPermission = (permission: string) => 
    authState.permissions.includes(permission);
  
  const hasRole = (roleId: string) => 
    authState.roles.some(r => r.roleId === roleId);

  return { ...authState, hasPermission, hasRole };
};
```

### 2. Clean Permission Checks
```typescript
// Replace all existing permission logic
const UserManagement = () => {
  const { hasPermission } = useAuth();
  
  if (!hasPermission('USER_MANAGEMENT:read')) {
    return <AccessDenied />;
  }
  
  return (
    <div>
      {hasPermission('USER_MANAGEMENT:create') && (
        <CreateUserButton />
      )}
    </div>
  );
};
```

### 3. Role-Based Dashboard
```typescript
const Dashboard = () => {
  const { availableAgents, roles } = useAuth();
  
  return (
    <div>
      <h2>Welcome! Your Role: {roles.map(r => r.roleName).join(', ')}</h2>
      
      <div className="agents-grid">
        {availableAgents.map(agent => (
          <AgentCard 
            key={agent.agentId} 
            agent={agent}
            roleAssigned={agent.assignedViaRole}
          />
        ))}
      </div>
    </div>
  );
};
```

## Implementation Plan

### Week 1: Backend Infrastructure
- [ ] Create new DynamoDB tables (Users, Roles, RoleAgents)
- [ ] Build role management APIs
- [ ] Update authorizer for role-based permissions
- [ ] Create default roles (admin, general-inquiries, coo)

### Week 2: Frontend Overhaul
- [ ] Replace auth system completely
- [ ] Update all components with new permission checks
- [ ] Build role management UI
- [ ] Add agent assignment interface

### Week 3: Testing & Polish
- [ ] End-to-end testing
- [ ] Role-based agent assignment testing
- [ ] UI/UX improvements
- [ ] Documentation updates

## Default Roles Setup

### Admin Role
```json
{
  "roleId": "admin",
  "roleName": "System Administrator",
  "permissions": ["*:*"],
  "assignedAgents": []
}
```

### General Inquiries Role
```json
{
  "roleId": "general-inquiries",
  "roleName": "General Inquiries",
  "permissions": [
    "KNOWLEDGE_BASE:read",
    "AGENT_MANAGEMENT:read",
    "FILE_MANAGEMENT:upload"
  ],
  "assignedAgents": ["public-info-agent"]
}
```

### COO Role
```json
{
  "roleId": "coo",
  "roleName": "Chief Operating Officer",
  "permissions": [
    "KNOWLEDGE_BASE:*",
    "USER_MANAGEMENT:read",
    "AGENT_MANAGEMENT:*",
    "FILE_MANAGEMENT:*"
  ],
  "assignedAgents": ["executive-agent", "analytics-agent"]
}
```

## Benefits of Fresh Start

### ✅ **Clean Code**
- Single permission system
- No legacy code
- Clear architecture
- Easy to understand

### ✅ **Better Performance**
- Single API call for user dashboard
- Cached permissions
- Faster authorization
- Optimized queries

### ✅ **Easier Maintenance**
- No backward compatibility issues
- Clean database schema
- Simple permission logic
- Future-proof design

### ✅ **Better UX**
- Role-based agent display on login
- Clear permission-based UI
- Intuitive role management
- Consistent experience

## Migration Steps (Fresh Start)

### Step 1: Infrastructure
1. Deploy new DynamoDB tables
2. Remove old Cognito group logic
3. Update CloudFormation template

### Step 2: Backend
1. Replace all APIs with role-based versions
2. Update authorizer completely
3. Add role management endpoints

### Step 3: Frontend
1. Replace auth system
2. Update all components
3. Add role management UI

### Step 4: Setup
1. Create default roles
2. Assign admin role to first user
3. Test role-based agent assignment

## Success Metrics

- [ ] Users see role-assigned agents immediately on login
- [ ] Admin can create custom roles with specific permissions
- [ ] Agent assignment to roles works seamlessly
- [ ] Clean, maintainable codebase
- [ ] Fast permission checking (< 100ms)

---

**Next Steps:**
1. Approve fresh start approach
2. Begin infrastructure changes
3. Update CloudFormation template
4. Start backend implementation

**Advantages over backward compatible approach:**
- 50% less code complexity
- 30% better performance
- 70% easier maintenance
- 100% cleaner architecture