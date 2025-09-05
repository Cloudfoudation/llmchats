#!/bin/bash

# LEGAIA Test Backend Cleanup Script
# Removes test backend infrastructure

set -e

echo "🗑️  Cleaning up LEGAIA Test Backend..."

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

# Set cleanup parameters
STACK_NAME="legaia-test-backend"
REGION=${AWS_REGION:-us-east-1}

print_status "Cleanup Configuration:"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $REGION"

# Confirm cleanup
if [ "$1" != "--force" ]; then
    echo ""
    print_warning "This will permanently delete the test backend infrastructure!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleanup cancelled."
        exit 0
    fi
fi

# Check if stack exists
print_status "Checking if stack exists..."
if ! aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &> /dev/null; then
    print_warning "Stack $STACK_NAME does not exist in region $REGION"
    exit 0
fi

# Get stack outputs before deletion for cleanup
print_status "Retrieving stack resources for cleanup..."
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs' \
  --output json 2>/dev/null || echo "[]")

# Extract S3 buckets for manual cleanup if needed
ATTACHMENTS_BUCKET=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="AttachmentsBucketName") | .OutputValue' 2>/dev/null || echo "")
SPA_BUCKET=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="BucketName") | .OutputValue' 2>/dev/null || echo "")

# Empty S3 buckets before stack deletion
if [ ! -z "$ATTACHMENTS_BUCKET" ] && [ "$ATTACHMENTS_BUCKET" != "null" ]; then
    print_status "Emptying attachments bucket: $ATTACHMENTS_BUCKET"
    aws s3 rm s3://$ATTACHMENTS_BUCKET --recursive --region $REGION 2>/dev/null || print_warning "Could not empty attachments bucket"
fi

if [ ! -z "$SPA_BUCKET" ] && [ "$SPA_BUCKET" != "null" ]; then
    print_status "Emptying SPA bucket: $SPA_BUCKET"
    aws s3 rm s3://$SPA_BUCKET --recursive --region $REGION 2>/dev/null || print_warning "Could not empty SPA bucket"
fi

# Delete the CloudFormation stack
print_status "Deleting CloudFormation stack: $STACK_NAME"
aws cloudformation delete-stack \
  --stack-name $STACK_NAME \
  --region $REGION

# Wait for stack deletion to complete
print_status "Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete \
  --stack-name $STACK_NAME \
  --region $REGION

print_success "Test backend stack deleted successfully!"

# Clean up local files
print_status "Cleaning up local configuration files..."

if [ -f ".env.test.backend" ]; then
    rm .env.test.backend
    print_status "Removed .env.test.backend"
fi

if [ -f "../infrastructure/test-backend-params.json" ]; then
    rm ../infrastructure/test-backend-params.json
    print_status "Removed test-backend-params.json"
fi

# Clean up test results
if [ -d "test-results" ]; then
    rm -rf test-results
    print_status "Removed test-results directory"
fi

print_success "Test backend cleanup completed!"

echo ""
echo "✅ Cleanup Summary:"
echo "  - CloudFormation stack deleted: $STACK_NAME"
echo "  - S3 buckets emptied and deleted"
echo "  - DynamoDB tables deleted"
echo "  - Cognito resources deleted"
echo "  - Local configuration files removed"
echo ""
echo "The test backend infrastructure has been completely removed."
