// Agent management types
import { ModelParams } from '@/types/models'
// Agent type
export type AgentType = 'custom' | 'bedrock';

// Visibility type
export type ResourceVisibility = 'private' | 'public';

// Agent interface
export interface Agent {
    id: string;
    version: number;
    createdAt: number;
    lastEditedAt: number;
    name: string;
    description: string;
    systemPrompt: string;
    modelParams: ModelParams;
    knowledgeBaseId?: string;
    telegramToken?: string;
    type: AgentType;
    visibility?: ResourceVisibility;

    // Bedrock agent specific fields
    bedrockAgentId?: string;
    bedrockAgentAliasId?: string;

    // Sharing related properties
    isOwner?: boolean;
    sharedBy?: string;
    sharedVia?: string;
    permissions?: string;
    accessType?: 'owner' | 'shared' | 'public';
}

// Agent creation/update request
export interface AgentRequest {
    id?: string;
    name: string;
    description?: string;
    systemPrompt: string;
    modelParams: ModelParams;
    knowledgeBaseId?: string;
    telegramToken?: string;
    type?: AgentType;
    version?: number;
    createdAt?: number;
    visibility?: ResourceVisibility;

    // Bedrock specific fields
    bedrockAgentId?: string;
    bedrockAgentAliasId?: string;
}

// Standard API responses
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
}

// Specific response types
export type CreateAgentResponse = ApiResponse<Agent>;
export type UpdateAgentResponse = ApiResponse<Agent>;
export type GetAgentResponse = ApiResponse<Agent>;
export type DeleteAgentResponse = ApiResponse<{ id: string }>;
export type ListAgentsResponse = ApiResponse<Agent[]>;