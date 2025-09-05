"""
Comprehensive User Management API Test Cases
Tests all user management endpoints with various scenarios
"""
import pytest
import uuid
import json
import time
from typing import Dict, List, Any
from test_config import config
from auth_helper import auth
from api_client import client

class TestUserManagementAPI:
    """Comprehensive User Management API tests"""
    
    @pytest.fixture(scope="class")
    def test_environment(self):
        """Setup test environment once per class"""
        from run_tests import setup_test_environment
        if not setup_test_environment():
            pytest.skip("Failed to setup test environment")
        yield
        # Cleanup handled by individual tests
    
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
        return f"test_{uuid.uuid4().hex[:8]}"
    
    @pytest.fixture
    def test_user_data(self, unique_id):
        """Generate test user data"""
        email = f"{unique_id}@example.com"
        return {
            "username": email,
            "email": email,
            "temporaryPassword": "TempPass123!",
            "attributes": {
                "email": email,
                "given_name": "Test",
                "family_name": "User"
            }
        }
    
    @pytest.fixture
    def created_test_users(self):
        """Track created test users for cleanup"""
        users = []
        yield users
        # Cleanup created users
        admin_email = config.test_users['admin']['email']
        for username in users:
            try:
                client.delete_user(admin_email, username)
            except Exception as e:
                print(f"Failed to cleanup user {username}: {e}")

    # ========================================
    # LIST USERS TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_list_users_admin_success(self, user_emails):
        """Test admin can successfully list users"""
        status_code, response = client.list_users(user_emails['admin'])
        
        assert status_code == 200
        assert response['success'] is True
        assert 'data' in response
        assert 'users' in response['data']
        assert isinstance(response['data']['users'], list)
        
        # Verify user structure
        if response['data']['users']:
            user = response['data']['users'][0]
            required_fields = ['username', 'email', 'status', 'enabled', 'createdAt', 'groups']
            for field in required_fields:
                assert field in user, f"Missing field: {field}"
    
    @pytest.mark.admin_only
    def test_list_users_with_pagination(self, user_emails):
        """Test user listing with pagination parameters"""
        # Test with limit
        status_code, response = client.make_request(
            'GET', 
            f"{config.get_api_url('user_management')}/users",
            user_emails['admin'],
            params={'limit': '2'}
        )
        
        assert status_code == 200
        assert 'data' in response
        assert len(response['data']['users']) <= 2
    
    @pytest.mark.admin_only
    def test_list_users_with_filter(self, user_emails):
        """Test user listing with filter"""
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/users",
            user_emails['admin'],
            params={'filter': 'email ^= "test"'}
        )
        
        assert status_code == 200
        assert 'data' in response
    
    @pytest.mark.parametrize("user_tier", ["paid", "free"])
    def test_list_users_non_admin_forbidden(self, user_emails, user_tier):
        """Test non-admin users cannot list users"""
        status_code, response = client.list_users(user_emails[user_tier])
        
        assert status_code == 403
        assert response['success'] is False
        assert 'error' in response
        assert response['error']['code'] in ['FORBIDDEN', 'ACCESS_DENIED']
    
    def test_list_users_unauthorized(self):
        """Test unauthorized access to list users"""
        status_code, response = client.list_users(None)
        
        assert status_code == 401

    # ========================================
    # CREATE USER TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_create_user_success(self, user_emails, test_user_data, created_test_users):
        """Test admin can successfully create user"""
        status_code, response = client.create_user(user_emails['admin'], test_user_data)
        
        assert status_code == 201
        assert response['success'] is True
        assert 'data' in response
        
        user_data = response['data']
        assert user_data['username'] == test_user_data['username']
        assert user_data['email'] == test_user_data['email']
        assert user_data['status'] in ['FORCE_CHANGE_PASSWORD', 'CONFIRMED']
        assert 'createdAt' in user_data
        
        # Track for cleanup
        created_test_users.append(user_data['username'])
    
    @pytest.mark.admin_only
    def test_create_user_with_groups(self, user_emails, unique_id, created_test_users):
        """Test creating user with group assignment"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!",
            "groups": ["free"],
            "attributes": {"email": f"{unique_id}@example.com"}
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        
        assert status_code == 201
        assert response['data']['groups'] == ["free"]
        
        created_test_users.append(response['data']['username'])
    
    @pytest.mark.admin_only
    def test_create_user_with_custom_attributes(self, user_emails, unique_id, created_test_users):
        """Test creating user with custom attributes"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!",
            "attributes": {
                "email": f"{unique_id}@example.com",
                "given_name": "John",
                "family_name": "Doe",
                "phone_number": "+1234567890"
            }
        }
        
        status_code, response = client.create_user(user_emails['admin'], user_data)
        
        assert status_code == 201
        created_test_users.append(response['data']['username'])
    
    @pytest.mark.admin_only
    def test_create_user_duplicate_username(self, user_emails, test_user_data, created_test_users):
        """Test creating user with duplicate username fails"""
        # Create first user
        status_code, response = client.create_user(user_emails['admin'], test_user_data)
        assert status_code == 201
        created_test_users.append(response['data']['username'])
        
        # Try to create duplicate
        status_code, response = client.create_user(user_emails['admin'], test_user_data)
        
        assert status_code == 409
        assert response['success'] is False
        assert response['error']['code'] == 'USER_EXISTS'
    
    @pytest.mark.admin_only
    @pytest.mark.parametrize("invalid_data,expected_error", [
        ({"username": "", "email": ""}, "MISSING_USERNAME_OR_EMAIL"),
        ({"username": "test", "email": "invalid-email"}, "INVALID_EMAIL"),
        ({"username": "test@example.com", "temporaryPassword": "weak"}, "INVALID_PASSWORD"),
        ({}, "MISSING_USERNAME_OR_EMAIL")
    ])
    def test_create_user_validation_errors(self, user_emails, invalid_data, expected_error):
        """Test user creation validation errors"""
        status_code, response = client.create_user(user_emails['admin'], invalid_data)
        
        assert status_code == 400
        assert response['success'] is False
        assert response['error']['code'] == expected_error
    
    @pytest.mark.parametrize("user_tier", ["paid", "free"])
    def test_create_user_non_admin_forbidden(self, user_emails, test_user_data, user_tier):
        """Test non-admin users cannot create users"""
        status_code, response = client.create_user(user_emails[user_tier], test_user_data)
        
        assert status_code == 403
        assert response['success'] is False

    # ========================================
    # GET USER TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_get_user_success(self, user_emails, test_user_data, created_test_users):
        """Test admin can get user details"""
        # Create user first
        status_code, response = client.create_user(user_emails['admin'], test_user_data)
        assert status_code == 201
        username = response['data']['username']
        created_test_users.append(username)
        
        # Get user details
        status_code, response = client.get_user(user_emails['admin'], username)
        
        assert status_code == 200
        assert response['success'] is True
        assert 'data' in response
        
        user_data = response['data']
        assert user_data['username'] == username
        assert user_data['email'] == test_user_data['email']
        assert 'attributes' in user_data
        assert 'groups' in user_data
        assert 'status' in user_data
        assert 'createdAt' in user_data
    
    @pytest.mark.admin_only
    def test_get_user_not_found(self, user_emails):
        """Test getting non-existent user returns 404"""
        status_code, response = client.get_user(user_emails['admin'], "nonexistent@example.com")
        
        assert status_code == 404
        assert response['success'] is False
        assert response['error']['code'] == 'USER_NOT_FOUND'
    
    @pytest.mark.parametrize("user_tier", ["paid", "free"])
    def test_get_user_non_admin_forbidden(self, user_emails, user_tier):
        """Test non-admin users cannot get user details"""
        status_code, response = client.get_user(user_emails[user_tier], "test@example.com")
        
        assert status_code == 403

    # ========================================
    # UPDATE USER GROUPS TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_update_user_groups_set_groups(self, user_emails, test_user_data, created_test_users):
        """Test setting user groups"""
        # Create user first
        status_code, response = client.create_user(user_emails['admin'], test_user_data)
        assert status_code == 201
        username = response['data']['username']
        created_test_users.append(username)
        
        # Set groups
        groups_data = {"setGroups": ["free", "paid"]}
        status_code, response = client.update_user_groups(user_emails['admin'], username, groups_data)
        
        assert status_code == 200
        assert response['success'] is True
        assert response['data']['currentGroups'] == ["free", "paid"]
        assert response['data']['added'] == ["free", "paid"]
    
    @pytest.mark.admin_only
    def test_update_user_groups_add_remove(self, user_emails, test_user_data, created_test_users):
        """Test adding and removing user groups"""
        # Create user with initial group
        test_user_data['groups'] = ['free']
        status_code, response = client.create_user(user_emails['admin'], test_user_data)
        assert status_code == 201
        username = response['data']['username']
        created_test_users.append(username)
        
        # Add group
        groups_data = {"addToGroups": ["paid"]}
        status_code, response = client.update_user_groups(user_emails['admin'], username, groups_data)
        
        assert status_code == 200
        assert "paid" in response['data']['currentGroups']
        assert "free" in response['data']['currentGroups']
        
        # Remove group
        groups_data = {"removeFromGroups": ["free"]}
        status_code, response = client.update_user_groups(user_emails['admin'], username, groups_data)
        
        assert status_code == 200
        assert "paid" in response['data']['currentGroups']
        assert "free" not in response['data']['currentGroups']
    
    @pytest.mark.admin_only
    def test_update_user_groups_user_not_found(self, user_emails):
        """Test updating groups for non-existent user"""
        groups_data = {"setGroups": ["free"]}
        status_code, response = client.update_user_groups(
            user_emails['admin'], 
            "nonexistent@example.com", 
            groups_data
        )
        
        assert status_code == 404
        assert response['error']['code'] == 'USER_NOT_FOUND'
    
    @pytest.mark.parametrize("user_tier", ["paid", "free"])
    def test_update_user_groups_non_admin_forbidden(self, user_emails, user_tier):
        """Test non-admin users cannot update user groups"""
        groups_data = {"setGroups": ["free"]}
        status_code, response = client.update_user_groups(
            user_emails[user_tier], 
            "test@example.com", 
            groups_data
        )
        
        assert status_code == 403

    # ========================================
    # DELETE USER TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_delete_user_success(self, user_emails, test_user_data):
        """Test admin can delete user"""
        # Create user first
        status_code, response = client.create_user(user_emails['admin'], test_user_data)
        assert status_code == 201
        username = response['data']['username']
        
        # Delete user
        status_code, response = client.delete_user(user_emails['admin'], username)
        
        assert status_code == 200
        assert response['success'] is True
        assert "deleted successfully" in response['message']
        
        # Verify user is deleted
        status_code, response = client.get_user(user_emails['admin'], username)
        assert status_code == 404
    
    @pytest.mark.admin_only
    def test_delete_user_not_found(self, user_emails):
        """Test deleting non-existent user returns 404"""
        status_code, response = client.delete_user(user_emails['admin'], "nonexistent@example.com")
        
        assert status_code == 404
        assert response['error']['code'] == 'USER_NOT_FOUND'
    
    @pytest.mark.parametrize("user_tier", ["paid", "free"])
    def test_delete_user_non_admin_forbidden(self, user_emails, user_tier):
        """Test non-admin users cannot delete users"""
        status_code, response = client.delete_user(user_emails[user_tier], "test@example.com")
        
        assert status_code == 403

    # ========================================
    # USER PROFILE TESTS
    # ========================================
    
    def test_get_current_user_profile_admin(self, user_emails):
        """Test admin can get their own profile"""
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/profile",
            user_emails['admin']
        )
        
        assert status_code == 200
        assert response['success'] is True
        assert 'data' in response
        
        profile = response['data']
        required_fields = ['email', 'fullName', 'genre', 'givenName', 'familyName', 'picture']
        for field in required_fields:
            assert field in profile
    
    @pytest.mark.parametrize("user_tier", ["admin", "paid", "free"])
    def test_get_current_user_profile_all_tiers(self, user_emails, user_tier):
        """Test all user tiers can get their own profile"""
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/profile",
            user_emails[user_tier]
        )
        
        assert status_code == 200
        assert response['success'] is True
        assert 'data' in response
    
    def test_get_profile_unauthorized(self):
        """Test unauthorized access to profile"""
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/profile",
            user_email=None
        )
        
        assert status_code == 401
    
    @pytest.mark.parametrize("user_tier", ["admin", "paid", "free"])
    def test_update_current_user_profile(self, user_emails, user_tier):
        """Test users can update their own profile"""
        profile_data = {
            "fullName": "Updated Test User",
            "genre": "Technology"
        }
        
        status_code, response = client.make_request(
            'PUT',
            f"{config.get_api_url('user_management')}/profile",
            user_emails[user_tier],
            data=profile_data
        )
        
        assert status_code == 200
        assert response['success'] is True
        assert response['data']['fullName'] == profile_data['fullName']
        assert response['data']['genre'] == profile_data['genre']
    
    @pytest.mark.parametrize("invalid_data,expected_status", [
        ({"fullName": "x" * 300}, 400),  # Too long
        ({"genre": "x" * 100}, 400),     # Too long
    ])
    def test_update_profile_validation(self, user_emails, invalid_data, expected_status):
        """Test profile update validation"""
        status_code, response = client.make_request(
            'PUT',
            f"{config.get_api_url('user_management')}/profile",
            user_emails['admin'],
            data=invalid_data
        )
        
        assert status_code == expected_status
        if status_code == 400:
            assert response['success'] is False
            assert response['error']['code'] == 'INVALID_INPUT'

    # ========================================
    # INTEGRATION TESTS
    # ========================================
    
    @pytest.mark.integration
    def test_complete_user_lifecycle(self, user_emails, unique_id):
        """Test complete user lifecycle from creation to deletion"""
        admin_email = user_emails['admin']
        
        # Step 1: Create user
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!",
            "groups": ["free"],
            "attributes": {
                "email": f"{unique_id}@example.com",
                "given_name": "Integration",
                "family_name": "Test"
            }
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        username = response['data']['username']
        
        try:
            # Step 2: Get user details
            status_code, response = client.get_user(admin_email, username)
            assert status_code == 200
            assert response['data']['username'] == username
            assert "free" in response['data']['groups']
            
            # Step 3: Update user groups
            groups_data = {"setGroups": ["paid"]}
            status_code, response = client.update_user_groups(admin_email, username, groups_data)
            assert status_code == 200
            assert response['data']['currentGroups'] == ["paid"]
            
            # Step 4: Verify group update
            status_code, response = client.get_user(admin_email, username)
            assert status_code == 200
            assert "paid" in response['data']['groups']
            assert "free" not in response['data']['groups']
            
        finally:
            # Step 5: Delete user
            status_code, response = client.delete_user(admin_email, username)
            assert status_code == 200
    
    @pytest.mark.integration
    def test_user_list_after_operations(self, user_emails, unique_id):
        """Test user listing reflects create/delete operations"""
        admin_email = user_emails['admin']
        
        # Get initial user count
        status_code, response = client.list_users(admin_email)
        assert status_code == 200
        initial_count = len(response['data']['users'])
        
        # Create user
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!"
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        username = response['data']['username']
        
        try:
            # Verify user count increased
            status_code, response = client.list_users(admin_email)
            assert status_code == 200
            assert len(response['data']['users']) == initial_count + 1
            
            # Verify new user is in list
            usernames = [user['username'] for user in response['data']['users']]
            assert username in usernames
            
        finally:
            # Delete user
            client.delete_user(admin_email, username)
            
            # Verify user count decreased
            status_code, response = client.list_users(admin_email)
            assert status_code == 200
            assert len(response['data']['users']) == initial_count

    # ========================================
    # PERFORMANCE TESTS
    # ========================================
    
    @pytest.mark.performance
    def test_list_users_performance(self, user_emails):
        """Test list users performance"""
        start_time = time.time()
        status_code, response = client.list_users(user_emails['admin'])
        response_time = time.time() - start_time
        
        assert status_code == 200
        assert response_time < 5.0, f"List users took {response_time:.2f}s, expected < 5s"
    
    @pytest.mark.performance
    def test_create_user_performance(self, user_emails, unique_id):
        """Test create user performance"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "TempPass123!"
        }
        
        start_time = time.time()
        status_code, response = client.create_user(user_emails['admin'], user_data)
        response_time = time.time() - start_time
        
        assert status_code == 201
        assert response_time < 10.0, f"Create user took {response_time:.2f}s, expected < 10s"
        
        # Cleanup
        if status_code == 201:
            client.delete_user(user_emails['admin'], response['data']['username'])

    # ========================================
    # SECURITY TESTS
    # ========================================
    
    @pytest.mark.security
    @pytest.mark.parametrize("endpoint,method", [
        ("/users", "GET"),
        ("/users", "POST"),
        ("/users/test@example.com", "GET"),
        ("/users/test@example.com", "DELETE"),
        ("/users/test@example.com/groups", "PUT"),
        ("/profile", "GET"),
        ("/profile", "PUT")
    ])
    def test_authentication_required(self, endpoint, method):
        """Test all endpoints require authentication"""
        full_url = f"{config.get_api_url('user_management')}{endpoint}"
        status_code, response = client.make_request(method, full_url, user_email=None)
        
        assert status_code == 401
    
    @pytest.mark.security
    def test_sql_injection_protection(self, user_emails):
        """Test SQL injection protection in user operations"""
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "admin' OR '1'='1",
            "<script>alert('xss')</script>",
            "../../etc/passwd"
        ]
        
        for malicious_input in malicious_inputs:
            # Test in username parameter
            status_code, response = client.get_user(user_emails['admin'], malicious_input)
            # Should return 404 (not found) or 400 (bad request), not 500 (server error)
            assert status_code in [400, 404], f"Potential injection vulnerability with input: {malicious_input}"
    
    @pytest.mark.security
    def test_user_enumeration_protection(self, user_emails):
        """Test protection against user enumeration attacks"""
        # Test with non-existent user
        status_code, response = client.get_user(user_emails['admin'], "definitely_not_a_user@example.com")
        assert status_code == 404
        
        # Test with malformed email
        status_code, response = client.get_user(user_emails['admin'], "not-an-email")
        assert status_code == 404
        
        # Both should return same error structure
        assert 'error' in response
        assert response['error']['code'] == 'USER_NOT_FOUND'
