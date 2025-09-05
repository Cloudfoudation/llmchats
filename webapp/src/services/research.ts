// src/services/research.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    StartResearchRequest,
    ResearchFeedbackRequest,
    ResearchResponse,
    ResearchStatusResponse,
    ResearchOutlineResponse,
    TasksListResponse,
    TaskFilesResponse,
    ResearchPdfResponse,
    UserPromptsResponse,
    UpdatePromptsRequest
} from '@/types/research';
import {
    ApiResponse
} from '@/types/api';

class ResearchService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_DEEP_RESEARCH_URL || '';
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

    async startResearch(data: StartResearchRequest): Promise<ResearchResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ResearchResponse>(
                '/start',
                data,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error(response.data.message || 'Failed to start research');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getResearchStatus(taskId: string): Promise<ResearchStatusResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ResearchStatusResponse>(
                `/${taskId}/status`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get research status');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getResearchOutline(taskId: string): Promise<ResearchOutlineResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ResearchOutlineResponse>(
                `/${taskId}/outline`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get research outline');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async provideFeedback(taskId: string, data: ResearchFeedbackRequest): Promise<ResearchResponse> {
        try {
            const headers = await this.getHeaders();
            console.log(`Submitting feedback for task ${taskId}:`, data);

            const response = await this.axiosInstance.post<ResearchResponse>(
                `/${taskId}/feedback`,
                data,
                { headers }
            );

            if (response.status >= 400) {
                const errorMsg = response.data.message || 'Failed to provide feedback';
                console.error(`Feedback submission error: ${response.status}`, errorMsg);
                throw new Error(errorMsg);
            }

            console.log(`Feedback response:`, response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async listResearchTasks(
        limit: number = 10,
        offset: number = 0,
        status?: string,
        sortBy: string = 'created_at',
        sortOrder: 'asc' | 'desc' = 'desc'
    ): Promise<TasksListResponse> {
        try {
            const headers = await this.getHeaders();
            const sortByParam = ['created_at', 'topic', 'status', 'progress'].includes(sortBy) ? sortBy : 'created_at';
            const sortOrderParam = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';

            let url = `/tasks?limit=${limit}&offset=${offset}&sort_by=${sortByParam}&sort_order=${sortOrderParam}`;

            if (status) {
                url += `&status=${status}`;
            }

            console.log(`Fetching tasks from: ${url}`);
            const response = await this.axiosInstance.get<TasksListResponse>(url, { headers });

            if (response.status >= 400) {
                console.error(`Error fetching tasks: ${response.status}`, response.data);
                throw new Error('Failed to list research tasks');
            }

            // Ensure progress values are proper floats
            if (response.data?.tasks) {
                response.data.tasks = response.data.tasks.map(task => ({
                    ...task,
                    progress: typeof task.progress === 'string' ? parseFloat(task.progress) : task.progress,
                }));
            }

            return response.data;
        } catch (error) {
            console.error('Error listing tasks:', error);
            this.handleApiError(error);
            throw error;
        }
    }
    // New method to download article content directly from URL
    async downloadArticleContent(url: string): Promise<string> {
        try {
            // Use direct fetch to avoid CORS issues
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to download article: ${response.status} ${response.statusText}`);
            }

            const content = await response.text();

            if (!content || content.trim().length === 0) {
                throw new Error('Downloaded article content is empty');
            }

            return content;
        } catch (error) {
            console.error('Error downloading article content:', error);
            throw error;
        }
    }

    async getResearchPdf(taskId: string): Promise<ResearchPdfResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ResearchPdfResponse>(
                `/${taskId}/pdf`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get PDF');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    // New method to get files associated with a research task
    async getTaskFiles(taskId: string): Promise<string[]> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<TaskFilesResponse>(
                `/${taskId}/files`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get task files');
            }

            return response.data.files || [];
        } catch (error) {
            console.error('Error getting task files:', error);
            return [];
        }
    }

    // Enhanced retrieveArticleContent method in research.ts
    async retrieveArticleContent(taskId: string, maxAttempts: number = 5): Promise<string> {
        // Try multiple approaches to get the article content
        let attempts = 0;
        let lastError: Error | null = null;
        const retryDelay = 2000; // 2 seconds between attempts

        while (attempts < maxAttempts) {
            attempts++;
            console.log(`Attempt ${attempts}/${maxAttempts} to retrieve article content for task ${taskId}`);

            try {
                // First, try to get content directly from the task status
                const status = await this.getResearchStatus(taskId);

                // If we have article content in the response, return it
                if (status.article && status.article.trim().length > 0) {
                    console.log('Found article content in task status');
                    return status.article;
                }

                // If no direct content but we have a URL, try to download it
                if (status.article_url) {
                    console.log(`Attempting to download article from URL: ${status.article_url}`);
                    try {
                        const content = await this.downloadArticleContent(status.article_url);
                        if (content && content.trim().length > 0) {
                            console.log('Successfully downloaded article from URL');
                            return content;
                        }
                    } catch (downloadError) {
                        console.error('Error downloading from URL:', downloadError);
                        // Continue to next approach
                    }
                }

                // If we're on the last attempt and still no content, throw an error
                if (attempts >= maxAttempts) {
                    throw new Error(`Could not retrieve article content after ${maxAttempts} attempts`);
                }

                // Wait before retrying
                console.log(`No content found. Waiting ${retryDelay / 1000} seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));

            } catch (error) {
                console.error(`Attempt ${attempts} failed:`, error);
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempts >= maxAttempts) {
                    break;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        // If we exhausted all attempts, throw an error with details
        const errorMessage = lastError ? lastError.message : `Failed to retrieve article content after ${maxAttempts} attempts`;
        throw new Error(errorMessage);
    }

    async refreshURLs(taskId: string): Promise<ResearchStatusResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ResearchStatusResponse>(
                `/${taskId}/refresh-urls`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to refresh URLs');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getUserPrompts(taskId: string): Promise<UserPromptsResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<UserPromptsResponse>(
                `/${taskId}/prompts`,
                { headers }
            );
    
            if (response.status >= 400) {
                throw new Error('Failed to get user prompts');
            }
    
            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async updatePrompts(taskId: string, data: UpdatePromptsRequest): Promise<ResearchResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ResearchResponse>(
                `/${taskId}/update-prompts`,
                data,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to update prompts');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }
}

// Create a singleton instance
export const researchService = new ResearchService();