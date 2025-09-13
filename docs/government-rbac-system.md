# Government Dynamic RBAC System Design

**Date**: 2025-01-13  
**Project**: GSIS Government AI Chat System  
**Status**: 🔄 DESIGN PHASE  

## 🎯 Overview

This document outlines the design for a **Dynamic Role-Based Access Control (RBAC) system** for the government AI chat application. The system allows administrators to create custom roles, assign granular permissions, and dynamically assign users to roles without hardcoded limitations.

## 🏛️ Government Requirements

### Core Principles:
1. **Manual Role Assignment** - No automatic role assignment based on email domains
2. **Granular Permissions** - Fine-grained control over system resources
3. **Dynamic Role Creation** - Admins can create new roles as needed
4. **Audit Trail** - Complete logging of role assignments and permission changes
5. **Principle of Least Privilege** - Users get minimum required permissions
6. **Separation of Duties** - Clear distinction between system admin and government admin roles

## 🔧 System Architecture

### Current Static Groups (To Be Replaced):
```yaml
# OLD STATIC SYSTEM
- admin (system administrator)
- government-admin (department administrator)  
- department-head (management level)
- analyst (read-write access)
- viewer (read-only access)
```

### New Dynamic RBAC System:
```yaml
# NEW DYNAMIC SYSTEM
Roles Table:
  - roleId (PK)
  - roleName
  - description
  - permissions[]
  - createdBy
  - createdAt
  - updatedAt

UserRoles Table:
  - userId (PK)
  - roleId (SK)
  - assignedBy
  - assignedAt
  - expiresAt (optional)

Permissions Table:
  - permissionId (PK)
  - resource
  - action
  - conditions
```

## 📋 Permission Framework

### Resource Categories:
1. **Knowledge Bases** (`kb`)
   - `kb:create` - Create knowledge bases
   - `kb:read` - View knowledge bases
   - `kb:update` - Modify knowledge bases
   - `kb:delete` - Delete knowledge bases
   - `kb:share` - Share with other users/groups

2. **AI Models** (`ai`)
   - `ai:invoke` - Use AI models
   - `ai:list` - List available models
   - `ai:configure` - Configure model parameters

3. **Documents** (`doc`)
   - `doc:upload` - Upload documents
   - `doc:download` - Download documents
   - `doc:delete` - Delete documents
   - `doc:process` - Process with BDA

4. **Users** (`user`)
   - `user:create` - Create new users
   - `user:read` - View user information
   - `user:update` - Modify user details
   - `user:delete` - Delete users
   - `user:assign-role` - Assign roles to users

5. **Roles** (`role`)
   - `role:create` - Create new roles
   - `role:read` - View roles
   - `role:update` - Modify roles
   - `role:delete` - Delete roles
   - `role:assign` - Assign roles to users

6. **System** (`sys`)
   - `sys:admin` - System administration
   - `sys:audit` - View audit logs
   - `sys:configure` - System configuration

### Permission Conditions:
```json
{
  "resource": "kb",
  "action": "read",
  "conditions": {
    "owner": "self",           // Only own resources
    "department": "finance",   // Department-specific
    "classification": "public" // Security classification
  }
}
```

## 🏗️ Implementation Plan

### Phase 1: Database Schema Updates
```sql
-- Roles Table
CREATE TABLE Roles (
  roleId VARCHAR(50) PRIMARY KEY,
  roleName VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSON,
  createdBy VARCHAR(50),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  isActive BOOLEAN DEFAULT true
);

-- User Roles Table  
CREATE TABLE UserRoles (
  userId VARCHAR(50),
  roleId VARCHAR(50),
  assignedBy VARCHAR(50),
  assignedAt TIMESTAMP,
  expiresAt TIMESTAMP NULL,
  PRIMARY KEY (userId, roleId)
);

-- Permission Templates Table
CREATE TABLE PermissionTemplates (
  templateId VARCHAR(50) PRIMARY KEY,
  templateName VARCHAR(100),
  permissions JSON,
  description TEXT
);
```

### Phase 2: API Endpoints

