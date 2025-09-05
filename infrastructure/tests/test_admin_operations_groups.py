"""
Admin Operations Test Cases - Group Management and User Modifications
Tests for admin group management and user modification operations
"""
import pytest
import uuid
import time
from typing import Dict, List, Any
from test_config import config
from auth_helper import auth
from api_client import client

class TestAdminGroupManagement:
    """Admin group management and user modification test cases"""
    
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
        return f"group_test_{uuid.uuid4().hex[:8]}"
    
    @pytest.fixture
    def test_user_for_groups(self, admin_email, unique_id):
        """Create a test user for group operations"""
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "GroupTest123!",
            "attributes": {
                "email": f"{unique_id}@example.com",
                "given_name": "Group",
                "family_name": "TestUser"
            }
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        
        username = response['data']['username']
        yield username
        
        # Cleanup
        try:
            client.delete_user(admin_email, username)
        except Exception as e:
            print(f"Failed to cleanup test user {username}: {e}")
    
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
    # ADMIN GROUP ASSIGNMENT TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_admin_set_user_groups(self, admin_email, test_user_for_groups):
        """Test admin can set user groups"""
        username = test_user_for_groups
        
        # Set groups
        groups_data = {"setGroups": ["free"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        
        assert status_code == 200
        assert response['success'] is True
        assert response['data']['currentGroups'] == ["free"]
        assert response['data']['added'] == ["free"]
        assert response['data']['removed'] == []
    
    @pytest.mark.admin_only
    def test_admin_set_multiple_groups(self, admin_email, test_user_for_groups):
        """Test admin can set multiple groups for user"""
        username = test_user_for_groups
        
        # Set multiple groups
        groups_data = {"setGroups": ["free", "paid"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        
        assert status_code == 200
        current_groups = set(response['data']['currentGroups'])
        expected_groups = set(["free", "paid"])
        assert current_groups == expected_groups
    
    @pytest.mark.admin_only
    def test_admin_add_groups_to_user(self, admin_email, test_user_for_groups):
        """Test admin can add groups to existing user groups"""
        username = test_user_for_groups
        
        # First set initial group
        groups_data = {"setGroups": ["free"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        assert status_code == 200
        
        # Add another group
        groups_data = {"addToGroups": ["paid"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        
        assert status_code == 200
        current_groups = set(response['data']['currentGroups'])
        assert "free" in current_groups
        assert "paid" in current_groups
        assert "paid" in response['data']['added']
    
    @pytest.mark.admin_only
    def test_admin_remove_groups_from_user(self, admin_email, test_user_for_groups):
        """Test admin can remove groups from user"""
        username = test_user_for_groups
        
        # First set multiple groups
        groups_data = {"setGroups": ["free", "paid"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        assert status_code == 200
        
        # Remove one group
        groups_data = {"removeFromGroups": ["paid"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        
        assert status_code == 200
        current_groups = response['data']['currentGroups']
        assert "free" in current_groups
        assert "paid" not in current_groups
        assert "paid" in response['data']['removed']
    
    @pytest.mark.admin_only
    def test_admin_replace_user_groups(self, admin_email, test_user_for_groups):
        """Test admin can completely replace user groups"""
        username = test_user_for_groups
        
        # Set initial groups
        groups_data = {"setGroups": ["free"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        assert status_code == 200
        
        # Replace with different groups
        groups_data = {"setGroups": ["paid", "admin"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        
        assert status_code == 200
        current_groups = set(response['data']['currentGroups'])
        expected_groups = set(["paid", "admin"])
        assert current_groups == expected_groups
        
        # Verify previous groups were removed
        assert "free" in response['data']['removed']
        assert set(response['data']['added']) == expected_groups
    
    @pytest.mark.admin_only
    def test_admin_clear_all_user_groups(self, admin_email, test_user_for_groups):
        """Test admin can clear all groups from user"""
        username = test_user_for_groups
        
        # Set initial groups
        groups_data = {"setGroups": ["free", "paid"]}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        assert status_code == 200
        
        # Clear all groups
        groups_data = {"setGroups": []}
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        
        assert status_code == 200
        assert response['data']['currentGroups'] == []
        assert set(response['data']['removed']) == set(["free", "paid"])
    
    @pytest.mark.admin_only
    def test_admin_group_operations_nonexistent_user(self, admin_email):
        """Test admin group operations on nonexistent user"""
        groups_data = {"setGroups": ["free"]}
        status_code, response = client.update_user_groups(
            admin_email, 
            "nonexistent@example.com", 
            groups_data
        )
        
        assert status_code == 404
        assert response['success'] is False
        assert response['error']['code'] == 'USER_NOT_FOUND'
    
    @pytest.mark.admin_only
    def test_admin_group_operations_performance(self, admin_email, test_user_for_groups):
        """Test admin group operations performance"""
        username = test_user_for_groups
        
        # Measure group update performance
        groups_data = {"setGroups": ["free", "paid"]}
        
        start_time = time.time()
        status_code, response = client.update_user_groups(admin_email, username, groups_data)
        response_time = time.time() - start_time
        
        assert status_code == 200
        assert response_time < 3.0, f"Group update took {response_time:.2f}s, expected < 3s"

    # ========================================
    # ADMIN USER DELETION TESTS
    # ========================================
    
    @pytest.mark.admin_only
    def test_admin_delete_user_success(self, admin_email, unique_id):
        """Test admin can successfully delete user"""
        # Create user to delete
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "DeleteTest123!"
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        username = response['data']['username']
        
        # Delete user
        status_code, response = client.delete_user(admin_email, username)
        
        assert status_code == 200
        assert response['success'] is True
        assert "deleted successfully" in response['message']
        
        # Verify user is deleted
        status_code, response = client.get_user(admin_email, username)
        assert status_code == 404
    
    @pytest.mark.admin_only
    def test_admin_delete_user_with_groups(self, admin_email, unique_id):
        """Test admin can delete user that has groups"""
        # Create user with groups
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "DeleteTest123!",
            "groups": ["free", "paid"]
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        username = response['data']['username']
        
        # Delete user
        status_code, response = client.delete_user(admin_email, username)
        
        assert status_code == 200
        assert response['success'] is True
        
        # Verify user is completely removed
        status_code, response = client.get_user(admin_email, username)
        assert status_code == 404
    
    @pytest.mark.admin_only
    def test_admin_delete_nonexistent_user(self, admin_email):
        """Test admin delete operation on nonexistent user"""
        status_code, response = client.delete_user(admin_email, "nonexistent@example.com")
        
        assert status_code == 404
        assert response['success'] is False
        assert response['error']['code'] == 'USER_NOT_FOUND'
    
    @pytest.mark.admin_only
    def test_admin_delete_user_performance(self, admin_email, unique_id):
        """Test admin user deletion performance"""
        # Create user to delete
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "DeleteTest123!"
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        username = response['data']['username']
        
        # Measure deletion performance
        start_time = time.time()
        status_code, response = client.delete_user(admin_email, username)
        response_time = time.time() - start_time
        
        assert status_code == 200
        assert response_time < 3.0, f"User deletion took {response_time:.2f}s, expected < 3s"

    # ========================================
    # ADMIN ACCESS CONTROL FOR MODIFICATIONS
    # ========================================
    
    @pytest.mark.admin_only
    def test_non_admin_cannot_update_groups(self, non_admin_emails, test_user_for_groups):
        """Test non-admin users cannot update user groups"""
        username = test_user_for_groups
        groups_data = {"setGroups": ["free"]}
        
        for user_type, email in non_admin_emails.items():
            status_code, response = client.update_user_groups(email, username, groups_data)
            
            assert status_code == 403, f"{user_type} user should not be able to update groups"
            assert response['success'] is False
    
    @pytest.mark.admin_only
    def test_non_admin_cannot_delete_users(self, non_admin_emails):
        """Test non-admin users cannot delete users"""
        for user_type, email in non_admin_emails.items():
            status_code, response = client.delete_user(email, "test@example.com")
            
            assert status_code == 403, f"{user_type} user should not be able to delete users"
            assert response['success'] is False

    # ========================================
    # ADMIN COMPLEX OPERATIONS TESTS
    # ========================================
    
    @pytest.mark.admin_only
    @pytest.mark.integration
    def test_admin_complete_user_lifecycle(self, admin_email, unique_id):
        """Test complete admin user lifecycle management"""
        # Step 1: Create user
        user_data = {
            "username": f"{unique_id}@example.com",
            "email": f"{unique_id}@example.com",
            "temporaryPassword": "LifecycleTest123!",
            "attributes": {
                "email": f"{unique_id}@example.com",
                "given_name": "Lifecycle",
                "family_name": "TestUser"
            }
        }
        
        status_code, response = client.create_user(admin_email, user_data)
        assert status_code == 201
        username = response['data']['username']
        
        try:
            # Step 2: Verify user creation
            status_code, response = client.get_user(admin_email, username)
            assert status_code == 200
            assert response['data']['username'] == username
            
            # Step 3: Assign groups
            groups_data = {"setGroups": ["free"]}
            status_code, response = client.update_user_groups(admin_email, username, groups_data)
            assert status_code == 200
            assert "free" in response['data']['currentGroups']
            
            # Step 4: Modify groups
            groups_data = {"setGroups": ["paid"]}
            status_code, response = client.update_user_groups(admin_email, username, groups_data)
            assert status_code == 200
            assert response['data']['currentGroups'] == ["paid"]
            
            # Step 5: Verify changes
            status_code, response = client.get_user(admin_email, username)
            assert status_code == 200
            assert "paid" in response['data']['groups']
            assert "free" not in response['data']['groups']
            
        finally:
            # Step 6: Delete user
            status_code, response = client.delete_user(admin_email, username)
            assert status_code == 200
    
    @pytest.mark.admin_only
    @pytest.mark.integration
    def test_admin_batch_user_management(self, admin_email, admin_created_users):
        """Test admin can manage multiple users efficiently"""
        # Create multiple users
        created_usernames = []
        user_count = 3
        
        for i in range(user_count):
            user_data = {
                "username": f"batch_user_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "email": f"batch_user_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "temporaryPassword": "BatchTest123!"
            }
            
            status_code, response = client.create_user(admin_email, user_data)
            assert status_code == 201
            username = response['data']['username']
            created_usernames.append(username)
            admin_created_users.append(username)
        
        # Assign groups to all users
        for username in created_usernames:
            groups_data = {"setGroups": ["free"]}
            status_code, response = client.update_user_groups(admin_email, username, groups_data)
            assert status_code == 200
        
        # Verify all users have correct groups
        for username in created_usernames:
            status_code, response = client.get_user(admin_email, username)
            assert status_code == 200
            assert "free" in response['data']['groups']
        
        # Update all users to different group
        for username in created_usernames:
            groups_data = {"setGroups": ["paid"]}
            status_code, response = client.update_user_groups(admin_email, username, groups_data)
            assert status_code == 200
        
        # Verify group changes
        for username in created_usernames:
            status_code, response = client.get_user(admin_email, username)
            assert status_code == 200
            assert "paid" in response['data']['groups']
            assert "free" not in response['data']['groups']
    
    @pytest.mark.admin_only
    def test_admin_concurrent_group_operations(self, admin_email, admin_created_users):
        """Test admin concurrent group operations don't cause conflicts"""
        # Create test users
        usernames = []
        for i in range(3):
            user_data = {
                "username": f"concurrent_test_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "email": f"concurrent_test_{i}_{uuid.uuid4().hex[:8]}@example.com",
                "temporaryPassword": "ConcurrentTest123!"
            }
            
            status_code, response = client.create_user(admin_email, user_data)
            assert status_code == 201
            username = response['data']['username']
            usernames.append(username)
            admin_created_users.append(username)
        
        # Perform concurrent group operations
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def update_user_groups(username, groups):
            groups_data = {"setGroups": groups}
            return client.update_user_groups(admin_email, username, groups_data)
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(update_user_groups, usernames[0], ["free"]),
                executor.submit(update_user_groups, usernames[1], ["paid"]),
                executor.submit(update_user_groups, usernames[2], ["admin"])
            ]
            
            results = [future.result() for future in as_completed(futures)]
        
        # All operations should succeed
        for status_code, response in results:
            assert status_code == 200
            assert response['success'] is True
        
        # Verify final states
        expected_groups = [["free"], ["paid"], ["admin"]]
        for i, username in enumerate(usernames):
            status_code, response = client.get_user(admin_email, username)
            assert status_code == 200
            user_groups = response['data']['groups']
            assert expected_groups[i][0] in user_groups
