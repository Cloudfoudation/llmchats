#!/usr/bin/env python3
"""
Main test runner for all API tests
"""
import sys
import os
import unittest
import boto3
import json
from typing import Dict, Any
import time

# Add the tests directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_config import config
from auth_helper import auth

def get_stack_outputs(stack_name: str, region: str) -> Dict[str, Any]:
    """Get CloudFormation stack outputs"""
    cloudformation = boto3.client('cloudformation', region_name=region)
    
    try:
        response = cloudformation.describe_stacks(StackName=stack_name)
        stack = response['Stacks'][0]
        
        outputs = {}
        if 'Outputs' in stack:
            for output in stack['Outputs']:
                outputs[output['OutputKey']] = output['OutputValue']
                
        return outputs
    except Exception as e:
        print(f"Error getting stack outputs: {e}")
        return {}

def setup_test_environment():
    """Setup test environment with API endpoints and authentication"""
    print("Setting up test environment...")
    
    # Get stack outputs
    outputs = get_stack_outputs(config.stack_name, config.region)
    
    if not outputs:
        print(f"Failed to get outputs from stack {config.stack_name}")
        return False
    
    # Set API endpoints
    api_endpoints = {
        'user_management': outputs.get('UserManagementApiUrl', '').rstrip('/'),
        'group_management': outputs.get('GroupManagementApiUrl', '').rstrip('/'),
        'shared_resources': outputs.get('SharedResourcesApiUrl', '').rstrip('/'),
        'knowledge_base': outputs.get('KnowledgeBaseApiUrl', '').rstrip('/'),
        'agent_management': outputs.get('AgentManagementApiUrl', '').rstrip('/'),
        'document': outputs.get('DocumentApiUrl', '').rstrip('/'),
        'profile': outputs.get('ProfileApiUrl', '').rstrip('/')
    }
    
    config.set_api_endpoints(api_endpoints)
    
    # Setup Cognito configuration
    user_pool_id = outputs.get('UserPoolId')
    user_pool_client_id = outputs.get('UserPoolClientId')
    identity_pool_id = outputs.get('IdentityPoolId')
    
    if not all([user_pool_id, user_pool_client_id, identity_pool_id]):
        print("Missing required Cognito configuration")
        return False
        
    auth.setup_cognito(user_pool_id, user_pool_client_id, identity_pool_id)
    
    # Setup test users
    print("Setting up test users...")
    if not auth.setup_test_users():
        print("Warning: Failed to setup all test users")
        
    print("Test environment setup complete!")
    print(f"API Endpoints configured:")
    for name, url in api_endpoints.items():
        print(f"  {name}: {url}")
        
    return True

def cleanup_test_environment():
    """Cleanup test environment"""
    print("Cleaning up test environment...")
    auth.cleanup_test_users()
    print("Cleanup complete!")

def run_test_suite(test_modules: list = None):
    """Run the test suite"""
    if test_modules is None:
        test_modules = [
            'test_user_management',
            'test_group_management', 
            'test_shared_resources',
            'test_knowledge_base',
            'test_agent_management'
        ]
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    for module_name in test_modules:
        try:
            module = __import__(module_name)
            suite.addTests(loader.loadTestsFromModule(module))
        except ImportError as e:
            print(f"Failed to import test module {module_name}: {e}")
            continue
    
    # Run tests
    runner = unittest.TextTestRunner(
        verbosity=2,
        buffer=True,
        failfast=False
    )
    
    print(f"\nRunning {suite.countTestCases()} tests...")
    result = runner.run(suite)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped) if hasattr(result, 'skipped') else 0}")
    
    if result.failures:
        print(f"\nFAILURES:")
        for test, traceback in result.failures:
            error_msg = traceback.split('AssertionError: ')[-1].split('\n')[0]
            print(f"- {test}: {error_msg}")
    
    if result.errors:
        print(f"\nERRORS:")
        for test, traceback in result.errors:
            error_msg = traceback.split('\n')[-2]
            print(f"- {test}: {error_msg}")
    
    success_rate = ((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100) if result.testsRun > 0 else 0
    print(f"\nSuccess Rate: {success_rate:.1f}%")
    
    return result.wasSuccessful()

def main():
    """Main function"""
    print("API Test Suite")
    print("=" * 60)
    
    # Setup environment
    if not setup_test_environment():
        print("Failed to setup test environment")
        sys.exit(1)
    
    try:
        # Run tests
        success = run_test_suite()
        
        if success:
            print("\n🎉 ALL TESTS PASSED!")
        else:
            print("\n❌ SOME TESTS FAILED!")
            
    except KeyboardInterrupt:
        print("\nTest execution interrupted by user")
    except Exception as e:
        print(f"\nUnexpected error during test execution: {e}")
        success = False
    finally:
        # Cleanup
        cleanup_test_environment()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()