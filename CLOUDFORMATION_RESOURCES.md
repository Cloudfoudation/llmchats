# CloudFormation Stack Resources

## Overview
This document lists all AWS resources that will be created during the GSIS POC infrastructure deployment.

## Resource Summary

| Category | Count | Description |
|----------|-------|-------------|
| **Authentication** | 12 | Cognito User Pool, Identity Pool, Groups, Roles |
| **API Gateway** | 25 | REST APIs, Deployments, Stages, Permissions |
| **Lambda Functions** | 35 | Backend functions and permissions |
| **DynamoDB Tables** | 7 | Data storage tables |
| **S3 & CloudFront** | 6 | Static hosting and CDN |
| **Networking** | 15 | VPC, Subnets, Gateways, Security Groups |
| **OpenSearch** | 4 | Serverless collection and policies |
| **SQS & Processing** | 6 | Message queues and processors |
| **IAM Roles** | 12 | Service roles and permissions |
| **Other** | 3 | KMS, EIP, Functions |
| **TOTAL** | **125** | **All Resources** |

---

## Detailed Resource List

### Authentication & Authorization (12 resources)

| Resource | Type | Purpose |
|----------|------|---------|
| CognitoUserPool | AWS::Cognito::UserPool | User authentication |
| CognitoIdentityPool | AWS::Cognito::IdentityPool | AWS credential provider |
| UserPoolClient | AWS::Cognito::UserPoolClient | App client configuration |
| CognitoDomain | AWS::Cognito::UserPoolDomain | Hosted UI domain |
| GoogleIdentityProvider | AWS::Cognito::UserPoolIdentityProvider | Google OAuth integration |
| AdminGroup | AWS::Cognito::UserPoolGroup | Admin user group |
| PaidGroup | AWS::Cognito::UserPoolGroup | Paid user group |
| FreeGroup | AWS::Cognito::UserPoolGroup | Free user group |
| AdminRole | AWS::IAM::Role | Admin user permissions |
| PaidUserRole | AWS::IAM::Role | Paid user permissions |
| FreeUserRole | AWS::IAM::Role | Free user permissions |
| IdentityPoolRoleAttachment | AWS::Cognito::IdentityPoolRoleAttachment | Role mapping |

### API Gateway (25 resources)

| API | Resources | Purpose |
|-----|-----------|---------|
| **UserManagementApi** | 5 | User CRUD operations |
| **ProfileApi** | 4 | User profile management |
| **GroupManagementApi** | 5 | Group operations |
| **SharedResourcesApi** | 5 | Resource sharing |
| **KnowledgeBaseApi** | 4 | Knowledge base management |
| **AgentManagementApi** | 5 | AI agent management |
| **DocumentApi** | 4 | Document processing |

Each API includes:
- RestApi
- Deployment
- Stage
- Custom Authorizer Permission
- Multiple Lambda Permissions

### Lambda Functions (35 resources)

| Function Category | Count | Purpose |
|-------------------|-------|---------|
| **Authentication** | 6 | Pre-signup, Post-confirmation + permissions |
| **User Management** | 7 | User CRUD + API permissions |
| **Group Management** | 11 | Group operations + API permissions |
| **Knowledge Base** | 17 | KB management + API permissions |
| **Agent Management** | 6 | Agent operations + API permissions |
| **Document Processing** | 3 | Document conversion + permissions |
| **Shared Resources** | 6 | Resource sharing + API permissions |
| **Authorizers** | 2 | Custom API authorizers |
| **Vector Index** | 2 | OpenSearch index management |
| **BDA Processor** | 3 | Bedrock Data Automation |

### DynamoDB Tables (7 resources)

| Table | Purpose | Key Schema |
|-------|---------|------------|
| AgentsTable | AI agent definitions | userId (HASH), id (RANGE) |
| ConversationsTable | Chat conversations | userId (HASH), id (RANGE) |
| KnowledgeBasesTable | Knowledge base metadata | userId (HASH), knowledgeBaseId (RANGE) |
| GroupsTable | User groups | groupId (HASH) |
| UserGroupsTable | Group memberships | userId (HASH), groupId (RANGE) |
| SharedAgentsTable | Shared agent access | groupId (HASH), agentId (RANGE) |
| SharedKnowledgeBasesTable | Shared KB access | groupId (HASH), knowledgeBaseId (RANGE) |
| SyncSessionsTable | Sync operations | sessionId (HASH) |

### Storage & CDN (6 resources)

| Resource | Type | Purpose |
|----------|------|---------|
| SPABucket | AWS::S3::Bucket | Static website hosting |
| AttachmentsBucket | AWS::S3::Bucket | File uploads |
| AccessLogsBucket | AWS::S3::Bucket | Access logging |
| SPACloudFrontDistribution | AWS::CloudFront::Distribution | CDN |
| CloudFrontOriginAccessControl | AWS::CloudFront::OriginAccessControl | S3 access control |
| URLRewriteFunction | AWS::CloudFront::Function | SPA routing |
| BucketPolicy | AWS::S3::BucketPolicy | CloudFront access |

### Networking (15 resources)

