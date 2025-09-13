# User Management Module

## Purpose
Admin functionality for managing users, groups, and permissions in the GSIS AI Portal system.

## API Integration

### User Management API
- **Base URL**: `https://0afocm1d58.execute-api.us-east-1.amazonaws.com/dev/`
- **Authentication**: Bearer token (Cognito ID token)
- **Authorization**: Admin group membership required

### API Endpoints
```typescript
GET    /users                           // List all users
GET    /users/{username}                // Get user details
POST   /users                          // Create new user
DELETE /users/{username}               // Delete user
PUT    /users/{username}/groups        // Update user groups
```

### AWS Cognito Integration
- **User Pool**: Direct user management
- **Group Management**: Add/remove users from groups
- **Attribute Management**: User profile updates

## Key Components

### 1. User Management Page (`src/components/users/UserManagementPage.tsx`)
```typescript
// Main admin interface
- List all users with pagination
- Search and filter users
- Create new users
- Edit user groups
- Delete users
- Bulk operations
```

### 2. New User Modal (`src/components/users/NewUserModal.tsx`)
```typescript
// User creation interface
- Email and username input
- Temporary password generation
- Initial group assignment
- Email verification setup
```

### 3. Edit User Groups Modal (`src/components/users/EditUserGroupsModal.tsx`)
```typescript
// Group membership management
- Current group display
- Available groups selection
- Add/remove group operations
- Permission preview
```

## Implementation

### User Service (`src/services/user.ts`)
```typescript
class UserManagementService {
  private baseUrl = process.env.NEXT_PUBLIC_USER_MANAGEMENT_API_URL;

  // List users with pagination
  async listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
    const headers = await this.getHeaders();
    const { limit = 50, paginationToken, filter } = params;

    let url = `/users?limit=${limit}`;
    if (paginationToken) {
      url += `&paginationToken=${encodeURIComponent(paginationToken)}`;
    }
    if (filter) {
      url += `&filter=${encodeURIComponent(filter)}`;
    }

    const response = await this.axiosInstance.get(url, { headers });
    return response.data;
  }

  // Create new user
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/users', userData, { headers });
    return response.data;
  }

  // Update user group memberships
  async updateUserGroups(username: string, groupData: UpdateUserGroupsRequest): Promise<UpdateUserGroupsResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.put(
      `/users/${encodeURIComponent(username)}/groups`,
      groupData,
      { headers }
    );
    return response.data;
  }

  // Delete user
  async deleteUser(username: string): Promise<DeleteUserResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.delete(
      `/users/${encodeURIComponent(username)}`,
      { headers }
    );
    return response.data;
  }

  // Check admin permissions
  async isAdmin(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      if (!idToken) return false;

      const payload = idToken.payload;
      const groups = payload['cognito:groups'];
      
      if (Array.isArray(groups)) {
        return groups.includes('admin');
      } else if (typeof groups === 'string') {
        return groups.split(',').includes('admin');
      }
      
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
}
```

### User Management Hook
```typescript
export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<{
    nextToken?: string;
    hasMore: boolean;
  }>({ hasMore: false });

  // Load users with pagination
  const loadUsers = async (paginationToken?: string, filter?: string) => {
    setLoading(true);
    try {
      const response = await userManagementService.listUsers({
        limit: 50,
        paginationToken,
        filter
      });

      if (response.success) {
        if (paginationToken) {
          // Append to existing users for pagination
          setUsers(prev => [...prev, ...response.data.users]);
        } else {
          // Replace users for new search/filter
          setUsers(response.data.users);
        }

        setPagination({
          nextToken: response.data.paginationToken,
          hasMore: !!response.data.paginationToken
        });
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const createUser = async (userData: CreateUserRequest) => {
    try {
      const response = await userManagementService.createUser(userData);
      if (response.success) {
        await loadUsers(); // Refresh list
        return response.data.user;
      }
      throw new Error(response.error?.message || 'Failed to create user');
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  // Update user groups
  const updateUserGroups = async (username: string, groupData: UpdateUserGroupsRequest) => {
    try {
      const response = await userManagementService.updateUserGroups(username, groupData);
      if (response.success) {
        // Update local user data
        setUsers(prev => prev.map(user => 
          user.username === username 
            ? { ...user, groups: response.data.user.groups }
            : user
        ));
        return response.data.user;
      }
      throw new Error(response.error?.message || 'Failed to update user groups');
    } catch (error) {
      console.error('Error updating user groups:', error);
      throw error;
    }
  };

  // Delete user
  const deleteUser = async (username: string) => {
    try {
      const response = await userManagementService.deleteUser(username);
      if (response.success) {
        setUsers(prev => prev.filter(user => user.username !== username));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete user');
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  return {
    users,
    loading,
    pagination,
    loadUsers,
    createUser,
    updateUserGroups,
    deleteUser
  };
};
```

## Data Structures

### User Object
```typescript
interface User {
  username: string;
  email: string;
  emailVerified: boolean;
  enabled: boolean;
  userStatus: 'CONFIRMED' | 'UNCONFIRMED' | 'FORCE_CHANGE_PASSWORD' | 'RESET_REQUIRED';
  groups: string[];
  attributes: {
    email: string;
    email_verified: string;
    given_name?: string;
    family_name?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  lastModified: string;
  lastLogin?: string;
}

interface CreateUserRequest {
  username: string;
  email: string;
  temporaryPassword: string;
  groups?: string[];
  attributes?: {
    given_name?: string;
    family_name?: string;
    [key: string]: string | undefined;
  };
  sendWelcomeEmail?: boolean;
}

interface UpdateUserGroupsRequest {
  addToGroups?: string[];
  removeFromGroups?: string[];
  setGroups?: string[];
}
```