#### Role Management API
```typescript
// Create Role
POST /api/roles
{
  "roleName": "Financial Analyst",
  "description": "Access to financial data and reports",
  "permissions": [
    "kb:read:finance",
    "doc:upload:finance", 
    "ai:invoke:analysis"
  ]
}

// Assign Role to User
POST /api/users/{userId}/roles
{
  "roleId": "financial-analyst-001",
  "expiresAt": "2025-12-31T23:59:59Z"
}

// List User Permissions
GET /api/users/{userId}/permissions
```

#### Permission Management API
```typescript
// Check Permission
POST /api/permissions/check
{
  "userId": "user-123",
  "resource": "kb",
  "action": "create",
  "context": {
    "department": "finance"
  }
}

// List Available Permissions
GET /api/permissions/templates
```

### Phase 3: Frontend Components

#### Admin Dashboard
```typescript
// Role Management Interface
const RoleManagement = () => {
  return (
    <div>
      <RoleCreator />
      <RoleList />
      <UserRoleAssignment />
      <PermissionMatrix />
    </div>
  );
};

// Permission Builder
const PermissionBuilder = () => {
  return (
    <div>
      <ResourceSelector />
      <ActionSelector />
      <ConditionBuilder />
      <PermissionPreview />
    </div>
  );
};
```

## 🔐 Security Implementation

### Permission Evaluation Engine
```python
class PermissionEvaluator:
    def check_permission(self, user_id: str, resource: str, action: str, context: dict) -> bool:
        # 1. Get user roles
        user_roles = self.get_user_roles(user_id)
        
        # 2. Get permissions for all roles
        permissions = self.get_role_permissions(user_roles)
        
        # 3. Evaluate each permission
        for permission in permissions:
            if self.matches_permission(permission, resource, action, context):
                return True
                
        return False
    
    def matches_permission(self, permission: dict, resource: str, action: str, context: dict) -> bool:
        # Check resource match
        if not self.matches_resource(permission['resource'], resource):
            return False
            
        # Check action match  
        if not self.matches_action(permission['action'], action):
            return False
            
        # Check conditions
        if not self.matches_conditions(permission.get('conditions', {}), context):
            return False
            
        return True
```

### Middleware Integration
```python
@require_permission('kb', 'create')
def create_knowledge_base(request):
    # Function implementation
    pass

@require_permission('user', 'assign-role')  
def assign_user_role(request):
    # Function implementation
    pass
```

## 📊 Pre-defined Role Templates

### System Administrator
```json
{
  "roleName": "System Administrator",
  "permissions": [
    "sys:*",
    "user:*", 
    "role:*",
    "kb:*",
    "doc:*",
    "ai:*"
  ]
}
```

### Government Administrator
```json
{
  "roleName": "Government Administrator", 
  "permissions": [
    "user:read",
    "user:assign-role",
    "role:read",
    "kb:*",
    "doc:*",
    "ai:invoke",
    "ai:list"
  ]
}
```

### Department Head
```json
{
  "roleName": "Department Head",
  "permissions": [
    "kb:create:own-department",
    "kb:read:own-department", 
    "kb:update:own-department",
    "kb:share:own-department",
    "doc:*:own-department",
    "ai:invoke",
    "user:read:own-department"
  ]
}
```

### Senior Analyst
```json
{
  "roleName": "Senior Analyst",
  "permissions": [
    "kb:create:own",
    "kb:read:shared",
    "kb:update:own",
    "doc:upload",
    "doc:process", 
    "ai:invoke:analysis"
  ]
}
```

### Junior Analyst
```json
{
  "roleName": "Junior Analyst",
  "permissions": [
    "kb:read:shared",
    "doc:upload:own",
    "ai:invoke:basic"
  ]
}
```

### Viewer
```json
{
  "roleName": "Viewer",
  "permissions": [
    "kb:read:public",
    "doc:download:public",
    "ai:invoke:basic"
  ]
}
```

## 🔄 Migration Strategy

### Step 1: Parallel System
- Keep existing static groups functional
- Implement dynamic RBAC alongside
- Gradual migration of users

