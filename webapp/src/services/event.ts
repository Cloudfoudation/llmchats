// src/services/event.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    StartEventRequest,
    EventResponse,
    ChatMessageRequest,
    ChatResponse,
    EventStatusResponse,
    VideoPromptResponse,
    EventTasksListResponse,
    UpdateSystemPromptsRequest,
    UpdateSystemPromptsResponse,
    AcceptAnnouncementResponse,
    RefreshUrlsResponse,
    ImageFeedbackRequest,
    ImageFeedbackResponse,
    PreviewImagesResponse,
    AcceptImagesResponse,
    TaskListParams
} from '@/types/event';

class EventService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_EVENT_COMPOSER_URL || '';
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

    async startEvent(data: StartEventRequest): Promise<EventResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<EventResponse>(
                '/start',
                data,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error(response.data.message || 'Failed to start event composition');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getEventStatus(taskId: string): Promise<EventStatusResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<EventStatusResponse>(
                `/${taskId}/status`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get event status');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async sendChatMessage(taskId: string, message: string): Promise<ChatResponse> {
        try {
            const headers = await this.getHeaders();
            const payload: ChatMessageRequest = { message };

            const response = await this.axiosInstance.post<ChatResponse>(
                `/${taskId}/chat`,
                payload,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to send chat message');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async acceptAnnouncement(taskId: string): Promise<AcceptAnnouncementResponse> {
        try {
            const headers = await this.getHeaders();

            const response = await this.axiosInstance.post<AcceptAnnouncementResponse>(
                `/${taskId}/accept-announcement`,
                {},
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to accept announcement');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getPreviewImages(taskId: string): Promise<PreviewImagesResponse> {
        try {
            const headers = await this.getHeaders();

            const response = await this.axiosInstance.get<PreviewImagesResponse>(
                `/${taskId}/preview-images`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get preview images');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async provideImageFeedback(
        taskId: string,
        selectedImages: number[],
        feedback?: string,
        regenerate: boolean = true
    ): Promise<ImageFeedbackResponse> {
        try {
            const headers = await this.getHeaders();
            const payload: ImageFeedbackRequest = {
                selected_images: selectedImages,
                feedback,
                regenerate
            };

            const response = await this.axiosInstance.post<ImageFeedbackResponse>(
                `/${taskId}/image-feedback`,
                payload,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to provide image feedback');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async acceptImages(taskId: string): Promise<AcceptImagesResponse> {
        try {
            const headers = await this.getHeaders();

            const response = await this.axiosInstance.post<AcceptImagesResponse>(
                `/${taskId}/accept-images`,
                {},
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to accept images');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async generateVideoPrompts(taskId: string): Promise<VideoPromptResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<VideoPromptResponse>(
                `/${taskId}/generate-video-prompts`,
                {},
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to generate video prompts');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async generateVideos(taskId: string): Promise<EventResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<EventResponse>(
                `/${taskId}/generate-videos`,
                {},
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to generate videos');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async updateSystemPrompts(
        taskId: string,
        data: UpdateSystemPromptsRequest
    ): Promise<UpdateSystemPromptsResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.put<UpdateSystemPromptsResponse>(
                `/${taskId}/system-prompts`,
                data,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to update system prompts');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async listEventTasks(params: TaskListParams = {}): Promise<EventTasksListResponse> {
        try {
            const headers = await this.getHeaders();

            const {
                limit = 25,
                last_evaluated_key,
                status,
                sort_order = 'desc'
            } = params;

            let url = `/tasks?limit=${limit}&sort_order=${sort_order}`;

            if (last_evaluated_key) {
                url += `&last_evaluated_key=${encodeURIComponent(last_evaluated_key)}`;
            }

            if (status) {
                url += `&status=${encodeURIComponent(status)}`;
            }

            console.log(`Fetching event tasks from: ${url}`);
            const response = await this.axiosInstance.get<EventTasksListResponse>(url, { headers });

            if (response.status >= 400) {
                console.error(`Error fetching tasks: ${response.status}`, response.data);
                throw new Error('Failed to list event tasks');
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
            console.error('Error listing event tasks:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    async refreshUrls(taskId: string): Promise<RefreshUrlsResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<RefreshUrlsResponse>(
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
}

// Create a singleton instance
export const eventService = new EventService();