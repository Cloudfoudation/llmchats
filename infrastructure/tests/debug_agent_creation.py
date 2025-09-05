#!/usr/bin/env python3
"""
Debug script to investigate agent creation failure
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

def debug_agent_creation():
    """Debug agent creation issue"""
    print("Setting up test environment...")
    
    # Setup test environment (API endpoints and auth)
    if not setup_test_environment():
        print("Failed to setup test environment")
        return
    
    # Create API client
    client = APIClient()
    
    # Test data
    paid_email = config.test_users['paid']['email']
    test_agent_data = {
        "name": f"Test Agent {uuid.uuid4().hex[:8]}",
        "description": "A test agent for API testing",
        "systemPrompt": "You are a helpful test assistant. Answer questions clearly and concisely.",
        "model": "anthropic.claude-3-sonnet-20240229-v1:0"
    }
    
    print(f"Paid email: {paid_email}")
    print(f"Agent data: {test_agent_data}")
    print()
    
    # Try to create agent
    print("Attempting to create agent...")
    status_code, response = client.create_agent(paid_email, test_agent_data)
    
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
    debug_agent_creation()
