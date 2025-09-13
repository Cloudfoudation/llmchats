# GSIS Knowledge Management System - Issues & Solutions

## Current Status: 🔧 SOLUTION READY - Needs Deployment & Testing

### 🎯 **Latest Update (Current)**
**Date**: December 2024  
**Status**: 🔧 **SOLUTION IMPLEMENTED - AWAITING DEPLOYMENT**  
**Issue**: Knowledge Base API authentication and role-based permissions  

#### **Problem Identified**:
- Knowledge Base API endpoints were **missing RBAC authorizer**
- API was falling back to hardcoded test user instead of parsing real JWT tokens
- Users with `gsis-admin` role were getting "INSUFFICIENT_PERMISSIONS" errors

#### **Root Cause**:
```yaml
# Template had commented out authorizers
ListKnowledgeBases:
  # Auth:                    ← MISSING!
  #   Authorizer: RBACAuthorizer
```

#### **Solution Implemented (Ready for Deployment)**:
1. 🔧 **Enabled RBAC Authorizer** on Knowledge Base API endpoints
2. 🔧 **Updated role system** to simplified 2-role structure:
   - `gsis-admin` - Full system access (`*` permissions)
   - `general-user` - Limited access to own resources
3. 🔧 **Added initial roles setup** Lambda to populate GroupPermissions table
4. 🔧 **Fixed permission checking** with dynamic + static fallback

#### **System After Deployment (Expected)**:
```bash
# 🔧 Cognito Groups (Will be created)
- gsis-admin (full access)
- general-user (limited access)

# 🔧 Dynamic Permissions (Will be populated)
- GroupPermissions DynamoDB table with initial roles
- Static fallback permissions for reliability

# 🔧 APIs (Will be working)
- Knowledge Base API: Authenticated + authorized
- User Management API: Admin-only access
- Role Management API: Dynamic permissions
```

---

## 🔧 **System Architecture - Current State**

### **Authentication Flow**:
1. ✅ User logs in via Google OAuth → Cognito
2. ✅ Frontend gets JWT token with user groups
3. ✅ API calls include `Authorization: Bearer JWT_TOKEN`
4. ✅ RBAC Authorizer validates token + extracts user info
5. ✅ APIs check permissions via dynamic + static system

### **Permission System**:
```python
# ✅ Dynamic Permissions (DynamoDB)
gsis-admin: ['*']  # Full access
general-user: ['kb:read', 'kb:create:own', 'kb:update:own']

# ✅ Static Fallback (Code)
STATIC_PERMISSIONS = {
    'gsis-admin': ['*'],
    'general-user': ['kb:read', 'kb:create:own', 'kb:update:own']
}
```

### **Role Assignment**:
```bash
# ✅ Admin can assign users to roles
aws cognito-idp admin-add-user-to-group \
    --user-pool-id $USER_POOL_ID \
    --username "user@gsis.gov" \
    --group-name "gsis-admin"
```

---

## 📋 **Testing Status**

### 🔧 **Features Ready for Testing**:
- [ ] User authentication via Google OAuth (needs testing)
- [ ] JWT token generation with groups (needs testing)
- [ ] RBAC authorizer parsing real tokens (needs deployment)
- [ ] Knowledge Base API with proper authorization (needs deployment)
- [ ] User Management API (admin-only) (needs testing)
- [ ] Dynamic permission system (needs deployment)
- [ ] Role assignment via Cognito groups (needs testing)

### 🧪 **Test Commands (After Deployment)**:
```bash
# 🔧 Deploy first
sam build && sam deploy

# 🧪 Test Knowledge Base API (requires gsis-admin role)
curl -X GET "https://your-kb-api-url/dev/knowledge-bases" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 🧪 Test User Management API (requires gsis-admin role)  
curl -X GET "https://your-user-api-url/dev/users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 🧪 Assign user to admin role
aws cognito-idp admin-add-user-to-group \
    --user-pool-id $USER_POOL_ID \
    --username "user@email.com" \
    --group-name "gsis-admin"
```

---

## 🚀 **Next Steps**

### **Immediate Actions (NEXT STEPS)**:
1. 🚀 **Deploy latest changes** with enabled authorizers
   ```bash
   sam build && sam deploy
   ```
2. 🧪 **Test with real users** assigned to `gsis-admin` group
3. 🔍 **Verify frontend integration** with JWT tokens

### **Future Enhancements**:
- [ ] Add more granular permissions (department-level, resource-specific)
- [ ] Implement role hierarchy (admin > manager > user)
- [ ] Add audit logging for permission changes
- [ ] Create admin UI for role management

---

## 🔍 **Troubleshooting Guide**

### **Common Issues & Solutions**:

#### **Issue**: "INSUFFICIENT_PERMISSIONS" error
**Solution**: 
1. Check user is assigned to correct Cognito group
2. Verify JWT token includes groups claim
3. Confirm API has RBAC authorizer enabled

#### **Issue**: API returns test user data
**Solution**:
1. Ensure API endpoints have `Auth: Authorizer: RBACAuthorizer`
2. Check JWT token is being sent in Authorization header
3. Verify RBAC authorizer is parsing token correctly

#### **Issue**: Dynamic permissions not working
**Solution**:
1. Check GroupPermissions DynamoDB table is populated
2. Verify initial roles setup Lambda ran successfully
3. Confirm static fallback permissions are correct

---

## 📊 **System Health Check**

### **Quick Verification**:
```bash
# 1. Check Cognito groups exist
aws cognito-idp list-groups --user-pool-id $USER_POOL_ID

# 2. Check GroupPermissions table populated
aws dynamodb scan --table-name "your-stack-group-permissions"

# 3. Check user group assignment
aws cognito-idp admin-list-groups-for-user \
    --user-pool-id $USER_POOL_ID \
    --username "user@email.com"

# 4. Test API with authentication
curl -X GET "https://your-api-url/dev/knowledge-bases" \
  -H "Authorization: Bearer JWT_TOKEN"
```

### **Expected Results**:
- ✅ Groups: `gsis-admin`, `general-user` exist
- ✅ GroupPermissions table has 2 entries
- ✅ Users assigned to appropriate groups
- ✅ API calls return 200 (not 403) for authorized users

---

## 📝 **Change Log**

### **v1.2 - December 2024** ✅ **CURRENT**
- Fixed Knowledge Base API authentication
- Simplified to 2-role system (gsis-admin, general-user)
- Added initial roles setup automation
- Enabled RBAC authorizers on all endpoints

### **v1.1 - December 2024**
- Added dynamic permission system
- Created GroupPermissions DynamoDB table
- Implemented RBAC authorizer function

### **v1.0 - December 2024**
- Initial deployment with Cognito groups
- Basic Knowledge Base and User Management APIs
- Google OAuth integration

---

**Status**: 🟡 **SOLUTION READY - AWAITING DEPLOYMENT**  
**Last Updated**: December 2024  
**Next Action**: Deploy changes with `sam build && sam deploy`  
**Next Review**: After deployment and testing