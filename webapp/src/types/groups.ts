// src/types/groups.ts
export interface Group {
    groupId: string;
    groupName: string;
    description: string;
    createdBy: string;
    createdAt: string;
    memberCount: number;
    userRole: GroupRole;
    joinedAt?: string;
}

export interface GroupMember {
    userId: string;
    email?: string;
    username?: string;
    role: GroupRole;
    joinedAt: string;
    permissions: GroupPermissions;
}

export interface GroupPermissions {
    canManageMembers: boolean;
    canManageKB: boolean;
    canManageAgents: boolean;
    canDelete: boolean;
}

export type GroupRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface CreateGroupRequest {
    groupName: string;
    description?: string;
}

export interface UpdateGroupRequest {
    groupName?: string;
    description?: string;
}

export interface AddMemberRequest {
    email: string;
    role?: GroupRole;
}

export interface UpdateMemberRoleRequest {
    role: GroupRole;
}

export interface GroupAccessRequest {
    action: 'generate_upload_urls' | 'generate_download_urls' | 'list_objects' | 'delete_objects' | 'copy_to_group';
    userId: string;
    groupId: string;
    files?: Array<{ name: string; type: string }>;
    keys?: string[];
    kbId?: string;
    resourceType?: 'knowledge-base' | 'agents';
    sourceKeys?: string[];
    targetPrefix?: string;
}

export interface GroupS3Object {
    key: string;
    size: number;
    lastModified: string;
    etag: string;
}

export interface GroupUploadUrls {
    [fileName: string]: {
        url: string;
        key: string;
    };
}

export interface GroupDownloadUrls {
    [key: string]: string;
}

export interface SharedKnowledgeBase {
    groupId: string;
    knowledgeBaseId: string;
    name: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    permissions: {
        canEdit: boolean;
        canDelete: boolean;
        canShare: boolean;
    };
    status: 'CREATING' | 'ACTIVE' | 'DELETING' | 'UPDATING' | 'FAILED';
}

export interface SharedAgent {
    groupId: string;
    agentId: string;
    name: string;
    description?: string;
    type: 'custom' | 'bedrock';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    systemPrompt?: string;
    modelParams?: any;
    bedrockAgentId?: string;
    bedrockAgentAliasId?: string;
    permissions: {
        canEdit: boolean;
        canDelete: boolean;
        canExecute: boolean;
    };
}

export interface GroupState {
    groups: Group[];
    currentGroup: Group | null;
    members: GroupMember[];
    sharedKnowledgeBases: SharedKnowledgeBase[];
    sharedAgents: SharedAgent[];
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    error: GroupError | null;
}

export class GroupError extends Error {
    code: string;
    statusCode?: number;

    constructor(message: string, code: string, statusCode?: number) {
        super(message);
        this.name = 'GroupError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

export interface GroupsListResponse {
    groups: Group[];
}

export interface MembersListResponse {
    members: GroupMember[];
}