## User Flow

### 1. Access User Management
1. Admin logs in to system
2. Navigates to admin section
3. Clicks "User Management"
4. System verifies admin permissions
5. User list loads with pagination

### 2. Create New User
1. Click "Create New User" button
2. Fill in user details:
   - Username (unique identifier)
   - Email address
   - Temporary password
   - Initial groups
3. Optional: Add user attributes
4. Click "Create User"
5. User receives welcome email
6. User appears in user list

### 3. Manage User Groups
1. Find user in list (search/filter)
2. Click "Edit Groups" button
3. View current group memberships
4. Add or remove groups:
   - admin: Full system access
   - paid: Premium features
   - free: Basic features
5. Save changes
6. User permissions update immediately

### 4. Delete User
1. Select user from list
2. Click "Delete User" button
3. Confirm deletion in modal
4. User removed from Cognito
5. User disappears from list

## Features

### 1. User Search and Filtering
```typescript
// Search by username, email, or attributes
const searchUsers = async (query: string) => {
  await loadUsers(undefined, query);
};

// Filter by user status
const filterByStatus = async (status: string) => {
  await loadUsers(undefined, `UserStatus = "${status}"`);
};

// Filter by group membership
const filterByGroup = async (group: string) => {
  await loadUsers(undefined, `Groups = "${group}"`);
};
```

### 2. Bulk Operations
```typescript
// Bulk group assignment
const bulkUpdateGroups = async (usernames: string[], groupData: UpdateUserGroupsRequest) => {
  const promises = usernames.map(username => 
    userManagementService.updateUserGroups(username, groupData)
  );
  
  const results = await Promise.allSettled(promises);
  return results;
};

// Bulk user deletion
const bulkDeleteUsers = async (usernames: string[]) => {
  const promises = usernames.map(username => 
    userManagementService.deleteUser(username)
  );
  
  const results = await Promise.allSettled(promises);
  return results;
};
```

### 3. User Status Management
```typescript
// Enable/disable user
const toggleUserStatus = async (username: string, enabled: boolean) => {
  // This would require additional API endpoint
  // Currently handled through Cognito console
};

// Force password reset
const forcePasswordReset = async (username: string) => {
  // This would require additional API endpoint
  // Currently handled through Cognito console
};
```

### 4. Audit and Monitoring
```typescript
// Track user activities
const getUserActivity = async (username: string) => {
  // Would integrate with CloudTrail or custom logging
  // Track login times, actions performed, etc.
};
```

## Security and Permissions

### Admin Authorization
```typescript
// Middleware to check admin access
export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const groups = decoded['cognito:groups'] || [];
    
    if (!groups.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Group Permissions
```typescript
export const GROUP_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageGroups: true,
    canAccessAllAgents: true,
    canAccessAllKnowledgeBases: true,
    canViewAnalytics: true
  },
  paid: {
    canCreateAgents: true,
    canCreateKnowledgeBases: true,
    canShareResources: true,
    canAccessPremiumModels: true
  },
  free: {
    canCreateAgents: false,
    canCreateKnowledgeBases: false,
    canShareResources: false,
    canAccessPremiumModels: false
  }
};
```

## Error Handling

### Common Errors
- `UserNotFound`: Invalid username
- `UserAlreadyExists`: Duplicate username/email
- `InvalidGroupName`: Non-existent group
- `InsufficientPermissions`: Not admin user
- `ValidationError`: Invalid user data

### Validation Rules
```typescript
const validateUserCreation = (userData: CreateUserRequest): string[] => {
  const errors: string[] = [];
  
  if (!userData.username || userData.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (!userData.email || !isValidEmail(userData.email)) {
    errors.push('Valid email address is required');
  }
  
  if (!userData.temporaryPassword || userData.temporaryPassword.length < 8) {
    errors.push('Temporary password must be at least 8 characters');
  }
  
  return errors;
};
```

## Usage Examples

### Create User
```typescript
const { createUser } = useUserManagement();

const handleCreateUser = async () => {
  try {
    const newUser = await createUser({
      username: 'john.doe',
      email: 'john.doe@company.com',
      temporaryPassword: 'TempPass123!',
      groups: ['free'],
      attributes: {
        given_name: 'John',
        family_name: 'Doe'
      },
      sendWelcomeEmail: true
    });
    
    console.log('User created:', newUser);
  } catch (error) {
    console.error('Failed to create user:', error);
  }
};
```

### Update User Groups
```typescript
const { updateUserGroups } = useUserManagement();

const promoteUser = async (username: string) => {
  try {
    await updateUserGroups(username, {
      removeFromGroups: ['free'],
      addToGroups: ['paid']
    });
    
    console.log('User promoted to paid tier');
  } catch (error) {
    console.error('Failed to update user groups:', error);
  }
};
```

### Search Users
```typescript
const { loadUsers } = useUserManagement();

const searchByEmail = async (email: string) => {
  try {
    await loadUsers(undefined, `email = "${email}"`);
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```