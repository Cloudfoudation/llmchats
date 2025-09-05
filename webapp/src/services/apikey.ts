// src/services/apikey.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    CreateApiKeyRequest,
    ApiResponse,
    ApiKey
} from '@/types/api';

class ApiService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_KEY_URL || '';
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

    // Add to services/api.ts

    async createApiKey(data: CreateApiKeyRequest): Promise<ApiResponse<ApiKey>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ApiResponse<ApiKey>>(
                '/api-keys',
                data,
                { headers }
            );

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to create API key');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getApiKeys(): Promise<ApiResponse<ApiKey[]>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ApiResponse<ApiKey[]>>(
                '/api-keys',
                { headers }
            );

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to fetch API keys');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async deleteApiKey(keyId: string): Promise<ApiResponse<void>> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.delete<ApiResponse<void>>(
                `/api-keys/${keyId}`,
                { headers }
            );

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to delete API key');
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