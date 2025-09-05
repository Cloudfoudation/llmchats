from fastapi import Request, HTTPException
import boto3
from botocore.config import Config
import jwt
from datetime import datetime
import os
from jwt import PyJWKClient

aws_config = Config(
    region_name=os.getenv('AWS_REGION', 'us-east-1'),
    retries=dict(max_attempts=3)
)

cognito_idp = boto3.client('cognito-idp', config=aws_config)
cognito_identity = boto3.client('cognito-identity', config=aws_config)
dynamodb = boto3.resource('dynamodb')
api_keys_table = dynamodb.Table(os.getenv('API_KEYS_TABLE'))

# Get Cognito configuration from environment variables
USER_POOL_ID = os.getenv('USER_POOL_ID')
IDENTITY_POOL_ID = os.getenv('IDENTITY_POOL_ID')
COGNITO_REGION = os.getenv('AWS_REGION', 'us-east-1')

async def verify_api_key(api_key: str):
    """Verify API key from DynamoDB table using GSI"""
    try:
        response = api_keys_table.query(
            IndexName='ApiKeyIndex',
            KeyConditionExpression='apiKey = :apiKey',
            FilterExpression='#status = :status',
            ExpressionAttributeValues={
                ':apiKey': api_key,
                ':status': 'active'
            },
            ExpressionAttributeNames={
                '#status': 'status'
            }
        )

        items = response.get('Items', [])
        if not items:
            raise HTTPException(status_code=401, detail="Invalid API key")

        api_key_data = items[0]
        current_time = int(datetime.utcnow().timestamp())

        # Check if API key has expired
        if 'ttl' in api_key_data and api_key_data['ttl'] < current_time:
            raise HTTPException(status_code=401, detail="API key has expired")

        return {
            "user_id": api_key_data['userId'],
            "role": "api_key",
            "username": api_key_data.get('username', ''),
            "groups": api_key_data.get('userGroups', []),
            "access_level": "api_key"
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail="API key verification failed")

async def verify_token(request: Request):
    # First check for API key in header
    api_key = request.headers.get("X-Api-Key")
    if api_key:
        return await verify_api_key(api_key)

    # If no API key, proceed with JWT token verification
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")
    
    token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=400, detail="Token is missing")

    try:
        return await verify_api_key(token)
    except:
        pass

    try:
        # Setup jwks client
        jwks_client = PyJWKClient(f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json")
        
        # Get the signing key
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Verify the token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                'verify_exp': True,
                'verify_aud': False,
                'verify_iss': True
            },
            issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}"
        )
        
        # Extract user info from token payload
        sub = payload['sub']
        username = payload.get('cognito:username') or payload.get('username')
        groups = payload.get('cognito:groups', [])
        
        try:
            identity_id = get_cognito_identity_id(token)
        except Exception as e:
            print(f"Error getting identity ID: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to get identity ID")
        
        role = 'free'
        if 'admin' in groups:
            role = 'admin'
        elif 'paid' in groups:
            role = 'paid'
            
        return {
            "user_id": identity_id,
            "sub": sub,
            "role": role,
            "username": username,
            "groups": groups
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        print(f"Debug - Full error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def get_cognito_identity_id(token: str) -> str:
    """Get Cognito Identity ID for the user"""
    try:
        response = cognito_identity.get_id(
            IdentityPoolId=IDENTITY_POOL_ID,
            Logins={
                f"cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}": token
            }
        )
        return response['IdentityId']
    except Exception as e:
        print(f"Error in get_cognito_identity_id: {str(e)}")
        raise