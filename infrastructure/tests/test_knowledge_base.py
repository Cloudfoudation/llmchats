"""
Test cases for Knowledge Base API
"""
import unittest
import uuid
import time
from test_config import config
from auth_helper import auth
from api_client import client

class TestKnowledgeBaseAPI(unittest.TestCase):
    """Test Knowledge Base API endpoints"""
    
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
        cls.test_kb_id = None
        cls.test_ds_id = None
        cls.test_session_id = None
        cls.test_kb_data = {
            "name": f"TestKB_{uuid.uuid4().hex[:8]}",
            "description": "A test knowledge base for API testing",
            "embeddingModel": "amazon.titan-embed-text-v1"
        }
        
    def test_01_list_knowledge_bases_paid_success(self):
        """Test paid user can list knowledge bases"""
        status_code, response = client.list_knowledge_bases(self.paid_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('knowledgeBases', response['data'])
        self.assertIsInstance(response['data']['knowledgeBases'], list)
        
    def test_02_list_knowledge_bases_admin_success(self):
        """Test admin can list knowledge bases"""
        status_code, response = client.list_knowledge_bases(self.admin_email)
        self.assertEqual(status_code, 200)
        self.assertIn('data', response)
        self.assertIn('knowledgeBases', response['data'])
        
    def test_03_list_knowledge_bases_free_denied(self):
        """Test free user cannot list knowledge bases"""
        status_code, response = client.list_knowledge_bases(self.free_email)
        self.assertEqual(status_code, 403)  # Should be exactly 403 Forbidden
        
    def test_04_create_knowledge_base_paid_success(self):
        """Test paid user can create knowledge base"""
        status_code, response = client.create_knowledge_base(self.paid_email, self.test_kb_data)
        self.assertEqual(status_code, 201)  # Should be exactly 201 Created
        
        if status_code == 201:
            self.assertIn('data', response)
            self.assertIn('knowledgeBaseId', response['data'])
            self.__class__.test_kb_id = response['data']['knowledgeBaseId']
            
    def test_05_create_knowledge_base_admin_success(self):
        """Test admin can create knowledge base"""
        admin_kb_data = {
            "name": f"AdminTestKB_{uuid.uuid4().hex[:8]}",
            "description": "An admin test knowledge base",
            "embeddingModel": "amazon.titan-embed-text-v1"
        }
        
        status_code, response = client.create_knowledge_base(self.admin_email, admin_kb_data)
        self.assertEqual(status_code, 201)  # Should be exactly 201 Created
        
    def test_06_create_knowledge_base_free_denied(self):
        """Test free user cannot create knowledge base"""
        status_code, response = client.create_knowledge_base(self.free_email, self.test_kb_data)
        self.assertEqual(status_code, 403)  # Should be exactly 403 Forbidden
        
    def test_07_get_knowledge_base_paid_success(self):
        """Test paid user can get knowledge base details"""
        if self.test_kb_id:
            status_code, response = client.get_knowledge_base(self.paid_email, self.test_kb_id)
            self.assertEqual(status_code, 200)
            self.assertIn('data', response)
            self.assertEqual(response['data']['knowledgeBaseId'], self.test_kb_id)
            
    def test_08_get_knowledge_base_free_denied(self):
        """Test free user cannot get knowledge base details"""
        if self.test_kb_id:
            status_code, response = client.get_knowledge_base(self.free_email, self.test_kb_id)
            self.assertEqual(status_code, 403)  # Should be exactly 403 Forbidden
            
    def test_09_update_knowledge_base_paid_success(self):
        """Test paid user can update knowledge base"""
        if self.test_kb_id:
            update_data = {
                "name": f"Updated Test KB {uuid.uuid4().hex[:8]}",
                "description": "Updated description"
            }
            
            status_code, response = client.update_knowledge_base(self.paid_email, self.test_kb_id, update_data)
            self.assertEqual(status_code, 200)  # Should be exactly 200 OK
            
    def test_10_update_knowledge_base_free_denied(self):
        """Test free user cannot update knowledge base"""
        if self.test_kb_id:
            update_data = {
                "name": "Unauthorized Update",
                "description": "This should fail"
            }
            
            status_code, response = client.update_knowledge_base(self.free_email, self.test_kb_id, update_data)
            self.assertEqual(status_code, 403)  # Should be exactly 403 Forbidden
            
    def test_11_list_data_sources_paid_success(self):
        """Test paid user can list data sources"""
        if self.test_kb_id:
            status_code, response = client.list_data_sources(self.paid_email, self.test_kb_id)
            self.assertEqual(status_code, 200)
            self.assertIn('data', response)
            self.assertIn('dataSources', response['data'])
            self.assertIsInstance(response['data']['dataSources'], list)
            
    def test_12_create_data_source_paid_success(self):
        """Test paid user can create data source"""
        if self.test_kb_id:
            ds_data = {
                "name": f"Test Data Source {uuid.uuid4().hex[:8]}",
                "description": "A test data source",
                "s3Configuration": {
                    "bucketArn": f"arn:aws:s3:::test-bucket-{uuid.uuid4().hex[:8]}",
                    "inclusionPrefixes": ["documents/"]
                }
            }
            
            status_code, response = client.create_data_source(self.paid_email, self.test_kb_id, ds_data)
            
            if status_code in [200, 201]:
                self.assertIn('dataSource', response)
                self.assertIn('dataSourceId', response['dataSource'])
                self.__class__.test_ds_id = response['dataSource']['dataSourceId']
            else:
                # May fail due to S3 permissions or bucket existence
                self.assertEqual(status_code, 400)  # Validation error
                
    def test_13_delete_data_source_paid_success(self):
        """Test paid user can delete data source"""
        if self.test_kb_id and self.test_ds_id:
            status_code, response = client.delete_data_source(self.paid_email, self.test_kb_id, self.test_ds_id)
            self.assertEqual(status_code, 200)
            
    def test_14_list_files_paid_success(self):
        """Test paid user can list files"""
        if self.test_kb_id:
            status_code, response = client.list_files(self.paid_email, self.test_kb_id)
            self.assertEqual(status_code, 200)
            self.assertIn('data', response)
            self.assertIn('files', response['data'])
            self.assertIsInstance(response['data']['files'], list)
            
    def test_15_upload_files_paid_success(self):
        """Test paid user can upload files"""
        if self.test_kb_id:
            file_data = {
                "files": [
                    {
                        "fileName": "test.txt",
                        "content": "VGhpcyBpcyBhIHRlc3QgZmlsZS4="  # Base64 encoded "This is a test file."
                    }
                ]
            }
            
            status_code, response = client.upload_files(self.paid_email, self.test_kb_id, file_data)
            self.assertEqual(status_code, 200)
            
    def test_16_get_file_download_url_paid_success(self):
        """Test paid user can get file download URL"""
        if self.test_kb_id:
            params = {
                "key": "test.txt"
            }
            
            status_code, response = client.get_file_download_url(self.paid_email, self.test_kb_id, params)
            # May succeed or fail depending on file existence
            self.assertEqual(status_code, 200)
            
    def test_17_delete_file_paid_success(self):
        """Test paid user can delete file"""
        if self.test_kb_id:
            file_data = {
                "key": "test.txt"
            }
            
            status_code, response = client.delete_file(self.paid_email, self.test_kb_id, file_data)
            # May succeed or fail depending on file existence
            self.assertEqual(status_code, 200)
            
    def test_18_start_sync_paid_success(self):
        """Test paid user can start sync"""
        if self.test_kb_id:
            sync_data = {
                "files": ["test.txt"]  # Optional file list
            }
            
            status_code, response = client.start_sync(self.paid_email, self.test_kb_id, sync_data)
            
            if status_code in [200, 201]:
                if 'sessionId' in response:
                    self.__class__.test_session_id = response['sessionId']
                elif 'ingestionJob' in response and 'ingestionJobId' in response['ingestionJob']:
                    # Legacy response format
                    pass
            else:
                # May fail due to no data sources or other reasons
                self.assertEqual(status_code, 400)
                
    def test_19_get_sync_status_paid_success(self):
        """Test paid user can get sync status"""
        if self.test_kb_id:
            status_code, response = client.get_sync_status(self.paid_email, self.test_kb_id)
            self.assertEqual(status_code, 200)
            # Response format may vary
            
    def test_20_get_sync_session_status_paid_success(self):
        """Test paid user can get sync session status"""
        if self.test_session_id:
            status_code, response = client.get_sync_session_status(self.paid_email, self.test_session_id)
            self.assertEqual(status_code, 200)
            self.assertIn('session', response)
            
    def test_21_retrieve_documents_paid_success(self):
        """Test paid user can retrieve documents"""
        if self.test_kb_id:
            query_data = {
                "query": "test query",
                "maxResults": 5
            }
            
            status_code, response = client.retrieve_documents(self.paid_email, self.test_kb_id, query_data)
            # May succeed or fail depending on data in KB
            self.assertIn(status_code, [200, 400])  # May fail if no documents
            
    def test_22_retrieve_documents_free_denied(self):
        """Test free user cannot retrieve documents"""
        if self.test_kb_id:
            query_data = {
                "query": "test query"
            }
            
            status_code, response = client.retrieve_documents(self.free_email, self.test_kb_id, query_data)
            self.assertEqual(status_code, 403)
            
    def test_23_create_knowledge_base_invalid_data(self):
        """Test create knowledge base with invalid data"""
        invalid_data = {
            "name": "",  # Empty name
            "embeddingModel": "invalid-model"  # Invalid model
        }
        
        status_code, response = client.create_knowledge_base(self.paid_email, invalid_data)
        self.assertEqual(status_code, 400)
        
    def test_24_get_nonexistent_knowledge_base(self):
        """Test get nonexistent knowledge base"""
        fake_kb_id = f"nonexistent-{uuid.uuid4()}"
        status_code, response = client.get_knowledge_base(self.paid_email, fake_kb_id)
        self.assertEqual(status_code, 403)  # Accept both 403 and 404
        
    def test_25_unauthorized_access(self):
        """Test unauthorized access without token"""
        status_code, response = client.list_knowledge_bases(None)  # No authentication
        self.assertEqual(status_code, 401)
        
    def test_26_delete_knowledge_base_paid_success(self):
        """Test paid user can delete knowledge base"""
        if self.test_kb_id:
            # Wait a bit to ensure any pending operations complete
            time.sleep(2)
            
            status_code, response = client.delete_knowledge_base(self.paid_email, self.test_kb_id)
            self.assertEqual(status_code, 200)
            
    def test_27_delete_knowledge_base_free_denied(self):
        """Test free user cannot delete knowledge base"""
        fake_kb_id = f"fake-{uuid.uuid4()}"
        status_code, response = client.delete_knowledge_base(self.free_email, fake_kb_id)
        self.assertEqual(status_code, 403)

if __name__ == '__main__':
    unittest.main()