# LEGAIA Bedrock Chat - Complete Deployment Guide

## Overview
This guide provides step-by-step instructions to deploy the LEGAIA Bedrock Chat application, a comprehensive AI chat platform with tiered access to Amazon Bedrock models.

## Architecture Summary
- **Frontend**: Next.js React application (Static SPA)
- **Backend**: AWS Lambda functions + API Gateway
- **AI Processing**: Amazon Bedrock + Optional container services
- **Authentication**: Amazon Cognito with Google OAuth
- **Storage**: Amazon DynamoDB + S3 + OpenSearch Serverless
- **CDN**: Amazon CloudFront

---

## Prerequisites Setup

### 1. Setup Python Environment (Mac M1)
```bash
# Create Python virtual environment
python3 -m venv gsis-poc-env
source gsis-poc-env/bin/activate

# Verify Python version
python --version  # Should be 3.8+
```

### 2. Install Required Tools (Mac M1)
```bash
# Install AWS CLI v2 for Mac M1
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Install SAM CLI in virtual environment
pip install aws-sam-cli

# Install Node.js 18+ using Homebrew (recommended for M1)
brew install node@18
brew link node@18

# Verify installations
aws --version
sam --version
node --version
npm --version

# Install additional Mac tools if needed
brew install jq  # For JSON parsing in scripts
```

### 3. Configure AWS CLI
```bash
aws configure
# Enter:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: us-east-1
# Default output format: json

# Verify your configuration
aws configure list
aws sts get-caller-identity

# Check current region and account
echo "Deploying to:"
echo "Region: $(aws configure get region)"
echo "Account: $(aws sts get-caller-identity --query Account --output text)"
echo "User: $(aws sts get-caller-identity --query Arn --output text)"
```

### 4. Enable Amazon Bedrock Models
```bash
# Go to AWS Console → Bedrock → Model access
# URL: https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess

# Click "Request model access" and enable these models:
# ✅ Meta Llama 3 2 1B Instruct (required for free tier users)
# ✅ Amazon Titan Text models (backup option)
# ✅ Claude 3 Haiku (if available in us-east-1)
# ✅ Claude 3.5 Sonnet (if available in us-east-1)

# Note: If Claude models not available in us-east-1:
# - Use Llama 3 2.1B and Titan models
# - Or deploy entire infrastructure to us-west-2 where Claude is available

# Verify enabled models:
aws bedrock list-foundation-models --region $(aws configure get region)
```

### 5. Google OAuth Setup (Optional but Recommended)
```bash
# 1. Go to https://console.cloud.google.com
# 2. Create new project or select existing
# 3. Enable Google+ API and Google Identity API
# 4. Go to Credentials → Create OAuth 2.0 Client ID
# 5. Application type: Web application
# 6. Add authorized redirect URIs (will be updated after deployment):
#    - https://your-cognito-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
#    - https://your-cloudfront-domain.cloudfront.net/auth/callback
#    - http://localhost:3000/auth/callback (for development)
# 7. Note down Client ID and Client Secret
```

---

## Deployment Steps

### Step 1: Activate Environment and Navigate to Project
```bash
# Navigate to project directory
cd /Users/ecloudvalley/Documents/ecv-projects/gsis/llmchats

# Activate your Python virtual environment
source gsis-poc-env/bin/activate

# Verify environment is activated (should show (gsis-poc-env) in prompt)
which python
which sam

# Navigate to infrastructure folder for deployment
cd infrastructure
pwd  # Should show: /Users/ecloudvalley/Documents/ecv-projects/gsis/llmchats/infrastructure
```

### Step 2: Create Deployment Parameters
```bash
# Ensure you're in the infrastructure/ folder
pwd  # Should show: /path/to/llmchats/infrastructure

# Create parameters file in the infrastructure/ folder (same location as template.yaml)
cat > deployment-params.json << EOF
[
  {
    "ParameterKey": "BucketName",
    "ParameterValue": "gsis-poc-spa-$(date +%s)"
  },
  {
    "ParameterKey": "GoogleClientId",
    "ParameterValue": "your-google-client-id.apps.googleusercontent.com"
  },
  {
    "ParameterKey": "GoogleClientSecret",
    "ParameterValue": "GOCSPX-your-google-client-secret"
  },
  {
    "ParameterKey": "AdminEmail",
    "ParameterValue": "admin@gsis.com"
  },
  {
    "ParameterKey": "BDABucket",
    "ParameterValue": "gsis-poc-bda-us-east-1-$(date +%s)"
  },
  {
    "ParameterKey": "Environment",
    "ParameterValue": "dev"
  },
  {
    "ParameterKey": "YourDomain",
    "ParameterValue": "http://localhost:3000"
  }
]
EOF
```

