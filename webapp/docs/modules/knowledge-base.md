# Knowledge Base Module

## Purpose
Manage document collections for Retrieval Augmented Generation (RAG) using Amazon Bedrock Knowledge Bases with OpenSearch vector storage.

## API Integration

### Knowledge Base API
- **Base URL**: `https://xll4e886d5.execute-api.us-east-1.amazonaws.com/dev/`
- **Authentication**: Bearer token (Cognito ID token)

### API Endpoints
```typescript
GET    /knowledge-bases                           // List knowledge bases
GET    /knowledge-bases/{kbId}                    // Get knowledge base details
POST   /knowledge-bases                          // Create knowledge base
DELETE /knowledge-bases/{kbId}                   // Delete knowledge base
POST   /knowledge-bases/{kbId}/data-sources      // Create data source
POST   /knowledge-bases/{kbId}/files             // Get upload URLs
GET    /knowledge-bases/{kbId}/files             // List files
DELETE /knowledge-bases/{kbId}/files             // Delete file
POST   /knowledge-bases/{kbId}/sync              // Start sync/ingestion
GET    /knowledge-bases/{kbId}/sync              // Get sync status
GET    /sync-sessions/{sessionId}                // Get sync session status
POST   /knowledge-bases/{kbId}/retrieve          // Retrieve documents
```

### AWS Services
- **Bedrock Knowledge Base**: Vector storage and retrieval
- **OpenSearch Serverless**: `txsxh0m4zuptpq7ay7tk`
- **S3 Bucket**: Document storage
- **Document Processing**: BDA (Bedrock Data Automation)

### DynamoDB Tables
- **Knowledge Bases**: `gsis-poc-shared-knowledge-bases`

## Key Components

### 1. Knowledge Base Manager (`src/components/knowledge/KnowledgeBaseManager.tsx`)
```typescript
// Main management interface
- List all knowledge bases
- Create new knowledge bases
- Upload documents
- Manage files
- Start sync operations
- Monitor sync status
```

### 2. Bedrock Knowledge Base Modal (`src/components/knowledge/BedrockKnowledgeBaseModal.tsx`)
```typescript
// Knowledge base creation
- Name and description input
- Embedding model selection
- Configuration options
- Validation and creation
```

### 3. Sync Status Display (`src/components/knowledge/SyncStatusDisplay.tsx`)
```typescript
// Real-time sync monitoring
- Ingestion job status
- BDA processing status
- Progress indicators
- Error reporting
```

### 4. Share Knowledge Base Modal (`src/components/knowledge/ShareKnowledgeBaseModal.tsx`)
```typescript
// Sharing functionality
- Group selection
- Permission settings
- Share management
```

## Implementation

### Knowledge Base Service (`src/services/knowledgeBase.ts`)
```typescript
class KnowledgeBaseService {
  private baseUrl = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_API_URL;

  // List all knowledge bases
  async listKnowledgeBases(): Promise<ListKnowledgeBasesResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get('/knowledge-bases', { headers });
    return response.data;
  }

  // Create new knowledge base
  async createKnowledgeBase(kbData: CreateKnowledgeBaseRequest): Promise<CreateKnowledgeBaseResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/knowledge-bases', kbData, { headers });
    return response.data;
  }

  // Upload files with presigned URLs
  async uploadFiles(knowledgeBaseId: string, data: FileUploadRequest): Promise<FileUploadResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post(
      `/knowledge-bases/${knowledgeBaseId}/files`,
      data,
      { headers }
    );
    return response.data;
  }

  // Start sync (ingestion + BDA processing)
  async startSync(knowledgeBaseId: string, data: StartSyncRequest = {}): Promise<StartSyncResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post(
      `/knowledge-bases/${knowledgeBaseId}/sync`,
      data,
      { headers }
    );
    return response.data;
  }

  // Get sync session status
  async getSyncSessionStatus(sessionId: string): Promise<GetSyncSessionStatusResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get(`/sync-sessions/${sessionId}`, { headers });
    return response.data;
  }

  // Retrieve documents for RAG
  async retrieveFromKnowledgeBase(
    knowledgeBaseId: string,
    query: string,
    options: { numberOfResults?: number; searchType?: string } = {}
  ): Promise<RetrieveResponse> {
    const headers = await this.getHeaders();
    const payload = {
      text: query,
      numberOfResults: options.numberOfResults || 5,
      searchType: options.searchType || 'HYBRID'
    };

    const response = await this.axiosInstance.post(
      `/knowledge-bases/${knowledgeBaseId}/retrieve`,
      payload,
      { headers }
    );
    return response.data;
  }
}
```

