"""
Enhanced test framework with improved structure and utilities
"""
import unittest
import time
import json
import uuid
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum
from test_config import config
from auth_helper import auth
from api_client import client

class UserTier(Enum):
    """User tier enumeration"""
    ADMIN = "admin"
    PAID = "paid"
    FREE = "free"

@dataclass
class TestCase:
    """Enhanced test case data structure"""
    name: str
    method: str
    endpoint: str
    user_tier: UserTier
    data: Optional[Dict] = None
    params: Optional[Dict] = None
    expected_status: int = 200
    expected_response_keys: Optional[List[str]] = None
    setup_func: Optional[Callable] = None
    cleanup_func: Optional[Callable] = None
    depends_on: Optional[List[str]] = None

class BaseAPITest(unittest.TestCase):
    """Enhanced base test class with common utilities"""
    
    @classmethod
    def setUpClass(cls):
        """Setup test class with enhanced error handling"""
        try:
            from run_tests import setup_test_environment
            if not setup_test_environment():
                raise Exception("Failed to setup test environment")
            
            cls.admin_email = config.test_users['admin']['email']
            cls.paid_email = config.test_users['paid']['email']
            cls.free_email = config.test_users['free']['email']
            cls.test_resources = {}  # Store created resources for cleanup
            cls.test_data_cache = {}  # Cache test data between tests
            
        except Exception as e:
            cls.skipTest(cls, f"Test environment setup failed: {e}")
    
    @classmethod
    def tearDownClass(cls):
        """Enhanced cleanup with resource tracking"""
        if hasattr(cls, 'test_resources'):
            cls.cleanup_test_resources()
    
    @classmethod
    def cleanup_test_resources(cls):
        """Clean up all created test resources"""
        # Override in subclasses to implement specific cleanup
        pass
    
    def get_user_email(self, user_tier: UserTier) -> str:
        """Get user email by tier"""
        tier_map = {
            UserTier.ADMIN: self.admin_email,
            UserTier.PAID: self.paid_email,
            UserTier.FREE: self.free_email
        }
        return tier_map[user_tier]
    
    def generate_unique_id(self, prefix: str = "test") -> str:
        """Generate unique ID for test resources"""
        return f"{prefix}_{uuid.uuid4().hex[:8]}"
    
    def assert_response_structure(self, response: Dict, expected_keys: List[str]):
        """Assert response has expected structure"""
        for key in expected_keys:
            if '.' in key:
                # Handle nested keys like 'data.users'
                keys = key.split('.')
                current = response
                for k in keys:
                    self.assertIn(k, current, f"Missing key: {key}")
                    current = current[k]
            else:
                self.assertIn(key, response, f"Missing key: {key}")
    
    def assert_error_response(self, status_code: int, response: Dict, expected_error_code: str = None):
        """Assert error response structure"""
        self.assertGreaterEqual(status_code, 400)
        self.assertIn('error', response)
        if expected_error_code:
            self.assertEqual(response['error'].get('code'), expected_error_code)
    
    def wait_for_async_operation(self, check_func: Callable, timeout: int = 30, interval: int = 2) -> bool:
        """Wait for async operation to complete"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if check_func():
                return True
            time.sleep(interval)
        return False
    
    def run_test_case(self, test_case: TestCase) -> tuple:
        """Execute a test case with enhanced error handling"""
        try:
            # Setup if needed
            if test_case.setup_func:
                test_case.setup_func()
            
            # Get user email
            user_email = self.get_user_email(test_case.user_tier)
            
            # Make API call
            status_code, response = client.make_request(
                method=test_case.method,
                url=f"{config.get_api_url(test_case.endpoint.split('/')[0])}{test_case.endpoint}",
                user_email=user_email,
                data=test_case.data,
                params=test_case.params
            )
            
            # Cleanup if needed
            if test_case.cleanup_func:
                test_case.cleanup_func()
            
            return status_code, response
            
        except Exception as e:
            self.fail(f"Test case {test_case.name} failed with exception: {e}")

class PerformanceTestMixin:
    """Mixin for performance testing capabilities"""
    
    def measure_response_time(self, func: Callable, *args, **kwargs) -> tuple:
        """Measure API response time"""
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        response_time = end_time - start_time
        return result, response_time
    
    def assert_response_time(self, response_time: float, max_time: float):
        """Assert response time is within acceptable limits"""
        self.assertLessEqual(response_time, max_time, 
                           f"Response time {response_time:.2f}s exceeds limit {max_time}s")

class SecurityTestMixin:
    """Mixin for security testing capabilities"""
    
    def test_unauthorized_access(self, endpoint: str, method: str = 'GET'):
        """Test unauthorized access to endpoint"""
        status_code, response = client.make_request(method, endpoint, user_email=None)
        self.assertEqual(status_code, 401)
    
    def test_forbidden_access(self, endpoint: str, user_tier: UserTier, method: str = 'GET'):
        """Test forbidden access for user tier"""
        user_email = self.get_user_email(user_tier)
        status_code, response = client.make_request(method, endpoint, user_email=user_email)
        self.assertEqual(status_code, 403)
    
    def test_input_validation(self, endpoint: str, user_tier: UserTier, 
                            invalid_data: Dict, method: str = 'POST'):
        """Test input validation with invalid data"""
        user_email = self.get_user_email(user_tier)
        status_code, response = client.make_request(
            method, endpoint, user_email=user_email, data=invalid_data
        )
        self.assertEqual(status_code, 400)

class DataTestMixin:
    """Mixin for data integrity testing"""
    
    def assert_data_consistency(self, created_data: Dict, retrieved_data: Dict, 
                              ignore_keys: List[str] = None):
        """Assert data consistency between create and retrieve operations"""
        ignore_keys = ignore_keys or ['id', 'createdAt', 'updatedAt', 'userId']
        
        for key, value in created_data.items():
            if key not in ignore_keys:
                self.assertEqual(retrieved_data.get(key), value, 
                               f"Data inconsistency for key: {key}")
    
    def test_crud_operations(self, api_prefix: str, user_tier: UserTier, 
                           create_data: Dict, update_data: Dict):
        """Test complete CRUD operations for a resource"""
        user_email = self.get_user_email(user_tier)
        
        # Create
        status_code, response = client.make_request(
            'POST', f"{config.get_api_url(api_prefix)}/{api_prefix}", 
            user_email=user_email, data=create_data
        )
        self.assertEqual(status_code, 201)
        resource_id = response['data']['id']
        
        # Read
        status_code, response = client.make_request(
            'GET', f"{config.get_api_url(api_prefix)}/{api_prefix}/{resource_id}",
            user_email=user_email
        )
        self.assertEqual(status_code, 200)
        self.assert_data_consistency(create_data, response['data'])
        
        # Update
        status_code, response = client.make_request(
            'PUT', f"{config.get_api_url(api_prefix)}/{api_prefix}/{resource_id}",
            user_email=user_email, data=update_data
        )
        self.assertEqual(status_code, 200)
        
        # Delete
        status_code, response = client.make_request(
            'DELETE', f"{config.get_api_url(api_prefix)}/{api_prefix}/{resource_id}",
            user_email=user_email
        )
        self.assertEqual(status_code, 204)
        
        return resource_id

class IntegrationTestMixin:
    """Mixin for integration testing capabilities"""
    
    def test_workflow(self, steps: List[TestCase]):
        """Test a complete workflow with multiple steps"""
        results = {}
        
        for step in steps:
            # Check dependencies
            if step.depends_on:
                for dep in step.depends_on:
                    self.assertIn(dep, results, f"Dependency {dep} not satisfied")
            
            # Execute step
            status_code, response = self.run_test_case(step)
            
            # Validate
            self.assertEqual(status_code, step.expected_status)
            if step.expected_response_keys:
                self.assert_response_structure(response, step.expected_response_keys)
            
            # Store result for dependencies
            results[step.name] = {
                'status_code': status_code,
                'response': response
            }
        
        return results
