"""
Test configuration for API testing
"""
import os
from typing import Dict, Any

class TestConfig:
    """Configuration class for API tests"""
    
    def __init__(self):
        # Configuration from samconfig-dev-sg.toml
        self.stack_name = "llmchats-dev"
        self.region = "ap-southeast-1"
        self.environment = "dev"
        
        # Google OAuth credentials for testing
        self.google_client_id = "11826187544-3o9lhftfbb8i7gba9ldo8qat5mvun0pd.apps.googleusercontent.com"
        self.admin_email = "trung.nguyentran@gmail.com"
        
        # Test user configurations
        self.test_users = {
            "admin": {
                "email": "trung.nguyentran@gmail.com",
                "password": "TestPassword123!",
                "group": "admin"
            },
            "paid": {
                "email": "test.paid@example.com", 
                "password": "TestPassword123!",
                "group": "paid"
            },
            "free": {
                "email": "test.free@example.com",
                "password": "TestPassword123!", 
                "group": "free"
            }
        }
        
        # API endpoints will be populated after deployment
        self.api_endpoints = {}
        
        # Test data
        self.test_data = {
            "knowledge_base": {
                "name": "Test Knowledge Base",
                "description": "A test knowledge base for API testing",
                "embedding_model": "amazon.titan-embed-text-v1"
            },
            "group": {
                "name": "Test Group",
                "description": "A test group for API testing"  
            },
            "agent": {
                "name": "Test Agent",
                "description": "A test agent for API testing",
                "instructions": "You are a helpful test assistant"
            }
        }
        
    def set_api_endpoints(self, endpoints: Dict[str, str]):
        """Set API endpoints after deployment"""
        self.api_endpoints = endpoints
        
    def get_api_url(self, api_name: str) -> str:
        """Get API URL for given API name"""
        return self.api_endpoints.get(api_name, "")

# Global test configuration instance
config = TestConfig()