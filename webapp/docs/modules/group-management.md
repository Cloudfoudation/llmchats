# Group Management Module

## Purpose
Admin functionality for creating and managing user groups, permissions, and access control in the GSIS AI Portal.

## API Integration

### Group Management API
- **Base URL**: `https://s3aof4lt9g.execute-api.us-east-1.amazonaws.com/dev/`
- **Authentication**: Bearer token (Cognito ID token)
- **Authorization**: Admin group membership required

### API Endpoints
```typescript
GET    /groups                         // List all groups
GET    /groups/{groupName}             // Get group details
POST   /groups                        // Create new group
PUT    /groups/{groupName}             // Update group
DELETE /groups/{groupName}             // Delete group
GET    /groups/{groupName}/members     // List group members
POST   /groups/{groupName}/members     // Add members to group
DELETE /groups/{groupName}/members     // Remove members from group
```

### DynamoDB Tables
- **Groups**: `gsis-poc-groups`
- **User Groups**: `gsis-poc-user-groups`

### AWS Cognito Integration
- **User Pool Groups**: Cognito group management
- **IAM Roles**: Group-based permissions
- **Policy Attachment**: Dynamic permission assignment

## Key Components

### 1. Group Management Page (`src/components/groups/GroupManagementPage.tsx`)
```typescript
// Main admin interface
- List all groups
- Create new groups
- Edit group details
- Delete groups
- Manage group members
- View group permissions
```

### 2. Create Group Modal (`src/components/groups/CreateGroupModal.tsx`)
```typescript
// Group creation interface
- Group name and description
- Permission selection
- Initial member assignment
- IAM role configuration
```

### 3. Edit Group Modal (`src/components/groups/EditGroupModal.tsx`)
```typescript
// Group modification interface
- Update group details
- Modify permissions
- Change group settings
```

### 4. Manage Group Members Modal (`src/components/groups/ManageGroupMembersModal.tsx`)
```typescript
// Member management interface
- Current members list
- Add new members
- Remove members
- Bulk member operations
```

## Implementation

### Group Service (`src/services/groupService.ts`)
```typescript
class GroupManagementService {
  private baseUrl = process.env.NEXT_PUBLIC_GROUP_MANAGEMENT_API_URL;

  // List all groups
  async listGroups(): Promise<ListGroupsResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get('/groups', { headers });
    return response.data;
  }

  // Create new group
  async createGroup(groupData: CreateGroupRequest): Promise<CreateGroupResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/groups', groupData, { headers });
    return response.data;
  }

  // Update group
  async updateGroup(groupName: string, groupData: UpdateGroupRequest): Promise<UpdateGroupResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.put(
      `/groups/${encodeURIComponent(groupName)}`,
      groupData,
      { headers }
    );
    return response.data;
  }

  // Delete group
  async deleteGroup(groupName: string): Promise<DeleteGroupResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.delete(
      `/groups/${encodeURIComponent(groupName)}`,
      { headers }
    );
    return response.data;
  }

  // Get group members
  async getGroupMembers(groupName: string): Promise<GetGroupMembersResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get(
      `/groups/${encodeURIComponent(groupName)}/members`,
      { headers }
    );
    return response.data;
  }

  // Add members to group
  async addMembersToGroup(groupName: string, usernames: string[]): Promise<AddMembersResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post(
      `/groups/${encodeURIComponent(groupName)}/members`,
      { usernames },
      { headers }
    );
    return response.data;
  }

  // Remove members from group
  async removeMembersFromGroup(groupName: string, usernames: string[]): Promise<RemoveMembersResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.delete(
      `/groups/${encodeURIComponent(groupName)}/members`,
      { 
        headers,
        data: { usernames }
      }
    );
    return response.data;
  }
}
```

