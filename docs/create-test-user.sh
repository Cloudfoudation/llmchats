#!/bin/bash

# Create Test User in Cognito for Knowledge Base Testing
# Run this script to create a fresh test user

# Configuration - Update these values from your CloudFormation outputs
USER_POOL_ID="us-east-1_f8w4Bbn1W"  # Update with your User Pool ID
REGION="us-east-1"
TEST_EMAIL="testuser@gsis.gov"
TEST_PASSWORD="TempPass123!"
USERNAME="testuser"

echo "🚀 Creating test user in Cognito..."
echo "User Pool ID: $USER_POOL_ID"
echo "Email: $TEST_EMAIL"
echo "Username: $USERNAME"

# Step 1: Create the user
echo "📝 Step 1: Creating user..."
aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME \
    --user-attributes Name=email,Value=$TEST_EMAIL Name=email_verified,Value=true \
    --temporary-password $TEST_PASSWORD \
    --message-action SUPPRESS \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ User created successfully"
else
    echo "❌ Failed to create user"
    exit 1
fi

# Step 2: Set permanent password
echo "🔑 Step 2: Setting permanent password..."
aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME \
    --password $TEST_PASSWORD \
    --permanent \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Password set successfully"
else
    echo "❌ Failed to set password"
fi

# Step 3: Assign to government-admin group
echo "👥 Step 3: Adding user to government-admin group..."
aws cognito-idp admin-add-user-to-group \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME \
    --group-name government-admin \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ User added to government-admin group"
else
    echo "⚠️ Failed to add user to group (group might not exist yet)"
fi

# Step 4: Get user details
echo "📋 Step 4: Getting user details..."
aws cognito-idp admin-get-user \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME \
    --region $REGION

echo ""
echo "🎉 Test user created successfully!"
echo "📧 Email: $TEST_EMAIL"
echo "🔑 Password: $TEST_PASSWORD"
echo "👤 Username: $USERNAME"
echo ""
echo "🔗 You can now use this user to test the Knowledge Base API"
echo "💡 Use these credentials in your frontend or API testing tools"