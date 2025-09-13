#!/bin/bash

# Get JWT Token for Test User
# Run this script to get a JWT token for API testing

# Configuration - Update these values
USER_POOL_ID="us-east-1_f8w4Bbn1W"  # Update with your User Pool ID
CLIENT_ID="3sp01a7qfqvhc4dagt1483ur76"  # Update with your User Pool Client ID
REGION="us-east-1"
USERNAME="testuser"
PASSWORD="TempPass123!"

echo "🔐 Getting JWT token for test user..."
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $CLIENT_ID"
echo "Username: $USERNAME"

# Initiate authentication
echo "📝 Step 1: Initiating authentication..."
AUTH_RESPONSE=$(aws cognito-idp admin-initiate-auth \
    --user-pool-id $USER_POOL_ID \
    --client-id $CLIENT_ID \
    --auth-flow ADMIN_NO_SRP_AUTH \
    --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD \
    --region $REGION \
    --output json)

if [ $? -eq 0 ]; then
    echo "✅ Authentication successful"
    
    # Extract tokens
    ACCESS_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.AuthenticationResult.AccessToken')
    ID_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.AuthenticationResult.IdToken')
    REFRESH_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.AuthenticationResult.RefreshToken')
    
    echo ""
    echo "🎉 JWT Tokens obtained successfully!"
    echo ""
    echo "📋 ACCESS TOKEN (use for API calls):"
    echo "$ACCESS_TOKEN"
    echo ""
    echo "📋 ID TOKEN:"
    echo "$ID_TOKEN"
    echo ""
    echo "📋 REFRESH TOKEN:"
    echo "$REFRESH_TOKEN"
    echo ""
    echo "💡 Usage Examples:"
    echo ""
    echo "🔗 Test GET /knowledge-bases:"
    echo "curl -H \"Authorization: Bearer $ACCESS_TOKEN\" \\"
    echo "     https://your-api-gateway-url/dev/knowledge-bases"
    echo ""
    echo "🔗 Test POST /knowledge-bases:"
    echo "curl -X POST \\"
    echo "     -H \"Authorization: Bearer $ACCESS_TOKEN\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{\"name\": \"Test KB\", \"description\": \"Test Knowledge Base\"}' \\"
    echo "     https://your-api-gateway-url/dev/knowledge-bases"
    
else
    echo "❌ Authentication failed"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi