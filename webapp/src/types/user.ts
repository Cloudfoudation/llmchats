// User management types

// User status in Cognito
export type UserStatus = 'CONFIRMED' | 'UNCONFIRMED' | 'ARCHIVED' | 'COMPROMISED' | 'UNKNOWN' | 'RESET_REQUIRED' | 'FORCE_CHANGE_PASSWORD';

// Available user groups
export type PredefinedUserGroup = 'admin' | 'paid' | 'free';
export type UserGroup = PredefinedUserGroup | string;

// Basic user interface
export interface User {
    username: string;
    email: string;
    status: UserStatus;
    enabled: boolean;
    createdAt: string;
    lastModifiedAt: string;
    groups: UserGroup[];
    attributes?: Record<string, string>;
}

// User creation request
export interface CreateUserRequest {
    email: string;
    temporaryPassword?: string;
    groups?: UserGroup[];
    sendInvite?: boolean;
    attributes?: Record<string, string>;
}

// User creation response
export interface CreateUserResponse {
    success: boolean;
    data?: User;
    error?: {
        code: string;
        message: string;
    };
}

// Group update request options
export interface UpdateUserGroupsRequest {
    // Three possible ways to update groups
    addToGroups?: UserGroup[];      // Add user to these groups
    removeFromGroups?: UserGroup[]; // Remove user from these groups
    setGroups?: UserGroup[];        // Replace all groups with these
}

// Group update response
export interface UpdateUserGroupsResponse {
    success: boolean;
    data?: {
        username: string;
        previousGroups: UserGroup[];
        currentGroups: UserGroup[];
        added: UserGroup[];
        removed: UserGroup[];
    };
    error?: {
        code: string;
        message: string;
    };
}

// Get user details response
export interface GetUserResponse {
    success: boolean;
    data?: User;
    error?: {
        code: string;
        message: string;
    };
}

// Delete user response
export interface DeleteUserResponse {
    success: boolean;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
}

// Parameters for listing users
export interface ListUsersParams {
    limit?: number;
    paginationToken?: string;
    filter?: string;
}

// Response for listing users
export interface ListUsersResponse {
    success: boolean;
    data?: {
        users: User[];
        paginationToken?: string;
    };
    error?: {
        code: string;
        message: string;
    };
}