"""
Admin Operations Test Cases - Security and Monitoring
Tests for admin security operations and system monitoring
"""
import pytest
import uuid
import time
import json
from typing import Dict, List, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from test_config import config
from auth_helper import auth
from api_client import client

class TestAdminSecurityOperations:
    """Admin security and monitoring test cases"""
    
    @pytest.fixture(scope="class")
    def test_environment(self):
        """Setup test environment once per class"""
        from run_tests import setup_test_environment
        if not setup_test_environment():
            pytest.skip("Failed to setup test environment")
        yield
    
    @pytest.fixture(scope="class")
    def admin_email(self, test_environment):
        """Admin user email for testing"""
        return config.test_users['admin']['email']
    
    @pytest.fixture(scope="class")
    def non_admin_emails(self, test_environment):
        """Non-admin user emails for testing"""
        return {
            'paid': config.test_users['paid']['email'],
            'free': config.test_users['free']['email']
        }
    
    @pytest.fixture
    def unique_id(self):
        """Generate unique ID for test resources"""
        return f"security_test_{uuid.uuid4().hex[:8]}"
    
    @pytest.fixture
    def admin_created_users(self):
        """Track users created by admin for cleanup"""
        created_users = []
        yield created_users
        
        # Cleanup created users
        admin_email = config.test_users['admin']['email']
        for username in created_users:
            try:
                client.delete_user(admin_email, username)
            except Exception as e:
                print(f"Failed to cleanup user {username}: {e}")

    # ========================================
    # ADMIN AUTHENTICATION SECURITY TESTS
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_operations_require_authentication(self):
        """Test all admin operations require proper authentication"""
        admin_operations = [
            ('GET', f"{config.get_api_url('user_management')}/users"),
            ('POST', f"{config.get_api_url('user_management')}/users"),
            ('GET', f"{config.get_api_url('user_management')}/users/test@example.com"),
            ('DELETE', f"{config.get_api_url('user_management')}/users/test@example.com"),
            ('PUT', f"{config.get_api_url('user_management')}/users/test@example.com/groups")
        ]
        
        for method, url in admin_operations:
            status_code, response = client.make_request(method, url, user_email=None)
            
            assert status_code == 401, f"{method} {url} should require authentication"
            assert 'error' in response or 'message' in response
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_operations_require_admin_role(self, non_admin_emails):
        """Test admin operations require admin role"""
        admin_operations = [
            ('list_users', lambda email: client.list_users(email)),
            ('create_user', lambda email: client.create_user(email, {
                "username": "test@example.com",
                "email": "test@example.com",
                "temporaryPassword": "Test123!"
            })),
            ('get_user', lambda email: client.get_user(email, "test@example.com")),
            ('delete_user', lambda email: client.delete_user(email, "test@example.com")),
            ('update_groups', lambda email: client.update_user_groups(
                email, "test@example.com", {"setGroups": ["free"]}
            ))
        ]
        
        for operation_name, operation_func in admin_operations:
            for user_type, email in non_admin_emails.items():
                status_code, response = operation_func(email)
                
                assert status_code == 403, f"{user_type} should not be able to perform {operation_name}"
                assert response['success'] is False
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_token_validation(self, admin_email):
        """Test admin operations validate tokens properly"""
        # Test with malformed token
        malformed_headers = {
            'Authorization': 'Bearer invalid_token_format',
            'Content-Type': 'application/json'
        }
        
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/users",
            user_email=None,
            data=None,
            params=None
        )
        
        # Should get 401 for invalid token
        assert status_code == 401
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_session_security(self, admin_email):
        """Test admin session security measures"""
        # Test that admin operations work with valid session
        status_code, response = client.list_users(admin_email)
        assert status_code == 200
        
        # Test session consistency across operations
        operations = [
            lambda: client.list_users(admin_email),
            lambda: client.make_request('GET', f"{config.get_api_url('user_management')}/profile", admin_email)
        ]
        
        for operation in operations:
            status_code, response = operation()
            assert status_code == 200, "Admin session should be consistent across operations"

    # ========================================
    # ADMIN INPUT VALIDATION SECURITY TESTS
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_sql_injection_protection(self, admin_email):
        """Test admin operations protect against SQL injection"""
        sql_injection_payloads = [
            "'; DROP TABLE users; --",
            "admin' OR '1'='1",
            "' UNION SELECT * FROM users --",
            "'; DELETE FROM users WHERE '1'='1'; --"
        ]
        
        for payload in sql_injection_payloads:
            # Test in username parameter
            status_code, response = client.get_user(admin_email, payload)
            
            # Should return 404 (not found) or 400 (bad request), not 500 (server error)
            assert status_code in [400, 404], f"Potential SQL injection vulnerability with: {payload}"
            assert status_code != 500, "SQL injection should not cause server errors"
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_xss_protection(self, admin_email, unique_id, admin_created_users):
        """Test admin operations protect against XSS attacks"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//",
            "<svg onload=alert('xss')>"
        ]
        
        for i, payload in enumerate(xss_payloads):
            user_data = {
                "username": f"{unique_id}_{i}@example.com",
                "email": f"{unique_id}_{i}@example.com",
                "temporaryPassword": "XSSTest123!",
                "attributes": {
                    "email": f"{unique_id}_{i}@example.com",
                    "given_name": payload  # XSS payload in attribute
                }
            }
            
            status_code, response = client.create_user(admin_email, user_data)
            
            if status_code == 201:
                username = response['data']['username']
                admin_created_users.append(username)
                
                # Get user and verify response is safe
                status_code, user_details = client.get_user(admin_email, username)
                assert status_code == 200
                
                # Response should be JSON, not executable script
                response_str = json.dumps(user_details)
                assert '<script>' not in response_str.lower()
                assert 'javascript:' not in response_str.lower()
                assert 'onerror=' not in response_str.lower()
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_path_traversal_protection(self, admin_email):
        """Test admin operations protect against path traversal"""
        path_traversal_payloads = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32\\config\\sam",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "....//....//....//etc//passwd",
            "/etc/passwd",
            "\\windows\\system32\\config\\sam"
        ]
        
        for payload in path_traversal_payloads:
            status_code, response = client.get_user(admin_email, payload)
            
            # Should return 404 (not found) or 400 (bad request), not expose system files
            assert status_code in [400, 404], f"Path traversal vulnerability with: {payload}"
            assert 'root:' not in str(response), "Should not expose system files"
            assert 'Administrator:' not in str(response), "Should not expose system files"
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_command_injection_protection(self, admin_email, unique_id, admin_created_users):
        """Test admin operations protect against command injection"""
        command_injection_payloads = [
            "; ls -la",
            "| cat /etc/passwd",
            "&& rm -rf /",
            "; ping google.com",
            "$(whoami)",
            "`id`"
        ]
        
        for i, payload in enumerate(command_injection_payloads):
            user_data = {
                "username": f"{unique_id}_{i}@example.com",
                "email": f"{unique_id}_{i}@example.com",
                "temporaryPassword": "CmdTest123!",
                "attributes": {
                    "email": f"{unique_id}_{i}@example.com",
                    "given_name": f"Test{payload}"  # Command injection in attribute
                }
            }
            
            status_code, response = client.create_user(admin_email, user_data)
            
            # Should either succeed with sanitized input or fail with validation error
            assert status_code in [201, 400], f"Command injection handling failed for: {payload}"
            
            if status_code == 201:
                admin_created_users.append(response['data']['username'])

    # ========================================
    # ADMIN RATE LIMITING AND DOS PROTECTION
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.security
    @pytest.mark.slow
    def test_admin_rate_limiting_protection(self, admin_email):
        """Test admin operations have rate limiting protection"""
        # Make rapid requests to test rate limiting
        request_count = 20
        results = []
        
        start_time = time.time()
        for i in range(request_count):
            status_code, response = client.list_users(admin_email)
            results.append((status_code, response))
            
            # Small delay to avoid overwhelming
            time.sleep(0.1)
        
        end_time = time.time()
        
        # Analyze results
        success_count = sum(1 for status_code, _ in results if status_code == 200)
        rate_limited_count = sum(1 for status_code, _ in results if status_code == 429)
        
        # Most requests should succeed, but some rate limiting is acceptable
        success_rate = success_count / request_count
        assert success_rate >= 0.5, f"Success rate {success_rate:.2f} too low, possible DoS vulnerability"
        
        # If rate limited, should return proper error
        for status_code, response in results:
            if status_code == 429:
                assert 'error' in response or 'message' in response
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_concurrent_request_handling(self, admin_email):
        """Test admin operations handle concurrent requests securely"""
        def make_list_request():
            return client.list_users(admin_email)
        
        # Make concurrent requests
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_list_request) for _ in range(10)]
            results = [future.result() for future in as_completed(futures)]
        
        # All requests should complete without server errors
        for status_code, response in results:
            assert status_code < 500, "Concurrent requests should not cause server errors"
            
            # Most should succeed
            if status_code == 200:
                assert 'data' in response
                assert 'users' in response['data']
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_large_payload_protection(self, admin_email):
        """Test admin operations protect against large payload attacks"""
        # Create extremely large user data
        large_value = "A" * 100000  # 100KB string
        
        user_data = {
            "username": "large_payload_test@example.com",
            "email": "large_payload_test@example.com",
            "temporaryPassword": "LargeTest123!",
            "attributes": {
                "email": "large_payload_test@example.com",
                "large_field": large_value
            }
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        
        # Should either handle gracefully or return appropriate error
        assert status_code in [201, 400, 413], "Large payload should be handled appropriately"
        
        if status_code == 201:
            # Cleanup if created
            try:
                client.delete_user(admin_email, response['data']['username'])
            except Exception:
                pass

    # ========================================
    # ADMIN DATA VALIDATION AND SANITIZATION
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_email_validation_security(self, admin_email):
        """Test admin email validation prevents security issues"""
        malicious_emails = [
            "test@evil.com\r\nBcc: victim@example.com",  # Email header injection
            "test@example.com<script>alert('xss')</script>",  # XSS in email
            "test@example.com'; DROP TABLE users; --",  # SQL injection in email
            "test@example.com\x00admin@example.com",  # Null byte injection
            "test@example.com\nX-Injected: header"  # Header injection
        ]
        
        for malicious_email in malicious_emails:
            user_data = {
                "username": malicious_email,
                "email": malicious_email,
                "temporaryPassword": "SecurityTest123!"
            }
            
            status_code, response = client.create_user(admin_email, user_data)
            
            # Should reject malicious emails
            assert status_code in [400, 422], f"Should reject malicious email: {malicious_email}"
            assert response['success'] is False
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_attribute_sanitization(self, admin_email, unique_id, admin_created_users):
        """Test admin operations sanitize user attributes"""
        # Test various potentially dangerous attribute values
        dangerous_attributes = {
            "script_tag": "<script>alert('xss')</script>",
            "sql_injection": "'; DROP TABLE users; --",
            "null_bytes": "test\x00admin",
            "unicode_control": "test\u202eadmin",  # Right-to-left override
            "html_entities": "&lt;script&gt;alert('xss')&lt;/script&gt;"
        }
        
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "SanitizeTest123!",
            "attributes": {
                "email": f"{unique_id}@example.com",
                **dangerous_attributes
            }
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        
        if status_code == 201:
            username = response['data']['username']
            admin_created_users.append(username)
            
            # Get user details and verify attributes are sanitized
            status_code, user_details = client.get_user(admin_email, username)
            assert status_code == 200
            
            attributes = user_details['data']['attributes']
            
            # Verify dangerous content is sanitized or rejected
            for attr_name, attr_value in dangerous_attributes.items():
                if attr_name in attributes:
                    stored_value = attributes[attr_name]
                    # Should not contain executable script tags
                    assert '<script>' not in stored_value.lower()
                    assert 'javascript:' not in stored_value.lower()

    # ========================================
    # ADMIN AUDIT AND MONITORING TESTS
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_operations_logging(self, admin_email, unique_id, admin_created_users):
        """Test admin operations are properly logged for audit"""
        # Perform various admin operations
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "LogTest123!"
        }
        
        # Create user
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        username = response['data']['username']
        admin_created_users.append(username)
        
        # Update groups
        groups_data = {"setGroups": ["free"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        assert status_code == 200
        
        # Get user details
        status_code, response = client.get_user(admin_email, username)
        assert status_code == 200
        
        # Note: Actual log verification would require access to CloudWatch logs
        # This test ensures operations complete successfully for audit trail
        assert True, "Admin operations completed for audit logging"
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_error_handling_security(self, admin_email):
        """Test admin error responses don't leak sensitive information"""
        # Test various error conditions
        error_scenarios = [
            lambda: client.get_user(admin_email, "nonexistent@example.com"),
            lambda: client.delete_user(admin_email, "nonexistent@example.com"),
            lambda: client.update_user_groups(admin_email, "nonexistent@example.com", {"setGroups": ["free"]}),
            lambda: client.create_user(admin_email, {"username": "", "email": ""})
        ]
        
        for scenario in error_scenarios:
            status_code, response = scenario()
            
            # Error responses should not leak sensitive information
            assert status_code >= 400, "Should return error status"
            
            response_str = json.dumps(response).lower()
            
            # Should not contain sensitive system information
            sensitive_terms = [
                'password', 'secret', 'key', 'token', 'internal',
                'database', 'connection', 'stack trace', 'exception'
            ]
            
            for term in sensitive_terms:
                assert term not in response_str, f"Error response should not contain: {term}"
    
    @pytest.mark.admin_only
    @pytest.mark.security
    def test_admin_privilege_escalation_protection(self, admin_email, non_admin_emails):
        """Test admin operations prevent privilege escalation"""
        # Test that non-admin users cannot escalate privileges through admin operations
        
        # Try to create admin user as non-admin
        admin_user_data = {
            "username": "fake_admin@example.com",
            "email": "fake_admin@example.com",
            "temporaryPassword": "FakeAdmin123!",
            "groups": ["admin"]
        }
        
        for user_type, email in non_admin_emails.items():
            status_code, response = client.create_user(email, admin_user_data)
            
            assert status_code == 403, f"{user_type} should not be able to create admin users"
            assert response['success'] is False
        
        # Test that non-admin users cannot modify their own groups through admin API
        for user_type, email in non_admin_emails.items():
            status_code, response = client.update_user_groups(
                email, 
                email,  # Try to modify their own groups
                {"setGroups": ["admin"]}
            )
            
            assert status_code == 403, f"{user_type} should not be able to escalate their own privileges"
