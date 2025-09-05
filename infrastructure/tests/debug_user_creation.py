#!/usr/bin/env python3
"""
Debug script to investigate user creation failure
"""
import sys
import os
import uuid

# Add the tests directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_config import config
from api_client import APIClient
from auth_helper import auth

def debug_user_creation():
    """Debug user creation issue"""
    print("Setting up test environment...")
    
    # Setup auth
    auth.setup_cognito(
        "ap-southeast-1_weNlrlAd9",  # User Pool ID from previous output
        "7rkp796f2lf7h196fqcsnlb0d8",  # Client ID from previous output
        "ap-southeast-1:805a07cc-bd94-40ed-8932-0c668a86943b"  # Identity Pool ID from previous output
    )
    
    # Setup test users
    print("Setting up test users...")
    auth.setup_test_users()
    
    # Setup API endpoints
    api_endpoints = {
        'user_management': 'https://t0u6jxvrtf.execute-api.ap-southeast-1.amazonaws.com/dev',
        'group_management': 'https://ofpjsm2pag.execute-api.ap-southeast-1.amazonaws.com/dev',
        'shared_resources': 'https://9hux2nwz4k.execute-api.ap-southeast-1.amazonaws.com/dev',
        'knowledge_base': 'https://g14d5k5a8a.execute-api.ap-southeast-1.amazonaws.com/dev',
        'agent_management': 'https://4mo9fx7ftk.execute-api.ap-southeast-1.amazonaws.com/dev',
        'document': 'https://6z37zyw5s3.execute-api.ap-southeast-1.amazonaws.com/dev',
        'profile': 'https://60d6aov165.execute-api.ap-southeast-1.amazonaws.com/dev'
    }
    config.set_api_endpoints(api_endpoints)
    
    # Create API client
    client = APIClient()
    
    # Test data
    admin_email = config.test_users['admin']['email']
    test_username = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    
    user_data = {
        "username": test_username,
        "email": test_username,
        "temporaryPassword": "TempPass123!",
        "attributes": {
            "email": test_username
        }
    }
    
    print(f"Admin email: {admin_email}")
    print(f"Test username: {test_username}")
    print(f"User data: {user_data}")
    print()
    
    # Check if admin user is authenticated
    print("Checking admin authentication...")
    if admin_email in auth.tokens:
        print(f"Admin user has token: {auth.tokens[admin_email] is not None}")
    else:
        print("Admin user not found in tokens")
    
    # Try to list users first (should work for admin)
    print("\nTesting admin access with list users...")
    status_code, response = client.list_users(admin_email)
    print(f"List users - Status Code: {status_code}")
    if status_code != 200:
        print(f"List users - Response: {response}")
    
    # Try to create user
    print("\nAttempting to create user...")
    status_code, response = client.create_user(admin_email, user_data)
    
    print(f"Create user - Status Code: {status_code}")
    print(f"Create user - Response: {response}")
    
    if status_code >= 400:
        print(f"\n=== ERROR DETAILS ===")
        if 'error' in response:
            print(f"Error: {response['error']}")
        if 'message' in response:
            print(f"Message: {response['message']}")
        if 'details' in response:
            print(f"Details: {response['details']}")
        if 'errorMessage' in response:
            print(f"Error Message: {response['errorMessage']}")
        if 'errorType' in response:
            print(f"Error Type: {response['errorType']}")

if __name__ == '__main__':
    debug_user_creation()
