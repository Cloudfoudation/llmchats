# custom_authorizer.py
import json
import time
import os
import jwt
from jwt.algorithms import RSAAlgorithm
import urllib.request
import re

# Cache for the public keys
jwks_cache = {}
jwks_url = None  # Will be populated at initialization

def lambda_handler(event, context):
    global jwks_url
    
    # If not yet initialized
    if jwks_url is None:
        # Get your user pool ID from environment variables
        user_pool_id = os.environ['USER_POOL_ID']
        region = os.environ['AWS_REGION']
        jwks_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    
    # Get the token from the Authorization header
    token = event['authorizationToken']
    if token.startswith('Bearer '):
        token = token[7:]
    
    try:
        # Validate the token
        claims = validate_token(token)
        
        # Get the user's Cognito groups
        cognito_groups = claims.get('cognito:groups', [])
        if isinstance(cognito_groups, str):
            cognito_groups = cognito_groups.split(',')
        
        # Check if user is in admin group
        is_admin = any(group == 'admin' for group in cognito_groups)
        
        if is_admin:
            # Generate policy allowing access
            policy = generate_policy(claims['sub'], 'Allow', event['methodArn'], claims, cognito_groups)
            return policy
        else:
            # Deny access if not in required groups
            policy = generate_policy(claims['sub'], 'Deny', event['methodArn'], claims, cognito_groups)
            return policy
            
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        raise Exception('Unauthorized')

def validate_token(token):
    # Decode the token header
    header = jwt.get_unverified_header(token)
    
    # Get the key ID from the header
    kid = header['kid']
    
    # Get the public key
    public_key = get_public_key(kid)
    
    # Verify the token
    user_pool_id = os.environ['USER_POOL_ID']
    region = os.environ['AWS_REGION']
    
    claims = jwt.decode(
        token,
        public_key,
        algorithms=['RS256'],
        options={"verify_aud": False},
        issuer=f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}'
    )
    
    # Check token expiration
    if time.time() > claims['exp']:
        raise Exception('Token has expired')
    
    return claims

def get_public_key(kid):
    global jwks_cache, jwks_url
    
    # If the key is not in the cache or cache is empty, fetch from JWKS URL
    if not jwks_cache or kid not in jwks_cache:
        response = urllib.request.urlopen(jwks_url)
        jwks = json.loads(response.read())
        
        # Update the cache with all keys
        jwks_cache = {key['kid']: key for key in jwks['keys']}
    
    if kid not in jwks_cache:
        raise Exception(f'Public key {kid} not found')
    
    # Get the key from the cache
    jwk = jwks_cache[kid]
    
    # Convert the JWK to a PEM format
    public_key = RSAAlgorithm.from_jwk(json.dumps(jwk))
    return public_key

def generate_policy(principal_id, effect, resource, claims, groups):
    # Extract the API ID, stage, and base resource path from the methodArn
    # methodArn format: arn:aws:execute-api:{regionId}:{accountId}:{apiId}/{stage}/{httpVerb}/[{resource}/{childResource}]
    tmp = resource.split(':')
    api_gateway_arn = tmp[5].split('/')
    aws_account_id = tmp[4]
    region = tmp[3]
    api_id = api_gateway_arn[0]
    stage = api_gateway_arn[1]
    
    # Create a policy that allows access to all methods and paths
    policy = {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                # Allow access to all methods and paths in this API and stage
                'Resource': f'arn:aws:execute-api:{region}:{aws_account_id}:{api_id}/{stage}/*'
            }]
        },
        'context': {
            'sub': claims['sub'],
            'username': claims.get('cognito:username', ''),
            'email': claims.get('email', ''),
            'isAdmin': str('admin' in groups).lower(),
            'isPaid': str('paid' in groups).lower(),
            'groups': ','.join(groups),
            'claims': json.dumps(claims)
        }
    }
    
    return policy