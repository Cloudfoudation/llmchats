# Knowledge Base RBAC Integration Issues & Solutions

**Date**: 2025-01-13  
**Status**: 🔄 IN PROGRESS  
**Component**: Knowledge Base API + RBAC Authorizer Integration

## 🎯 Problem Summary

After switching from Cognito Groups authorizer to RBAC authorizer, the Knowledge Base API stopped working properly. Users could not create knowledge bases due to authorization and data mapping issues.

## 🔍 Issues Encountered

### Issue 1: Knowledge Bases Found in DynamoDB but Not Returned
**Status**: ✅ IDENTIFIED  
**Problem**: 
- Logs showed "Found 3 knowledge bases" in DynamoDB
- Frontend received empty array: `{"success": true, "data": {"knowledgeBases": []}}`

**Root Cause**: 
- Knowledge bases existed in DynamoDB but failed to retrieve from Bedrock
- `bedrock_agent.get_knowledge_base()` calls were failing silently
- Error handling was skipping failed KBs without logging the specific error

**Solution Applied**:
```python
# Added proper error handling in list_knowledge_bases
try:
    kb_response = bedrock_agent.get_knowledge_base(knowledgeBaseId=kb_id)
    kb_data = kb_response['knowledgeBase']
    print(f"Successfully got KB details from Bedrock for {kb_id}")
except Exception as bedrock_error:
    print(f"Error getting KB {kb_id} from Bedrock: {bedrock_error}")
    continue  # Skip this KB if we can't get it from Bedrock
```

### Issue 2: POST Requests Not Reaching Lambda Function
**Status**: ✅ SOLVED  
**Problem**: 
- Only OPTIONS requests appeared in logs
- POST requests returned 500 internal error
- No POST logs in KnowledgeBaseManagementFunction

**Root Cause**: 
- RBAC authorizer was failing and blocking POST requests
- Authorizer failure prevented requests from reaching the Lambda function

**Solution Applied**:
- Temporarily disabled authorizer to confirm issue
- Fixed RBAC authorizer implementation
- Re-enabled authorizer after fixes

### Issue 3: Parameter Validation Failed - identityId None
**Status**: ✅ SOLVED  
**Problem**: 
```json
{
  "error": {
    "code": "BEDROCK_CREATION_FAILED",
    "message": "Parameter validation failed: Invalid type for parameter tags.identityId, value: None, type: <class 'NoneType'>, valid types: <class 'str'>"
  }
}
```

**Root Cause**: 
- Knowledge base creation required `identityId` for Bedrock tags
- RBAC authorizer wasn't providing `identityId` in context
- Test user setup was missing `identityId` field

**Solution Applied**:
```python
# Added identityId to test user
user_info = {
    'sub': 'test-user-123',
    'email': 'test@example.com', 
    'username': 'test-user',
    'groups': ['admin'],
    'identityId': 'us-east-1:test-identity-123'  # Added this
}
```

### Issue 4: RBAC Authorizer Not Providing Required Fields
**Status**: ✅ SOLVED  
**Problem**: 
- Knowledge Base function expected specific user info format
- RBAC authorizer provided different format than old Cognito authorizer
- Missing mapping between authorizer output and function input

**Root Cause**: 
- Inconsistent data format between authorizers
- Knowledge Base function designed for old Cognito format
- Missing `identityId` in RBAC authorizer context

**Solution Applied**:
1. **Enhanced RBAC Authorizer**:
```python
# Added identityId retrieval in RBAC authorizer
response = cognito_identity.get_id(
    IdentityPoolId=identity_pool_id,
    Logins={
        f'cognito-idp.{region}.amazonaws.com/{user_pool_id}': token
    }
)
identity_id = response.get('IdentityId')

# Added to context
'context': {
    'sub': claims['sub'],
    'username': claims.get('cognito:username', claims.get('email', 'user')),
    'email': claims.get('email', ''),
    'identityId': identity_id or claims['sub'],
    'claims': json.dumps(claims)
}
```

