// src/services/scenario.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    ProjectRequest,
    ProjectResponse,
    ProjectStatusResponse,
    ProjectsListResponse,
    StructureResponse,
    ContentResponse,
    ImageResponse,
    VideoResponse,
    VideoGenerationResponse,
    RequirementsModel,
    StructureFeedbackModel,
    ContentFeedbackModel,
    ImageFeedbackModel,
    VideoSettingsModel,
    ExportSettingsModel,
    ExportResponse,
    RepurposeResponse
} from '@/types/scenario';

class ScenarioService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_SCENARIO_AI_URL || '';
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

    async createProject(data: ProjectRequest): Promise<ProjectResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ProjectResponse>(
                '/projects',
                data,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error(response.data.message || 'Failed to create project');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getProjectStatus(projectId: string): Promise<ProjectStatusResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ProjectStatusResponse>(
                `/projects/${projectId}`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get project status');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async listProjects(
        limit: number = 20,
        pagination_token?: string
    ): Promise<ProjectsListResponse> {
        try {
            const headers = await this.getHeaders();
            
            let url = `/projects?limit=${limit}`;
            if (pagination_token) {
                url += `&pagination_token=${pagination_token}`;
            }

            console.log(`Fetching projects from: ${url}`);
            const response = await this.axiosInstance.get<ProjectsListResponse>(
                url, 
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error fetching projects: ${response.status}`, response.data);
                throw new Error('Failed to list projects');
            }

            // Ensure progress values are proper floats
            if (response.data?.projects) {
                response.data.projects = response.data.projects.map(project => ({
                    ...project,
                    progress: typeof project.progress === 'string' ? parseFloat(project.progress) : project.progress,
                }));
            }

            return response.data;
        } catch (error) {
            console.error('Error listing projects:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    async saveRequirements(
        projectId: string, 
        requirements: RequirementsModel
    ): Promise<ProjectResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ProjectResponse>(
                `/projects/${projectId}/requirements`,
                requirements,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to save requirements');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getStructure(projectId: string): Promise<StructureResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<StructureResponse>(
                `/projects/${projectId}/structure`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get structure');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async submitStructureFeedback(
        projectId: string,
        feedback: StructureFeedbackModel
    ): Promise<ProjectResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ProjectResponse>(
                `/projects/${projectId}/structure/feedback`,
                feedback,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to submit structure feedback');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async approveStructure(projectId: string): Promise<ProjectResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ProjectResponse>(
                `/projects/${projectId}/structure/approve`,
                {},
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to approve structure');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getContent(projectId: string): Promise<ContentResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ContentResponse>(
                `/projects/${projectId}/content`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get content');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async submitContentFeedback(
        projectId: string,
        feedback: ContentFeedbackModel
    ): Promise<ProjectResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ProjectResponse>(
                `/projects/${projectId}/content/feedback`,
                feedback,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to submit content feedback');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async approveContent(projectId: string): Promise<ProjectResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ProjectResponse>(
                `/projects/${projectId}/content/approve`,
                {},
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to approve content');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getImages(projectId: string): Promise<ImageResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<ImageResponse>(
                `/projects/${projectId}/images`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get images');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async submitImageFeedback(
        projectId: string,
        feedback: ImageFeedbackModel,
        selectedImages: number[]
    ): Promise<ProjectResponse> {
        try {
            const headers = await this.getHeaders();
            const payload = {
                ...feedback,
                selected_images: selectedImages
            };
            
            const response = await this.axiosInstance.post<ProjectResponse>(
                `/projects/${projectId}/images/feedback`,
                payload,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to submit image feedback');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async approveImages(projectId: string): Promise<ProjectResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ProjectResponse>(
                `/projects/${projectId}/images/approve`,
                {},
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to approve images');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async getVideo(projectId: string): Promise<VideoResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get<VideoResponse>(
                `/projects/${projectId}/video`,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to get video');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async generateVideo(
        projectId: string,
        settings: VideoSettingsModel
    ): Promise<VideoGenerationResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<VideoGenerationResponse>(
                `/projects/${projectId}/video/generate`,
                settings,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to generate video');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async repurposeContent(
        projectId: string,
        platform: string
    ): Promise<RepurposeResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<RepurposeResponse>(
                `/projects/${projectId}/content/repurpose?platform=${platform}`,
                {},
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to repurpose content');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    async exportVideo(
        projectId: string,
        exportSettings: ExportSettingsModel
    ): Promise<ExportResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post<ExportResponse>(
                `/projects/${projectId}/video/export`,
                exportSettings,
                { headers }
            );

            if (response.status >= 400) {
                throw new Error('Failed to export video');
            }

            return response.data;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }
}

// Create a singleton instance
export const scenarioService = new ScenarioService();