### Step 3: Deploy Core Infrastructure
```bash
# IMPORTANT: Must be in infrastructure/ folder
pwd  # Should show: /path/to/llmchats/infrastructure

# Activate Python virtual environment first
source ../gsis-poc-env/bin/activate

# Verify required files exist
ls -la  # Should see: template.yaml, deployment-params.json, functions/

# Verify deployment target
echo "Deploying to:"
echo "Region: $(aws configure get region)"
echo "Account: $(aws sts get-caller-identity --query Account --output text)"
echo "Stack: gsis-poc"

# Build SAM application (processes template and packages Lambda functions)
sam build

# Deploy using SAM with parameter file (recommended)
sam deploy \
  --stack-name gsis-poc \
  --parameter-overrides file://deployment-params.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1 \
  --resolve-s3

# Alternative: Simple SAM deploy command (auto-resolves S3 bucket)
sam deploy \
  --stack-name gsis-poc \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region us-east-1 \
  --resolve-s3

# Alternative: Deploy with inline parameters
# sam deploy \
#   --stack-name gsis-poc \
#   --region $(aws configure get region) \
#   --parameter-overrides \
#     BucketName=gsis-poc-spa-$(date +%s) \
#     GoogleClientId=your-google-client-id.apps.googleusercontent.com \
#     GoogleClientSecret=GOCSPX-your-google-client-secret \
#     AdminEmail=admin@gsis.com \
#     BDABucket=gsis-poc-bda-us-east-1-$(date +%s) \
#     Environment=dev \
#     YourDomain=http://localhost:3000 \
#   --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
#   --resolve-s3 \
#   --confirm-changeset

# Alternative: Use CloudFormation deploy with SAM package (for JSON parameter files)
# DEPLOYMENT_BUCKET="gsis-poc-deployment-$(date +%s)"
# aws s3 mb s3://$DEPLOYMENT_BUCKET --region $(aws configure get region)
# sam package --s3-bucket $DEPLOYMENT_BUCKET --output-template-file packaged-template.yaml
# aws cloudformation deploy --template-file packaged-template.yaml --stack-name gsis-poc --region $(aws configure get region) --parameter-overrides file://deployment-params.json --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

# Note: SAM deploy is recommended because:
# - Automatically handles Lambda function packaging and S3 upload
# - Creates S3 bucket automatically with --resolve-s3
# - Handles large templates without manual S3 bucket creation

# Wait for deployment to complete (5-10 minutes)
# Note: If deployment fails due to Bedrock model access, enable models first

# Verify new RBAC tables were created
echo "Verifying RBAC tables:"
aws dynamodb list-tables --query 'TableNames[?contains(@, `gsis-poc`)]' --output table

# Should see new tables:
# - gsis-poc-users
# - gsis-poc-roles  
# - gsis-poc-role-agents
```

### Step 4: Configure Cognito Lambda Triggers (Mac M1 Compatible)
```bash
# Verify we're working with the correct stack and region
echo "Configuring triggers for:"
echo "Region: $(aws configure get region)"
echo "Stack: gsis-poc"

# Get outputs from CloudFormation
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --region $(aws configure get region) \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

PRE_SIGNUP_ARN=$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --region $(aws configure get region) \
  --query 'Stacks[0].Outputs[?OutputKey==`PreSignupLambda`].OutputValue' \
  --output text)

POST_CONFIRMATION_ARN=$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --region $(aws configure get region) \
  --query 'Stacks[0].Outputs[?OutputKey==`PostConfirmationLambda`].OutputValue' \
  --output text)

# Configure Lambda triggers
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --lambda-config "PreSignUp=$PRE_SIGNUP_ARN,PostConfirmation=$POST_CONFIRMATION_ARN" \
  --region $(aws configure get region)

echo "✅ Cognito Lambda triggers configured"
```

### Step 5: Update Google OAuth Redirect URIs
```bash
# Get Cognito domain and CloudFront domain
COGNITO_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoDomainName`].OutputValue' \
  --output text)

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
  --output text)

echo "📝 Update Google OAuth redirect URIs with:"
echo "  - https://$COGNITO_DOMAIN/oauth2/idpresponse"
echo "  - https://$CLOUDFRONT_DOMAIN/auth/callback"
```

### Step 6: Deploy Frontend Application (Mac M1)
```bash
# Navigate to webapp folder from infrastructure folder
cd ../webapp
pwd  # Should show: /path/to/llmchats/webapp

# Install dependencies (M1 optimized)
npm install

# Get all CloudFormation outputs for environment configuration
aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' \
  --output table

