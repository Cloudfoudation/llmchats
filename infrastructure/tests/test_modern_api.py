"""
Modern pytest-based API tests with fixtures and parametrization
"""
import pytest
import asyncio
import uuid
from typing import Dict, Any, List
from test_config import config
from auth_helper import auth
from api_client import client

# Test fixtures
@pytest.fixture(scope="session")
def test_environment():
    """Setup test environment once per session"""
    from run_tests import setup_test_environment
    if not setup_test_environment():
        pytest.skip("Failed to setup test environment")
    
    yield
    
    # Cleanup
    auth.cleanup_test_users()

@pytest.fixture(scope="session")
def user_emails(test_environment):
    """Provide user emails for different tiers"""
    return {
        'admin': config.test_users['admin']['email'],
        'paid': config.test_users['paid']['email'],
        'free': config.test_users['free']['email']
    }

@pytest.fixture
def unique_id():
    """Generate unique ID for test resources"""
    return f"test_{uuid.uuid4().hex[:8]}"

@pytest.fixture
def test_user_data(unique_id):
    """Generate test user data"""
    email = f"{unique_id}@example.com"
    return {
        "username": email,
        "email": email,
        "temporaryPassword": "TempPass123!",
        "attributes": {"email": email}
    }

@pytest.fixture
def test_kb_data(unique_id):
    """Generate test knowledge base data"""
    return {
        "name": f"Test KB {unique_id}",
        "description": "Test knowledge base for API testing",
        "embedding_model": "amazon.titan-embed-text-v1"
    }

@pytest.fixture
def test_agent_data(unique_id):
    """Generate test agent data"""
    return {
        "name": f"Test Agent {unique_id}",
        "description": "Test agent for API testing",
        "instructions": "You are a helpful test assistant"
    }

@pytest.fixture
def test_group_data(unique_id):
    """Generate test group data"""
    return {
        "name": f"Test Group {unique_id}",
        "description": "Test group for API testing"
    }

# User Management Tests
class TestUserManagement:
    """User Management API tests"""
    
    @pytest.mark.admin_only
    def test_admin_can_list_users(self, user_emails):
        """Test admin can list users"""
        status_code, response = client.list_users(user_emails['admin'])
        assert status_code == 200
        assert 'data' in response
        assert 'users' in response['data']
        assert isinstance(response['data']['users'], list)
    
    @pytest.mark.parametrize("user_tier", ["paid", "free"])
    def test_non_admin_cannot_list_users(self, user_emails, user_tier):
        """Test non-admin users cannot list users"""
        status_code, response = client.list_users(user_emails[user_tier])
        assert status_code == 403
    
    @pytest.mark.admin_only
    def test_admin_can_create_user(self, user_emails, test_user_data):
        """Test admin can create user"""
        status_code, response = client.create_user(user_emails['admin'], test_user_data)
        assert status_code == 201
        assert 'data' in response
        assert 'username' in response['data']
        
        # Cleanup
        username = response['data']['username']
        client.delete_user(user_emails['admin'], username)
    
    @pytest.mark.parametrize("user_tier", ["paid", "free"])
    def test_non_admin_cannot_create_user(self, user_emails, test_user_data, user_tier):
        """Test non-admin users cannot create users"""
        status_code, response = client.create_user(user_emails[user_tier], test_user_data)
        assert status_code == 403
    
    @pytest.mark.admin_only
    @pytest.mark.parametrize("invalid_data", [
        {"username": "", "email": "invalid-email"},
        {"username": "test", "email": ""},
        {"username": "a" * 300, "email": "test@example.com"}
    ])
    def test_create_user_validation(self, user_emails, invalid_data):
        """Test user creation input validation"""
        status_code, response = client.create_user(user_emails['admin'], invalid_data)
        assert status_code == 400
    
    def test_unauthorized_access(self):
        """Test unauthorized access returns 401"""
        status_code, response = client.list_users(None)
        assert status_code == 401

