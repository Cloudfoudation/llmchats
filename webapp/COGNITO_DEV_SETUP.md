# AWS Cognito Development Environment Setup

## Option 1: Pre-Signup Lambda Trigger (Recommended)

Create a Lambda function to automatically confirm users in development:

```javascript
// Lambda function: cognito-auto-confirm-dev
exports.handler = (event, context, callback) => {
    // Check if this is development environment
    const isDev = process.env.ENVIRONMENT === 'development' || 
                  process.env.ENVIRONMENT === 'dev';
    
    if (isDev) {
        // Automatically confirm all users in development
        event.response.autoConfirmUser = true;
        
        // Auto-verify email if present
        if (event.request.userAttributes.hasOwnProperty("email")) {
            event.response.autoVerifyEmail = true;
        }
        
        // Auto-verify phone if present
        if (event.request.userAttributes.hasOwnProperty("phone_number")) {
            event.response.autoVerifyPhone = true;
        }
        
        console.log('Dev environment: Auto-confirming user', event.request.userAttributes.email);
    }
    
    callback(null, event);
};
```

### Steps to implement:
1. Create Lambda function with above code
2. Set environment variable `ENVIRONMENT=development`
3. Attach Lambda to Cognito User Pool pre-signup trigger
4. Users will be automatically confirmed on signup

## Option 2: AdminCreateUser API

For creating test users programmatically:

```javascript
import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const createConfirmedTestUser = async (email, password) => {
    const client = new CognitoIdentityProviderClient({ region: 'ap-southeast-1' });
    
    const command = new AdminCreateUserCommand({
        UserPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
        Username: email,
        UserAttributes: [
            {
                Name: 'email',
                Value: email
            },
            {
                Name: 'email_verified',
                Value: 'true'
            }
        ],
        TemporaryPassword: password,
        MessageAction: 'SUPPRESS', // Don't send welcome email
        ForceAliasCreation: false
    });
    
    return await client.send(command);
};
```

## Option 3: Configure User Pool Settings

When creating the User Pool:
1. **Verification settings**: Set to "No verification" for development pools
2. **Auto-verified attributes**: None for development
3. **Required attributes**: Minimal set for testing

## Current Implementation Status

✅ Real API calls implemented
✅ Development flow skips verification UI
⚠️ Still requires email confirmation in Cognito
🎯 **Next Step**: Implement Lambda trigger for auto-confirmation

## Environment Variables for Lambda

```bash
ENVIRONMENT=development
USER_POOL_ID=ap-southeast-1_weNlrlAd9
```