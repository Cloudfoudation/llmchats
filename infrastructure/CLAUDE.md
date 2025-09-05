# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AWS SAM (Serverless Application Model) infrastructure project that deploys a comprehensive serverless application with:
- Cognito-based authentication with Google OAuth integration
- Bedrock Knowledge Base integration with OpenSearch Serverless
- Group-based resource sharing system
- Multi-tier user roles (admin, paid, free)
- S3-based file management with CloudFront distribution

## Build and Deployment Commands

### SAM Commands
```bash
# Build the SAM application
sam build

# Deploy to AWS (guided)
sam deploy --guided

# Deploy with specific parameters
sam deploy --parameter-overrides Environment=dev BucketName=my-spa-bucket

# Delete the stack
sam delete

# Validate template
sam validate
```

### Testing
```bash
# Run local API Gateway
sam local start-api

# Test individual Lambda functions
sam local invoke FunctionName -e events/test-event.json
```

## Architecture

### Core Components

**Authentication & Authorization**:
- Cognito User Pool with Google OAuth provider
- Custom JWT authorizers (`custom_authorizer.py`, `ispaid_custom_authorizer.py`)
- Role-based access control (admin > paid > free users)
- Identity mapping between Cognito sub and Identity Pool identityId

**Data Layer**:
- DynamoDB tables for agents, conversations, knowledge bases, groups, and sharing
- S3 buckets for attachments and source files with user/group isolation  
- OpenSearch Serverless collection for vector search
- SQS queues for async BDA document processing with dead letter queues

**API Architecture**:
- **User Management API**: Admin-only Cognito user operations
- **Group Management API**: Group lifecycle and membership management (paid users+)
- **Shared Resources API**: Resource sharing across groups (paid users+)
- **Knowledge Base API**: Comprehensive KB operations including file management and retrieval (paid users+)

**Lambda Functions Architecture**:
- **Python Functions**: Use `boto3>=1.26.0`, standardized JSON responses with CORS
- **Node.js Functions**: Use AWS SDK v2, async/await patterns
- **Error Handling**: Consistent HTTP status codes and JSON error responses

### Key Functions

- `functions/authorizer/`: JWT validation and IAM policy generation
- `functions/group-management/`: Complete group lifecycle (CRUD, members, roles) - uses `sub` for group operations  
- `functions/shared-resources/`: Resource sharing between users and groups - uses `sub` for group membership, `identityId` for resource ownership
- `functions/user-management/`: Cognito user administration - works with Cognito User Pool only
- `functions/knowledge-base/`: Legacy Bedrock Knowledge Base operations - uses `identityId` for resource ownership
- `functions/knowledge-base-api/`: New comprehensive Knowledge Base API with enhanced functionality - includes file operations, sharing, and retrieval
- `functions/bda-processor/`: Async BDA processing for document/image extraction - triggered by SQS messages
- `functions/group-access-mediator/`: S3 access mediation for group resources - uses `sub` for group permissions, supports both for S3 paths
- `functions/create-vector-index/`: OpenSearch vector index management
- `functions/post-confirmation/`: Auto-assigns user groups based on email domain

## Development Patterns

### Environment Variables
Functions consistently use these patterns:
- `USER_POOL_ID`, `IDENTITY_POOL_ID` for Cognito integration
- `*_TABLE` for DynamoDB table names (e.g., `KB_TABLE`, `SHARED_KB_TABLE`, `USER_GROUPS_TABLE`)
- `ATTACHMENTS_BUCKET`, `BDA_BUCKET` for S3 bucket names
- `BEDROCK_KB_ROLE_ARN` for Knowledge Base operations
- `GROUP_ACCESS_MEDIATOR_LAMBDA`, `CREATE_VECTOR_INDEX_LAMBDA` for Lambda function ARNs
- `BDA_JOB_QUEUE_URL`, `BDA_RESULTS_QUEUE_URL` for async BDA processing queues
- `AOSS_COLLECTION_ID` for OpenSearch Serverless collection
- `REGION_NAME` for AWS region
- `ALLOWED_ORIGINS` for CORS configuration