| Resource | Type | Purpose |
|----------|------|---------|
| VPC | AWS::EC2::VPC | Virtual private cloud |
| InternetGateway | AWS::EC2::InternetGateway | Internet access |
| AttachInternetGateway | AWS::EC2::VPCGatewayAttachment | Gateway attachment |
| PublicSubnet1 | AWS::EC2::Subnet | Public subnet AZ1 |
| PublicSubnet2 | AWS::EC2::Subnet | Public subnet AZ2 |
| PrivateSubnet1 | AWS::EC2::Subnet | Private subnet AZ1 |
| PrivateSubnet2 | AWS::EC2::Subnet | Private subnet AZ2 |
| NatGateway | AWS::EC2::NatGateway | NAT for private subnets |
| NatGatewayEIP | AWS::EC2::EIP | Elastic IP for NAT |
| PublicRouteTable | AWS::EC2::RouteTable | Public routing |
| PrivateRouteTable | AWS::EC2::RouteTable | Private routing |
| PublicRoute | AWS::EC2::Route | Internet route |
| PrivateRoute | AWS::EC2::Route | NAT route |
| ALBSecurityGroup | AWS::EC2::SecurityGroup | Load balancer security |
| EcsSecurityGroup | AWS::EC2::SecurityGroup | Container security |
| DatabaseSecurityGroup | AWS::EC2::SecurityGroup | Database security |

### OpenSearch Serverless (4 resources)

| Resource | Type | Purpose |
|----------|------|---------|
| BedrockCollection | AWS::OpenSearchServerless::Collection | Vector search |
| KBEncryptionPolicy | AWS::OpenSearchServerless::SecurityPolicy | Encryption settings |
| KBAccessPolicy | AWS::OpenSearchServerless::AccessPolicy | Access control |
| KBNetworkPolicy | AWS::OpenSearchServerless::SecurityPolicy | Network access |

### Message Processing (6 resources)

| Resource | Type | Purpose |
|----------|------|---------|
| BDAJobQueue | AWS::SQS::Queue | BDA job queue |
| BDAJobDLQ | AWS::SQS::Queue | Dead letter queue |
| BDAResultsQueue | AWS::SQS::Queue | Results queue |
| BDAProcessorFunction | AWS::Lambda::Function | BDA processor |
| BDAProcessorLambdaRole | AWS::IAM::Role | Processor role |
| BDAProcessorFunctionSQSTrigger | AWS::Lambda::EventSourceMapping | SQS trigger |

### IAM Roles (12 resources)

| Role | Purpose |
|------|---------|
| AdminRole | Admin user permissions |
| PaidUserRole | Paid user permissions |
| FreeUserRole | Free user permissions |
| CognitoAuthenticatedRole | Authenticated user base |
| CognitoUnauthenticatedRole | Unauthenticated user base |
| BedrockKBRole | Bedrock Knowledge Base service |
| PreSignupLambdaRole | Pre-signup Lambda |
| PostConfirmationLambdaRole | Post-confirmation Lambda |
| UserManagementFunctionRole | User management API |
| GroupManagementFunctionRole | Group management API |
| KnowledgeBaseManagementFunctionRole | KB management API |
| AgentManagementFunctionRole | Agent management API |

### Security & Encryption (2 resources)

| Resource | Type | Purpose |
|----------|------|---------|
| KMSKey | AWS::KMS::Key | Encryption key |
| Various Lambda Permissions | AWS::Lambda::Permission | API Gateway permissions |

---

## Cost Implications

### High-Cost Resources
- **NAT Gateway**: ~$32/month (biggest cost)
- **OpenSearch Serverless**: ~$24/month minimum
- **CloudFront**: Usage-based
- **Lambda**: Usage-based (1M requests free)

### Low-Cost Resources
- **DynamoDB**: Pay-per-request (25GB free)
- **S3**: Storage + requests (5GB free)
- **Cognito**: 50K MAU free
- **API Gateway**: Usage-based

### Optimization Opportunities
- Use VPC Endpoints instead of NAT Gateway
- Configure DynamoDB auto-scaling
- Set S3 lifecycle policies
- Monitor CloudWatch costs

---

## Security Features

### Encryption
- **KMS**: Customer-managed encryption key
- **S3**: Server-side encryption enabled
- **DynamoDB**: Encryption at rest
- **Lambda**: Environment variable encryption

### Access Control
- **IAM**: Least privilege roles
- **Cognito**: Multi-tier user access
- **S3**: Public access blocked
- **API Gateway**: Custom authorizers

### Network Security
- **VPC**: Isolated network
- **Security Groups**: Restrictive rules
- **CloudFront**: HTTPS-only
- **Private Subnets**: Database isolation

---

## Deployment Time Estimate

| Resource Category | Estimated Time |
|-------------------|----------------|
| VPC & Networking | 2-3 minutes |
| IAM Roles | 1-2 minutes |
| Cognito | 2-3 minutes |
| DynamoDB Tables | 3-5 minutes |
| Lambda Functions | 5-8 minutes |
| API Gateway | 3-5 minutes |
| OpenSearch | 8-12 minutes |
| S3 & CloudFront | 5-8 minutes |
| **Total** | **30-45 minutes** |

---

## Resource Dependencies

### Critical Path
1. **KMS Key** → All encrypted resources
2. **VPC** → Subnets → Security Groups
3. **Cognito User Pool** → Identity Pool → Roles
4. **OpenSearch Collection** → Knowledge Base functions
5. **S3 Buckets** → CloudFront → Bucket Policies

### Parallel Creation
- Lambda functions (after IAM roles)
- DynamoDB tables (independent)
- API Gateway resources (after Lambda)
- SQS queues (independent)

This comprehensive infrastructure provides a scalable, secure foundation for the AI chat application with proper separation of concerns and enterprise-grade security features.