### Step 2: Permission Mapping
```python
# Map existing groups to new permissions
MIGRATION_MAP = {
    'admin': 'system-administrator',
    'government-admin': 'government-administrator', 
    'department-head': 'department-head',
    'analyst': 'senior-analyst',
    'viewer': 'viewer'
}
```

### Step 3: Data Migration
```python
def migrate_users_to_rbac():
    for user in get_all_users():
        old_groups = user.cognito_groups
        for group in old_groups:
            new_role = MIGRATION_MAP.get(group)
            if new_role:
                assign_role_to_user(user.id, new_role)
```

### Step 4: Cleanup
- Remove static Cognito groups
- Update IAM roles to use dynamic permissions
- Remove hardcoded group checks

## 🎛️ Admin Workflow

### Creating a New Role
1. **Admin logs in** → Access Role Management
2. **Click "Create Role"** → Enter role details
3. **Select Permissions** → Use permission builder
4. **Set Conditions** → Define access constraints  
5. **Review & Save** → Role created and available
6. **Assign to Users** → Select users and assign role

### Assigning Permissions
1. **Select Resource Type** (KB, Documents, AI, etc.)
2. **Choose Actions** (Create, Read, Update, Delete, Share)
3. **Set Conditions** (Department, Classification, Ownership)
4. **Preview Permissions** → See effective access
5. **Save Role** → Role ready for assignment

### User Management
1. **View All Users** → See current role assignments
2. **Search/Filter** → Find specific users
3. **Assign Roles** → Multiple role assignment
4. **Set Expiration** → Time-limited access
5. **Audit Trail** → View assignment history

## 🔍 Audit & Compliance

### Audit Log Structure
```json
{
  "timestamp": "2025-01-13T10:30:00Z",
  "action": "role_assigned",
  "actor": "admin@gsis.com",
  "target": "analyst@gsis.com", 
  "details": {
    "roleId": "financial-analyst-001",
    "roleName": "Financial Analyst",
    "expiresAt": "2025-12-31T23:59:59Z"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### Compliance Reports
- **User Access Report** - Who has access to what
- **Permission Changes** - History of role modifications
- **Expired Roles** - Roles that need renewal
- **Unused Permissions** - Permissions never used
- **Access Violations** - Failed permission checks

## 🚀 Future Enhancements

### Advanced Features
1. **Conditional Permissions** - Time-based, location-based access
2. **Approval Workflows** - Multi-step role assignment approval
3. **Risk Scoring** - Automatic risk assessment for role combinations
4. **ML-Based Recommendations** - Suggest optimal role assignments
5. **Integration APIs** - Connect with external identity systems

### Scalability Considerations
1. **Permission Caching** - Redis-based permission cache
2. **Bulk Operations** - Mass role assignments
3. **Performance Monitoring** - Permission check latency tracking
4. **Load Balancing** - Distributed permission evaluation

## 📋 Implementation Checklist

### Backend Development
- [ ] Create new DynamoDB tables for RBAC
- [ ] Implement Permission Evaluator service
- [ ] Create Role Management APIs
- [ ] Add permission middleware to existing endpoints
- [ ] Implement audit logging system

### Frontend Development  
- [ ] Build Role Management dashboard
- [ ] Create Permission Builder interface
- [ ] Add User Role Assignment UI
- [ ] Implement Permission Matrix view
- [ ] Create Audit Log viewer

### Testing & Validation
- [ ] Unit tests for permission evaluation
- [ ] Integration tests for role assignment
- [ ] Security testing for privilege escalation
- [ ] Performance testing for permission checks
- [ ] User acceptance testing with government users

### Deployment & Migration
- [ ] Deploy RBAC system alongside existing system
- [ ] Migrate existing users to new roles
- [ ] Update documentation and training materials
- [ ] Remove legacy group-based system
- [ ] Monitor system performance and security

---

**Next Steps**: 
1. Review and approve this design
2. Begin Phase 1 implementation (Database Schema)
3. Create detailed API specifications
4. Start frontend mockups for admin interface

**Estimated Timeline**: 6-8 weeks for full implementation
**Priority**: High - Critical for government compliance and security