### Security Model
- **Identity Consistency**: 
  - Agents and Conversations tables use `identityId` as primary key
  - Group-related tables (Groups, UserGroups, SharedResources) use `sub` as primary key
  - S3 paths for user resources use `identityId` (e.g., `users/{identityId}/...`)
  - Group resource sharing tracked by `sub`
- Group permissions follow role hierarchy: owner > admin > member > viewer
- S3 access uses pre-signed URLs generated through group-access-mediator
- All APIs protected by custom authorizers with group-based access control

### Resource Naming
- DynamoDB tables: `${AWS::StackName}-{resource-type}`
- S3 buckets: `${AWS::StackName}-{purpose}`
- Lambda functions: Follow SAM conventions with CodeUri pointing to `./functions/{name}/`

## Working with Functions

### Python Functions
- Entry point: `def handler(event, context)` or `def lambda_handler(event, context)`
- Dependencies in `requirements.txt` with pinned versions
- Use `boto3` for AWS operations, `pyjwt[crypto]` for JWT handling

### Adding New Functions
1. Create directory under `functions/`
2. Add `requirements.txt` for Python or `package.json` for Node.js
3. Define function in `template.yaml` with appropriate IAM policies
4. Include API Gateway events if building REST endpoints

### Common Operations
- **Group membership checks**: Use `UserGroupsTable` with `sub` as `userId` key
- **Resource ownership checks**: Use `identityId` for Agents/Conversations tables
- **Resource sharing**: Track in `SharedAgentsTable` and `SharedKnowledgeBasesTable` using `sub` as `sharedBy`
- **S3 operations**: Use `identityId` for user resource paths (`users/{identityId}/...`)
- **Group access mediation**: Pass both `userSub` and `userId` (identityId) for proper access control
- **Knowledge Base operations**: Support full CRUD, file management, data source operations, and ingestion jobs
- **Vector operations**: Require OpenSearch Serverless collection access

### Identity Mapping
- JWT tokens contain `sub` (User Pool identifier)
- `identityId` obtained from Cognito Identity Pool using JWT token
- Functions that need both should call `get_identity_id_from_token()` helper
- Group operations use `sub`, resource operations use `identityId`

## Template Parameters

Key parameters for deployment:
- `Environment`: dev/prod  
- `BucketName`: S3 bucket for SPA files
- `SourceBucketArn`: ARN of the S3 bucket for source files and documents
- `GoogleClientId`/`GoogleClientSecret`: OAuth configuration
- `AdminEmail`: Auto-assigned to admin group
- `YourDomain`: CORS and callback configuration
- `BDABucket`: Bedrock data bucket (default: bedrock-bda-us-east-1-llmchats)

## Stack Dependencies

The template creates interconnected resources with careful dependency management:
- Cognito pools must be created before Lambda triggers
- OpenSearch policies must precede collection creation
- IAM roles require proper trust relationships for cross-service access
- VPC and networking components support future ECS/container workloads

## Recent Updates

Based on recent commits (as of June 2025):
- **Enhanced Knowledge Base API**: New comprehensive API with file management, sharing, and retrieval capabilities
- **Async BDA Processing**: Optimized sync start process with background document processing via SQS queues
- **Permission Updates**: Refined IAM policies for better security and group-based access
- **Removed Share Agent**: Streamlined agent sharing through existing group mechanisms
- **Code Cleanup**: Improved error handling and response formatting
- **Group Integration**: Enhanced Knowledge Base operations to work with group membership

## Async BDA Processing Architecture

### Problem Solved
The sync start process was slow because BDA (Bedrock Data Automation) processing was synchronous:
- Files processed sequentially (one at a time)  
- Each BDA job could take up to 2.5 minutes
- Multiple files = multiple × 2.5 minutes wait time
- Risk of Lambda timeout (15 minutes)
- Poor user experience with long wait times

### Solution Architecture
**Coordinated Async Processing Flow**:
1. **Session Creation**: `start_sync` creates sync session and queues BDA jobs
2. **Parallel BDA Processing**: Multiple files processed concurrently via SQS
3. **Progress Tracking**: Each BDA completion updates session counters
4. **Automatic Coordination**: Ingestion starts when ALL BDA jobs complete
5. **Status Monitoring**: Real-time session status via dedicated API

