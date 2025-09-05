// src/types/shared-resources.ts
import { Agent } from './agent';
import { Group, GroupRole } from './groups';

export interface SharedResource {
    id: string;
    groupId: string;
    sharedBy: string;
    type: 'knowledge-base' | 'agent';
    name: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    sharedAt: string;
    permissions: SharedResourcePermissions;
    group: Pick<Group, 'groupId' | 'groupName'>;
}

export interface SharedResourcePermissions {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canExecute?: boolean; // For agents
    canSync?: boolean; // For knowledge bases
}

export interface SharedKnowledgeBaseExtended extends SharedResource {
    type: 'knowledge-base';
    knowledgeBaseId: string;
    syncStatus?: 'idle' | 'syncing' | 'error';
    lastSyncAt?: string;
}

export interface SharedAgentExtended extends SharedResource {
    type: 'agent';
    agent: Agent;
}

export interface CreateSharedResourceRequest {
    resourceId: string;
    resourceType: 'knowledge-base' | 'agent';
    groupId: string;
    permissions?: Partial<SharedResourcePermissions>;
}

export interface UpdateSharedResourceRequest {
    permissions?: Partial<SharedResourcePermissions>;
}

export interface ShareToGroupRequest {
    groupId: string;
    permissions?: Partial<SharedResourcePermissions>;
}

export interface SharedResourcesFilter {
    groupId?: string;
    type?: 'knowledge-base' | 'agent';
    createdBy?: string;
}

export interface SharedResourcesState {
    resources: SharedResource[];
    knowledgeBases: SharedKnowledgeBaseExtended[];
    agents: SharedAgentExtended[];
    isLoading: boolean;
    isSharing: boolean;
    error: SharedResourceError | null;
}

export class SharedResourceError extends Error {
    code: string;
    statusCode?: number;

    constructor(message: string, code: string, statusCode?: number) {
        super(message);
        this.name = 'SharedResourceError';
        this.code = code;
        this.statusCode = statusCode;
    }
}