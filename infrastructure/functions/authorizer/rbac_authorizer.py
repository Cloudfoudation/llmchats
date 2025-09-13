# rbac_authorizer.py - GSIS Government RBAC Authorization (Minimal for testing)
import json
import time
import os
import jwt
from jwt.algorithms import RSAAlgorithm
import urllib.request

# Cache for the public keys
jwks_cache = {}
jwks_url = None

def lambda_handler(event, context):
    global jwks_url
    
    print(f"🔍 RBAC Authorizer called with event: {json.dumps(event, default=str)}")
    
    try:
        if jwks_url is None:
            user_pool_id = os.environ['USER_POOL_ID']
            region = os.environ.get('COGNITO_REGION', os.environ.get('AWS_REGION', 'us-east-1'))
            jwks_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
        
        token = event.get('authorizationToken', '')
        if not token:
            print(f"❌ No authorization token found")
            raise Exception('Unauthorized - No token')
            
        if token.startswith('Bearer '):
            token = token[7:]
        
        claims = validate_token(token)
        user_id = claims['sub']
        
        print(f"✅ Token validated for user: {user_id}")
        
        # For now, allow all requests (temporary for testing)
        policy = generate_policy(user_id, 'Allow', event['methodArn'], claims, token)
        print(f"✅ Generated Allow policy for user: {user_id}")
        return policy
            
    except Exception as e:
        print(f"❌ Authorization error: {str(e)}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        raise Exception('Unauthorized')

def validate_token(token):
    header = jwt.get_unverified_header(token)
    kid = header['kid']
    public_key = get_public_key(kid)
    
    user_pool_id = os.environ['USER_POOL_ID']
    region = os.environ['AWS_REGION']
    
    claims = jwt.decode(
        token,
        public_key,
        algorithms=['RS256'],
        options={"verify_aud": False},
        issuer=f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}'
    )
    
    if time.time() > claims['exp']:
        raise Exception('Token has expired')
    
    return claims

def get_public_key(kid):
    global jwks_cache, jwks_url
    
    if not jwks_cache or kid not in jwks_cache:
        response = urllib.request.urlopen(jwks_url)
        jwks = json.loads(response.read())
        jwks_cache = {key['kid']: key for key in jwks['keys']}
    
    if kid not in jwks_cache:
        raise Exception(f'Public key {kid} not found')
    
    jwk = jwks_cache[kid]
    public_key = RSAAlgorithm.from_jwk(json.dumps(jwk))
    return public_key

def generate_policy(principal_id, effect, resource, claims, token=None):
    tmp = resource.split(':')
    api_gateway_arn = tmp[5].split('/')
    aws_account_id = tmp[4]
    region = tmp[3]
    api_id = api_gateway_arn[0]
    stage = api_gateway_arn[1]
    
    # Try to get identityId from Cognito Identity Pool with timeout
    identity_id = None
    try:
        import boto3
        from botocore.config import Config
        
        # Configure client with shorter timeout to prevent hanging
        config = Config(
            read_timeout=2,
            connect_timeout=2,
            retries={'max_attempts': 1}
        )
        cognito_identity = boto3.client('cognito-identity', config=config)
        user_pool_id = os.environ['USER_POOL_ID']
        identity_pool_id = os.environ.get('IDENTITY_POOL_ID')
        
        if identity_pool_id and token:
            # Get identity ID using the JWT token (need the actual token, not just sub)
            response = cognito_identity.get_id(
                IdentityPoolId=identity_pool_id,
                Logins={
                    f'cognito-idp.{region}.amazonaws.com/{user_pool_id}': token
                }
            )
            identity_id = response.get('IdentityId')
            print(f"🔍 Got identityId: {identity_id}")
        elif not token:
            print(f"⚠️ No token provided to get identityId")
    except Exception as e:
        print(f"⚠️ Could not get identityId (using sub as fallback): {e}")
        # Use sub as fallback - this is acceptable
        identity_id = claims['sub']
    
    policy = {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                'Resource': f'arn:aws:execute-api:{region}:{aws_account_id}:{api_id}/{stage}/*'
            }]
        },
        'context': {
            'sub': claims['sub'],                                    # Required: Cognito sub
            'username': claims.get('cognito:username', claims.get('email', 'user')),  # Required: fallback to email or 'user'
            'email': claims.get('email', ''),                       # Optional: user email
            'identityId': identity_id or claims['sub'],             # Required: fallback to sub
            'claims': json.dumps(claims)                            # Required: contains groups
        }
    }
    
    print(f"🔍 Generated policy context: {policy['context']}")
    return policy
