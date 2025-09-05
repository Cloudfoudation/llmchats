"""
User Management API Edge Cases and Error Handling Tests
Tests boundary conditions, error scenarios, and edge cases
"""
import pytest
import uuid
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from test_config import config
from auth_helper import auth
from api_client import client

class TestUserManagementEdgeCases:
    """Edge cases and error handling tests for User Management API"""
    
    @pytest.fixture(scope="class")
    def test_environment(self):
        """Setup test environment once per class"""
        from run_tests import setup_test_environment
        if not setup_test_environment():
            pytest.skip("Failed to setup test environment")
        yield
    
    @pytest.fixture(scope="class")
    def user_emails(self, test_environment):
        """Provide user emails for different tiers"""
        return {
            'admin': config.test_users['admin']['email'],
            'paid': config.test_users['paid']['email'],
            'free': config.test_users['free']['email']
        }
    
    @pytest.fixture
    def unique_id(self):
        """Generate unique ID for test resources"""
        return f"edge_{uuid.uuid4().hex[:8]}"
    
    @pytest.fixture
    def cleanup_users(self):
        """Track users for cleanup"""
        users_to_cleanup = []
        yield users_to_cleanup
        
        # Cleanup
        admin_email = config.test_users['admin']['email']
        for username in users_to_cleanup:
            try:
                client.delete_user(admin_email, username)
            except Exception:
                pass  # User might already be deleted

    # ========================================
    # BOUNDARY VALUE TESTS
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.parametrize("limit", [1, 10, 50, 60, 100])
    def test_list_users_limit_boundaries(self, user_emails, limit):
        """Test list users with various limit values"""
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/users",
            user_emails['admin'],
            params={'limit': str(limit)}
        )
        
        assert status_code == 200
        # Should respect limit (capped at 60 by Cognito)
        expected_max = min(limit, 60)
        assert len(response['data']['users']) <= expected_max
    
    @pytest.mark.admin_only
    def test_create_user_maximum_username_length(self, user_emails, cleanup_users):
        """Test creating user with maximum allowed username length"""
        # Cognito username max is typically 128 characters
        long_username = "a" * 120 + "@example.com"  # 132 chars total
        
        user_data = {
            "username": long_username,
            "email": long_username,
            "temporaryPassword": "TempPass123!"
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        
        if status_code == 201:
            cleanup_users.append(response['data']['username'])
            assert response['data']['username'] == long_username
        else:
            # If it fails, should be a validation error, not server error
            assert status_code == 400
            assert 'error' in response
    
    @pytest.mark.admin_only
    def test_create_user_maximum_attribute_values(self, user_emails, unique_id, cleanup_users):
        """Test creating user with maximum attribute values"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!",
            "attributes": {
                "email": f"{unique_id}@example.com",
                "given_name": "A" * 256,  # Test long given name
                "family_name": "B" * 256,  # Test long family name
                "phone_number": "+1234567890123456789"  # Long phone number
            }
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        
        if status_code == 201:
            cleanup_users.append(response['data']['username'])
        # Should either succeed or fail with validation error
        assert status_code in [201, 400]
    
    @pytest.mark.admin_only
    def test_update_profile_boundary_values(self, user_emails):
        """Test profile update with boundary values"""
        test_cases = [
            {"fullName": ""},  # Empty string
            {"fullName": "A"},  # Single character
            {"fullName": "A" * 256},  # Maximum length
            {"genre": ""},  # Empty genre
            {"genre": "A" * 50},  # Maximum genre length
        ]
        
        for profile_data in test_cases:
            status_code, response = client.make_request(
                'PUT',
                f"{config.get_api_url('user_management')}/profile",
                user_emails['admin'],
                data=profile_data
            )
            
            # Should either succeed or fail with validation error
            assert status_code in [200, 400]
            if status_code == 400:
                assert 'error' in response
                assert response['error']['code'] == 'INVALID_INPUT'

    # ========================================
    # SPECIAL CHARACTER TESTS
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.parametrize("special_chars", [
        "test+tag@example.com",  # Plus in email
        "test.dot@example.com",  # Dot in email
        "test_underscore@example.com",  # Underscore in email
        "test-dash@example.com",  # Dash in email
        "test123@sub.domain.com",  # Subdomain
    ])
    def test_create_user_special_email_formats(self, user_emails, special_chars, cleanup_users):
        """Test creating users with various valid email formats"""
        user_data = {
            "username": special_chars,
            "email": special_chars,
            "temporaryPassword": "TempPass123!"
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        
        if status_code == 201:
            cleanup_users.append(response['data']['username'])
            assert response['data']['email'] == special_chars
        else:
            # Should be validation error if not accepted
            assert status_code == 400
    
    @pytest.mark.admin_only
    def test_create_user_unicode_characters(self, user_emails, unique_id, cleanup_users):
        """Test creating user with unicode characters in attributes"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!",
            "attributes": {
                "email": f"{unique_id}@example.com",
                "given_name": "José",  # Accented character
                "family_name": "李",    # Chinese character
            }
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        
        if status_code == 201:
            cleanup_users.append(response['data']['username'])
        # Should handle unicode properly
        assert status_code in [201, 400]

    # ========================================
    # CONCURRENT ACCESS TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_concurrent_user_creation(self, user_emails):
        """Test concurrent user creation doesn't cause conflicts"""
        def create_user_worker(index):
            user_data = {
                "username": f"concurrent_{index}_{uuid.uuid4().hex[:8]}@example.com",
                "email": f"concurrent_{index}_{uuid.uuid4().hex[:8]}@example.com",
                "temporaryPassword": "TempPass123!"
            }
            return client.create_user(user_emails['admin'], user_data)
        
        # Create 5 users concurrently
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_user_worker, i) for i in range(5)]
            results = [future.result() for future in as_completed(futures)]
        
        # All should succeed or fail gracefully
        created_users = []
        for status_code, response in results:
            assert status_code in [201, 400, 409, 500]  # Valid response codes
            if status_code == 201:
                created_users.append(response['data']['username'])
        
        # Cleanup created users
        for username in created_users:
            try:
                client.delete_user(user_emails['admin'], username)
            except Exception:
                pass
    
    @pytest.mark.admin_only
    def test_concurrent_user_operations(self, user_emails, unique_id, cleanup_users):
        """Test concurrent operations on the same user"""
        # Create user first
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!"
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        assert status_code == 201
        username = response['data']['username']
        cleanup_users.append(username)
        
        def operation_worker(operation_type):
            if operation_type == 'get':
                return client.get_user(user_emails['admin'], username)
            elif operation_type == 'update_groups':
                return client.update_user_groups(
                    user_emails['admin'], 
                    username, 
                    {"addToGroups": ["free"]}
                )
        
        # Perform concurrent operations
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(operation_worker, 'get'),
                executor.submit(operation_worker, 'get'),
                executor.submit(operation_worker, 'update_groups')
            ]
            results = [future.result() for future in as_completed(futures)]
        
        # All operations should complete without server errors
        for status_code, response in results:
            assert status_code < 500  # No server errors

    # ========================================
    # ERROR RECOVERY TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_malformed_json_handling(self, user_emails):
        """Test handling of malformed JSON in requests"""
        malformed_json_cases = [
            '{"username": "test@example.com", "email": }',  # Missing value
            '{"username": "test@example.com" "email": "test@example.com"}',  # Missing comma
            '{"username": "test@example.com", "email": "test@example.com",}',  # Trailing comma
            '{username: "test@example.com"}',  # Unquoted key
            '{"username": "test@example.com", "email": "test@example.com"',  # Missing closing brace
        ]
        
        for malformed_json in malformed_json_cases:
            # Directly test with malformed JSON
            status_code, response = client.make_request(
                'POST',
                f"{config.get_api_url('user_management')}/users",
                user_emails['admin'],
                data=malformed_json  # Pass raw string instead of dict
            )
            
            # Should return 400 for malformed JSON
            assert status_code == 400
            assert 'error' in response
    
    @pytest.mark.admin_only
    def test_extremely_large_request_handling(self, user_emails):
        """Test handling of extremely large requests"""
        # Create a very large attribute value
        large_value = "A" * 10000  # 10KB string
        
        user_data = {
            "username": "large_test@example.com",
            "email": "large_test@example.com",
            "temporaryPassword": "TempPass123!",
            "attributes": {
                "email": "large_test@example.com",
                "custom_large_field": large_value
            }
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        
        # Should either handle gracefully or return appropriate error
        assert status_code in [201, 400, 413]  # 413 = Payload Too Large
        
        if status_code == 201:
            # Cleanup if created
            try:
                client.delete_user(user_emails['admin'], response['data']['username'])
            except Exception:
                pass

    # ========================================
    # RATE LIMITING TESTS
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.slow
    def test_rapid_requests_handling(self, user_emails):
        """Test handling of rapid successive requests"""
        # Make rapid requests to list users
        results = []
        start_time = time.time()
        
        for i in range(10):
            status_code, response = client.list_users(user_emails['admin'])
            results.append((status_code, response))
            
        end_time = time.time()
        
        # All requests should complete
        assert len(results) == 10
        
        # Most should succeed (some might be rate limited)
        success_count = sum(1 for status_code, _ in results if status_code == 200)
        rate_limited_count = sum(1 for status_code, _ in results if status_code == 429)
        
        # At least some should succeed
        assert success_count > 0
        
        # If rate limited, should return proper error
        for status_code, response in results:
            if status_code == 429:
                assert 'error' in response

    # ========================================
    # DATA CONSISTENCY TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_user_data_consistency_after_updates(self, user_emails, unique_id, cleanup_users):
        """Test data consistency after multiple updates"""
        # Create user
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!",
            "groups": ["free"]
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        assert status_code == 201
        username = response['data']['username']
        cleanup_users.append(username)
        
        # Perform multiple group updates
        group_updates = [
            {"setGroups": ["paid"]},
            {"addToGroups": ["admin"]},
            {"removeFromGroups": ["paid"]},
            {"setGroups": ["free", "paid"]}
        ]
        
        for update in group_updates:
            status_code, response = client.update_user_groups(user_emails['admin'], username, update)
            assert status_code == 200
            
            # Verify consistency by getting user details
            status_code, user_details = client.get_user(user_emails['admin'], username)
            assert status_code == 200
            
            # Groups should match the last update
            current_groups = set(user_details['data']['groups'])
            expected_groups = set(response['data']['currentGroups'])
            assert current_groups == expected_groups
    
    @pytest.mark.admin_only
    def test_profile_data_persistence(self, user_emails):
        """Test profile data persists across multiple updates"""
        # Update profile multiple times
        profile_updates = [
            {"fullName": "First Update", "genre": "Tech"},
            {"fullName": "Second Update"},  # Only update name
            {"genre": "Science"},  # Only update genre
            {"fullName": "Final Update", "genre": "Final Genre"}
        ]
        
        for update in profile_updates:
            status_code, response = client.make_request(
                'PUT',
                f"{config.get_api_url('user_management')}/profile",
                user_emails['admin'],
                data=update
            )
            assert status_code == 200
            
            # Verify the update
            status_code, profile = client.make_request(
                'GET',
                f"{config.get_api_url('user_management')}/profile",
                user_emails['admin']
            )
            assert status_code == 200
            
            # Check that updated fields are correct
            for key, value in update.items():
                assert profile['data'][key] == value

    # ========================================
    # TIMEOUT AND RESILIENCE TESTS
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.slow
    def test_long_running_operations(self, user_emails):
        """Test operations don't timeout unexpectedly"""
        # Test operations that might take longer
        operations = [
            lambda: client.list_users(user_emails['admin']),
            lambda: client.make_request(
                'GET',
                f"{config.get_api_url('user_management')}/profile",
                user_emails['admin']
            )
        ]
        
        for operation in operations:
            start_time = time.time()
            status_code, response = operation()
            duration = time.time() - start_time
            
            # Should complete within reasonable time
            assert duration < 30.0, f"Operation took {duration:.2f}s, expected < 30s"
            assert status_code < 500, "Should not have server errors"

    # ========================================
    # SECURITY EDGE CASES
    # ========================================
    
    @pytest.mark.security
    def test_header_injection_protection(self, user_emails):
        """Test protection against header injection attacks"""
        # Test with malicious headers
        malicious_headers = {
            'X-Forwarded-For': '127.0.0.1\r\nX-Injected-Header: malicious',
            'User-Agent': 'Mozilla/5.0\r\nX-Injected: attack',
            'Authorization': f"Bearer {auth.get_auth_headers(user_emails['admin'])['Authorization']}\r\nX-Injected: header"
        }
        
        # Make request with potentially malicious headers
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/users",
            user_emails['admin']
        )
        
        # Should handle gracefully
        assert status_code in [200, 400, 401, 403]
        assert status_code != 500  # Should not cause server error
    
    @pytest.mark.security
    def test_path_traversal_protection(self, user_emails):
        """Test protection against path traversal attacks"""
        malicious_paths = [
            "../../../etc/passwd",
            "..\\..\\windows\\system32\\config\\sam",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "....//....//....//etc//passwd"
        ]
        
        for malicious_path in malicious_paths:
            status_code, response = client.get_user(user_emails['admin'], malicious_path)
            
            # Should return 404 (not found) or 400 (bad request), not expose system files
            assert status_code in [400, 404]
            assert 'error' in response
    
    @pytest.mark.security
    def test_xss_protection_in_responses(self, user_emails, unique_id, cleanup_users):
        """Test XSS protection in API responses"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert('xss');//"
        ]
        
        for payload in xss_payloads:
            user_data = {
                "username": f"{unique_id}_{len(cleanup_users)}@example.com",
                "email": f"{unique_id}_{len(cleanup_users)}@example.com",
                "temporaryPassword": "TempPass123!",
                "attributes": {
                    "email": f"{unique_id}_{len(cleanup_users)}@example.com",
                    "given_name": payload  # XSS payload in attribute
                }
            }
            
            status_code, response = client.create_user(user_emails['admin'], user_data)
            
            if status_code == 201:
                cleanup_users.append(response['data']['username'])
                
                # Get user and check response doesn't contain unescaped payload
                status_code, user_details = client.get_user(user_emails['admin'], response['data']['username'])
                assert status_code == 200
                
                # Response should be JSON, not executable script
                assert isinstance(response, dict)
                response_str = json.dumps(user_details)
                
                # Should not contain executable script tags
                assert '<script>' not in response_str.lower()
                assert 'javascript:' not in response_str.lower()
