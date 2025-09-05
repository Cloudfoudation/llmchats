// src/services/user.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    User,
    CreateUserRequest,
    CreateUserResponse,
    UpdateUserGroupsRequest,
    UpdateUserGroupsResponse,
    GetUserResponse,
    DeleteUserResponse,
    ListUsersParams,
    ListUsersResponse
} from '@/types/user';

class UserManagementService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_USER_MANAGEMENT_API_URL || '';
        this.user = null;
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            validateStatus: (status) => status < 500
        });
    }

    setUser(user: AuthUser | null) {
        this.user = user;
    }

    private async getHeaders(): Promise<Record<string, string>> {
        if (!this.user) {
            throw new Error('User not authenticated');
        }

        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No valid token found');
            }

            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            console.error('Error getting auth headers:', error);
            throw new Error('Failed to get authentication token');
        }
    }

    private handleApiError(error: unknown): never {
        if (axios.isAxiosError(error)) {
            const apiError = error.response?.data?.error;
            if (apiError) {
                throw new Error(`${apiError.code}: ${apiError.message}`);
            }
            throw new Error(`API error: ${error.response?.status} - ${error.message}`);
        }
        throw error;
    }

    /**
     * List users with optional pagination and filtering
     */
    async listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
        try {
            const headers = await this.getHeaders();
            const { limit = 50, paginationToken, filter } = params;

            let url = `/users?limit=${limit}`;

            if (paginationToken) {
                url += `&paginationToken=${encodeURIComponent(paginationToken)}`;
            }

            if (filter) {
                url += `&filter=${encodeURIComponent(filter)}`;
            }

            const response = await this.axiosInstance.get<ListUsersResponse>(url, { headers });

            if (response.status >= 400) {
                console.error(`Error fetching users: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to list users: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error listing users:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Get details of a specific user
     */
    async getUser(username: string): Promise<GetUserResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<GetUserResponse>(
                `/users/${encodeURIComponent(username)}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error fetching user: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to get user: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error getting user details for ${username}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Create a new user
     */
    async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<CreateUserResponse>(
                '/users',
                userData,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error creating user: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to create user: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error creating user:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Delete a user
     */
    async deleteUser(username: string): Promise<DeleteUserResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.delete<DeleteUserResponse>(
                `/users/${encodeURIComponent(username)}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error deleting user: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to delete user: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error deleting user ${username}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Update user group memberships
     * Provides three ways to update: add to groups, remove from groups, or set all groups
     */
    async updateUserGroups(username: string, groupData: UpdateUserGroupsRequest): Promise<UpdateUserGroupsResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.put<UpdateUserGroupsResponse>(
                `/users/${encodeURIComponent(username)}/groups`,
                groupData,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error updating user groups: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to update user groups: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error updating groups for user ${username}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Helper to add user to specific groups
     */
    async addUserToGroups(username: string, groups: string[]): Promise<UpdateUserGroupsResponse> {
        return this.updateUserGroups(username, { addToGroups: groups });
    }

    /**
     * Helper to remove user from specific groups
     */
    async removeUserFromGroups(username: string, groups: string[]): Promise<UpdateUserGroupsResponse> {
        return this.updateUserGroups(username, { removeFromGroups: groups });
    }

    /**
     * Helper to set all user groups (replacing existing ones)
     */
    async setUserGroups(username: string, groups: string[]): Promise<UpdateUserGroupsResponse> {
        return this.updateUserGroups(username, { setGroups: groups });
    }

    /**
     * Check if current user has admin permissions
     */
    async isAdmin(): Promise<boolean> {
        try {
            if (!this.user) return false;

            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken;

            if (!idToken) return false;

            const payload = idToken.payload;
            const groups = payload['cognito:groups'];

            if (!groups) return false;

            // Check if groups is an array first
            if (Array.isArray(groups)) {
                return groups.includes('admin');
            }
            // If it's a string, then split it
            else if (typeof groups === 'string') {
                return groups.split(',').includes('admin');
            }

            // For any other type, it's not a valid groups format
            return false;

        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }
}

// Create singleton instance
export const userManagementService = new UserManagementService();