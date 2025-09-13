#!/bin/bash

echo "Adding user to RBAC Users table..."

aws dynamodb put-item \
  --region us-east-1 \
  --table-name gsis-poc-users \
  --item '{
    "userId": {"S": "c4c8e488-c001-7032-f934-22b22d6a3d84"},
    "email": {"S": "admin@gsis.com"},
    "username": {"S": "admin@gsis.com"},
    "roles": {"L": [{"S": "admin"}]},
    "createdAt": {"S": "2024-09-12T12:00:00Z"}
  }'

echo "User added successfully!"
