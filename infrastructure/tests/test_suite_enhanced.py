"""
Enhanced comprehensive test suite with improved organization
"""
import unittest
import json
from test_framework import (
    BaseAPITest, UserTier, TestCase, 
    PerformanceTestMixin, SecurityTestMixin, 
    DataTestMixin, IntegrationTestMixin
)
from test_config import config
from api_client import client

class UserManagementTestSuite(BaseAPITest, SecurityTestMixin, DataTestMixin):
    """Enhanced User Management API tests"""
    
    def test_admin_user_lifecycle(self):
        """Test complete user lifecycle for admin"""
        test_user_data = {
            "username": self.generate_unique_id("testuser") + "@example.com",
            "email": self.generate_unique_id("testuser") + "@example.com",
            "temporaryPassword": "TempPass123!",
            "attributes": {
                "email": self.generate_unique_id("testuser") + "@example.com"
            }
        }
        
        # Test CRUD operations
        resource_id = self.test_crud_operations(
            api_prefix="user_management",
            user_tier=UserTier.ADMIN,
            create_data=test_user_data,
            update_data={"groups": ["free"]}
        )
        
        # Store for cleanup
        self.test_resources['users'] = self.test_resources.get('users', [])
        self.test_resources['users'].append(resource_id)
    
    def test_user_access_permissions(self):
        """Test user access permissions across tiers"""
        test_cases = [
            # Admin access
            TestCase("list_users_admin", "GET", "/users", UserTier.ADMIN, 
                    expected_status=200, expected_response_keys=["data.users"]),
            
            # Paid user denied
            TestCase("list_users_paid", "GET", "/users", UserTier.PAID, 
                    expected_status=403),
            
            # Free user denied
            TestCase("list_users_free", "GET", "/users", UserTier.FREE, 
                    expected_status=403),
        ]
        
        for test_case in test_cases:
            with self.subTest(test_case=test_case.name):
                status_code, response = self.run_test_case(test_case)
                self.assertEqual(status_code, test_case.expected_status)
                
                if test_case.expected_response_keys and status_code == 200:
                    self.assert_response_structure(response, test_case.expected_response_keys)
    
    def test_input_validation_scenarios(self):
        """Test various input validation scenarios"""
        invalid_data_sets = [
            {"username": "", "email": "invalid-email"},  # Empty username, invalid email
            {"username": "test", "email": ""},  # Valid username, empty email
            {"username": "a" * 300, "email": "test@example.com"},  # Username too long
        ]
        
        for i, invalid_data in enumerate(invalid_data_sets):
            with self.subTest(scenario=f"invalid_data_{i}"):
                self.test_input_validation(
                    endpoint=f"{config.get_api_url('user_management')}/users",
                    user_tier=UserTier.ADMIN,
                    invalid_data=invalid_data
                )
    
    @classmethod
    def cleanup_test_resources(cls):
        """Clean up created users"""
        if 'users' in cls.test_resources:
            for user_id in cls.test_resources['users']:
                try:
                    client.delete_user(cls.admin_email, user_id)
                except Exception as e:
                    print(f"Failed to cleanup user {user_id}: {e}")

