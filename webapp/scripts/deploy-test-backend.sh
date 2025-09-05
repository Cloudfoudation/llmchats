#!/bin/bash

# LEGAIA Test Backend Deployment Script
# Deploys a separate backend infrastructure for testing

set -e

echo "🚀 Deploying LEGAIA Test Backend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the webapp directory"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    print_error "SAM CLI is not installed. Please install it first."
    exit 1
fi

# Set deployment parameters
STACK_NAME="legaia-test-backend"
REGION=${AWS_REGION:-us-east-1}
ENVIRONMENT="test"

print_status "Deployment Configuration:"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $REGION"
echo "  Environment: $ENVIRONMENT"

# Navigate to infrastructure directory
if [ -d "../infrastructure" ]; then
    cd ../infrastructure
    print_status "Using infrastructure directory: $(pwd)"
else
    print_error "Infrastructure directory not found. Please ensure the infrastructure code is available."
    exit 1
fi

# Create test-specific parameter file
print_status "Creating test backend parameters..."
cat > test-backend-params.json << EOF
{
  "Parameters": {
    "BucketName": "legaia-test-backend-spa-$(date +%s)",
    "GoogleClientId": "${GOOGLE_CLIENT_ID:-your-test-google-client-id}",
    "GoogleClientSecret": "${GOOGLE_CLIENT_SECRET:-your-test-google-client-secret}",
    "AdminEmail": "${TEST_ADMIN_EMAIL:-admin@testbackend.com}",
    "Environment": "test"
  }
}
EOF

# Build the SAM application
print_status "Building SAM application..."
sam build

# Deploy the test backend
print_status "Deploying test backend stack..."
sam deploy \
  --stack-name $STACK_NAME \
  --region $REGION \
  --parameter-overrides file://test-backend-params.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --resolve-s3 \
  --confirm-changeset

# Get stack outputs
print_status "Retrieving stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs' \
  --output json)

# Extract key outputs
USER_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
IDENTITY_POOL_ID=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="IdentityPoolId") | .OutputValue')
COGNITO_DOMAIN=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="CognitoDomainName") | .OutputValue')
AGENTS_TABLE=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="AgentsTableName") | .OutputValue')
CONVERSATIONS_TABLE=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="ConversationsTableName") | .OutputValue')
ATTACHMENTS_BUCKET=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="AttachmentsBucketName") | .OutputValue')

# Navigate back to webapp directory
cd ../webapp

# Update test backend environment file
print_status "Updating test backend environment configuration..."
cat > .env.test.backend << EOF
# Test Backend Environment Configuration - Auto-generated
# Generated on: $(date)

# AWS Region Configuration
NEXT_PUBLIC_REGION=$REGION
NEXT_PUBLIC_AWS_REGION=$REGION

# Test Backend AWS Resources
NEXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
NEXT_PUBLIC_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
NEXT_PUBLIC_COGNITO_DOMAIN=$COGNITO_DOMAIN

# OAuth Redirect URLs for Test Backend
NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN=http://localhost:3030/auth/callback
NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT=http://localhost:3030/auth/logout

# Test Backend DynamoDB Tables
NEXT_PUBLIC_AGENTS_TABLE=$AGENTS_TABLE
NEXT_PUBLIC_CONVERSATIONS_TABLE=$CONVERSATIONS_TABLE
NEXT_PUBLIC_GROUPS_TABLE=${AGENTS_TABLE/agents/groups}
NEXT_PUBLIC_USER_GROUPS_TABLE=${AGENTS_TABLE/agents/user-groups}
NEXT_PUBLIC_SHARED_AGENTS_TABLE=${AGENTS_TABLE/agents/shared-agents}
NEXT_PUBLIC_SHARED_KNOWLEDGE_BASES_TABLE=${AGENTS_TABLE/agents/shared-knowledge-bases}

# Test Backend S3 Buckets
NEXT_PUBLIC_ATTACHMENTS_BUCKET=$ATTACHMENTS_BUCKET
NEXT_PUBLIC_SPA_BUCKET=${ATTACHMENTS_BUCKET/attachments/spa}

