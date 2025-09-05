"""
User Management Test Configuration and Utilities
Specific configuration and helper functions for user management tests
"""
import uuid
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from test_config import config

@dataclass
class UserTestData:
    """Test user data structure"""
    username: str
    email: str
    password: str
    groups: List[str]
    attributes: Dict[str, str]

@dataclass
class TestScenario:
    """Test scenario configuration"""
    name: str
    description: str
    user_tier: str
    expected_status: int
    test_data: Dict[str, Any]
    cleanup_required: bool = True

class UserManagementTestConfig:
    """Configuration class for user management tests"""
    
    # Test data templates
    VALID_USER_TEMPLATE = {
        "temporaryPassword": "TempPass123!",
        "attributes": {
            "given_name": "Test",
            "family_name": "User"
        }
    }
    
    INVALID_USER_DATA = [
        {
            "name": "empty_username_email",
            "data": {"username": "", "email": ""},
            "expected_error": "MISSING_USERNAME_OR_EMAIL"
        },
        {
            "name": "invalid_email_format",
            "data": {"username": "test", "email": "invalid-email"},
            "expected_error": "INVALID_EMAIL"
        },
        {
            "name": "weak_password",
            "data": {"username": "test@example.com", "temporaryPassword": "weak"},
            "expected_error": "INVALID_PASSWORD"
        },
        {
            "name": "missing_required_fields",
            "data": {},
            "expected_error": "MISSING_USERNAME_OR_EMAIL"
        }
    ]
    
    # Special email formats for testing
    SPECIAL_EMAIL_FORMATS = [
        "test+tag@example.com",
        "test.dot@example.com", 
        "test_underscore@example.com",
        "test-dash@example.com",
        "test123@sub.domain.com"
    ]
    
    # Unicode test data
    UNICODE_TEST_DATA = {
        "given_name_accented": "José",
        "family_name_chinese": "李",
        "given_name_arabic": "محمد",
        "family_name_cyrillic": "Иванов"
    }
    
    # Performance test thresholds
    PERFORMANCE_THRESHOLDS = {
        "list_users_avg": 2.0,
        "list_users_max": 5.0,
        "get_user_avg": 1.5,
        "create_user_avg": 3.0,
        "update_groups_avg": 2.0,
        "delete_user_avg": 2.0,
        "profile_get_avg": 1.0,
        "profile_update_avg": 2.0
    }
    
    # Load test configurations
    LOAD_TEST_CONFIGS = {
        "light_load": {
            "concurrent_users": 5,
            "requests_per_user": 10,
            "duration": 30
        },
        "medium_load": {
            "concurrent_users": 10,
            "requests_per_user": 20,
            "duration": 60
        },
        "heavy_load": {
            "concurrent_users": 20,
            "requests_per_user": 50,
            "duration": 120
        }
    }
    
    @staticmethod
    def generate_unique_user_data(prefix: str = "test") -> Dict[str, Any]:
        """Generate unique user data for testing"""
        unique_id = f"{prefix}_{uuid.uuid4().hex[:8]}"
        email = f"{unique_id}@example.com"
        
        return {
            "username": email,
            "email": email,
            **UserManagementTestConfig.VALID_USER_TEMPLATE,
            "attributes": {
                **UserManagementTestConfig.VALID_USER_TEMPLATE["attributes"],
                "email": email
            }
        }
    
    @staticmethod
    def generate_user_with_groups(groups: List[str], prefix: str = "test") -> Dict[str, Any]:
        """Generate user data with specific groups"""
        user_data = UserManagementTestConfig.generate_unique_user_data(prefix)
        user_data["groups"] = groups
        return user_data
    
    @staticmethod
    def generate_profile_test_data() -> Dict[str, Any]:
        """Generate profile test data"""
        return {
            "fullName": f"Test User {uuid.uuid4().hex[:8]}",
            "genre": "Technology"
        }
    
    @staticmethod
    def get_boundary_test_values() -> Dict[str, List[Any]]:
        """Get boundary test values for various fields"""
        return {
            "username_lengths": [
                "",  # Empty
                "a",  # Single char
                "a" * 64,  # Normal length
                "a" * 128,  # Max length
                "a" * 256  # Over limit
            ],
            "email_lengths": [
                "a@b.c",  # Minimal valid
                "a" * 50 + "@example.com",  # Long local part
                "test@" + "a" * 200 + ".com"  # Long domain
            ],
            "attribute_lengths": [
                "",  # Empty
                "A",  # Single char
                "A" * 256,  # Normal max
                "A" * 1000  # Over limit
            ],
            "list_limits": [1, 5, 10, 20, 50, 60, 100]
        }

