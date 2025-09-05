"""
Authentication helper for API testing
"""
import boto3
import requests
import jwt
import json
from typing import Dict, Optional, Tuple
from test_config import config

class AuthHelper:
    """Helper class for authentication operations in tests"""
    
    def __init__(self):
        self.cognito_client = boto3.client('cognito-idp', region_name=config.region)
        self.cognito_identity_client = boto3.client('cognito-identity', region_name=config.region)
        self.user_pool_id = None
        self.user_pool_client_id = None
        self.identity_pool_id = None
        self.tokens = {}  # Store tokens for different users
        
    def setup_cognito(self, user_pool_id: str, user_pool_client_id: str, identity_pool_id: str):
        """Setup Cognito configuration"""
        self.user_pool_id = user_pool_id
        self.user_pool_client_id = user_pool_client_id
        self.identity_pool_id = identity_pool_id
        
    def create_test_user(self, email: str, password: str, temporary: bool = False) -> bool:
        """Create a test user in Cognito"""
        try:
            # Prepare the parameters for admin_create_user
            create_params = {
                'UserPoolId': self.user_pool_id,
                'Username': email,
                'UserAttributes': [
                    {'Name': 'email', 'Value': email},
                    {'Name': 'email_verified', 'Value': 'true'}
                ],
                'MessageAction': 'SUPPRESS'
            }
            
            # Only add TemporaryPassword if temporary is True
            if temporary:
                create_params['TemporaryPassword'] = password
            
            response = self.cognito_client.admin_create_user(**create_params)
            
            if not temporary:
                # Set permanent password
                self.cognito_client.admin_set_user_password(
                    UserPoolId=self.user_pool_id,
                    Username=email,
                    Password=password,
                    Permanent=True
                )
            
            return True
        except self.cognito_client.exceptions.UsernameExistsException:
            return True  # User already exists
        except Exception as e:
            print(f"Error creating user {email}: {str(e)}")
            return False
            
    def add_user_to_group(self, email: str, group_name: str) -> bool:
        """Add user to a Cognito group"""
        try:
            self.cognito_client.admin_add_user_to_group(
                UserPoolId=self.user_pool_id,
                Username=email,
                GroupName=group_name
            )
            return True
        except Exception as e:
            print(f"Error adding user {email} to group {group_name}: {str(e)}")
            return False
            
    def authenticate_user(self, email: str, password: str) -> Tuple[bool, Optional[Dict]]:
        """Authenticate user and return tokens"""
        try:
            response = self.cognito_client.admin_initiate_auth(
                UserPoolId=self.user_pool_id,
                ClientId=self.user_pool_client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )
            
            auth_result = response['AuthenticationResult']
            tokens = {
                'access_token': auth_result['AccessToken'],
                'id_token': auth_result['IdToken'],
                'refresh_token': auth_result['RefreshToken']
            }
            
            # Get identity ID from identity pool
            identity_response = self.cognito_identity_client.get_id(
                IdentityPoolId=self.identity_pool_id,
                Logins={
                    f'cognito-idp.{config.region}.amazonaws.com/{self.user_pool_id}': auth_result['IdToken']
                }
            )
            
            tokens['identity_id'] = identity_response['IdentityId']
            
            # Store tokens for this user
            self.tokens[email] = tokens
            
            return True, tokens
        except Exception as e:
            print(f"Error authenticating user {email}: {str(e)}")
            return False, None
            
    def get_auth_headers(self, email: str) -> Dict[str, str]:
        """Get authorization headers for API requests"""
        if email in self.tokens:
            return {
                'Authorization': f"Bearer {self.tokens[email]['id_token']}",
                'Content-Type': 'application/json'
            }
        return {'Content-Type': 'application/json'}
        
    def get_user_sub(self, email: str) -> Optional[str]:
        """Get user's sub from JWT token"""
        if email in self.tokens:
            try:
                decoded = jwt.decode(
                    self.tokens[email]['id_token'], 
                    options={"verify_signature": False}
                )
                return decoded.get('sub')
            except Exception as e:
                print(f"Error decoding token for {email}: {str(e)}")
        return None
        
    def get_identity_id(self, email: str) -> Optional[str]:
        """Get user's identity ID"""
        if email in self.tokens:
            return self.tokens[email]['identity_id']
        return None
        
    def cleanup_test_users(self):
        """Delete all test users"""
        for user_config in config.test_users.values():
            try:
                self.cognito_client.admin_delete_user(
                    UserPoolId=self.user_pool_id,
                    Username=user_config['email']
                )
            except Exception as e:
                print(f"Error deleting user {user_config['email']}: {str(e)}")
                
    def setup_test_users(self) -> bool:
        """Setup all test users with appropriate groups"""
        success = True
        
        for user_type, user_config in config.test_users.items():
            # Create user
            if not self.create_test_user(user_config['email'], user_config['password']):
                success = False
                continue
                
            # Add to group  
            if not self.add_user_to_group(user_config['email'], user_config['group']):
                success = False
                continue
                
            # Authenticate to get tokens
            auth_success, tokens = self.authenticate_user(user_config['email'], user_config['password'])
            if not auth_success:
                success = False
                
        return success

# Global auth helper instance
auth = AuthHelper()