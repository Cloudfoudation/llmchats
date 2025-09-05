// src/services/groupService.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    Group,
    GroupMember,
    CreateGroupRequest,
    UpdateGroupRequest,
    AddMemberRequest,
    UpdateMemberRoleRequest,
    ApiResponse,
    GroupsListResponse,
    MembersListResponse,
    GroupError
} from '@/types/groups';

class GroupService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_GROUP_MANAGEMENT_API_URL || '';
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
                throw new GroupError(apiError.message, apiError.code, error.response?.status);
            }
            throw new GroupError(`API error: ${error.message}`, 'API_ERROR', error.response?.status);
        }
        throw error instanceof Error
            ? new GroupError(error.message, 'UNKNOWN_ERROR')
            : new GroupError('Unknown error', 'UNKNOWN_ERROR');
    }

    // Group CRUD operations
    async listGroups(limit?: number): Promise<ApiResponse<GroupsListResponse>> {
        try {
            const headers = await this.getHeaders();
            const params = new URLSearchParams();
            if (limit) params.append('limit', limit.toString());

            const response = await this.axiosInstance.get<ApiResponse<GroupsListResponse>>(
                `/groups?${params}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error fetching groups: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to list groups: ${response.status}`, 'LIST_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error('Error listing groups:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    async createGroup(request: CreateGroupRequest): Promise<ApiResponse<Group>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ApiResponse<Group>>(
                '/groups',
                request,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error creating group: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to create group: ${response.status}`, 'CREATE_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error('Error creating group:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    async getGroup(groupId: string): Promise<ApiResponse<Group>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ApiResponse<Group>>(
                `/groups/${encodeURIComponent(groupId)}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error fetching group: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to get group: ${response.status}`, 'GET_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error(`Error getting group details for ${groupId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    async updateGroup(
        groupId: string,
        request: UpdateGroupRequest
    ): Promise<ApiResponse<{ message: string }>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.put<ApiResponse<{ message: string }>>(
                `/groups/${encodeURIComponent(groupId)}`,
                request,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error updating group: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to update group: ${response.status}`, 'UPDATE_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error(`Error updating group ${groupId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    async deleteGroup(groupId: string): Promise<ApiResponse<{ message: string }>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.delete<ApiResponse<{ message: string }>>(
                `/groups/${encodeURIComponent(groupId)}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error deleting group: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to delete group: ${response.status}`, 'DELETE_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error(`Error deleting group ${groupId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    // Member management
    async listMembers(groupId: string): Promise<ApiResponse<MembersListResponse>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ApiResponse<MembersListResponse>>(
                `/groups/${encodeURIComponent(groupId)}/members`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error fetching members: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to list members: ${response.status}`, 'LIST_MEMBERS_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error(`Error listing members for group ${groupId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    async addMember(
        groupId: string,
        request: AddMemberRequest
    ): Promise<ApiResponse<GroupMember>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ApiResponse<GroupMember>>(
                `/groups/${encodeURIComponent(groupId)}/members`,
                request,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error adding member: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to add member: ${response.status}`, 'ADD_MEMBER_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error(`Error adding member to group ${groupId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    async removeMember(
        groupId: string,
        userId: string
    ): Promise<ApiResponse<{ message: string }>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.delete<ApiResponse<{ message: string }>>(
                `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error removing member: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to remove member: ${response.status}`, 'REMOVE_MEMBER_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error(`Error removing member from group ${groupId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    async updateMemberRole(
        groupId: string,
        userId: string,
        request: UpdateMemberRoleRequest
    ): Promise<ApiResponse<{ message: string }>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.put<ApiResponse<{ message: string }>>(
                `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
                request,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error updating member role: ${response.status}`, response.data);
                if (!response.data.success && response.data.error) {
                    throw new GroupError(
                        response.data.error.message,
                        response.data.error.code,
                        response.status
                    );
                }
                throw new GroupError(`Failed to update member role: ${response.status}`, 'UPDATE_ROLE_FAILED', response.status);
            }

            return response.data;
        } catch (error) {
            console.error(`Error updating role in group ${groupId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }
}

export const groupService = new GroupService();