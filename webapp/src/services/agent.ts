// src/services/agent.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
    Agent,
    AgentRequest,
    CreateAgentResponse,
    UpdateAgentResponse,
    GetAgentResponse,
    DeleteAgentResponse,
    ListAgentsResponse
} from '@/types/agent';

class AgentManagementService {
    private baseUrl: string;
    private user: AuthUser | null;
    private axiosInstance: AxiosInstance;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_AGENT_MANAGEMENT_API_URL || '';
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
     * Process API response to ensure it's properly formatted
     */
    private processResponse<T>(responseData: any): T {
        // If responseData is already an object with success field, return it
        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
            return responseData as T;
        }

        // If responseData is a string (likely JSON), try to parse it
        if (typeof responseData === 'string') {
            try {
                return JSON.parse(responseData) as T;
            } catch (e) {
                console.error('Error parsing API response:', e);
            }
        }

        // Otherwise, wrap it in a standard response format
        return {
            success: true,
            data: responseData
        } as T;
    }

    /**
     * List all agents the user has access to
     */
    async listAgents(): Promise<ListAgentsResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get(
                '/agents',
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error fetching agents: ${response.status}`, response.data);
                const processedResponse = this.processResponse<ListAgentsResponse>(response.data);
                if (!processedResponse.success) {
                    return processedResponse;
                }
                throw new Error(`Failed to list agents: ${response.status}`);
            }

            return this.processResponse<ListAgentsResponse>(response.data);
        } catch (error) {
            console.error('Error listing agents:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Get details of a specific agent
     */
    async getAgent(agentId: string): Promise<GetAgentResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.get(
                `/agents/${encodeURIComponent(agentId)}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error fetching agent: ${response.status}`, response.data);
                const processedResponse = this.processResponse<GetAgentResponse>(response.data);
                if (!processedResponse.success) {
                    return processedResponse;
                }
                throw new Error(`Failed to get agent: ${response.status}`);
            }

            return this.processResponse<GetAgentResponse>(response.data);
        } catch (error) {
            console.error(`Error getting agent details for ${agentId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Create a new agent
     */
    async createAgent(agentData: AgentRequest): Promise<CreateAgentResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.post(
                '/agents',
                agentData,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error creating agent: ${response.status}`, response.data);
                const processedResponse = this.processResponse<CreateAgentResponse>(response.data);
                if (!processedResponse.success) {
                    return processedResponse;
                }
                throw new Error(`Failed to create agent: ${response.status}`);
            }

            return this.processResponse<CreateAgentResponse>(response.data);
        } catch (error) {
            console.error('Error creating agent:', error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Update an existing agent
     */
    async updateAgent(agentId: string, agentData: AgentRequest): Promise<UpdateAgentResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.put(
                `/agents/${encodeURIComponent(agentId)}`,
                agentData,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error updating agent: ${response.status}`, response.data);
                const processedResponse = this.processResponse<UpdateAgentResponse>(response.data);
                if (!processedResponse.success) {
                    return processedResponse;
                }
                throw new Error(`Failed to update agent: ${response.status}`);
            }

            return this.processResponse<UpdateAgentResponse>(response.data);
        } catch (error) {
            console.error(`Error updating agent ${agentId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }

    /**
     * Delete an agent
     */
    async deleteAgent(agentId: string): Promise<DeleteAgentResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await this.axiosInstance.delete(
                `/agents/${encodeURIComponent(agentId)}`,
                { headers }
            );

            if (response.status >= 400) {
                console.error(`Error deleting agent: ${response.status}`, response.data);
                const processedResponse = this.processResponse<DeleteAgentResponse>(response.data);
                if (!processedResponse.success) {
                    return processedResponse;
                }
                throw new Error(`Failed to delete agent: ${response.status}`);
            }

            return this.processResponse<DeleteAgentResponse>(response.data);
        } catch (error) {
            console.error(`Error deleting agent ${agentId}:`, error);
            this.handleApiError(error);
            throw error;
        }
    }
}

// Create singleton instance
export const agentManagementService = new AgentManagementService();