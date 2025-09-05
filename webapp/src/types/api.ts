// src/types/api.ts
export const VALID_STATUSES = ['pending', 'processing', 'completed', 'failed', 'idle'] as const;
export type SearchStatus = typeof VALID_STATUSES[number];

export interface UploadedFile {
    key: string;
    location: string;
    title: string;
    url: string;
}

export interface ProcessedResult {
    filename: string;
    title: string;
    url: string;
    s3_location: string;
}

export interface KnowledgeBaseConfig { 
    name: string;
    description?: string;
    access?: 'private' | 'public';
  }

export interface KnowledgeBaseResult {
    name: string;
    id: string;
    folder_id: string;
    vector_index_name: string;
    data_source_id: string;
    status: string;
}

export interface ResultsData {
    knowledge_base_config: KnowledgeBaseResult;
    results: ProcessedResult[];
    uploaded_files: UploadedFile[];
}

export interface UserInfo {
    email: string;
    username: string;
    groups: string[];
    identityId: string | null;
}

export interface ErrorResponse {
    code: string;
    message: string;
}

export interface SearchHistoryItem {
    userId: string;
    requestId: string;
    query: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    timestamp: number;
    statusDetails?: string;
    updatedAt: number;
    userInfo: UserInfo;
    results?: ResultsData;
    error?: ErrorResponse;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: ErrorResponse;
}

export interface SearchResponse {
    items: SearchHistoryItem[];
    count: number;
    scannedCount: number;
    userInfo: UserInfo;
    nextToken?: string;
}

export interface SearchRequest {
    query: string;
}

export interface SearchState {
    requestId?: string;
    status: SearchStatus;
    results?: ResultsData;
    error?: {
        code: string;
        message: string;
    };
    knowledgeBaseName?: string;
    vectorDbIndex?: string;
}

export interface VectorDbConfig {
  dimension?: number;
  similarity?: string;
}

export interface SearchSubmitResponse {
  userId: string;
  requestId: string; 
  status: SearchStatus;
  timestamp: number;
  vectorDbConfig?: VectorDbConfig;
  knowledgeBaseConfig?: KnowledgeBaseConfig;
}

export interface PaginatedResponse<T> {
    items: T[];
    count: number;
    scannedCount: number;
    nextToken?: string;
    userInfo?: UserInfo;
}

export interface ApiKey {
    userId: string;
    id: string;
    apiKey: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    expiresAt: number;
    createdBy: string;
    status: 'active' | 'inactive' | 'expired';
}

export interface CreateApiKeyRequest {
    name: string;
    expiryDays?: number;
}

export interface ApiKeyResponse {
    items: ApiKey[];
}