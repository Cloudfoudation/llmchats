# Missing Knowledge Base API Integrations

## Current Status
- ✅ Knowledge Base API returns 201 (creation successful)
- ❌ File upload process not working properly
- ❌ Files not being processed/ingested

## Missing/Incomplete Integrations

### 1. BDA Bucket Configuration
**Issue**: The `BDABucket` parameter is commented out in template.yaml
```yaml
# BDABucket:
#   Type: String
#   # Default: bedrock-bda-us-east-1-llmchats
```

**Fix**: Uncomment and provide default value:
```yaml
BDABucket:
  Type: String
  Default: bedrock-bda-us-east-1-llmchats
  Description: S3 bucket for Bedrock Data Automation processing
```

### 2. BDA Service Region Mismatch
**Issue**: BDA is only available in us-east-1, but the stack might be deployed in other regions

**Current Code**: The backend tries to use BDA in us-east-1 but has region handling issues

**Fix**: Ensure proper cross-region S3 operations and BDA client configuration

### 3. Missing S3 Object Tagging for Bedrock
**Issue**: Bedrock KB role requires objects to have specific tags, but uploads don't set them

**Current Policy**:
```yaml
Condition:
  StringEquals:
    's3:ExistingObjectTag/BedrockKB': 'true'
```

**Fix**: Add object tagging during upload process

### 4. Data Source Creation Timing
**Issue**: Data source is created immediately after KB creation, but vector index might not be ready

**Fix**: Add proper retry logic and verification

### 5. Missing File Processing Workflow
**Issue**: Files are uploaded but not automatically processed through the ingestion pipeline

**Missing Components**:
- Automatic file type detection
- BDA processing queue management
- Ingestion job status tracking
- Error handling and retry logic

## Recommended Fixes

### 1. Update Template Parameters
```yaml
# Add to Parameters section
BDABucket:
  Type: String
  Default: !Sub "bedrock-bda-${AWS::Region}-${AWS::StackName}"
  Description: S3 bucket for Bedrock Data Automation processing
```

### 2. Create BDA Bucket Resource
```yaml
BDABucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Ref BDABucket
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: aws:kms
            KMSMasterKeyID: !Ref KMSKey
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
```

### 3. Fix S3 Object Tagging
Update the upload process to add required tags:
```python
# In upload_files function
s3.put_object_tagging(
    Bucket=ATTACHMENTS_BUCKET,
    Key=s3_key,
    Tagging={
        'TagSet': [
            {'Key': 'BedrockKB', 'Value': 'true'},
            {'Key': 'KnowledgeBaseId', 'Value': kb_id}
        ]
    }
)
```

### 4. Improve Data Source Creation
Add proper error handling and retry logic:
```python
def create_data_source_with_retry(kb_id, s3_prefix, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            # Create data source
            response = bedrock_agent.create_data_source(...)
            return response
        except Exception as e:
            if attempt < max_attempts - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise e
```

### 5. Add File Processing Status Tracking
Create a comprehensive file processing workflow:
1. Upload files to S3 with proper tags
2. Queue files for BDA processing (if needed)
3. Track processing status in DynamoDB
4. Start ingestion job when processing complete
5. Monitor ingestion job status
6. Update UI with progress

## Quick Fixes for Immediate Testing

### 1. Disable BDA Processing Temporarily
Set `BDA_JOB_QUEUE_URL` to empty string to skip BDA processing:
```python
# In knowledge-base-api/app.py
BDA_JOB_QUEUE_URL = ""  # Disable BDA processing
```

### 2. Fix S3 Permissions
Update Bedrock KB role to allow access without tags (temporarily):
```yaml
- Effect: Allow
  Action:
    - s3:GetObject
    - s3:ListBucket
  Resource:
    - !GetAtt AttachmentsBucket.Arn
    - !Sub ${AttachmentsBucket.Arn}/*
  # Remove the Condition temporarily
```

### 3. Add Debug Logging
Enable detailed logging in the knowledge base API to track the upload process:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Testing Steps

1. **Test KB Creation**: Verify knowledge base is created successfully
2. **Test Data Source**: Check if data source is created automatically
3. **Test File Upload**: Upload a simple text file
4. **Test Ingestion**: Start sync and monitor status
5. **Test Retrieval**: Query the knowledge base after ingestion

## Deployment Command

```bash
# Update the template with fixes
sam build
sam deploy --parameter-overrides \
  BucketName=your-spa-bucket \
  GoogleClientId=your-google-client-id \
  GoogleClientSecret=your-google-client-secret \
  AdminEmail=admin@yourdomain.com \
  BDABucket=bedrock-bda-us-east-1-your-stack
```

## Monitoring and Debugging

1. **CloudWatch Logs**: Check Lambda function logs for errors
2. **DynamoDB**: Verify KB metadata is stored correctly
3. **S3**: Check if files are uploaded with correct structure
4. **Bedrock Console**: Verify KB and data sources are created
5. **OpenSearch**: Check if vector index is created properly

This should resolve the file upload and processing issues in the knowledge base API.