# Creating Dynamic Roles - Admin Guide

## 1. Create a New Cognito Group

```bash
# Create the "kbCreator" group in Cognito
aws cognito-idp create-group \
    --group-name "kbCreator" \
    --user-pool-id "us-east-1_f8w4Bbn1W" \
    --description "Knowledge Base Creator Role" \
    --precedence 10 \
    --region us-east-1
```

## 2. Set Dynamic Permissions for the Group

```bash
# Use the Knowledge Base API to set permissions
curl -X PUT "https://your-api-gateway-url/dev/groups/kbCreator/permissions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "groupName": "kbCreator",
    "permissions": [
      "kb:create",
      "kb:read", 
      "kb:update:own",
      "doc:upload",
      "ai:invoke:basic"
    ],
    "autoAssignAgents": [],
    "autoAssignKnowledgeBases": []
  }'
```

## 3. Assign User to the New Group

```bash
# Add user to the new group
aws cognito-idp admin-add-user-to-group \
    --user-pool-id "us-east-1_f8w4Bbn1W" \
    --username "testuser" \
    --group-name "kbCreator" \
    --region us-east-1
```

## 4. Test the New Role

```bash
# Test knowledge base creation with the new role
curl -X POST "https://your-api-gateway-url/dev/knowledge-bases" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "name": "Test KB with kbCreator Role",
    "description": "Testing dynamic role permissions"
  }'
```

## 5. API Endpoints for Group Management

### Create Group Permissions
```http
PUT /groups/{groupName}/permissions
{
  "permissions": ["kb:create", "kb:read"],
  "autoAssignAgents": ["agent-id-1"],
  "autoAssignKnowledgeBases": ["kb-id-1"]
}
```

### Get Group Permissions
```http
GET /groups/{groupName}/permissions
```

### List All Groups with Permissions
```http
GET /groups/permissions
```

### Create New Cognito Group via API
```http
POST /groups
{
  "groupName": "newRole",
  "description": "New Dynamic Role",
  "precedence": 20
}
```

## Example: Finance Department Role

```bash
# 1. Create Cognito group
aws cognito-idp create-group \
    --group-name "finance-analyst" \
    --user-pool-id "us-east-1_f8w4Bbn1W" \
    --description "Finance Department Analyst" \
    --precedence 15

# 2. Set permissions via API
curl -X PUT "https://api-url/dev/groups/finance-analyst/permissions" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "kb:create:finance",
      "kb:read:finance", 
      "kb:update:finance",
      "doc:upload:finance",
      "agent:use:financial-analyzer"
    ],
    "autoAssignAgents": ["financial-analyzer-v1"],
    "autoAssignKnowledgeBases": ["finance-policies-kb"]
  }'

# 3. Assign users
aws cognito-idp admin-add-user-to-group \
    --user-pool-id "us-east-1_f8w4Bbn1W" \
    --username "john.finance" \
    --group-name "finance-analyst"
```

This system allows admins to:
- ✅ Create new roles dynamically
- ✅ Set granular permissions 
- ✅ Auto-assign resources
- ✅ No code deployment needed
- ✅ Real-time permission changes