# Knowledge Base Tests
class TestKnowledgeBase:
    """Knowledge Base API tests"""
    
    @pytest.mark.paid_only
    def test_paid_user_can_list_knowledge_bases(self, user_emails):
        """Test paid user can list knowledge bases"""
        status_code, response = client.list_knowledge_bases(user_emails['paid'])
        assert status_code == 200
        assert 'data' in response
        assert 'knowledgeBases' in response['data']
    
    @pytest.mark.free_only
    def test_free_user_cannot_access_knowledge_bases(self, user_emails):
        """Test free user cannot access knowledge bases"""
        status_code, response = client.list_knowledge_bases(user_emails['free'])
        assert status_code == 403
    
    @pytest.mark.paid_only
    def test_knowledge_base_crud_operations(self, user_emails, test_kb_data):
        """Test complete CRUD operations for knowledge base"""
        # Create
        status_code, response = client.create_knowledge_base(user_emails['paid'], test_kb_data)
        assert status_code == 201
        assert 'data' in response
        kb_id = response['data']['id']
        
        try:
            # Read
            status_code, response = client.get_knowledge_base(user_emails['paid'], kb_id)
            assert status_code == 200
            assert response['data']['name'] == test_kb_data['name']
            
            # Update
            update_data = {"description": "Updated description"}
            status_code, response = client.update_knowledge_base(user_emails['paid'], kb_id, update_data)
            assert status_code == 200
            
            # Verify update
            status_code, response = client.get_knowledge_base(user_emails['paid'], kb_id)
            assert status_code == 200
            assert response['data']['description'] == update_data['description']
            
        finally:
            # Delete
            status_code, response = client.delete_knowledge_base(user_emails['paid'], kb_id)
            assert status_code in [200, 204]
    
    @pytest.mark.paid_only
    @pytest.mark.slow
    def test_file_upload_workflow(self, user_emails, test_kb_data):
        """Test file upload and sync workflow"""
        # Create KB
        status_code, response = client.create_knowledge_base(user_emails['paid'], test_kb_data)
        assert status_code == 201
        kb_id = response['data']['id']
        
        try:
            # Upload file
            file_data = {
                "files": [{
                    "name": "test_document.txt",
                    "content": "This is a test document for knowledge base testing.",
                    "contentType": "text/plain"
                }]
            }
            
            status_code, response = client.upload_files(user_emails['paid'], kb_id, file_data)
            assert status_code == 200
            
            # List files
            status_code, response = client.list_files(user_emails['paid'], kb_id)
            assert status_code == 200
            assert 'data' in response
            
            # Start sync
            status_code, response = client.start_sync(user_emails['paid'], kb_id)
            assert status_code == 200
            
        finally:
            # Cleanup
            client.delete_knowledge_base(user_emails['paid'], kb_id)

# Agent Management Tests
class TestAgentManagement:
    """Agent Management API tests"""
    
    @pytest.mark.paid_only
    def test_paid_user_can_list_agents(self, user_emails):
        """Test paid user can list agents"""
        status_code, response = client.list_agents(user_emails['paid'])
        assert status_code == 200
        assert 'data' in response
    
    @pytest.mark.free_only
    def test_free_user_cannot_access_agents(self, user_emails):
        """Test free user cannot access agents"""
        status_code, response = client.list_agents(user_emails['free'])
        assert status_code == 403
    
    @pytest.mark.paid_only
    def test_agent_crud_operations(self, user_emails, test_agent_data):
        """Test complete CRUD operations for agents"""
        # Create
        status_code, response = client.create_agent(user_emails['paid'], test_agent_data)
        assert status_code == 201
        agent_id = response['data']['id']
        
        try:
            # Read
            status_code, response = client.get_agent(user_emails['paid'], agent_id)
            assert status_code == 200
            assert response['data']['name'] == test_agent_data['name']
            
            # Update
            update_data = {"description": "Updated agent description"}
            status_code, response = client.update_agent(user_emails['paid'], agent_id, update_data)
            assert status_code == 200
            
        finally:
            # Delete
            status_code, response = client.delete_agent(user_emails['paid'], agent_id)
            assert status_code in [200, 204]

# Group Management Tests
class TestGroupManagement:
    """Group Management API tests"""
    
    @pytest.mark.paid_only
    def test_paid_user_can_manage_groups(self, user_emails, test_group_data):
        """Test paid user can manage groups"""
        # Create group
        status_code, response = client.create_group(user_emails['paid'], test_group_data)
        assert status_code == 201
        group_id = response['data']['id']
        
        try:
            # List groups
            status_code, response = client.list_groups(user_emails['paid'])
            assert status_code == 200
            
            # Get group
            status_code, response = client.get_group(user_emails['paid'], group_id)
            assert status_code == 200
            
        finally:
            # Delete group
            client.delete_group(user_emails['paid'], group_id)
    
    @pytest.mark.free_only
    def test_free_user_cannot_manage_groups(self, user_emails):
        """Test free user cannot manage groups"""
        status_code, response = client.list_groups(user_emails['free'])
        assert status_code == 403

