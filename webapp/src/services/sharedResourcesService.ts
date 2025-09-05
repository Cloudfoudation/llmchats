// src/services/sharedResourcesService.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    SharedResource,
    CreateSharedResourceRequest,
    UpdateSharedResourceRequest,
    SharedResourcesFilter,
    SharedResourceError,
} from '@/types/shared-resources';

import {
    ApiResponse,
} from '@/types/api';
import { ResourceVisibility } from '@/types/agent';

// Interface for visibility settings
interface SetVisibilityRequest {
    resourceId: string;
    resourceType: 'knowledge-base' | 'agent';
    visibility: ResourceVisibility;
}

class SharedResourcesService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_SHARED_RESOURCES_API_URL || '';
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
                throw new SharedResourceError(
                    apiError.message,
                    apiError.code,
                    error.response?.status
                );
            }
            throw new SharedResourceError(
                `API error: ${error.response?.status} - ${error.message}`,
                'API_ERROR',
                error.response?.status
            );
        }
        throw new SharedResourceError(
            error instanceof Error ? error.message : 'Unknown error occurred',
            'UNKNOWN_ERROR'
        );
    }

    async listSharedResources(filter?: SharedResourcesFilter): Promise<ApiResponse<{ resources: SharedResource[] }>> {
        try {
            const headers = await this.getHeaders();
            const params = new URLSearchParams();
            if (filter?.type) params.append('type', filter.type);
            if (filter?.groupId) params.append('groupId', filter.groupId);
            if (filter?.createdBy) params.append('createdBy', filter.createdBy);

            const url = `/shared-resources${params.toString() ? `?${params}` : ''}`;
            const response = await this.axiosInstance.get<ApiResponse<{ resources: SharedResource[] }>>(url, { headers });

            if (response.status >= 400) {
                console.error(`Error fetching shared resources: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to list shared resources: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error listing shared resources:', error);
            this.handleApiError(error);
        }
    }

    async shareResource(request: CreateSharedResourceRequest): Promise<ApiResponse<{ message: string }>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ApiResponse<{ message: string }>>(
                '/shared-resources',
                request,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error sharing resource: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to share resource: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error sharing resource:', error);
            this.handleApiError(error);
        }
    }

    async setResourceVisibility(request: SetVisibilityRequest): Promise<ApiResponse<{ message: string }>> {
        try {
            const headers = await this.getHeaders();

            // Use the same endpoint as shareResource but with visibility property
            const response = await this.axiosInstance.post<ApiResponse<{ message: string }>>(
                '/shared-resources',
                request,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error setting resource visibility: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to set resource visibility: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error setting resource visibility:', error);
            this.handleApiError(error);
        }
    }

    async updateSharedResource(
        resourceType: string,
        resourceId: string,
        groupId: string,
        request: UpdateSharedResourceRequest
    ): Promise<ApiResponse<{ message: string }>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.put<ApiResponse<{ message: string }>>(
                `/shared-resources/${resourceType}/${resourceId}/groups/${groupId}`,
                request,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error updating shared resource: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to update shared resource: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error updating shared resource:', error);
            this.handleApiError(error);
        }
    }

    async unshareResource(
        resourceType: string,
        resourceId: string,
        groupId: string
    ): Promise<ApiResponse<{ message: string }>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.delete<ApiResponse<{ message: string }>>(
                `/shared-resources/${resourceType}/${resourceId}/groups/${groupId}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error unsharing resource: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to unshare resource: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error unsharing resource:', error);
            this.handleApiError(error);
        }
    }
}

export const sharedResourcesService = new SharedResourcesService();