### Groups Hook (`src/hooks/useGroups.ts`)
```typescript
export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Load all groups
  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await groupManagementService.listGroups();
      if (response.success) {
        setGroups(response.data.groups);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new group
  const createGroup = async (groupData: CreateGroupRequest) => {
    try {
      const response = await groupManagementService.createGroup(groupData);
      if (response.success) {
        await loadGroups(); // Refresh list
        return response.data.group;
      }
      throw new Error(response.error?.message || 'Failed to create group');
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  };

  // Update group
  const updateGroup = async (groupName: string, groupData: UpdateGroupRequest) => {
    try {
      const response = await groupManagementService.updateGroup(groupName, groupData);
      if (response.success) {
        await loadGroups(); // Refresh list
        return response.data.group;
      }
      throw new Error(response.error?.message || 'Failed to update group');
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  };

  // Delete group
  const deleteGroup = async (groupName: string) => {
    try {
      const response = await groupManagementService.deleteGroup(groupName);
      if (response.success) {
        setGroups(prev => prev.filter(group => group.name !== groupName));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete group');
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  };

  // Manage group members
  const addMembersToGroup = async (groupName: string, usernames: string[]) => {
    try {
      const response = await groupManagementService.addMembersToGroup(groupName, usernames);
      if (response.success) {
        // Update local group data
        setGroups(prev => prev.map(group => 
          group.name === groupName 
            ? { ...group, memberCount: group.memberCount + usernames.length }
            : group
        ));
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to add members');
    } catch (error) {
      console.error('Error adding members to group:', error);
      throw error;
    }
  };

  const removeMembersFromGroup = async (groupName: string, usernames: string[]) => {
    try {
      const response = await groupManagementService.removeMembersFromGroup(groupName, usernames);
      if (response.success) {
        // Update local group data
        setGroups(prev => prev.map(group => 
          group.name === groupName 
            ? { ...group, memberCount: Math.max(0, group.memberCount - usernames.length) }
            : group
        ));
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to remove members');
    } catch (error) {
      console.error('Error removing members from group:', error);
      throw error;
    }
  };

  return {
    groups,
    loading,
    selectedGroup,
    setSelectedGroup,
    loadGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    addMembersToGroup,
    removeMembersFromGroup
  };
};
```

## Data Structures

### Group Object
```typescript
interface Group {
  name: string;
  description?: string;
  permissions: GroupPermissions;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  iamRoleArn?: string;
  isSystemGroup: boolean; // admin, paid, free are system groups
}

interface GroupPermissions {
  // Agent permissions
  canCreateAgents: boolean;
  canEditOwnAgents: boolean;
  canDeleteOwnAgents: boolean;
  canShareAgents: boolean;
  canAccessSharedAgents: boolean;
  
  // Knowledge Base permissions
  canCreateKnowledgeBases: boolean;
  canEditOwnKnowledgeBases: boolean;
  canDeleteOwnKnowledgeBases: boolean;
  canShareKnowledgeBases: boolean;
  canAccessSharedKnowledgeBases: boolean;
  
  // Model access permissions
  canAccessPremiumModels: boolean;
  canAccessAllModels: boolean;
  
  // Admin permissions
  canManageUsers: boolean;
  canManageGroups: boolean;
  canViewAnalytics: boolean;
  canManageSystem: boolean;
}

interface CreateGroupRequest {
  name: string;
  description?: string;
  permissions: GroupPermissions;
  initialMembers?: string[];
}

interface UpdateGroupRequest {
  description?: string;
  permissions?: Partial<GroupPermissions>;
}
```

## User Flow

### 1. Access Group Management
1. Admin logs in to system
2. Navigates to admin section
3. Clicks "Group Management"
4. System verifies admin permissions
5. Group list loads

### 2. Create New Group
1. Click "Create New Group" button
2. Fill in group details:
   - Group name (unique)
   - Description
   - Permission settings
3. Select initial members (optional)
4. Click "Create Group"
5. Group appears in list
6. IAM role created automatically

### 3. Manage Group Permissions
1. Select group from list
2. Click "Edit Group" button
3. Modify permission settings:
   - Agent management permissions
   - Knowledge base permissions
   - Model access permissions
   - Admin permissions
4. Save changes
5. Permissions update for all group members

### 4. Manage Group Members
1. Select group from list
2. Click "Manage Members" button
3. View current members
4. Add new members:
   - Search for users
   - Select multiple users
   - Bulk add operation
5. Remove members:
   - Select members to remove
   - Confirm removal