# Security Tests
class TestSecurity:
    """Security-focused tests"""
    
    @pytest.mark.security
    @pytest.mark.parametrize("endpoint,method", [
        ("/users", "GET"),
        ("/groups", "GET"),
        ("/knowledge-bases", "GET"),
        ("/agents", "GET"),
        ("/shared-resources", "GET")
    ])
    def test_authentication_required(self, endpoint, method):
        """Test all endpoints require authentication"""
        status_code, response = client.make_request(method, endpoint, user_email=None)
        assert status_code == 401
    
    @pytest.mark.security
    @pytest.mark.parametrize("user_tier,restricted_endpoints", [
        ("free", ["/groups", "/knowledge-bases", "/agents", "/shared-resources"]),
        ("paid", ["/users"])
    ])
    def test_authorization_boundaries(self, user_emails, user_tier, restricted_endpoints):
        """Test authorization boundaries between user tiers"""
        for endpoint in restricted_endpoints:
            status_code, response = client.make_request("GET", endpoint, user_emails[user_tier])
            assert status_code == 403

# Performance Tests
class TestPerformance:
    """Performance-focused tests"""
    
    @pytest.mark.performance
    @pytest.mark.slow
    def test_api_response_times(self, user_emails):
        """Test API response times are within acceptable limits"""
        import time
        
        endpoints_to_test = [
            (client.list_users, user_emails['admin']),
            (client.list_knowledge_bases, user_emails['paid']),
            (client.list_agents, user_emails['paid']),
            (client.list_groups, user_emails['paid'])
        ]
        
        for func, user_email in endpoints_to_test:
            start_time = time.time()
            status_code, response = func(user_email)
            response_time = time.time() - start_time
            
            assert status_code == 200
            assert response_time < 5.0, f"Response time {response_time:.2f}s exceeds 5s limit"

# Integration Tests
class TestIntegration:
    """Integration tests for complex workflows"""
    
    @pytest.mark.integration
    @pytest.mark.slow
    def test_complete_knowledge_base_workflow(self, user_emails, test_kb_data):
        """Test complete knowledge base workflow from creation to deletion"""
        # Step 1: Create knowledge base
        status_code, response = client.create_knowledge_base(user_emails['paid'], test_kb_data)
        assert status_code == 201
        kb_id = response['data']['id']
        
        try:
            # Step 2: Upload files
            file_data = {
                "files": [{
                    "name": "integration_test.txt",
                    "content": "Integration test document content.",
                    "contentType": "text/plain"
                }]
            }
            
            status_code, response = client.upload_files(user_emails['paid'], kb_id, file_data)
            assert status_code == 200
            
            # Step 3: Start sync
            status_code, response = client.start_sync(user_emails['paid'], kb_id)
            assert status_code == 200
            
            # Step 4: Check sync status
            status_code, response = client.get_sync_status(user_emails['paid'], kb_id)
            assert status_code == 200
            
            # Step 5: List files
            status_code, response = client.list_files(user_emails['paid'], kb_id)
            assert status_code == 200
            
        finally:
            # Step 6: Cleanup
            status_code, response = client.delete_knowledge_base(user_emails['paid'], kb_id)
            assert status_code in [200, 204]

# Smoke Tests
class TestSmoke:
    """Smoke tests for basic functionality"""
    
    @pytest.mark.smoke
    def test_all_apis_accessible(self, user_emails):
        """Smoke test to verify all APIs are accessible"""
        # Test admin endpoints
        status_code, _ = client.list_users(user_emails['admin'])
        assert status_code in [200, 403]  # Should be accessible or forbidden, not error
        
        # Test paid user endpoints
        endpoints = [
            client.list_knowledge_bases,
            client.list_agents,
            client.list_groups,
            client.list_shared_resources
        ]
        
        for endpoint_func in endpoints:
            status_code, _ = endpoint_func(user_emails['paid'])
            assert status_code in [200, 403], f"Endpoint {endpoint_func.__name__} returned {status_code}"
