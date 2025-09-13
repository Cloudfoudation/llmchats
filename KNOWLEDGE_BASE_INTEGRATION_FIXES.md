# Knowledge Base Integration Fixes

## Summary
The knowledge base API is returning 201 (success) but files are not being uploaded properly. Based on the original webapp documentation and current gsis-poc-web implementation, here are the key fixes needed:

## ✅ Completed Fixes

### 1. Template Parameter Fix
- **Issue**: BDABucket parameter was commented out
- **Fix**: Uncommented and added proper default value
- **File**: `infrastructure/template.yaml`

### 2. S3 Object Tagging
- **Issue**: Uploaded files lacked required tags for Bedrock KB access
- **Fix**: Added `BedrockKB=true&Purpose=knowledge-base` tags to presigned URLs and upload headers
- **Files**: 
  - `infrastructure/functions/knowledge-base-api/app.py`
  - `gsis-poc-web/services/knowledgeBaseService.ts`

### 3. S3 Permission Condition (Temporary)
- **Issue**: Bedrock KB role required specific S3 object tags
- **Fix**: Temporarily removed tag condition to allow immediate testing
- **File**: `infrastructure/template.yaml`

### 4. Frontend Method Alignment
- **Issue**: CreateKnowledgeBaseModal called non-existent `uploadFile` method
- **Fix**: Changed to use existing `uploadFiles` method with array of files
- **File**: `gsis-poc-web/components/CreateKnowledgeBaseModal.vue`

### 5. Type Definitions Cleanup
- **Issue**: Duplicate interfaces causing conflicts
- **Fix**: Removed duplicate KnowledgeBase and IKnowledgeBaseService interfaces
- **File**: `gsis-poc-web/types/index.ts`

## 🔄 Current Integration Flow

Based on the original webapp documentation, the proper flow should be:

1. **Create Knowledge Base**
   ```typescript
   const kb = await createKnowledgeBase({
     name: 'Test KB',
     description: 'Test description'
   })
   ```

2. **Upload Files** (if any selected)
   ```typescript
   await uploadFiles(kb.knowledgeBaseId, selectedFiles)
   ```

3. **Start Sync/Ingestion**
   ```typescript
   const sessionId = await startSync(kb.knowledgeBaseId)
   ```

4. **Monitor Progress**
   ```typescript
   const status = await getSyncSessionStatus(sessionId)
   ```

## 🚀 Deployment Steps

1. **Deploy Infrastructure Updates**:
   ```bash
   cd infrastructure
   sam build
   sam deploy --parameter-overrides \
     BucketName=gsis-poc-spa-1757488324 \
     GoogleClientId=your-google-client-id \
     GoogleClientSecret=your-google-client-secret \
     AdminEmail=admin@gsis.gov \
     BDABucket=bedrock-bda-us-east-1-gsis-poc
   ```

2. **Test via gsis-poc-web**:
   - Navigate to knowledge base section
   - Create new knowledge base
   - Upload test files
   - Monitor sync status

## 🧪 Testing Sequence

### Via gsis-poc-web Interface:

1. **Login** to the application
2. **Navigate** to Knowledge Base section
3. **Click** "Create Knowledge Base"
4. **Fill** name and description
5. **Upload** test files (PDF, TXT, etc.)
6. **Submit** form
7. **Monitor** sync progress
8. **Verify** files appear in knowledge base

### Expected Behavior:
- ✅ Knowledge base created (201 response)
- ✅ Files uploaded to S3 with proper tags
- ✅ Data source auto-created
- ✅ Sync/ingestion starts automatically
- ✅ Progress monitoring works
- ✅ Files become searchable

## 🔍 Debugging

### Check CloudWatch Logs:
```bash
# Knowledge Base API logs
aws logs tail /aws/lambda/gsis-poc-KnowledgeBaseManagementFunction-xxx --follow

# BDA Processor logs (if enabled)
aws logs tail /aws/lambda/gsis-poc-BDAProcessorFunction-xxx --follow
```

### Verify S3 Structure:
```bash
# Check uploaded files
aws s3 ls s3://gsis-poc-attachments/users/ --recursive

# Check file tags
aws s3api get-object-tagging --bucket gsis-poc-attachments --key users/xxx/knowledge-base/xxx/file.pdf
```

### Check DynamoDB:
```bash
# Verify KB metadata
aws dynamodb scan --table-name gsis-poc-knowledge-bases

# Check sync sessions
aws dynamodb scan --table-name gsis-poc-sync-sessions
```

## 🎯 Key Integration Points

### 1. Authentication Flow
- Uses Cognito JWT tokens
- RBAC authorizer validates permissions
- User identity extracted for S3 paths

### 2. File Upload Process
- Get presigned URLs from API
- Upload directly to S3 with tags
- Trigger sync/ingestion automatically

### 3. BDA Processing (Optional)
- Processes images and scanned PDFs
- Extracts text and metadata
- Stores processed results in S3

### 4. Vector Ingestion
- Bedrock processes documents
- Creates embeddings using Titan model
- Stores in OpenSearch Serverless

### 5. Real-time Monitoring
- Sync sessions track progress
- WebSocket or polling for updates
- Error reporting and retry logic

## 🔧 Additional Improvements Needed

### 1. Error Handling
- Better error messages in UI
- Retry logic for failed uploads
- Graceful degradation

### 2. Progress Indicators
- Real-time upload progress
- Sync status visualization
- File processing status

### 3. File Management
- List uploaded files
- Delete individual files
- Download processed results

### 4. Performance Optimization
- Parallel file uploads
- Chunked large file handling
- Efficient sync monitoring

This integration should now work properly through the gsis-poc-web interface following the original webapp's proven patterns.