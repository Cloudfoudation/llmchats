// src/services/api.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    SearchResponse,
    PaginatedResponse,
    SearchHistoryItem,
    SearchSubmitResponse,
    ApiResponse,
    KnowledgeBaseConfig,
    VectorDbConfig
} from '@/types/api';

class ApiService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
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
                'Content-Type': 'application/json',
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

    async submitSearch(query: string): Promise<ApiResponse<SearchSubmitResponse>> {
        try {
            const headers = await this.getHeaders();
            const session = await fetchAuthSession();
            const identityId = session.identityId;

            if (!identityId) {
                throw new Error('Identity ID not found');
            }

            // Add vector DB and KB configs
            const payload = {
                query,
                vectorDbConfig: {
                    dimension: 1024,
                    similarity: 'cosine'
                } as VectorDbConfig,
                knowledgeBaseConfig: {
                    name: `KB-${Date.now()}`,
                    description: `Knowledge base for query: ${query}`,
                    access: 'private'
                } as KnowledgeBaseConfig
            };

            const response = await this.axiosInstance.post<ApiResponse<SearchSubmitResponse>>(
                `/search?identityId=${encodeURIComponent(identityId)}`,
                payload,
                { headers }
            );

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error?.message || 'Unknown error occurred');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getResults(requestIds: string | string[]): Promise<ApiResponse<SearchResponse>> {
        try {
            const headers = await this.getHeaders();
            const ids = Array.isArray(requestIds) ? requestIds.join(',') : requestIds;

            const response = await this.axiosInstance.get<ApiResponse<SearchResponse>>(
                `/results/status?requestIds=${ids}`,
                { headers }
            );

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Unknown error occurred');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getAllResults(params?: {
        limit?: number;
        nextToken?: string;
    }): Promise<ApiResponse<PaginatedResponse<SearchHistoryItem>>> {
        try {
            const headers = await this.getHeaders();
            const queryParams = new URLSearchParams();

            if (params?.limit) {
                queryParams.append('limit', params.limit.toString());
            }
            if (params?.nextToken) {
                queryParams.append('nextToken', params.nextToken);
            }

            const url = `/results${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<SearchHistoryItem>>>(
                url,
                { headers }
            );

            if (!response.data.success) {
                throw new Error(
                    response.data.error
                        ? `${response.data.error.code}: ${response.data.error.message}`
                        : 'Unknown error occurred'
                );
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }
}

// Create a singleton instance
export const apiService = new ApiService();