2. **Updated Knowledge Base Function**:
```python
# Simplified to only handle RBAC format
def get_user_info(event) -> dict:
    authorizer = event.get('requestContext', {}).get('authorizer', {})
    
    if 'sub' in authorizer:
        # Parse claims for groups
        claims = json.loads(authorizer.get('claims', '{}'))
        groups = claims.get('cognito:groups', [])
        
        user_info = {
            'sub': authorizer.get('sub', ''),
            'username': authorizer.get('username', ''),
            'email': authorizer.get('email', ''),
            'identityId': authorizer.get('identityId'),
            'groups': groups
        }
        
        # Validate required fields
        if not user_info['identityId']:
            user_info['identityId'] = user_info['sub']  # Fallback
            
        return user_info
```

### Issue 5: GET Requests Failing After RBAC Updates
**Status**: ✅ SOLVED  
**Problem**: 
- GET requests started failing after RBAC authorizer changes
- Function signature changes broke the authorizer

**Root Cause**: 
- Updated `generate_policy()` function to require `token` parameter
- Existing calls didn't pass the token parameter
- Function signature mismatch

**Solution Applied**:
```python
# Made token parameter optional
def generate_policy(principal_id, effect, resource, claims, token=None):
    # Handle case where token might be None
    if identity_pool_id and token:
        # Get identityId using token
    elif not token:
        print("⚠️ No token provided to get identityId")
```

## 🛠️ Current Status

### ✅ Completed
- [x] Fixed error handling in `list_knowledge_bases`
- [x] Added proper logging for Bedrock API failures
- [x] Enhanced RBAC authorizer to provide `identityId`
- [x] Updated Knowledge Base function to handle RBAC format
- [x] Added required field validation
- [x] Fixed function signature compatibility

### 🔄 In Progress
- [ ] Testing POST knowledge base creation with real user
- [ ] Verifying all required fields are properly mapped
- [ ] Testing GET knowledge bases with RBAC authorizer

### ❌ Known Issues
- Knowledge bases may exist in DynamoDB but not in Bedrock (orphaned records)
- Need cleanup process for orphaned DynamoDB records

## 📋 Required Fields Mapping

### RBAC Authorizer Output:
```json
{
  "context": {
    "sub": "cognito-user-sub-id",
    "username": "user@example.com", 
    "email": "user@example.com",
    "identityId": "us-east-1:identity-123",
    "claims": "{\"cognito:groups\":[\"admin\",\"paid\"]}"
  }
}
```

### Knowledge Base Function Input:
```python
user_info = {
    'sub': 'cognito-user-sub-id',        # DynamoDB primary key
    'username': 'user@example.com',      # KB naming prefix
    'email': 'user@example.com',         # Metadata
    'identityId': 'us-east-1:identity-123', # S3 folder paths
    'groups': ['admin', 'paid']          # Access control
}
```

## 🔧 Infrastructure Changes Made

### Template Updates:
```yaml
# Added IDENTITY_POOL_ID to RBAC authorizer
RBACAuthorizerFunction:
  Environment:
    Variables:
      USER_POOL_ID: !Ref CognitoUserPool
      IDENTITY_POOL_ID: !Ref CognitoIdentityPool  # Added this

# Added cognito-identity:GetId permission
Policies:
  - Effect: Allow
    Action:
      - 'cognito-identity:GetId'
    Resource: !Sub 'arn:aws:cognito-identity:${AWS::Region}:${AWS::AccountId}:identitypool/${CognitoIdentityPool}'
```

## 🧪 Testing Checklist

### Before Deployment:
- [ ] RBAC authorizer has all required environment variables
- [ ] Knowledge Base function handles RBAC format
- [ ] All required fields have fallbacks

### After Deployment:
- [ ] GET /knowledge-bases returns existing KBs
- [ ] POST /knowledge-bases creates new KB successfully
- [ ] User info extraction works correctly
- [ ] identityId is properly retrieved and used

## 📝 Lessons Learned

1. **Authorizer Format Consistency**: When changing authorizers, ensure all consuming functions are updated to handle the new format
2. **Required Field Validation**: Always validate required fields and provide fallbacks
3. **Error Handling**: Proper error handling prevents silent failures and helps debugging
4. **Integration Testing**: Test the full flow after authorizer changes, not just individual components

## 🔄 Next Steps

1. Deploy current fixes and test knowledge base creation
2. Clean up orphaned DynamoDB records that don't exist in Bedrock
3. Add comprehensive error handling for all Bedrock API calls
4. Implement proper RBAC permissions for knowledge base operations
5. Add role-based knowledge base assignment functionality

---

**Last Updated**: 2025-01-13  
**Next Review**: After deployment testing