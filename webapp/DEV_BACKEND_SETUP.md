# Development Backend Setup for Auto-Confirmation

## 🎯 Problem Solved

In development environment, we want users to be automatically confirmed without needing email verification, making testing and development much easier.

## 🔧 Backend Changes Made

### 1. **Pre-Signup Lambda Trigger** ✅
- **File**: `/infrastructure/functions/pre-signup/index.js`
- **Purpose**: Automatically confirms users during signup in development
- **Logic**: 
  - Checks `ENVIRONMENT` variable
  - If `dev` or `development`: Sets `autoConfirmUser = true`
  - Also auto-verifies email and phone attributes

### 2. **Infrastructure Updates** ✅
- **File**: `/infrastructure/template.yaml`
- **Changes**:
  - Added `PreSignupLambda` function
  - Added `PreSignupLambdaRole` IAM role  
  - Added `PreSignupLambdaPermission` for Cognito
  - Updated `LambdaTriggersSetupCommand` output

### 3. **Existing Cognito Configuration** ✅
- **Already configured correctly** for dev environment:
  - `AutoVerifiedAttributes: []` (no verification required)
  - `VerificationMessageTemplate: !Ref AWS::NoValue` (no templates)
  - `UserAttributeUpdateSettings: !Ref AWS::NoValue` (no verification)

## 🚀 Deployment Steps

### Step 1: Deploy Infrastructure
```bash
cd /Users/trungnguyentran/Documents/Projects/LEGAIA/infrastructure

# Build the SAM application
sam build

# Deploy with dev environment
sam deploy --parameter-overrides Environment=dev
```

### Step 2: Configure Lambda Triggers
After deployment, run the command from CloudFormation outputs:
```bash
# This command will be in the CloudFormation outputs
aws cognito-idp update-user-pool \\
  --user-pool-id YOUR_USER_POOL_ID \\
  --lambda-config "PreSignUp=arn:aws:lambda:region:account:function:your-stack-PreSignupLambda,PostConfirmation=arn:aws:lambda:region:account:function:your-stack-PostConfirmationLambda" \\
  --region ap-southeast-1
```

### Step 3: Test the Setup
1. **Register a new user** through the webapp
2. **No email verification required** - user should be automatically confirmed
3. **Redirected to login** immediately after registration
4. **Can login** with the credentials right away

## 🧪 Testing Flow

### Before (Production):
1. User registers → Email sent → User clicks verification link → User confirmed → User can login

### After (Development):
1. User registers → **Automatically confirmed** → User can login immediately

## 🔍 How It Works

### Development Flow:
```
User Registration 
    ↓
Pre-Signup Lambda Trigger
    ↓
Check ENVIRONMENT=dev
    ↓
Set autoConfirmUser=true
    ↓
User automatically confirmed
    ↓
Post-Confirmation Lambda (assign groups)
    ↓
User ready to login
```

### Environment Detection:
- **Lambda Environment Variable**: `ENVIRONMENT=dev`
- **CloudFormation Parameter**: `Environment=dev`
- **Pre-signup trigger** only activates auto-confirmation in dev mode

## 📋 Verification Checklist

After deployment, verify these work:

- [ ] **Registration**: New users can register
- [ ] **Auto-confirmation**: No email verification step
- [ ] **Immediate login**: Users can login right after registration  
- [ ] **Group assignment**: Users get assigned to appropriate groups (admin/paid/free)
- [ ] **Real API calls**: Frontend still uses real AWS Cognito (not mocked)

## 🔧 Files Modified

1. **New Files**:
   - `infrastructure/functions/pre-signup/index.js`
   - `infrastructure/functions/pre-signup/package.json`

2. **Modified Files**:
   - `infrastructure/template.yaml` (added Lambda resources)
   - `src/hooks/useSignup.ts` (dev flow updated)

## 💡 Key Benefits

1. **Faster Development**: No email verification delays
2. **Real API Integration**: Still uses real AWS Cognito (not mocks)
3. **Environment-Aware**: Only affects development environment
4. **Production Safe**: Production still requires email verification
5. **Easy Testing**: Can create test users instantly

## 🚨 Important Notes

- **Production environment** (`Environment=prod`) still requires email verification
- **Lambda triggers** must be manually configured after deployment via AWS CLI
- **Environment variable** `ENVIRONMENT=dev` is crucial for the pre-signup trigger
- **Frontend changes** also implemented to skip verification UI in dev