### Knowledge Base Hook (`src/hooks/useKnowledgeBase.ts`)
```typescript
export const useKnowledgeBase = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncSessionStatus>>({});

  // Load all knowledge bases
  const loadKnowledgeBases = async () => {
    setLoading(true);
    try {
      const response = await knowledgeBaseService.listKnowledgeBases();
      if (response.success) {
        setKnowledgeBases(response.data.knowledgeBases);
      }
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create knowledge base
  const createKnowledgeBase = async (kbData: CreateKnowledgeBaseRequest) => {
    try {
      const response = await knowledgeBaseService.createKnowledgeBase(kbData);
      if (response.success) {
        await loadKnowledgeBases();
        return response.data.knowledgeBase;
      }
      throw new Error(response.error?.message || 'Failed to create knowledge base');
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      throw error;
    }
  };

  // Upload files
  const uploadFiles = async (knowledgeBaseId: string, files: File[]) => {
    try {
      // Get presigned URLs
      const uploadRequest = {
        files: files.map(file => ({
          fileName: file.name,
          contentType: file.type,
          size: file.size
        }))
      };

      const response = await knowledgeBaseService.uploadFiles(knowledgeBaseId, uploadRequest);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to get upload URLs');
      }

      // Upload files to S3
      const uploadPromises = response.data.uploadUrls.map(async (urlData, index) => {
        const file = files[index];
        return knowledgeBaseService.uploadFileWithSignedUrl(
          urlData.uploadUrl,
          file,
          file.type
        );
      });

      await Promise.all(uploadPromises);
      return response.data.uploadUrls;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  };

  // Start sync and monitor progress
  const startSyncWithMonitoring = async (knowledgeBaseId: string) => {
    try {
      const response = await knowledgeBaseService.startSync(knowledgeBaseId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to start sync');
      }

      const sessionId = response.data.sessionId;
      
      // Monitor sync progress
      const monitorSync = async () => {
        try {
          const statusResponse = await knowledgeBaseService.getSyncSessionStatus(sessionId);
          if (statusResponse.success) {
            setSyncStatus(prev => ({
              ...prev,
              [knowledgeBaseId]: statusResponse.data.status
            }));

            // Continue monitoring if not complete
            if (statusResponse.data.status.overallStatus === 'IN_PROGRESS') {
              setTimeout(monitorSync, 5000); // Check every 5 seconds
            }
          }
        } catch (error) {
          console.error('Error monitoring sync:', error);
        }
      };

      // Start monitoring
      monitorSync();
      return sessionId;
    } catch (error) {
      console.error('Error starting sync:', error);
      throw error;
    }
  };

  return {
    knowledgeBases,
    loading,
    syncStatus,
    loadKnowledgeBases,
    createKnowledgeBase,
    uploadFiles,
    startSyncWithMonitoring
  };
};
```

## Data Structures

### Knowledge Base
```typescript
interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  status: 'CREATING' | 'ACTIVE' | 'DELETING' | 'FAILED';
  embeddingModel: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isOwner: boolean;
  isShared: boolean;
  sharedWith: string[];
  fileCount: number;
  lastSyncAt?: string;
}

interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
  embeddingModel?: string;
}
```

### Sync Status
```typescript
interface SyncSessionStatus {
  sessionId: string;
  knowledgeBaseId: string;
  overallStatus: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  bdaStatus: {
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    processedFiles: number;
    totalFiles: number;
    errors: string[];
  };
  ingestionStatus: {
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    jobId?: string;
    processedDocuments: number;
    totalDocuments: number;
    errors: string[];
  };
  startedAt: string;
  completedAt?: string;
}
```

## User Flow

### 1. Create Knowledge Base
1. Click "Create Knowledge Base"
2. Enter name and description
3. Select embedding model
4. Click "Create"
5. Knowledge base appears in list

