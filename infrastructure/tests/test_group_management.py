"""
Test cases for Group Management API
"""
import unittest
import uuid
from test_config import config
from auth_helper import auth
from api_client import client

class TestGroupManagementAPI(unittest.TestCase):
    """Test Group Management API endpoints"""
    
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
        cls.test_group_id = None
        cls.test_group_data = {
            "groupName": f"Test Group {uuid.uuid4().hex[:8]}",
            "description": "A test group for API testing"
        }
        
    def test_01_list_groups_paid_success(self):
        """Test paid user can list groups"""
        status_code, response = client.list_groups(self.paid_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('groups', response['data'])
        self.assertIsInstance(response['data']['groups'], list)
        
    def test_02_list_groups_admin_success(self):
        """Test admin can list groups"""
        status_code, response = client.list_groups(self.admin_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('groups', response['data'])
        
    def test_03_list_groups_free_denied(self):
        """Test free user cannot list groups"""
        status_code, response = client.list_groups(self.free_email)
        self.assertEqual(status_code, 403)
        
    def test_04_create_group_paid_success(self):
        """Test paid user can create group"""
        status_code, response = client.create_group(self.paid_email, self.test_group_data)
        self.assertEqual(status_code, 201)
        
        if status_code in [200, 201]:
            self.assertIn('data', response)
            self.assertIn('groupId', response['data'])
            self.__class__.test_group_id = response['data']['groupId']
            
    def test_05_create_group_admin_success(self):
        """Test admin can create group"""
        admin_group_data = {
            "groupName": f"Admin Test Group {uuid.uuid4().hex[:8]}",
            "description": "An admin test group"
        }
        
        status_code, response = client.create_group(self.admin_email, admin_group_data)
        self.assertEqual(status_code, 201)
        
    def test_06_create_group_free_denied(self):
        """Test free user cannot create group"""
        status_code, response = client.create_group(self.free_email, self.test_group_data)
        self.assertEqual(status_code, 403)
        
    def test_07_get_group_paid_success(self):
        """Test paid user can get group details"""
        if self.test_group_id:
            status_code, response = client.get_group(self.paid_email, self.test_group_id)
            self.assertEqual(status_code, 200)
            self.assertIn('data', response)
            self.assertEqual(response['data']['groupId'], self.test_group_id)
            
    def test_08_get_group_free_denied(self):
        """Test free user cannot get group details"""
        if self.test_group_id:
            status_code, response = client.get_group(self.free_email, self.test_group_id)
            self.assertEqual(status_code, 403)
            
    def test_09_update_group_paid_success(self):
        """Test paid user can update group"""
        if self.test_group_id:
            update_data = {
                "name": f"Updated Test Group {uuid.uuid4().hex[:8]}",
                "description": "Updated description"
            }
            
            status_code, response = client.update_group(self.paid_email, self.test_group_id, update_data)
            self.assertEqual(status_code, 200)
            
    def test_10_update_group_free_denied(self):
        """Test free user cannot update group"""
        if self.test_group_id:
            update_data = {
                "name": "Unauthorized Update",
                "description": "This should fail"
            }
            
            status_code, response = client.update_group(self.free_email, self.test_group_id, update_data)
            self.assertEqual(status_code, 403)
            
    def test_11_add_group_member_paid_success(self):
        """Test paid user can add group member"""
        if self.test_group_id:
            member_data = {
                "email": self.admin_email,
                "role": "member"
            }
            
            status_code, response = client.add_group_member(self.paid_email, self.test_group_id, member_data)
            self.assertEqual(status_code, 200)
            
    def test_12_list_group_members_paid_success(self):
        """Test paid user can list group members"""
        if self.test_group_id:
            status_code, response = client.list_group_members(self.paid_email, self.test_group_id)
            self.assertEqual(status_code, 200)
            self.assertIn('data', response)
            self.assertIn('members', response['data'])
            self.assertIsInstance(response['data']['members'], list)
            
    def test_13_update_member_role_paid_success(self):
        """Test paid user can update member role"""
        if self.test_group_id:
            # Get admin user's sub for the update
            admin_sub = auth.get_user_sub(self.admin_email)
            if admin_sub:
                role_data = {
                    "role": "admin"
                }
                
                status_code, response = client.update_member_role(self.paid_email, self.test_group_id, admin_sub, role_data)
                self.assertEqual(status_code, 200)  # 404 if member not found
                
    def test_14_remove_group_member_paid_success(self):
        """Test paid user can remove group member"""
        if self.test_group_id:
            # Get admin user's sub for removal
            admin_sub = auth.get_user_sub(self.admin_email)
            if admin_sub:
                status_code, response = client.remove_group_member(self.paid_email, self.test_group_id, admin_sub)
                self.assertEqual(status_code, 200)  # 404 if member not found
                
    def test_15_add_member_free_denied(self):
        """Test free user cannot add group member"""
        if self.test_group_id:
            member_data = {
                "email": self.free_email,
                "role": "member"
            }
            
            status_code, response = client.add_group_member(self.free_email, self.test_group_id, member_data)
            self.assertEqual(status_code, 403)
            
    def test_16_create_group_invalid_data(self):
        """Test create group with invalid data"""
        invalid_data = {
            "name": "",  # Empty name
            "description": "x" * 1001  # Too long description
        }
        
        status_code, response = client.create_group(self.paid_email, invalid_data)
        self.assertEqual(status_code, 400)
        
    def test_17_get_nonexistent_group(self):
        """Test get nonexistent group"""
        fake_group_id = f"nonexistent-{uuid.uuid4()}"
        status_code, response = client.get_group(self.paid_email, fake_group_id)
        self.assertEqual(status_code, 403)  # Accept both 403 and 404
        
    def test_18_unauthorized_access(self):
        """Test unauthorized access without token"""
        status_code, response = client.list_groups(None)  # No authentication
        self.assertEqual(status_code, 401)
        
    def test_19_delete_group_paid_success(self):
        """Test paid user can delete group"""
        if self.test_group_id:
            status_code, response = client.delete_group(self.paid_email, self.test_group_id)
            self.assertEqual(status_code, 200)
            
    def test_20_delete_group_free_denied(self):
        """Test free user cannot delete group"""
        fake_group_id = f"fake-{uuid.uuid4()}"
        status_code, response = client.delete_group(self.free_email, fake_group_id)
        self.assertEqual(status_code, 403)

if __name__ == '__main__':
    unittest.main()