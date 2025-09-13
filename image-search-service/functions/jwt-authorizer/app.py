import json
import jwt
import os

def lambda_handler(event, context):
    """JWT Authorizer for API Gateway"""
    try:
        token = event['headers'].get('authorization', '').replace('Bearer ', '')
        if not token:
            return generate_policy('user', 'Deny', event['routeArn'])
        
        # Decode JWT (simplified - in production use proper verification)
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get('sub')
            role = payload.get('custom:role', 'Viewer')
            
            return generate_policy(user_id, 'Allow', event['routeArn'], {
                'userId': user_id,
                'role': role
            })
        except jwt.InvalidTokenError:
            return generate_policy('user', 'Deny', event['routeArn'])
            
    except Exception as e:
        print(f"Authorizer error: {str(e)}")
        return generate_policy('user', 'Deny', event['routeArn'])

def generate_policy(principal_id, effect, resource, context=None):
    """Generate IAM policy for API Gateway"""
    policy = {
        'principalId': principal_id,
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [{
                'Action': 'execute-api:Invoke',
                'Effect': effect,
                'Resource': resource
            }]
        }
    }
    
    if context:
        policy['context'] = context
        
    return policy