# Test Backend API Endpoints (will be updated with actual API Gateway URLs)
NEXT_PUBLIC_AGENT_MANAGEMENT_API_URL=https://test-api.execute-api.$REGION.amazonaws.com/test/
NEXT_PUBLIC_DOCUMENT_API_URL=https://test-api.execute-api.$REGION.amazonaws.com/test/
NEXT_PUBLIC_KNOWLEDGE_BASE_API_URL=https://test-api.execute-api.$REGION.amazonaws.com/test/
NEXT_PUBLIC_USER_MANAGEMENT_API_URL=https://test-api.execute-api.$REGION.amazonaws.com/test/
NEXT_PUBLIC_GROUP_MANAGEMENT_API_URL=https://test-api.execute-api.$REGION.amazonaws.com/test/
NEXT_PUBLIC_SHARED_RESOURCES_API_URL=https://test-api.execute-api.$REGION.amazonaws.com/test/
NEXT_PUBLIC_PROFILE_API_URL=https://test-api.execute-api.$REGION.amazonaws.com/test/

# Test Backend CloudFront
NEXT_PUBLIC_CLOUDFRONT_DOMAIN=localhost:3030

# Test Backend OpenSearch
NEXT_PUBLIC_KB_COLLECTION_ID=test-collection-123

# Application Settings
NEXT_PUBLIC_APP_NAME=LEGAIA Test Backend
NEXT_PUBLIC_ENVIRONMENT=test-backend

# Test Configuration - Single Browser Only
PLAYWRIGHT_BASE_URL=http://localhost:3030
PLAYWRIGHT_HEADLESS=false
PLAYWRIGHT_TIMEOUT=60000
PLAYWRIGHT_RETRIES=1
PLAYWRIGHT_WORKERS=1
BROWSER_NAME=chromium

# Test User Credentials (Update these with actual test user credentials)
TEST_ADMIN_EMAIL=${TEST_ADMIN_EMAIL:-admin@testbackend.com}
TEST_ADMIN_PASSWORD=${TEST_ADMIN_PASSWORD:-TestBackend123!}
TEST_PAID_EMAIL=${TEST_PAID_EMAIL:-paid@testbackend.com}
TEST_PAID_PASSWORD=${TEST_PAID_PASSWORD:-TestBackend123!}
TEST_FREE_EMAIL=${TEST_FREE_EMAIL:-free@testbackend.com}
TEST_FREE_PASSWORD=${TEST_FREE_PASSWORD:-TestBackend123!}

# Debug Configuration
DEBUG_MODE=true
VERBOSE_LOGGING=true
SCREENSHOT_ON_FAILURE=true
VIDEO_ON_FAILURE=false
TRACE_ON_FAILURE=true
CLEANUP_TEST_DATA=false
EOF

print_success "Test backend deployed successfully!"

echo ""
echo "📋 Deployment Summary:"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $REGION"
echo "  User Pool ID: $USER_POOL_ID"
echo "  User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "  Identity Pool ID: $IDENTITY_POOL_ID"
echo "  Cognito Domain: $COGNITO_DOMAIN"
echo "  Agents Table: $AGENTS_TABLE"
echo "  Conversations Table: $CONVERSATIONS_TABLE"
echo "  Attachments Bucket: $ATTACHMENTS_BUCKET"
echo ""
echo "📝 Next Steps:"
echo "1. Create test users in the Cognito User Pool"
echo "2. Update test user credentials in .env.test.backend"
echo "3. Run: npm run test:backend to start testing"
echo ""
echo "🔧 Test Commands:"
echo "  npm run dev:test-backend     - Start test backend server"
echo "  npm run test:backend         - Run tests against test backend"
echo "  npm run test:backend:debug   - Run tests with debugging"
echo ""
echo "🗑️  Cleanup:"
echo "  ./scripts/cleanup-test-backend.sh - Remove test backend resources"
EOF