class UserManagementTestUtils:
    """Utility functions for user management tests"""
    
    @staticmethod
    def create_test_users_batch(count: int, prefix: str = "batch") -> List[Dict[str, Any]]:
        """Create a batch of test user data"""
        users = []
        for i in range(count):
            user_data = UserManagementTestConfig.generate_unique_user_data(f"{prefix}_{i}")
            users.append(user_data)
        return users
    
    @staticmethod
    def validate_user_response_structure(response: Dict[str, Any]) -> bool:
        """Validate user response has correct structure"""
        required_fields = ['username', 'email', 'status', 'enabled', 'createdAt', 'groups']
        
        if 'data' not in response:
            return False
        
        user_data = response['data']
        if isinstance(user_data, list):
            # List response
            if not user_data:
                return True  # Empty list is valid
            user_data = user_data[0]  # Check first user
        
        return all(field in user_data for field in required_fields)
    
    @staticmethod
    def validate_error_response_structure(response: Dict[str, Any]) -> bool:
        """Validate error response has correct structure"""
        return (
            'success' in response and 
            response['success'] is False and
            'error' in response and
            'code' in response['error'] and
            'message' in response['error']
        )
    
    @staticmethod
    def extract_usernames_from_response(response: Dict[str, Any]) -> List[str]:
        """Extract usernames from list users response"""
        if 'data' not in response or 'users' not in response['data']:
            return []
        
        return [user['username'] for user in response['data']['users']]
    
    @staticmethod
    def wait_for_user_creation(client, admin_email: str, username: str, 
                             timeout: int = 30, interval: int = 2) -> bool:
        """Wait for user creation to be reflected in the system"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            status_code, response = client.get_user(admin_email, username)
            if status_code == 200:
                return True
            elif status_code == 404:
                time.sleep(interval)
                continue
            else:
                # Unexpected error
                return False
        
        return False
    
    @staticmethod
    def cleanup_test_users(client, admin_email: str, usernames: List[str]) -> Dict[str, bool]:
        """Clean up multiple test users and return cleanup status"""
        cleanup_results = {}
        
        for username in usernames:
            try:
                status_code, response = client.delete_user(admin_email, username)
                cleanup_results[username] = status_code in [200, 204, 404]  # 404 means already deleted
            except Exception as e:
                cleanup_results[username] = False
        
        return cleanup_results
    
    @staticmethod
    def measure_operation_time(operation_func, *args, **kwargs) -> tuple:
        """Measure operation execution time"""
        start_time = time.time()
        result = operation_func(*args, **kwargs)
        execution_time = time.time() - start_time
        return result, execution_time
    
    @staticmethod
    def generate_malicious_inputs() -> Dict[str, List[str]]:
        """Generate malicious inputs for security testing"""
        return {
            "sql_injection": [
                "'; DROP TABLE users; --",
                "admin' OR '1'='1",
                "' UNION SELECT * FROM users --"
            ],
            "xss_payloads": [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "<img src=x onerror=alert('xss')>",
                "';alert('xss');//"
            ],
            "path_traversal": [
                "../../../etc/passwd",
                "..\\..\\windows\\system32\\config\\sam",
                "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
            ],
            "header_injection": [
                "test\r\nX-Injected-Header: malicious",
                "test\nSet-Cookie: admin=true"
            ]
        }
    
    @staticmethod
    def create_stress_test_scenario(operation_type: str, intensity: str = "medium") -> Dict[str, Any]:
        """Create stress test scenario configuration"""
        base_configs = UserManagementTestConfig.LOAD_TEST_CONFIGS
        
        if intensity not in base_configs:
            intensity = "medium"
        
        config_data = base_configs[intensity].copy()
        config_data["operation_type"] = operation_type
        config_data["name"] = f"{operation_type}_{intensity}_load"
        
        return config_data

class UserManagementTestReporter:
    """Test reporting utilities for user management tests"""
    
    def __init__(self):
        self.test_results = []
        self.performance_metrics = {}
        self.security_findings = []
    
    def add_test_result(self, test_name: str, status: str, duration: float, 
                       details: Dict[str, Any] = None):
        """Add test result to reporter"""
        self.test_results.append({
            "test_name": test_name,
            "status": status,
            "duration": duration,
            "details": details or {},
            "timestamp": time.time()
        })
    
    def add_performance_metric(self, operation: str, metric_type: str, value: float):
        """Add performance metric"""
        if operation not in self.performance_metrics:
            self.performance_metrics[operation] = {}
        self.performance_metrics[operation][metric_type] = value
    
    def add_security_finding(self, test_name: str, severity: str, description: str):
        """Add security finding"""
        self.security_findings.append({
            "test_name": test_name,
            "severity": severity,
            "description": description,
            "timestamp": time.time()
        })
    
    def generate_summary_report(self) -> Dict[str, Any]:
        """Generate summary report"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["status"] == "PASSED"])
        failed_tests = total_tests - passed_tests
        
        avg_duration = sum(r["duration"] for r in self.test_results) / total_tests if total_tests > 0 else 0
        
        return {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                "average_duration": avg_duration
            },
            "performance_metrics": self.performance_metrics,
            "security_findings": self.security_findings,
            "detailed_results": self.test_results
        }
    
    def print_summary(self):
        """Print summary to console"""
        report = self.generate_summary_report()
        summary = report["summary"]
        
        print(f"\n{'='*60}")
        print("USER MANAGEMENT TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Success Rate: {summary['success_rate']:.1f}%")
        print(f"Average Duration: {summary['average_duration']:.3f}s")
        
        if self.performance_metrics:
            print(f"\nPerformance Metrics:")
            for operation, metrics in self.performance_metrics.items():
                print(f"  {operation}:")
                for metric, value in metrics.items():
                    print(f"    {metric}: {value:.3f}s")
        
        if self.security_findings:
            print(f"\nSecurity Findings: {len(self.security_findings)}")
            for finding in self.security_findings:
                print(f"  {finding['severity']}: {finding['description']}")
        
        print(f"{'='*60}")

# Global instances
user_test_config = UserManagementTestConfig()
user_test_utils = UserManagementTestUtils()
user_test_reporter = UserManagementTestReporter()