class KnowledgeBaseTestSuite(BaseAPITest, PerformanceTestMixin, IntegrationTestMixin):
    """Enhanced Knowledge Base API tests"""
    
    def test_knowledge_base_workflow(self):
        """Test complete knowledge base workflow"""
        workflow_steps = [
            TestCase(
                name="create_kb",
                method="POST",
                endpoint="/knowledge-bases",
                user_tier=UserTier.PAID,
                data=config.test_data['knowledge_base'],
                expected_status=201,
                expected_response_keys=["data.id", "data.name"]
            ),
            TestCase(
                name="list_kb",
                method="GET", 
                endpoint="/knowledge-bases",
                user_tier=UserTier.PAID,
                expected_status=200,
                expected_response_keys=["data.knowledgeBases"]
            ),
            TestCase(
                name="get_kb",
                method="GET",
                endpoint="/knowledge-bases/{kb_id}",  # Will be replaced with actual ID
                user_tier=UserTier.PAID,
                expected_status=200,
                depends_on=["create_kb"]
            )
        ]
        
        results = self.test_workflow(workflow_steps)
        
        # Store KB ID for cleanup
        kb_id = results['create_kb']['response']['data']['id']
        self.test_resources['knowledge_bases'] = self.test_resources.get('knowledge_bases', [])
        self.test_resources['knowledge_bases'].append(kb_id)
    
    def test_knowledge_base_performance(self):
        """Test knowledge base API performance"""
        # Test list performance
        result, response_time = self.measure_response_time(
            client.list_knowledge_bases, self.paid_email
        )
        self.assert_response_time(response_time, 5.0)  # 5 second limit
        
        # Test create performance
        kb_data = {
            **config.test_data['knowledge_base'],
            'name': self.generate_unique_id('perf_test_kb')
        }
        
        result, response_time = self.measure_response_time(
            client.create_knowledge_base, self.paid_email, kb_data
        )
        self.assert_response_time(response_time, 10.0)  # 10 second limit for creation
        
        # Cleanup
        if result[0] == 201:
            kb_id = result[1]['data']['id']
            client.delete_knowledge_base(self.paid_email, kb_id)
    
    def test_file_operations_integration(self):
        """Test file upload and management integration"""
        # Create KB first
        kb_data = {
            **config.test_data['knowledge_base'],
            'name': self.generate_unique_id('file_test_kb')
        }
        
        status_code, response = client.create_knowledge_base(self.paid_email, kb_data)
        self.assertEqual(status_code, 201)
        kb_id = response['data']['id']
        
        try:
            # Test file operations
            file_data = {
                "files": [
                    {
                        "name": "test_document.txt",
                        "content": "This is a test document for knowledge base testing.",
                        "contentType": "text/plain"
                    }
                ]
            }
            
            # Upload file
            status_code, response = client.upload_files(self.paid_email, kb_id, file_data)
            self.assertEqual(status_code, 200)
            
            # List files
            status_code, response = client.list_files(self.paid_email, kb_id)
            self.assertEqual(status_code, 200)
            self.assertIn('data', response)
            
            # Start sync
            status_code, response = client.start_sync(self.paid_email, kb_id)
            self.assertEqual(status_code, 200)
            
        finally:
            # Cleanup
            client.delete_knowledge_base(self.paid_email, kb_id)
    
    @classmethod
    def cleanup_test_resources(cls):
        """Clean up created knowledge bases"""
        if 'knowledge_bases' in cls.test_resources:
            for kb_id in cls.test_resources['knowledge_bases']:
                try:
                    client.delete_knowledge_base(cls.paid_email, kb_id)
                except Exception as e:
                    print(f"Failed to cleanup knowledge base {kb_id}: {e}")

class AgentManagementTestSuite(BaseAPITest, SecurityTestMixin, DataTestMixin):
    """Enhanced Agent Management API tests"""
    
    def test_agent_access_control(self):
        """Test agent access control across user tiers"""
        # Test paid user can access
        status_code, response = client.list_agents(self.paid_email)
        self.assertEqual(status_code, 200)
        
        # Test free user cannot access
        self.test_forbidden_access(
            endpoint=f"{config.get_api_url('agent_management')}/agents",
            user_tier=UserTier.FREE
        )
    
    def test_agent_crud_operations(self):
        """Test agent CRUD operations"""
        agent_data = {
            **config.test_data['agent'],
            'name': self.generate_unique_id('test_agent')
        }
        
        update_data = {
            'description': 'Updated test agent description',
            'instructions': 'Updated instructions for the test agent'
        }
        
        resource_id = self.test_crud_operations(
            api_prefix="agent_management",
            user_tier=UserTier.PAID,
            create_data=agent_data,
            update_data=update_data
        )
        
        self.test_resources['agents'] = self.test_resources.get('agents', [])
        self.test_resources['agents'].append(resource_id)
    
    @classmethod
    def cleanup_test_resources(cls):
        """Clean up created agents"""
        if 'agents' in cls.test_resources:
            for agent_id in cls.test_resources['agents']:
                try:
                    client.delete_agent(cls.paid_email, agent_id)
                except Exception as e:
                    print(f"Failed to cleanup agent {agent_id}: {e}")

