#!/usr/bin/env python3
"""
Debug script to investigate group creation failure
"""
import sys
import os
import uuid

# Add the tests directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_config import config
from api_client import APIClient
from auth_helper import auth
from run_tests import setup_test_environment

def debug_group_creation():
    """Debug group creation issue"""
    print("Setting up test environment...")
    
    # Setup test environment (API endpoints and auth)
    if not setup_test_environment():
        print("Failed to setup test environment")
        return
    
    # Create API client
    client = APIClient()
    
    # Test data
    paid_email = config.test_users['paid']['email']
    test_group_data = {
        "name": f"Test Group {uuid.uuid4().hex[:8]}",
        "description": "A test group for API testing"
    }
    
    print(f"Paid email: {paid_email}")
    print(f"Group data: {test_group_data}")
    print()
    
    # Try to create group
    print("Attempting to create group...")
    status_code, response = client.create_group(paid_email, test_group_data)
    
    print(f"Status Code: {status_code}")
    print(f"Response: {response}")
    
    if status_code >= 400:
        print(f"\n=== ERROR DETAILS ===")
        if 'error' in response:
            print(f"Error: {response['error']}")
        if 'message' in response:
            print(f"Message: {response['message']}")
        if 'details' in response:
            print(f"Details: {response['details']}")

if __name__ == '__main__':
    debug_group_creation()
