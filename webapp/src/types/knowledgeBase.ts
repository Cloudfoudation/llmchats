// Knowledge base types
import { ResourceVisibility } from './agent';

export interface KnowledgeBase {
    knowledgeBaseId: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    folderId?: string;
    tags?: Record<string, string>;
    accessType: 'owner' | 'shared' | 'public';
    visibility?: ResourceVisibility;
    isDuplicate: boolean;
    permissions: KnowledgeBasePermissions;
    groupId?: string;
    sharedBy?: string;
    sharedAt?: string;
}

export interface KnowledgeBasePermissions {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSync: boolean;
    canShare: boolean;
}

export interface CreateKnowledgeBaseRequest {
    name: string;
    description?: string;
    tags?: Record<string, string>;
    visibility?: ResourceVisibility;
}

export interface UpdateKnowledgeBaseRequest {
    name?: string;
    description?: string;
    tags?: Record<string, string>;
    visibility?: ResourceVisibility;
}

export interface CreateKnowledgeBaseResponse {
    success: boolean;
    data?: KnowledgeBase;
    error?: {
        code: string;
        message: string;
    };
}

export interface UpdateKnowledgeBaseResponse {
    success: boolean;
    data?: KnowledgeBase;
    error?: {
        code: string;
        message: string;
    };
}

export interface ListKnowledgeBasesResponse {
    success: boolean;
    data?: {
        knowledgeBases: KnowledgeBase[];
    };
    error?: {
        code: string;
        message: string;
    };
}

export interface GetKnowledgeBaseResponse {
    success: boolean;
    data?: KnowledgeBase;
    error?: {
        code: string;
        message: string;
    };
}

export interface DeleteKnowledgeBaseResponse {
    success: boolean;
    message?: string;
    error?: {
        code: string;
        message: string;
    };
}

export interface DataSource {
    dataSourceId: string;
    name: string;
    status: string;
    folderId: string;
}

export interface CreateDataSourceRequest {
    name?: string;
    groupId?: string;
}

export interface CreateDataSourceResponse {
    success: boolean;
    data?: DataSource;
    error?: {
        code: string;
        message: string;
    };
}

export interface SyncJobStatistics {
    numberOfDocumentsDeleted?: number;
    numberOfDocumentsFailed?: number;
    numberOfDocumentsScanned?: number;
    numberOfMetadataDocumentsModified?: number;
    numberOfMetadataDocumentsScanned?: number;
    numberOfModifiedDocumentsIndexed?: number;
    numberOfNewDocumentsIndexed?: number;
    numberOfDocumentsProcessed?: number;
}

export interface SyncJob {
    dataSourceId: string;
    ingestionJobId: string;
    status: string;
    startedAt?: string;
    updatedAt?: string;
    statistics?: SyncJobStatistics;
}

export interface StartSyncRequest {
    dataSourceId?: string;
    processFiles?: boolean;
}

export interface StartSyncResponse {
    success: boolean;
    data?: {
        sessionId: string;
        status: string;
        knowledgeBaseId: string;
        dataSourceId: string;
        ingestionJobId?: string;
        startedAt?: string;
        bdaProcessing?: {
            enabled: boolean;
            queuedFiles?: number;
            status?: string;
            message?: string;
        };
    };
    error?: {
        code: string;
        message: string;
    };
}

export interface SyncSessionStatus {
    sessionId: string;
    knowledgeBaseId: string;
    status: 'PREPARING' | 'BDA_PROCESSING' | 'INGESTION_STARTED' | 'INGESTION_FAILED' | 'COMPLETED';
    totalFiles: number;
    completedFiles: number;
    failedFiles: number;
    ingestionJobId?: string;
    createdAt: string;
    updatedAt: string;
    errorMessage?: string;
}

export interface GetSyncSessionStatusResponse {
    success: boolean;
    data?: SyncSessionStatus;
    error?: {
        code: string;
        message: string;
    };
}

export interface SyncStatus {
    syncStatuses: Record<string, SyncJob>;
}

export interface GetSyncStatusResponse {
    success: boolean;
    data?: SyncStatus;
    error?: {
        code: string;
        message: string;
    };
}

export interface FileUploadRequest {
    files: {
        name: string;
        type: string;
    }[];
}

export interface FileUploadUrlInfo {
    fileName: string;
    uploadUrl: string;
    s3Key: string;
}

export interface FileUploadResponse {
    success: boolean;
    data?: {
        uploadUrls: FileUploadUrlInfo[];
        folderId: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

export interface KBFile {
    key: string;
    fileName: string;
    fileSize: number;
    fileType?: string;
    lastModified: string;
}

export interface ListFilesResponse {
    success: boolean;
    data?: {
        files: KBFile[];
        folderPath: string;
        folderId: string;
    };
    error?: {
        code: string;
        message: string;
    };
}

export interface RetrieveRequest {
    text: string;
    numberOfResults?: number;
    searchType?: string;
}

export interface RetrieveResponse {
    success: boolean;
    data?: {
        retrievalResults: Array<{
            content: {
                text: string;
            };
            location?: {
                type: string;
                s3Location?: {
                    uri: string;
                };
            };
            metadata?: {
                source?: string;
                [key: string]: any;
            };
        }>;
    };
    error?: {
        code: string;
        message: string;
    };
}