#!/usr/bin/env python3
"""
Debug script that exactly mimics the test
"""
import sys
import os
import uuid

# Add the tests directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_config import config
from api_client import APIClient
from auth_helper import auth

def debug_exact_test():
    """Debug exactly what the test does"""
    print("=== EXACT TEST REPLICATION ===")
    
    # This is exactly what the test class does
    admin_email = config.test_users['admin']['email']
    paid_email = config.test_users['paid']['email']
    free_email = config.test_users['free']['email']
    
    print(f"Admin email: {admin_email}")
    print(f"Paid email: {paid_email}")
    print(f"Free email: {free_email}")
    
    # Create API client exactly like the test
    client = APIClient()
    
    # Generate unique username like the updated test
    test_username = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    
    user_data = {
        "username": test_username,
        "email": test_username,
        "temporaryPassword": "TempPass123!",
        "attributes": {
            "email": test_username
        }
    }
    
    print(f"Test username: {test_username}")
    print(f"User data: {user_data}")
    print()
    
    # Call exactly like the test
    print("Calling client.create_user...")
    status_code, response = client.create_user(admin_email, user_data)
    
    print(f"Status Code: {status_code}")
    print(f"Response: {response}")
    
    if status_code >= 400:
        print(f"\n=== ERROR DETAILS ===")
        if 'error' in response:
            print(f"Error: {response['error']}")
        if 'message' in response:
            print(f"Message: {response['message']}")

if __name__ == '__main__':
    debug_exact_test()