**Components**:
- **Sync Sessions Table** (`SyncSessionsTable`): Tracks session state and BDA progress
- **BDA Job Queue** (`BDAJobQueue`): Main queue for file processing requests
- **BDA Job DLQ** (`BDAJobDLQ`): Dead letter queue for failed jobs (3 retries)
- **BDA Processor Lambda** (`BDAProcessorFunction`): Processes files and updates session state
- **Coordinated Sync API**: Manages sessions and triggers ingestion after BDA completion
- **Session Status API**: `GET /sync-sessions/{sessionId}` for real-time progress

**Session States**:
- `PREPARING`: Session created, BDA jobs queued but not yet started
- `BDA_PROCESSING`: BDA jobs actively processing files
- `INGESTION_STARTED`: All BDA complete, ingestion job started
- `INGESTION_FAILED`: Error starting ingestion
- `COMPLETED`: Full sync completed successfully

### Benefits
- **Proper Coordination**: Ingestion waits for ALL BDA processing to complete
- **Instant Response**: Users get session ID immediately (sub-second response)
- **Real-time Status**: Track BDA progress and ingestion status
- **Parallel Processing**: Multiple files processed simultaneously
- **Better Reliability**: Retry logic, dead letter queues, and atomic session updates
- **Scalability**: Auto-scales with SQS message volume
- **User Experience**: Clear status updates throughout the entire process

## API Endpoints

### Knowledge Base API (`KnowledgeBaseApi`)
All endpoints require paid user authorization:
- `GET /knowledge-bases` - List user's knowledge bases
- `POST /knowledge-bases` - Create new knowledge base
- `GET /knowledge-bases/{knowledgeBaseId}` - Get knowledge base details
- `PUT /knowledge-bases/{knowledgeBaseId}` - Update knowledge base
- `DELETE /knowledge-bases/{knowledgeBaseId}` - Delete knowledge base
- `GET /knowledge-bases/{knowledgeBaseId}/data-sources` - List data sources
- `POST /knowledge-bases/{knowledgeBaseId}/data-sources` - Create data source
- `DELETE /knowledge-bases/{knowledgeBaseId}/data-sources/{dataSourceId}` - Delete data source
- `POST /knowledge-bases/{knowledgeBaseId}/sync` - Start coordinated sync session
- `DELETE /knowledge-bases/{knowledgeBaseId}/sync/{ingestionJobId}` - Stop ingestion job
- `GET /knowledge-bases/{knowledgeBaseId}/sync` - Get sync status
- `GET /sync-sessions/{sessionId}` - Get detailed sync session status
- `GET /knowledge-bases/{knowledgeBaseId}/files` - List files
- `POST /knowledge-bases/{knowledgeBaseId}/files` - Upload files
- `GET /knowledge-bases/{knowledgeBaseId}/files/download` - Get file download URL
- `DELETE /knowledge-bases/{knowledgeBaseId}/files` - Delete file
- `POST /knowledge-bases/{knowledgeBaseId}/retrieve` - Retrieve documents

### Group Management API (`GroupManagementApi`)
Requires paid user authorization:
- `GET /groups` - List user's groups
- `POST /groups` - Create group
- `GET /groups/{groupId}` - Get group details
- `PUT /groups/{groupId}` - Update group
- `DELETE /groups/{groupId}` - Delete group
- `POST /groups/{groupId}/members` - Add member
- `DELETE /groups/{groupId}/members/{userId}` - Remove member
- `GET /groups/{groupId}/members` - List members
- `PUT /groups/{groupId}/members/{userId}` - Update member role

### Shared Resources API (`SharedResourcesApi`)
Requires paid user authorization:
- `GET /shared-resources` - List shared resources
- `GET /shared-resources/shared-to-me` - List resources shared to user
- `POST /shared-resources` - Share resource
- `DELETE /shared-resources/{resourceType}/{resourceId}/groups/{groupId}` - Unshare resource
- `PUT /shared-resources/{resourceType}/{resourceId}/groups/{groupId}` - Update shared resource

### User Management API (`UserManagementApi`)
Requires admin authorization:
- `GET /users` - List users
- `POST /users` - Create user
- `GET /users/{username}` - Get user details
- `DELETE /users/{username}` - Delete user
- `PUT /users/{username}/groups` - Update user groups