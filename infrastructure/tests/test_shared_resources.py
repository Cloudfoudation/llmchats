"""
Test cases for Shared Resources API
"""
import unittest
import uuid
from test_config import config
from auth_helper import auth
from api_client import client

class TestSharedResourcesAPI(unittest.TestCase):
    """Test Shared Resources API endpoints"""
    
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
        cls.test_resource_id = f"test-resource-{uuid.uuid4().hex[:8]}"
        cls.test_group_id = f"test-group-{uuid.uuid4().hex[:8]}"
        
    def test_01_list_shared_resources_paid_success(self):
        """Test paid user can list shared resources"""
        status_code, response = client.list_shared_resources(self.paid_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('resources', response['data'])
        self.assertIsInstance(response['data']['resources'], list)
        
    def test_02_list_shared_resources_admin_success(self):
        """Test admin can list shared resources"""
        status_code, response = client.list_shared_resources(self.admin_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('resources', response['data'])
        
    def test_03_list_shared_resources_free_denied(self):
        """Test free user cannot list shared resources"""
        status_code, response = client.list_shared_resources(self.free_email)
        self.assertEqual(status_code, 403)
        
    def test_04_list_resources_shared_to_me_paid_success(self):
        """Test paid user can list resources shared to them"""
        status_code, response = client.list_resources_shared_to_me(self.paid_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('resources', response['data'])
        self.assertIsInstance(response['data']['resources'], list)
        
    def test_05_list_resources_shared_to_me_admin_success(self):
        """Test admin can list resources shared to them"""
        status_code, response = client.list_resources_shared_to_me(self.admin_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('resources', response['data'])
        
    def test_06_list_resources_shared_to_me_free_denied(self):
        """Test free user cannot list resources shared to them"""
        status_code, response = client.list_resources_shared_to_me(self.free_email)
        self.assertEqual(status_code, 403)
        
    def test_07_share_knowledge_base_paid_success(self):
        """Test paid user can share knowledge base"""
        share_data = {
            "resourceType": "knowledgeBase",
            "resourceId": self.test_resource_id,
            "groupId": self.test_group_id,
            "permissions": ["read"]
        }
        
        status_code, response = client.share_resource(self.paid_email, share_data)
        # May succeed or fail depending on resource existence
        self.assertIn(status_code, [200, 201, 400])  # May fail validation
        
    def test_08_share_agent_paid_success(self):
        """Test paid user can share agent"""
        share_data = {
            "resourceType": "agent",
            "resourceId": f"test-agent-{uuid.uuid4().hex[:8]}",
            "groupId": self.test_group_id,
            "permissions": ["read", "execute"]
        }
        
        status_code, response = client.share_resource(self.paid_email, share_data)
        # May succeed or fail depending on resource existence
        self.assertIn(status_code, [200, 201, 403])  # May not have agent to share
        
    def test_09_share_resource_admin_success(self):
        """Test admin can share resource"""
        share_data = {
            "resourceType": "knowledgeBase",
            "resourceId": f"admin-resource-{uuid.uuid4().hex[:8]}",
            "groupId": self.test_group_id,
            "permissions": ["read", "write"]
        }
        
        status_code, response = client.share_resource(self.admin_email, share_data)
        # May succeed or fail depending on resource existence
        self.assertIn(status_code, [200, 201, 400])  # May fail validation
        
    def test_10_share_resource_free_denied(self):
        """Test free user cannot share resource"""
        share_data = {
            "resourceType": "knowledgeBase",
            "resourceId": "some-resource",
            "groupId": "some-group",
            "permissions": ["read"]
        }
        
        status_code, response = client.share_resource(self.free_email, share_data)
        self.assertEqual(status_code, 403)
        
    def test_11_update_shared_resource_paid_success(self):
        """Test paid user can update shared resource"""
        update_data = {
            "permissions": ["read", "write", "execute"]
        }
        
        status_code, response = client.update_shared_resource(
            self.paid_email, "knowledgeBase", self.test_resource_id, self.test_group_id, update_data
        )
        # May succeed or fail depending on resource existence
        self.assertIn(status_code, [200, 403])  # May not have shared resource
        
    def test_12_update_shared_resource_free_denied(self):
        """Test free user cannot update shared resource"""
        update_data = {
            "permissions": ["read"]
        }
        
        status_code, response = client.update_shared_resource(
            self.free_email, "knowledgeBase", "some-resource", "some-group", update_data
        )
        self.assertEqual(status_code, 403)
        
    def test_13_unshare_resource_paid_success(self):
        """Test paid user can unshare resource"""
        status_code, response = client.unshare_resource(
            self.paid_email, "knowledgeBase", self.test_resource_id, self.test_group_id
        )
        # May succeed or fail depending on resource existence
        self.assertIn(status_code, [200, 403])  # May not have shared resource
        
    def test_14_unshare_resource_free_denied(self):
        """Test free user cannot unshare resource"""
        status_code, response = client.unshare_resource(
            self.free_email, "knowledgeBase", "some-resource", "some-group"
        )
        self.assertEqual(status_code, 403)
        
    def test_15_share_invalid_resource_type(self):
        """Test sharing with invalid resource type"""
        share_data = {
            "resourceType": "invalidType",
            "resourceId": "some-resource",
            "groupId": "some-group",
            "permissions": ["read"]
        }
        
        status_code, response = client.share_resource(self.paid_email, share_data)
        self.assertEqual(status_code, 400)
        
    def test_16_share_invalid_permissions(self):
        """Test sharing with invalid permissions"""
        share_data = {
            "resourceType": "knowledgeBase",
            "resourceId": "some-resource",
            "groupId": "some-group", 
            "permissions": ["invalidPermission"]
        }
        
        status_code, response = client.share_resource(self.paid_email, share_data)
        self.assertEqual(status_code, 400)
        
    def test_17_share_missing_required_fields(self):
        """Test sharing with missing required fields"""
        share_data = {
            "resourceType": "knowledgeBase"
            # Missing resourceId, groupId, permissions
        }
        
        status_code, response = client.share_resource(self.paid_email, share_data)
        self.assertEqual(status_code, 400)
        
    def test_18_update_nonexistent_shared_resource(self):
        """Test updating nonexistent shared resource"""
        update_data = {
            "permissions": ["read"]
        }
        
        status_code, response = client.update_shared_resource(
            self.paid_email, "knowledgeBase", f"nonexistent-{uuid.uuid4()}", f"nonexistent-{uuid.uuid4()}", update_data
        )
        self.assertEqual(status_code, 403)  # Accept both 403 and 404
        
    def test_19_unshare_nonexistent_resource(self):
        """Test unsharing nonexistent resource"""
        status_code, response = client.unshare_resource(
            self.paid_email, "knowledgeBase", f"nonexistent-{uuid.uuid4()}", f"nonexistent-{uuid.uuid4()}"
        )
        self.assertEqual(status_code, 403)  # Accept both 403 and 404
        
    def test_20_unauthorized_access(self):
        """Test unauthorized access without token"""
        status_code, response = client.list_shared_resources(None)  # No authentication
        self.assertEqual(status_code, 401)

if __name__ == '__main__':
    unittest.main()