// src/services/knowledgeBase.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    KnowledgeBase,
    CreateKnowledgeBaseRequest,
    CreateKnowledgeBaseResponse,
    ListKnowledgeBasesResponse,
    GetKnowledgeBaseResponse,
    DeleteKnowledgeBaseResponse,
    CreateDataSourceRequest,
    CreateDataSourceResponse,
    StartSyncRequest,
    StartSyncResponse,
    GetSyncStatusResponse,
    GetSyncSessionStatusResponse,
    FileUploadRequest,
    FileUploadResponse,
    RetrieveResponse,
    RetrieveRequest,
    SyncSessionStatus
} from '@/types/knowledgeBase';

class KnowledgeBaseService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_API_URL || '';
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
     * List all knowledge bases the user has access to
     */
    async listKnowledgeBases(): Promise<ListKnowledgeBasesResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ListKnowledgeBasesResponse>(
                '/knowledge-bases',
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error listing knowledge bases: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to list knowledge bases: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error listing knowledge bases:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Get a specific knowledge base by ID
     */
    async getKnowledgeBase(knowledgeBaseId: string): Promise<GetKnowledgeBaseResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<GetKnowledgeBaseResponse>(
                `/knowledge-bases/${knowledgeBaseId}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error fetching knowledge base: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to get knowledge base: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error getting knowledge base ${knowledgeBaseId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Create a new knowledge base
     */
    async createKnowledgeBase(kbData: CreateKnowledgeBaseRequest): Promise<CreateKnowledgeBaseResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<CreateKnowledgeBaseResponse>(
                '/knowledge-bases',
                kbData,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error creating knowledge base: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to create knowledge base: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error('Error creating knowledge base:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Delete a knowledge base
     */
    async deleteKnowledgeBase(knowledgeBaseId: string): Promise<DeleteKnowledgeBaseResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.delete<DeleteKnowledgeBaseResponse>(
                `/knowledge-bases/${knowledgeBaseId}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error deleting knowledge base: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to delete knowledge base: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error deleting knowledge base ${knowledgeBaseId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Create a data source for a knowledge base
     */
    async createDataSource(knowledgeBaseId: string, data: CreateDataSourceRequest): Promise<CreateDataSourceResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<CreateDataSourceResponse>(
                `/knowledge-bases/${knowledgeBaseId}/data-sources`,
                data,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error creating data source: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to create data source: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error creating data source for knowledge base ${knowledgeBaseId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Start syncing (ingestion job) for a knowledge base with coordinated BDA processing
     */
    async startSync(knowledgeBaseId: string, data: StartSyncRequest = {}): Promise<StartSyncResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<StartSyncResponse>(
                `/knowledge-bases/${knowledgeBaseId}/sync`,
                data,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error starting sync: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to start sync: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error starting sync for knowledge base ${knowledgeBaseId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Get sync status for a knowledge base (legacy ingestion jobs)
     */
    async getSyncStatus(knowledgeBaseId: string): Promise<GetSyncStatusResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<GetSyncStatusResponse>(
                `/knowledge-bases/${knowledgeBaseId}/sync`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error getting sync status: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to get sync status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error getting sync status for knowledge base ${knowledgeBaseId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Get sync session status for coordinated BDA + ingestion process
     */
    async getSyncSessionStatus(sessionId: string): Promise<GetSyncSessionStatusResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<GetSyncSessionStatusResponse>(
                `/sync-sessions/${sessionId}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error getting sync session status: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to get sync session status: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error getting sync session status for session ${sessionId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Generate pre-signed URLs for file uploads
     */
    async uploadFiles(knowledgeBaseId: string, data: FileUploadRequest): Promise<FileUploadResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<FileUploadResponse>(
                `/knowledge-bases/${knowledgeBaseId}/files`,
                data,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error getting upload URLs: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to get upload URLs: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error getting file upload URLs for knowledge base ${knowledgeBaseId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * List files in a knowledge base
     */
    async listFiles(knowledgeBaseId: string): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get(
                `/knowledge-bases/${knowledgeBaseId}/files`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error listing files: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to list files: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error listing files for knowledge base ${knowledgeBaseId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Get a presigned URL for downloading a file
     */
    async getDownloadUrl(knowledgeBaseId: string, fileKey: string): Promise<string> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get(
                `/knowledge-bases/${knowledgeBaseId}/files/download`,
                {
                    headers,
                    params: { key: fileKey }
                }
            );

            if (response.status >= 400) {
                console.error(`Error getting download URL: ${response.status}`, response.data);
                if (response.data?.error) {
                    throw new Error(response.data.error.message);
                }
                throw new Error(`Failed to get download URL: ${response.status}`);
            }

            if (!response.data?.data?.downloadUrl) {
                throw new Error('No download URL returned');
            }

            return response.data.data.downloadUrl;
        } catch (error) {
            console.error(`Error getting download URL for file ${fileKey}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Upload a file using a pre-signed URL
     */
    async uploadFileWithSignedUrl(uploadUrl: string, file: File, contentType: string): Promise<boolean> {
        try {
            const response = await axios.put(uploadUrl, file, {
                headers: {
                    'Content-Type': contentType
                }
            });

            return response.status >= 200 && response.status < 300;
        } catch (error) {
            console.error(`Error uploading file to signed URL:`, error);
            if (axios.isAxiosError(error)) {
                console.error(`S3 upload error details:`, error.response?.data);
            }
            throw error;
        }
    }

    /**
     * Delete a file from the knowledge base
     */
    async deleteFile(knowledgeBaseId: string, s3Key: string): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.delete(
                `/knowledge-bases/${knowledgeBaseId}/files`,
                {
                    headers,
                    params: { key: s3Key }
                }
            );

            if (response.status >= 400) {
                console.error(`Error deleting file: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to delete file: ${response.status}`);
            }

            return response.data;
        } catch (error) {
            console.error(`Error deleting file from knowledge base ${knowledgeBaseId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Retrieve information from a knowledge base
     */
    async retrieveFromKnowledgeBase(
        knowledgeBaseId: string,
        query: string,
        options: {
            numberOfResults?: number;
            searchType?: string;
        } = {}
    ): Promise<RetrieveResponse> {
        try {
            const headers = await this.getHeaders();
            const payload: RetrieveRequest = {
                text: query,
                numberOfResults: options.numberOfResults || 5,
                searchType: options.searchType || 'HYBRID'
            };

            const response = await this.axiosInstance.post<RetrieveResponse>(
                `/knowledge-bases/${knowledgeBaseId}/retrieve`,
                payload,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error retrieving from knowledge base: ${response.status}`, response.data);
                if (response.data?.error) {
                    return response.data;
                }
                throw new Error(`Failed to retrieve from knowledge base: ${response.status}`);
            }

            return response.data;
        } catch (error: unknown) {
            return {
                success: false,
                error: {
                    code: 'RETRIEVE_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error retrieving from knowledge base'
                }
            };
        }
    }
}

// Create singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();