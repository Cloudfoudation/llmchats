"""
API client for making HTTP requests to all APIs
"""
import requests
from typing import Dict, Tuple
from test_config import config
from auth_helper import auth

class APIClient:
    """HTTP client for API testing"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def make_request(self, method: str, url: str, user_email: str = None, 
                    data: Dict = None, params: Dict = None) -> Tuple[int, Dict]:
        """Make HTTP request with optional authentication"""
        headers = {}
        if user_email:
            headers.update(auth.get_auth_headers(user_email))
            
        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=30
            )
            
            try:
                response_data = response.json()
            except:
                response_data = {"message": response.text}
                
            return response.status_code, response_data
            
        except Exception as e:
            return 500, {"error": str(e)}
            
    # User Management API methods
    def list_users(self, user_email: str) -> Tuple[int, Dict]:
        """List all users (admin only)"""
        url = f"{config.get_api_url('user_management')}/users"
        return self.make_request('GET', url, user_email)
        
    def create_user(self, user_email: str, user_data: Dict) -> Tuple[int, Dict]:
        """Create a new user (admin only)"""
        url = f"{config.get_api_url('user_management')}/users"
        return self.make_request('POST', url, user_email, user_data)
        
    def get_user(self, user_email: str, username: str) -> Tuple[int, Dict]:
        """Get user details (admin only)"""
        url = f"{config.get_api_url('user_management')}/users/{username}"
        return self.make_request('GET', url, user_email)
        
    def delete_user(self, user_email: str, username: str) -> Tuple[int, Dict]:
        """Delete a user (admin only)"""
        url = f"{config.get_api_url('user_management')}/users/{username}"
        return self.make_request('DELETE', url, user_email)
        
    def update_user_groups(self, user_email: str, username: str, groups: Dict) -> Tuple[int, Dict]:
        """Update user's groups (admin only)"""
        url = f"{config.get_api_url('user_management')}/users/{username}/groups"
        return self.make_request('PUT', url, user_email, groups)
        
    # Group Management API methods
    def list_groups(self, user_email: str) -> Tuple[int, Dict]:
        """List user's groups (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups"
        return self.make_request('GET', url, user_email)
        
    def create_group(self, user_email: str, group_data: Dict) -> Tuple[int, Dict]:
        """Create a new group (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups"
        return self.make_request('POST', url, user_email, group_data)
        
    def get_group(self, user_email: str, group_id: str) -> Tuple[int, Dict]:
        """Get group details (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups/{group_id}"
        return self.make_request('GET', url, user_email)
        
    def update_group(self, user_email: str, group_id: str, group_data: Dict) -> Tuple[int, Dict]:
        """Update group (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups/{group_id}"
        return self.make_request('PUT', url, user_email, group_data)
        
    def delete_group(self, user_email: str, group_id: str) -> Tuple[int, Dict]:
        """Delete group (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups/{group_id}"
        return self.make_request('DELETE', url, user_email)
        
    def add_group_member(self, user_email: str, group_id: str, member_data: Dict) -> Tuple[int, Dict]:
        """Add member to group (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups/{group_id}/members"
        return self.make_request('POST', url, user_email, member_data)
        
    def remove_group_member(self, user_email: str, group_id: str, user_id: str) -> Tuple[int, Dict]:
        """Remove member from group (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups/{group_id}/members/{user_id}"
        return self.make_request('DELETE', url, user_email)
        
    def list_group_members(self, user_email: str, group_id: str) -> Tuple[int, Dict]:
        """List group members (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups/{group_id}/members"
        return self.make_request('GET', url, user_email)
        
    def update_member_role(self, user_email: str, group_id: str, user_id: str, role_data: Dict) -> Tuple[int, Dict]:
        """Update member role in group (paid users)"""
        url = f"{config.get_api_url('group_management')}/groups/{group_id}/members/{user_id}"
        return self.make_request('PUT', url, user_email, role_data)
        
    # Shared Resources API methods
    def list_shared_resources(self, user_email: str) -> Tuple[int, Dict]:
        """List resources shared by user (paid users)"""
        url = f"{config.get_api_url('shared_resources')}/shared-resources"
        return self.make_request('GET', url, user_email)
        
    def list_resources_shared_to_me(self, user_email: str) -> Tuple[int, Dict]:
        """List resources shared to user (paid users)"""
        url = f"{config.get_api_url('shared_resources')}/shared-resources/shared-to-me"
        return self.make_request('GET', url, user_email)
        
    def share_resource(self, user_email: str, share_data: Dict) -> Tuple[int, Dict]:
        """Share a resource (paid users)"""
        url = f"{config.get_api_url('shared_resources')}/shared-resources"
        return self.make_request('POST', url, user_email, share_data)
        
    def unshare_resource(self, user_email: str, resource_type: str, resource_id: str, group_id: str) -> Tuple[int, Dict]:
        """Unshare a resource (paid users)"""
        url = f"{config.get_api_url('shared_resources')}/shared-resources/{resource_type}/{resource_id}/groups/{group_id}"
        return self.make_request('DELETE', url, user_email)
        
    def update_shared_resource(self, user_email: str, resource_type: str, resource_id: str, group_id: str, update_data: Dict) -> Tuple[int, Dict]:
        """Update shared resource (paid users)"""
        url = f"{config.get_api_url('shared_resources')}/shared-resources/{resource_type}/{resource_id}/groups/{group_id}"
        return self.make_request('PUT', url, user_email, update_data)
        
    # Knowledge Base API methods
    def list_knowledge_bases(self, user_email: str) -> Tuple[int, Dict]:
        """List knowledge bases (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases"
        return self.make_request('GET', url, user_email)
        
    def create_knowledge_base(self, user_email: str, kb_data: Dict) -> Tuple[int, Dict]:
        """Create knowledge base (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases"
        return self.make_request('POST', url, user_email, kb_data)
        
    def get_knowledge_base(self, user_email: str, kb_id: str) -> Tuple[int, Dict]:
        """Get knowledge base details (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}"
        return self.make_request('GET', url, user_email)
        
    def update_knowledge_base(self, user_email: str, kb_id: str, kb_data: Dict) -> Tuple[int, Dict]:
        """Update knowledge base (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}"
        return self.make_request('PUT', url, user_email, kb_data)
        
    def delete_knowledge_base(self, user_email: str, kb_id: str) -> Tuple[int, Dict]:
        """Delete knowledge base (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}"
        return self.make_request('DELETE', url, user_email)
        
    def list_data_sources(self, user_email: str, kb_id: str) -> Tuple[int, Dict]:
        """List data sources (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/data-sources"
        return self.make_request('GET', url, user_email)
        
    def create_data_source(self, user_email: str, kb_id: str, ds_data: Dict) -> Tuple[int, Dict]:
        """Create data source (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/data-sources"
        return self.make_request('POST', url, user_email, ds_data)
        
    def delete_data_source(self, user_email: str, kb_id: str, ds_id: str) -> Tuple[int, Dict]:
        """Delete data source (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/data-sources/{ds_id}"
        return self.make_request('DELETE', url, user_email)
        
    def start_sync(self, user_email: str, kb_id: str, sync_data: Dict = None) -> Tuple[int, Dict]:
        """Start knowledge base sync (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/sync"
        return self.make_request('POST', url, user_email, sync_data or {})
        
    def stop_sync(self, user_email: str, kb_id: str, ingestion_job_id: str) -> Tuple[int, Dict]:
        """Stop knowledge base sync (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/sync/{ingestion_job_id}"
        return self.make_request('DELETE', url, user_email)
        
    def get_sync_status(self, user_email: str, kb_id: str) -> Tuple[int, Dict]:
        """Get sync status (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/sync"
        return self.make_request('GET', url, user_email)
        
    def get_sync_session_status(self, user_email: str, session_id: str) -> Tuple[int, Dict]:
        """Get sync session status (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/sync-sessions/{session_id}"
        return self.make_request('GET', url, user_email)
        
    def list_files(self, user_email: str, kb_id: str, params: Dict = None) -> Tuple[int, Dict]:
        """List files in knowledge base (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/files"
        return self.make_request('GET', url, user_email, params=params)
        
    def upload_files(self, user_email: str, kb_id: str, file_data: Dict) -> Tuple[int, Dict]:
        """Upload files to knowledge base (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/files"
        return self.make_request('POST', url, user_email, file_data)
        
    def get_file_download_url(self, user_email: str, kb_id: str, params: Dict) -> Tuple[int, Dict]:
        """Get file download URL (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/files/download"
        return self.make_request('GET', url, user_email, params=params)
        
    def delete_file(self, user_email: str, kb_id: str, file_data: Dict) -> Tuple[int, Dict]:
        """Delete file from knowledge base (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/files"
        return self.make_request('DELETE', url, user_email, params=file_data)
        
    def retrieve_documents(self, user_email: str, kb_id: str, query_data: Dict) -> Tuple[int, Dict]:
        """Retrieve documents from knowledge base (paid users)"""
        url = f"{config.get_api_url('knowledge_base')}/knowledge-bases/{kb_id}/retrieve"
        return self.make_request('POST', url, user_email, query_data)
        
    # Agent Management API methods  
    def list_agents(self, user_email: str) -> Tuple[int, Dict]:
        """List agents (paid users)"""
        url = f"{config.get_api_url('agent_management')}/agents"
        return self.make_request('GET', url, user_email)
        
    def create_agent(self, user_email: str, agent_data: Dict) -> Tuple[int, Dict]:
        """Create agent (paid users)"""
        url = f"{config.get_api_url('agent_management')}/agents"
        return self.make_request('POST', url, user_email, agent_data)
        
    def get_agent(self, user_email: str, agent_id: str) -> Tuple[int, Dict]:
        """Get agent details (paid users)"""
        url = f"{config.get_api_url('agent_management')}/agents/{agent_id}"
        return self.make_request('GET', url, user_email)
        
    def update_agent(self, user_email: str, agent_id: str, agent_data: Dict) -> Tuple[int, Dict]:
        """Update agent (paid users)"""
        url = f"{config.get_api_url('agent_management')}/agents/{agent_id}"
        return self.make_request('PUT', url, user_email, agent_data)
        
    def delete_agent(self, user_email: str, agent_id: str) -> Tuple[int, Dict]:
        """Delete agent (paid users)"""
        url = f"{config.get_api_url('agent_management')}/agents/{agent_id}"
        return self.make_request('DELETE', url, user_email)

# Global API client instance        
client = APIClient()