# Create environment file
cp .env.example .env.local
```

### Step 7: Configure Environment Variables
```bash
# Edit .env.local with CloudFormation outputs
nano .env.local

# Fill in these values from CloudFormation outputs:
# NEXT_PUBLIC_REGION=us-east-1
# NEXT_PUBLIC_USER_POOL_ID=<UserPoolId>
# NEXT_PUBLIC_USER_POOL_CLIENT_ID=<UserPoolClientId>
# NEXT_PUBLIC_IDENTITY_POOL_ID=<IdentityPoolId>
# NEXT_PUBLIC_COGNITO_DOMAIN=<CognitoDomainName>
# NEXT_PUBLIC_AGENTS_TABLE=<AgentsTableName>
# NEXT_PUBLIC_CONVERSATIONS_TABLE=<ConversationsTableName>
# NEXT_PUBLIC_ATTACHMENTS_BUCKET=<AttachmentsBucketName>
# ... (all other required variables)
```

### Step 8: Build and Deploy Frontend (Mac M1)
```bash
# Build Next.js application (M1 optimized)
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Get S3 bucket name
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# Sync built files to S3
aws s3 sync ./out s3://$BUCKET_NAME --region us-east-1 --delete

# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --region us-east-1 \
  --paths "/*"

echo "✅ Frontend deployed successfully"
```

### Step 9: Test Core Deployment
```bash
# Get application URL
APP_URL="https://$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
  --output text)"

echo "🚀 Application URL: $APP_URL"

# Test application accessibility
curl -I $APP_URL

# Test API endpoints
API_URL=$(aws cloudformation describe-stacks \
  --stack-name gsis-poc \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`UserManagementApiUrl`].OutputValue' \
  --output text)

curl -I $API_URL
```

---

## Optional: Deploy Container Services

### Step 10: Deploy Bedrock Service (Optional)
```bash
cd ../bedrock-service
pwd  # Should show: /path/to/llmchats/bedrock-service

# Build and deploy
sam build
aws cloudformation deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name gsis-poc-bedrock-service \
  --region $(aws configure get region) \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

### Step 11: Deploy Agents Service (Optional)
```bash
cd ../agents-service
pwd  # Should show: /path/to/llmchats/agents-service

# Build and deploy
sam build
aws cloudformation deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name gsis-poc-agents-service \
  --region $(aws configure get region) \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

---

## Post-Deployment Configuration

### Step 12: Create Test Users
```bash
# Create admin user (will be auto-assigned to admin group)
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --region us-east-1 \
  --username admin@gsis.com \
  --user-attributes Name=email,Value=admin@gsis.com Name=email_verified,Value=true \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS

# Create test paid user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --region us-east-1 \
  --username paid@amazon.com \
  --user-attributes Name=email,Value=paid@amazon.com Name=email_verified,Value=true \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS

# Create test free user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --region us-east-1 \
  --username free@example.com \
  --user-attributes Name=email,Value=free@example.com Name=email_verified,Value=true \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS
```

### Step 13: Verify User Group Assignments
```bash
# Check admin user groups
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@gsis.com

# Check paid user groups
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id $USER_POOL_ID \
  --username paid@amazon.com

# Check free user groups
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id $USER_POOL_ID \
  --username free@example.com
```

---

## Development Environment Setup

### Step 14: Setup Development Environment (Mac M1)
```bash
# Navigate to webapp folder
cd ../webapp
pwd  # Should show: /path/to/llmchats/webapp

# Setup test environment
./scripts/setup-test-env.sh

# Create development environment file
cp .env.example .env.development.local

# Install Playwright for M1
npx playwright install

# Start development server
npm run dev

# Run tests (M1 compatible)
npm run test:e2e
```

---

## Verification and Testing

### Step 15: Comprehensive Testing
```bash
# Test authentication flow
echo "Testing authentication..."
curl -X POST "$API_URL/auth/test" \
  -H "Content-Type: application/json"

# Test Bedrock access
echo "Testing Bedrock access..."
# This requires authenticated user session

# Test file upload
echo "Testing file upload..."
# This requires authenticated user session

# Test knowledge base creation
echo "Testing knowledge base..."
# This requires authenticated user session
```

### Step 16: Monitor Deployment
```bash
# Check CloudWatch logs
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/gsis-poc"

# Check DynamoDB tables
aws dynamodb list-tables \
  --query 'TableNames[?contains(@, `gsis-poc`)]'

# Check S3 buckets
aws s3 ls | grep gsis-poc

# Check CloudFront distribution status
aws cloudfront get-distribution \
  --id $DISTRIBUTION_ID \
  --query 'Distribution.Status'