6. Changes apply immediately

## Features

### 1. Permission Templates
```typescript
export const PERMISSION_TEMPLATES = {
  admin: {
    canCreateAgents: true,
    canEditOwnAgents: true,
    canDeleteOwnAgents: true,
    canShareAgents: true,
    canAccessSharedAgents: true,
    canCreateKnowledgeBases: true,
    canEditOwnKnowledgeBases: true,
    canDeleteOwnKnowledgeBases: true,
    canShareKnowledgeBases: true,
    canAccessSharedKnowledgeBases: true,
    canAccessPremiumModels: true,
    canAccessAllModels: true,
    canManageUsers: true,
    canManageGroups: true,
    canViewAnalytics: true,
    canManageSystem: true
  },
  
  paid: {
    canCreateAgents: true,
    canEditOwnAgents: true,
    canDeleteOwnAgents: true,
    canShareAgents: true,
    canAccessSharedAgents: true,
    canCreateKnowledgeBases: true,
    canEditOwnKnowledgeBases: true,
    canDeleteOwnKnowledgeBases: true,
    canShareKnowledgeBases: true,
    canAccessSharedKnowledgeBases: true,
    canAccessPremiumModels: true,
    canAccessAllModels: false,
    canManageUsers: false,
    canManageGroups: false,
    canViewAnalytics: false,
    canManageSystem: false
  },
  
  free: {
    canCreateAgents: false,
    canEditOwnAgents: false,
    canDeleteOwnAgents: false,
    canShareAgents: false,
    canAccessSharedAgents: true,
    canCreateKnowledgeBases: false,
    canEditOwnKnowledgeBases: false,
    canDeleteOwnKnowledgeBases: false,
    canShareKnowledgeBases: false,
    canAccessSharedKnowledgeBases: true,
    canAccessPremiumModels: false,
    canAccessAllModels: false,
    canManageUsers: false,
    canManageGroups: false,
    canViewAnalytics: false,
    canManageSystem: false
  }
};
```

### 2. Dynamic IAM Role Management
```typescript
// IAM role creation for groups
const createGroupIAMRole = async (groupName: string, permissions: GroupPermissions) => {
  const policyDocument = generatePolicyFromPermissions(permissions);
  
  const roleParams = {
    RoleName: `GSISGroup-${groupName}`,
    AssumeRolePolicyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: {
          Federated: 'cognito-identity.amazonaws.com'
        },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': process.env.IDENTITY_POOL_ID
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated'
          }
        }
      }]
    }),
    Description: `IAM role for GSIS group: ${groupName}`
  };

  // Create role and attach policies
  const role = await iam.createRole(roleParams).promise();
  await iam.putRolePolicy({
    RoleName: roleParams.RoleName,
    PolicyName: `${groupName}Policy`,
    PolicyDocument: JSON.stringify(policyDocument)
  }).promise();

  return role.Role.Arn;
};
```

### 3. Permission Validation
```typescript
// Check if user has specific permission
export const hasPermission = (userGroups: string[], requiredPermission: keyof GroupPermissions): boolean => {
  // Admin always has all permissions
  if (userGroups.includes('admin')) {
    return true;
  }

  // Check each group for the permission
  for (const groupName of userGroups) {
    const template = PERMISSION_TEMPLATES[groupName as keyof typeof PERMISSION_TEMPLATES];
    if (template && template[requiredPermission]) {
      return true;
    }
  }

  return false;
};

// Get effective permissions for user
export const getEffectivePermissions = (userGroups: string[]): GroupPermissions => {
  const effectivePermissions: GroupPermissions = {
    canCreateAgents: false,
    canEditOwnAgents: false,
    canDeleteOwnAgents: false,
    canShareAgents: false,
    canAccessSharedAgents: false,
    canCreateKnowledgeBases: false,
    canEditOwnKnowledgeBases: false,
    canDeleteOwnKnowledgeBases: false,
    canShareKnowledgeBases: false,
    canAccessSharedKnowledgeBases: false,
    canAccessPremiumModels: false,
    canAccessAllModels: false,
    canManageUsers: false,
    canManageGroups: false,
    canViewAnalytics: false,
    canManageSystem: false
  };

  // Merge permissions from all groups (OR operation)
  for (const groupName of userGroups) {
    const template = PERMISSION_TEMPLATES[groupName as keyof typeof PERMISSION_TEMPLATES];
    if (template) {
      Object.keys(effectivePermissions).forEach(permission => {
        const key = permission as keyof GroupPermissions;
        effectivePermissions[key] = effectivePermissions[key] || template[key];
      });
    }
  }

  return effectivePermissions;
};
```