### 2. Upload Documents
1. Select knowledge base
2. Click "Upload Files"
3. Choose documents (PDF, DOCX, TXT, etc.)
4. Files upload to S3 with presigned URLs
5. Files appear in knowledge base file list

### 3. Sync Documents
1. Click "Start Sync" on knowledge base
2. BDA processing begins (document parsing)
3. Ingestion job starts (vector embedding)
4. Monitor progress in real-time
5. Documents become searchable

### 4. Use in Chat
1. Create or edit agent
2. Select knowledge bases to include
3. Agent uses RAG for context-aware responses
4. Retrieved documents enhance answers

## Features

### 1. Document Processing
- **BDA Integration**: Advanced document parsing
- **Multiple Formats**: PDF, DOCX, TXT, HTML, MD
- **Metadata Extraction**: Title, author, creation date
- **Content Chunking**: Optimal chunk sizes for embedding

### 2. Vector Search
- **Hybrid Search**: Combines semantic and keyword search
- **Embedding Models**: Multiple Bedrock embedding options
- **Relevance Scoring**: Ranked results by similarity
- **Configurable Results**: Adjustable result count

### 3. Real-time Monitoring
- **Sync Progress**: Live status updates
- **Error Reporting**: Detailed error messages
- **File Tracking**: Individual file processing status
- **Performance Metrics**: Processing times and statistics

### 4. Sharing System
- **Group Sharing**: Share with user groups
- **Permission Control**: Read-only access
- **Discovery**: Browse shared knowledge bases
- **Access Management**: Grant/revoke access

## Configuration

### Embedding Models
```typescript
export const EMBEDDING_MODELS = [
  {
    id: 'amazon.titan-embed-text-v1',
    name: 'Titan Text Embeddings V1',
    dimensions: 1536,
    maxTokens: 8192
  },
  {
    id: 'amazon.titan-embed-text-v2:0',
    name: 'Titan Text Embeddings V2',
    dimensions: 1024,
    maxTokens: 8192
  },
  {
    id: 'cohere.embed-english-v3',
    name: 'Cohere Embed English V3',
    dimensions: 1024,
    maxTokens: 512
  }
];
```

### File Upload Limits
```typescript
export const UPLOAD_LIMITS = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 100,
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html',
    'text/markdown'
  ]
};
```

## Error Handling

### Common Errors
- `KnowledgeBaseNotFound`: Invalid knowledge base ID
- `FileUploadFailed`: S3 upload error
- `SyncFailed`: Ingestion or BDA processing error
- `InvalidFileType`: Unsupported file format
- `FileSizeExceeded`: File too large

### Validation
```typescript
const validateFile = (file: File): string[] => {
  const errors: string[] = [];
  
  if (file.size > UPLOAD_LIMITS.maxFileSize) {
    errors.push(`File ${file.name} exceeds size limit of 50MB`);
  }
  
  if (!UPLOAD_LIMITS.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported`);
  }
  
  return errors;
};
```

## Usage Examples

### Create Knowledge Base
```typescript
const { createKnowledgeBase } = useKnowledgeBase();

const handleCreate = async () => {
  try {
    const kb = await createKnowledgeBase({
      name: 'Company Policies',
      description: 'Internal company policy documents',
      embeddingModel: 'amazon.titan-embed-text-v2:0'
    });
    console.log('Knowledge base created:', kb);
  } catch (error) {
    console.error('Failed to create knowledge base:', error);
  }
};
```

### Upload and Sync
```typescript
const { uploadFiles, startSyncWithMonitoring } = useKnowledgeBase();

const handleUploadAndSync = async (kbId: string, files: File[]) => {
  try {
    // Upload files
    await uploadFiles(kbId, files);
    
    // Start sync process
    const sessionId = await startSyncWithMonitoring(kbId);
    console.log('Sync started:', sessionId);
  } catch (error) {
    console.error('Upload/sync failed:', error);
  }
};
```

### Retrieve Documents
```typescript
const retrieveContext = async (kbId: string, query: string) => {
  try {
    const response = await knowledgeBaseService.retrieveFromKnowledgeBase(
      kbId,
      query,
      { numberOfResults: 5, searchType: 'HYBRID' }
    );
    
    if (response.success) {
      return response.data.results;
    }
  } catch (error) {
    console.error('Retrieval failed:', error);
  }
  return [];
};
```