```

---

## Mac M1 Specific Issues

### Common M1 Issues and Solutions

#### 1. Node.js Native Modules
```bash
# If npm install fails with native module errors
npm install --target_arch=arm64
npm rebuild

# Or use Rosetta 2 for compatibility
arch -x86_64 npm install
```

#### 2. Python/SAM CLI Issues
```bash
# If SAM CLI has issues on M1
pip install --upgrade aws-sam-cli

# Or install via Homebrew
brew install aws-sam-cli
```

#### 3. Docker Issues (if using containers)
```bash
# Use ARM64 base images in Dockerfiles
FROM --platform=linux/arm64 node:18-alpine

# Or force x86_64 platform
docker build --platform linux/amd64 .
```

#### 4. Playwright Browser Issues
```bash
# Install browsers with dependencies
npx playwright install --with-deps

# If still issues, use system Chrome
export PLAYWRIGHT_BROWSERS_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Stack Name Too Long Error
```bash
# Error: OpenSearch policy name exceeds 32 characters
# Solution: Use shorter stack name
--stack-name gsis-poc  # Instead of gsis-poc-infrastructure
```

#### 2. Cognito Lambda Trigger Configuration
```bash
# If Lambda triggers fail to configure
aws cognito-idp describe-user-pool --user-pool-id $USER_POOL_ID
aws lambda get-policy --function-name $PRE_SIGNUP_ARN
```

#### 3. CloudFront Distribution Issues
```bash
# Check distribution status
aws cloudfront get-distribution --id $DISTRIBUTION_ID

# Check origin access control
aws cloudfront list-origin-access-controls
```

#### 4. Bedrock Model Access
```bash
# List available models
aws bedrock list-foundation-models --region us-east-1

# Check model access
aws bedrock get-foundation-model \
  --model-identifier meta.llama3-2-1b-instruct-v1:0 \
  --region us-east-1
```

---

## Security Checklist

### Step 18: Security Verification
- [ ] **S3 Buckets**: Public access blocked
- [ ] **IAM Roles**: Least privilege principle applied
- [ ] **Cognito**: MFA enabled for admin users
- [ ] **CloudFront**: HTTPS-only access
- [ ] **API Gateway**: Rate limiting configured
- [ ] **Lambda**: Environment variables encrypted
- [ ] **DynamoDB**: Encryption at rest enabled
- [ ] **KMS**: Key rotation enabled

---

## Maintenance

### Regular Maintenance Tasks (Mac M1)
```bash
# Activate environment first
source gsis-poc-env/bin/activate

# Update Lambda function code
sam build && sam deploy

# Update frontend (with M1 optimizations)
NODE_OPTIONS="--max-old-space-size=4096" npm run build
aws s3 sync ./out s3://$BUCKET_NAME

# Monitor costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Backup DynamoDB tables
aws dynamodb create-backup \
  --table-name $AGENTS_TABLE \
  --backup-name "agents-backup-$(date +%Y%m%d)"

# Deactivate environment when done
deactivate
```

---

## Summary

### Deployment Checklist
- [ ] **Prerequisites**: AWS CLI, SAM CLI, Node.js installed
- [ ] **AWS Account**: Configured with appropriate permissions
- [ ] **Bedrock Models**: Enabled in AWS Console
- [ ] **Google OAuth**: Configured (optional)
- [ ] **Infrastructure**: Deployed via SAM
- [ ] **Cognito Triggers**: Configured via AWS CLI
- [ ] **Frontend**: Built and deployed to S3/CloudFront
- [ ] **Environment Variables**: Configured correctly
- [ ] **Test Users**: Created and verified
- [ ] **Testing**: Basic functionality verified
- [ ] **Monitoring**: CloudWatch logs and metrics enabled
- [ ] **Security**: Security checklist completed

### Estimated Costs
- **Development Environment**: ~$60-80/month
- **Production Environment**: ~$100-200/month
- **With Container Services**: +$30-50/month
- **Heavy AI Usage**: +$50-500/month (depending on usage)

### Key URLs After Deployment
- **Application**: `https://<cloudfront-domain>`
- **Admin Panel**: `https://<cloudfront-domain>/admin`
- **API Documentation**: Available in CloudFormation outputs
- **CloudWatch Logs**: AWS Console → CloudWatch → Log Groups

### Support and Documentation
- **Architecture**: See `docs/Architecture.png`
- **API Documentation**: See CloudFormation outputs
- **Testing Guide**: See `TESTING.md`
- **Development Setup**: See `DEV_ENVIRONMENT_SETUP.md`

---

**🎉 Deployment Complete!**

Your LEGAIA Bedrock Chat application is now live and ready for use. Users can register, authenticate via Google OAuth or email/password, and start chatting with AI models based on their access tier.