class GroupManagementTestSuite(BaseAPITest, IntegrationTestMixin):
    """Enhanced Group Management API tests"""
    
    def test_group_member_workflow(self):
        """Test complete group and member management workflow"""
        workflow_steps = [
            TestCase(
                name="create_group",
                method="POST",
                endpoint="/groups",
                user_tier=UserTier.PAID,
                data=config.test_data['group'],
                expected_status=201,
                expected_response_keys=["data.id", "data.name"]
            ),
            TestCase(
                name="add_member",
                method="POST",
                endpoint="/groups/{group_id}/members",
                user_tier=UserTier.PAID,
                data={"userId": "test-user-id", "role": "member"},
                expected_status=200,
                depends_on=["create_group"]
            ),
            TestCase(
                name="list_members",
                method="GET",
                endpoint="/groups/{group_id}/members",
                user_tier=UserTier.PAID,
                expected_status=200,
                expected_response_keys=["data.members"],
                depends_on=["add_member"]
            )
        ]
        
        results = self.test_workflow(workflow_steps)
        
        # Store group ID for cleanup
        group_id = results['create_group']['response']['data']['id']
        self.test_resources['groups'] = self.test_resources.get('groups', [])
        self.test_resources['groups'].append(group_id)
    
    @classmethod
    def cleanup_test_resources(cls):
        """Clean up created groups"""
        if 'groups' in cls.test_resources:
            for group_id in cls.test_resources['groups']:
                try:
                    client.delete_group(cls.paid_email, group_id)
                except Exception as e:
                    print(f"Failed to cleanup group {group_id}: {e}")

class SecurityTestSuite(BaseAPITest, SecurityTestMixin):
    """Dedicated security testing suite"""
    
    def test_authentication_requirements(self):
        """Test authentication requirements across all endpoints"""
        endpoints = [
            ("/users", "GET"),
            ("/groups", "GET"),
            ("/knowledge-bases", "GET"),
            ("/agents", "GET"),
            ("/shared-resources", "GET")
        ]
        
        for endpoint, method in endpoints:
            with self.subTest(endpoint=endpoint, method=method):
                self.test_unauthorized_access(endpoint, method)
    
    def test_authorization_boundaries(self):
        """Test authorization boundaries between user tiers"""
        # Free user restrictions
        free_restricted_endpoints = [
            ("/groups", "GET"),
            ("/knowledge-bases", "GET"),
            ("/agents", "GET"),
            ("/shared-resources", "GET")
        ]
        
        for endpoint, method in free_restricted_endpoints:
            with self.subTest(endpoint=endpoint, method=method, tier="free"):
                self.test_forbidden_access(endpoint, UserTier.FREE, method)
        
        # Paid user restrictions (admin-only endpoints)
        paid_restricted_endpoints = [
            ("/users", "GET"),
            ("/users", "POST"),
        ]
        
        for endpoint, method in paid_restricted_endpoints:
            with self.subTest(endpoint=endpoint, method=method, tier="paid"):
                self.test_forbidden_access(endpoint, UserTier.PAID, method)

def create_test_suite():
    """Create comprehensive test suite"""
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        UserManagementTestSuite,
        KnowledgeBaseTestSuite,
        AgentManagementTestSuite,
        GroupManagementTestSuite,
        SecurityTestSuite
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    return suite

if __name__ == '__main__':
    # Run the enhanced test suite
    runner = unittest.TextTestRunner(verbosity=2, buffer=True)
    suite = create_test_suite()
    result = runner.run(suite)
