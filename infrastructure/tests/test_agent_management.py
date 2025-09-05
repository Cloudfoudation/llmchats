"""
Test cases for Agent Management API
"""
import unittest
import uuid
from test_config import config
from auth_helper import auth
from api_client import client

class TestAgentManagementAPI(unittest.TestCase):
    """Test Agent Management API endpoints"""
    
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
        cls.test_agent_id = None
        cls.test_agent_data = {
            "name": f"Test Agent {uuid.uuid4().hex[:8]}",
            "description": "A test agent for API testing",
            "systemPrompt": "You are a helpful test assistant. Answer questions clearly and concisely.",
            "modelParams": {
                "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
                "temperature": 0.7,
                "maxTokens": 1000
            }
        }
        
    def test_01_list_agents_paid_success(self):
        """Test paid user can list agents"""
        status_code, response = client.list_agents(self.paid_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIsInstance(response['data'], list)
        
    def test_02_list_agents_admin_success(self):
        """Test admin can list agents"""
        status_code, response = client.list_agents(self.admin_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        
    def test_03_list_agents_free_denied(self):
        """Test free user cannot list agents"""
        status_code, response = client.list_agents(self.free_email)
        self.assertEqual(status_code, 403)
        
    def test_04_create_agent_paid_success(self):
        """Test paid user can create agent"""
        status_code, response = client.create_agent(self.paid_email, self.test_agent_data)
        self.assertEqual(status_code, 201)
        
        if status_code in [200, 201]:
            self.assertIn('data', response)
            self.assertIn('id', response['data'])
            self.__class__.test_agent_id = response['data']['id']
            
    def test_05_create_agent_admin_success(self):
        """Test admin can create agent"""
        admin_agent_data = {
            "name": f"Admin Test Agent {uuid.uuid4().hex[:8]}",
            "description": "An admin test agent",
            "systemPrompt": "You are an admin assistant.",
            "modelParams": {
                "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
                "temperature": 0.7,
                "maxTokens": 1000
            }
        }
        
        status_code, response = client.create_agent(self.admin_email, admin_agent_data)
        self.assertEqual(status_code, 201)
        
    def test_06_create_agent_free_denied(self):
        """Test free user cannot create agent"""
        status_code, response = client.create_agent(self.free_email, self.test_agent_data)
        self.assertEqual(status_code, 403)
        
    def test_07_get_agent_paid_success(self):
        """Test paid user can get agent details"""
        if self.test_agent_id:
            status_code, response = client.get_agent(self.paid_email, self.test_agent_id)
            self.assertEqual(status_code, 200)
            self.assertIn('data', response)
            self.assertEqual(response['data']['id'], self.test_agent_id)
            
    def test_08_get_agent_free_denied(self):
        """Test free user cannot get agent details"""
        if self.test_agent_id:
            status_code, response = client.get_agent(self.free_email, self.test_agent_id)
            self.assertEqual(status_code, 403)
            
    def test_09_update_agent_paid_success(self):
        """Test paid user can update agent"""
        if self.test_agent_id:
            update_data = {
                "name": f"Updated Test Agent {uuid.uuid4().hex[:8]}",
                "description": "Updated description",
                "instructions": "You are an updated test assistant."
            }
            
            status_code, response = client.update_agent(self.paid_email, self.test_agent_id, update_data)
            self.assertEqual(status_code, 200)
            
    def test_10_update_agent_free_denied(self):
        """Test free user cannot update agent"""
        if self.test_agent_id:
            update_data = {
                "name": "Unauthorized Update",
                "description": "This should fail"
            }
            
            status_code, response = client.update_agent(self.free_email, self.test_agent_id, update_data)
            self.assertEqual(status_code, 403)
            
    def test_11_create_agent_with_knowledge_base(self):
        """Test creating agent with knowledge base reference"""
        agent_with_kb_data = {
            "name": f"KB Agent {uuid.uuid4().hex[:8]}",
            "description": "Agent with knowledge base",
            "instructions": "Use the knowledge base to answer questions.",
            "model": "anthropic.claude-3-sonnet-20240229-v1:0",
            "knowledgeBaseIds": [f"test-kb-{uuid.uuid4().hex[:8]}"]  # Fake KB ID
        }
        
        status_code, response = client.create_agent(self.paid_email, agent_with_kb_data)
        # May succeed or fail depending on KB existence
        self.assertIn(status_code, [201, 400])  # May fail validation
        
    def test_12_create_agent_invalid_model(self):
        """Test create agent with invalid model"""
        invalid_agent_data = {
            "name": f"Invalid Model Agent {uuid.uuid4().hex[:8]}",
            "description": "Agent with invalid model",
            "instructions": "Test instructions",
            "model": "invalid-model-name"
        }
        
        status_code, response = client.create_agent(self.paid_email, invalid_agent_data)
        self.assertEqual(status_code, 400)
        
    def test_13_create_agent_missing_required_fields(self):
        """Test create agent with missing required fields"""
        invalid_data = {
            "name": "",  # Empty name
            # Missing instructions and model
        }
        
        status_code, response = client.create_agent(self.paid_email, invalid_data)
        self.assertEqual(status_code, 400)
        
    def test_14_get_nonexistent_agent(self):
        """Test get nonexistent agent"""
        fake_agent_id = f"nonexistent-{uuid.uuid4()}"
        status_code, response = client.get_agent(self.paid_email, fake_agent_id)
        self.assertEqual(status_code, 404)
        
    def test_15_update_nonexistent_agent(self):
        """Test update nonexistent agent"""
        fake_agent_id = f"nonexistent-{uuid.uuid4()}"
        update_data = {
            "name": "Updated Name"
        }
        
        status_code, response = client.update_agent(self.paid_email, fake_agent_id, update_data)
        self.assertEqual(status_code, 404)
        
    def test_16_create_agent_long_instructions(self):
        """Test create agent with very long instructions"""
        long_instructions = "x" * 10000  # Very long instructions
        
        agent_data = {
            "name": f"Long Instructions Agent {uuid.uuid4().hex[:8]}",
            "description": "Agent with long instructions",
            "instructions": long_instructions,
            "model": "anthropic.claude-3-sonnet-20240229-v1:0"
        }
        
        status_code, response = client.create_agent(self.paid_email, agent_data)
        # May succeed or fail depending on length limits
        self.assertIn(status_code, [201, 400])  # May fail validation
        
    def test_17_update_agent_partial_fields(self):
        """Test update agent with partial fields"""
        if self.test_agent_id:
            partial_update = {
                "description": "Partially updated description"
                # Only updating description, not name or instructions
            }
            
            status_code, response = client.update_agent(self.paid_email, self.test_agent_id, partial_update)
            self.assertEqual(status_code, 200)
            
    def test_18_unauthorized_access(self):
        """Test unauthorized access without token"""
        status_code, response = client.list_agents(None)  # No authentication
        self.assertEqual(status_code, 401)
        
    def test_19_delete_agent_paid_success(self):
        """Test paid user can delete agent"""
        if self.test_agent_id:
            status_code, response = client.delete_agent(self.paid_email, self.test_agent_id)
            self.assertEqual(status_code, 200)
            
    def test_20_delete_agent_free_denied(self):
        """Test free user cannot delete agent"""
        fake_agent_id = f"fake-{uuid.uuid4()}"
        status_code, response = client.delete_agent(self.free_email, fake_agent_id)
        self.assertEqual(status_code, 403)
        
    def test_21_delete_nonexistent_agent(self):
        """Test delete nonexistent agent"""
        fake_agent_id = f"nonexistent-{uuid.uuid4()}"
        status_code, response = client.delete_agent(self.paid_email, fake_agent_id)
        self.assertEqual(status_code, 404)

if __name__ == '__main__':
    unittest.main()