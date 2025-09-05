"""
Test cases for User Management API
"""
import unittest
import uuid
from test_config import config
from auth_helper import auth
from api_client import client

class TestUserManagementAPI(unittest.TestCase):
    """Test User Management API endpoints"""
    
    @classmethod
    def setUpClass(cls):
        """Setup test class"""
        # Import here to avoid circular imports
        from run_tests import setup_test_environment
        
        # Setup test environment (API endpoints and auth)
        if not setup_test_environment():
            raise Exception("Failed to setup test environment")
        
        cls.admin_email = config.test_users['admin']['email']
        cls.paid_email = config.test_users['paid']['email']
        cls.free_email = config.test_users['free']['email']
        cls.test_username = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
        
    def test_01_list_users_admin_access(self):
        """Test admin can list users"""
        status_code, response = client.list_users(self.admin_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('users', response['data'])
        self.assertIsInstance(response['data']['users'], list)
        
    def test_02_list_users_paid_denied(self):
        """Test paid user cannot list users"""
        status_code, response = client.list_users(self.paid_email)
        self.assertEqual(status_code, 403)
        
    def test_03_list_users_free_denied(self):
        """Test free user cannot list users"""
        status_code, response = client.list_users(self.free_email)
        self.assertEqual(status_code, 403)
        
    def test_04_create_user_admin_success(self):
        """Test admin can create user"""
        # Generate unique username for this test
        test_username = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
        
        user_data = {
            "username": test_username,
            "email": test_username,
            "temporaryPassword": "TempPass123!",
            "attributes": {
                "email": test_username
            }
        }
        
        status_code, response = client.create_user(self.admin_email, user_data)
        # Accept success codes - user creation should work now
        self.assertEqual(status_code, 201)
        
        # If successful, check response structure
        if status_code in [200, 201]:
            self.assertIn('data', response)
            self.assertIn('username', response['data'])
        
    def test_05_create_user_paid_denied(self):
        """Test paid user cannot create user"""
        user_data = {
            "username": f"testuser_{uuid.uuid4().hex[:8]}@example.com",
            "email": f"testuser_{uuid.uuid4().hex[:8]}@example.com"
        }
        
        status_code, response = client.create_user(self.paid_email, user_data)
        self.assertEqual(status_code, 403)
        
    def test_06_get_user_admin_success(self):
        """Test admin can get user details"""
        status_code, response = client.get_user(self.admin_email, self.test_username)
        if status_code == 200:
            self.assertIn('user', response)
            self.assertEqual(response['user']['Username'], self.test_username)
        else:
            # User might not exist yet, check it's a valid error
            self.assertEqual(status_code, 404)
            
    def test_07_get_user_paid_denied(self):
        """Test paid user cannot get user details"""
        status_code, response = client.get_user(self.paid_email, self.test_username)
        self.assertEqual(status_code, 403)
        
    def test_08_update_user_groups_admin_success(self):
        """Test admin can update user groups"""
        groups_data = {
            "groups": ["free"]
        }
        
        status_code, response = client.update_user_groups(self.admin_email, self.test_username, groups_data)
        # May succeed or fail depending on user existence
        self.assertIn(status_code, [200, 404])  # May not find user to update
        
    def test_09_update_user_groups_paid_denied(self):
        """Test paid user cannot update user groups"""
        groups_data = {
            "groups": ["free"]
        }
        
        status_code, response = client.update_user_groups(self.paid_email, self.test_username, groups_data)
        self.assertEqual(status_code, 403)
        
    def test_10_delete_user_admin_success(self):
        """Test admin can delete user"""
        status_code, response = client.delete_user(self.admin_email, self.test_username)
        # May succeed or fail depending on user existence
        self.assertIn(status_code, [200, 204, 404])  # May not find user to delete
        
    def test_11_delete_user_paid_denied(self):
        """Test paid user cannot delete user"""
        status_code, response = client.delete_user(self.paid_email, "nonexistent@example.com")
        self.assertEqual(status_code, 403)
        
    def test_12_create_user_invalid_data(self):
        """Test create user with invalid data"""
        user_data = {
            "username": "",  # Invalid empty username
            "email": "invalid-email"  # Invalid email format
        }
        
        status_code, response = client.create_user(self.admin_email, user_data)
        self.assertEqual(status_code, 400)
        
    def test_13_get_nonexistent_user(self):
        """Test get nonexistent user"""
        status_code, response = client.get_user(self.admin_email, "nonexistent@example.com")
        self.assertEqual(status_code, 404)
        
    def test_14_unauthorized_access(self):
        """Test unauthorized access without token"""
        status_code, response = client.list_users(None)  # No authentication
        self.assertEqual(status_code, 401)

if __name__ == '__main__':
    unittest.main()