### 4. Group Hierarchy
```typescript
// Define group hierarchy for inheritance
export const GROUP_HIERARCHY = {
  admin: ['paid', 'free'],
  paid: ['free'],
  free: []
};

// Check if group inherits from another
const inheritsFrom = (childGroup: string, parentGroup: string): boolean => {
  const hierarchy = GROUP_HIERARCHY[childGroup as keyof typeof GROUP_HIERARCHY] || [];
  return hierarchy.includes(parentGroup);
};
```

## Security and Validation

### Group Name Validation
```typescript
const validateGroupName = (name: string): string[] => {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Group name is required');
  }
  
  if (name.length < 3 || name.length > 50) {
    errors.push('Group name must be between 3 and 50 characters');
  }
  
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    errors.push('Group name can only contain letters, numbers, hyphens, and underscores');
  }
  
  // Check for reserved names
  const reservedNames = ['admin', 'paid', 'free', 'system', 'root'];
  if (reservedNames.includes(name.toLowerCase())) {
    errors.push('Group name is reserved');
  }
  
  return errors;
};
```

### Permission Validation
```typescript
const validatePermissions = (permissions: GroupPermissions): string[] => {
  const errors: string[] = [];
  
  // Admin permissions require other permissions
  if (permissions.canManageUsers && !permissions.canAccessAllModels) {
    errors.push('User management requires access to all models');
  }
  
  if (permissions.canManageGroups && !permissions.canManageUsers) {
    errors.push('Group management requires user management permission');
  }
  
  // Sharing requires creation permissions
  if (permissions.canShareAgents && !permissions.canCreateAgents) {
    errors.push('Sharing agents requires agent creation permission');
  }
  
  if (permissions.canShareKnowledgeBases && !permissions.canCreateKnowledgeBases) {
    errors.push('Sharing knowledge bases requires knowledge base creation permission');
  }
  
  return errors;
};
```

## Error Handling

### Common Errors
- `GroupAlreadyExists`: Duplicate group name
- `GroupNotFound`: Invalid group name
- `InvalidPermissions`: Invalid permission configuration
- `SystemGroupModification`: Attempt to modify system groups
- `MemberNotFound`: User not found when adding to group

### System Group Protection
```typescript
const isSystemGroup = (groupName: string): boolean => {
  return ['admin', 'paid', 'free'].includes(groupName);
};

const validateGroupModification = (groupName: string): void => {
  if (isSystemGroup(groupName)) {
    throw new Error('System groups cannot be modified');
  }
};
```

## Usage Examples

### Create Group
```typescript
const { createGroup } = useGroups();

const handleCreateGroup = async () => {
  try {
    const newGroup = await createGroup({
      name: 'research-team',
      description: 'Research team with premium access',
      permissions: {
        ...PERMISSION_TEMPLATES.paid,
        canAccessAllModels: true // Custom permission
      },
      initialMembers: ['researcher1', 'researcher2']
    });
    
    console.log('Group created:', newGroup);
  } catch (error) {
    console.error('Failed to create group:', error);
  }
};
```

### Add Members to Group
```typescript
const { addMembersToGroup } = useGroups();

const handleAddMembers = async (groupName: string, usernames: string[]) => {
  try {
    await addMembersToGroup(groupName, usernames);
    console.log('Members added successfully');
  } catch (error) {
    console.error('Failed to add members:', error);
  }
};
```

### Check Permissions
```typescript
const { user } = useAuth();

const canCreateAgent = hasPermission(user.groups, 'canCreateAgents');
const effectivePerms = getEffectivePermissions(user.groups);
```