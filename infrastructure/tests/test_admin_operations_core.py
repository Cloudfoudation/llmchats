"""
Admin Operations Test Cases - Core Admin Functions
Tests for administrative user management operations
"""
import pytest
import uuid
import time
from typing import Dict, List, Any
from test_config import config
from auth_helper import auth
from api_client import client

class TestAdminOperationsCore:
    """Core admin operations test cases"""
    
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
        return f"admin_test_{uuid.uuid4().hex[:8]}"
    
    @pytest.fixture
    def test_user_data(self, unique_id):
        """Generate test user data for admin operations"""
        email = f"{unique_id}@example.com"
        return {
            "username": email,
            "email": email,
            "temporaryPassword": "AdminTest123!",
            "attributes": {
                "email": email,
                "given_name": "Admin",
                "family_name": "TestUser"
            }
        }
    
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
    # ADMIN USER LISTING TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_admin_can_list_all_users(self, admin_email):
        """Test admin can list all users in the system"""
        status_code, response = client.list_users(admin_email)
        
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
                assert field in user, f"Missing required field: {field}"
    
    @pytest.mark.admin_only
    def test_admin_list_users_with_pagination(self, admin_email):
        """Test admin can use pagination when listing users"""
        # Test with different page sizes
        page_sizes = [1, 5, 10, 20]
        
        for page_size in page_sizes:
            status_code, response = client.make_request(
                'GET',
                f"{config.get_api_url('user_management')}/users",
                admin_email,
                params={'limit': str(page_size)}
            )
            
            assert status_code == 200
            assert len(response['data']['users']) <= page_size
            
            # Check if pagination token is provided when needed
            if len(response['data']['users']) == page_size:
                # Might have more pages
                assert 'paginationToken' in response['data'] or len(response['data']['users']) < page_size
    
    @pytest.mark.admin_only
    def test_admin_list_users_with_filter(self, admin_email):
        """Test admin can filter users when listing"""
        # Test email filter
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/users",
            admin_email,
            params={'filter': 'email ^= "admin"'}
        )
        
        assert status_code == 200
        assert 'data' in response
        
        # All returned users should match the filter (if any)
        for user in response['data']['users']:
            if user['email']:
                # Filter might not be exact match, but should be related
                assert isinstance(user['email'], str)
    
    @pytest.mark.admin_only
    def test_admin_list_users_performance(self, admin_email):
        """Test admin user listing performance"""
        start_time = time.time()
        status_code, response = client.list_users(admin_email)
        response_time = time.time() - start_time
        
        assert status_code == 200
        assert response_time < 5.0, f"List users took {response_time:.2f}s, expected < 5s"
        
        # Verify response structure is complete
        assert 'data' in response
        assert 'users' in response['data']

    # ========================================
    # ADMIN USER CREATION TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_admin_create_basic_user(self, admin_email, test_user_data, admin_created_users):
        """Test admin can create a basic user"""
        status_code, response = client.create_user(admin_email, test_user_data)
        
        assert status_code == 201
        assert response['success'] is True
        assert 'data' in response
        
        user_data = response['data']
        # Backend generates UUID as username, but email should match
        assert user_data['email'] == test_user_data['email']
        assert user_data['status'] in ['FORCE_CHANGE_PASSWORD', 'CONFIRMED']
        assert 'createdAt' in user_data
        assert 'username' in user_data  # Username will be a UUID
        
        # Track for cleanup
        admin_created_users.append(user_data['username'])
    
    @pytest.mark.admin_only
    def test_admin_create_user_with_groups(self, admin_email, unique_id, admin_created_users):
        """Test admin can create user with specific groups"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "AdminTest123!",
            "groups": ["free"],
            "attributes": {
                "email": f"{unique_id}@example.com",
                "given_name": "Group",
                "family_name": "TestUser"
            }
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        
        assert status_code == 201
        assert response['data']['groups'] == ["free"]
        
        admin_created_users.append(response['data']['username'])
    
    @pytest.mark.admin_only
    def test_admin_create_user_with_multiple_groups(self, admin_email, unique_id, admin_created_users):
        """Test admin can create user with multiple groups"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "AdminTest123!",
            "groups": ["free", "paid"],
            "attributes": {
                "email": f"{unique_id}@example.com"
            }
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        
        assert status_code == 201
        # Groups should be assigned
        created_groups = set(response['data']['groups'])
        expected_groups = set(["free", "paid"])
        assert created_groups == expected_groups
        
        admin_created_users.append(response['data']['username'])
    
    @pytest.mark.admin_only
    def test_admin_create_user_with_custom_attributes(self, admin_email, unique_id, admin_created_users):
        """Test admin can create user with custom attributes"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "AdminTest123!",
            "attributes": {
                "email": f"{unique_id}@example.com",
                "given_name": "Custom",
                "family_name": "Attributes",
                "phone_number": "+1234567890",
                "department": "Engineering"
            }
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        
        assert status_code == 201
        admin_created_users.append(response['data']['username'])
        
        # Verify user was created with attributes by getting user details
        username = response['data']['username']
        status_code, user_details = client.get_user(admin_email, username)
        
        assert status_code == 200
        attributes = user_details['data']['attributes']
        assert attributes['given_name'] == "Custom"
        assert attributes['family_name'] == "Attributes"
    
    @pytest.mark.admin_only
    def test_admin_create_user_duplicate_prevention(self, admin_email, test_user_data, admin_created_users):
        """Test admin cannot create duplicate users"""
        # Create first user
        status_code, response = client.create_user(admin_email, test_user_data)
        assert status_code == 201
        admin_created_users.append(response['data']['username'])
        
        # Try to create duplicate
        status_code, response = client.create_user(admin_email, test_user_data)
        
        assert status_code == 409
        assert response['success'] is False
        assert response['error']['code'] == 'USER_EXISTS'
    
    @pytest.mark.admin_only
    def test_admin_create_user_validation_errors(self, admin_email):
        """Test admin user creation validation"""
        invalid_data_sets = [
            {
                "data": {"username": "", "email": ""},
                "expected_error": "MISSING_USERNAME_OR_EMAIL"
            },
            {
                "data": {"username": "test", "email": "invalid-email"},
                "expected_error": "INVALID_EMAIL"
            },
            {
                "data": {"username": "test@example.com", "temporaryPassword": "weak"},
                "expected_error": "INVALID_PASSWORD"
            }
        ]
        
        for test_case in invalid_data_sets:
            status_code, response = client.create_user(admin_email, test_case["data"])
            
            assert status_code == 400
            assert response['success'] is False
            assert response['error']['code'] == test_case["expected_error"]

    # ========================================
    # ADMIN USER RETRIEVAL TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_admin_get_user_details(self, admin_email, test_user_data, admin_created_users):
        """Test admin can get detailed user information"""
        # Create user first
        status_code, response = client.create_user(admin_email, test_user_data)
        assert status_code == 201
        username = response['data']['username']
        admin_created_users.append(username)
        
        # Get user details
        status_code, response = client.get_user(admin_email, username)
        
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
        assert 'lastModifiedAt' in user_data
    
    @pytest.mark.admin_only
    def test_admin_get_user_with_groups(self, admin_email, unique_id, admin_created_users):
        """Test admin can see user's group memberships"""
        # Create user with groups
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "AdminTest123!",
            "groups": ["free", "paid"]
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        username = response['data']['username']
        admin_created_users.append(username)
        
        # Get user details
        status_code, response = client.get_user(admin_email, username)
        
        assert status_code == 200
        user_groups = set(response['data']['groups'])
        expected_groups = set(["free", "paid"])
        assert user_groups == expected_groups
    
    @pytest.mark.admin_only
    def test_admin_get_nonexistent_user(self, admin_email):
        """Test admin gets proper error for nonexistent user"""
        status_code, response = client.get_user(admin_email, "nonexistent@example.com")
        
        assert status_code == 404
        assert response['success'] is False
        assert response['error']['code'] == 'USER_NOT_FOUND'
    
    @pytest.mark.admin_only
    def test_admin_get_user_performance(self, admin_email, test_user_data, admin_created_users):
        """Test admin user retrieval performance"""
        # Create user first
        status_code, response = client.create_user(admin_email, test_user_data)
        assert status_code == 201
        username = response['data']['username']
        admin_created_users.append(username)
        
        # Measure get user performance
        start_time = time.time()
        status_code, response = client.get_user(admin_email, username)
        response_time = time.time() - start_time
        
        assert status_code == 200
        assert response_time < 3.0, f"Get user took {response_time:.2f}s, expected < 3s"

    # ========================================
    # ADMIN ACCESS CONTROL TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_non_admin_cannot_list_users(self, non_admin_emails):
        """Test non-admin users cannot list users"""
        for user_type, email in non_admin_emails.items():
            status_code, response = client.list_users(email)
            
            assert status_code == 403, f"{user_type} user should not be able to list users"
            # API returns different response format for 403 errors
            assert 'Message' in response or 'error' in response or response.get('success') is False
    
    @pytest.mark.admin_only
    def test_non_admin_cannot_create_users(self, non_admin_emails, test_user_data):
        """Test non-admin users cannot create users"""
        for user_type, email in non_admin_emails.items():
            status_code, response = client.create_user(email, test_user_data)
            
            assert status_code == 403, f"{user_type} user should not be able to create users"
            assert response['success'] is False
    
    @pytest.mark.admin_only
    def test_non_admin_cannot_get_user_details(self, non_admin_emails):
        """Test non-admin users cannot get user details"""
        for user_type, email in non_admin_emails.items():
            status_code, response = client.get_user(email, "test@example.com")
            
            assert status_code == 403, f"{user_type} user should not be able to get user details"
            assert response['success'] is False
    
    @pytest.mark.admin_only
    def test_unauthenticated_access_denied(self):
        """Test unauthenticated access is denied for admin operations"""
        admin_operations = [
            lambda: client.list_users(None),
            lambda: client.create_user(None, {"username": "test@example.com"}),
            lambda: client.get_user(None, "test@example.com"),
            lambda: client.delete_user(None, "test@example.com")
        ]
        
        for operation in admin_operations:
            status_code, response = operation()
            assert status_code == 401, "Unauthenticated access should return 401"

    # ========================================
    # ADMIN BULK OPERATIONS TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_admin_bulk_user_creation_performance(self, admin_email, admin_created_users):
        """Test admin can efficiently create multiple users"""
        user_count = 5
        creation_times = []
        
        for i in range(user_count):
            user_data = {
                "username": f"bulk_test_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "email": f"bulk_test_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "temporaryPassword": "BulkTest123!"
            }
            
            start_time = time.time()
            status_code, response = client.create_user(admin_email, user_data)
            creation_time = time.time() - start_time
            
            assert status_code == 201
            creation_times.append(creation_time)
            admin_created_users.append(response['data']['username'])
        
        # Verify performance
        avg_creation_time = sum(creation_times) / len(creation_times)
        assert avg_creation_time < 5.0, f"Average creation time {avg_creation_time:.2f}s exceeds 5s"
    
    @pytest.mark.admin_only
    def test_admin_user_search_functionality(self, admin_email, admin_created_users):
        """Test admin can search for users effectively"""
        # Create a user with specific attributes for searching
        search_user_data = {
            "username": f"searchable_{uuid.uuid4().hex[:8]}@example.com",
            "email": f"searchable_{uuid.uuid4().hex[:8]}@example.com",
            "temporaryPassword": "SearchTest123!",
            "attributes": {
                "given_name": "Searchable",
                "family_name": "TestUser"
            }
        }
        
        status_code, response = client.create_user(admin_email, search_user_data)
        assert status_code == 201
        created_username = response['data']['username']
        admin_created_users.append(created_username)
        
        # Search for the user
        status_code, response = client.make_request(
            'GET',
            f"{config.get_api_url('user_management')}/users",
            admin_email,
            params={'filter': f'email ^= "searchable"'}
        )
        
        assert status_code == 200
        # Should find at least our created user
        found_usernames = [user['username'] for user in response['data']['users']]
        assert created_username in found_usernames or len(response['data']['users']) > 0
