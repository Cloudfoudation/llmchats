import json
import boto3
import os

def lambda_handler(event, context):
    """Setup initial roles and permissions in GroupPermissions table"""
    
    # Only run on CREATE events
    if event['RequestType'] != 'Create':
        return send_response(event, context, 'SUCCESS', {})
    
    try:
        dynamodb = boto3.resource('dynamodb')
        table_name = os.environ['GROUP_PERMISSIONS_TABLE']
        table = dynamodb.Table(table_name)
        
        # Define initial roles with permissions - Simple 2-role system
        initial_roles = [
            {
                'groupName': 'gsis-admin',
                'permissions': ['*'],  # Full access to everything
                'autoAssignAgents': [],
                'autoAssignKnowledgeBases': [],
                'description': 'GSIS administrators with full system access'
            },
            {
                'groupName': 'general-user',
                'permissions': [
                    'kb:read', 'kb:create:own', 'kb:update:own',
                    'agent:read', 'agent:use',
                    'doc:upload', 'doc:process'
                ],
                'autoAssignAgents': [],
                'autoAssignKnowledgeBases': [],
                'description': 'General users with access to own resources'
            }
        ]
        
        # Insert initial roles
        for role in initial_roles:
            try:
                table.put_item(
                    Item=role,
                    ConditionExpression='attribute_not_exists(groupName)'  # Only if doesn't exist
                )
                print(f"✅ Created initial role: {role['groupName']}")
            except table.meta.client.exceptions.ConditionalCheckFailedException:
                print(f"⚠️ Role already exists: {role['groupName']}")
            except Exception as e:
                print(f"❌ Error creating role {role['groupName']}: {e}")
        
        print("🎉 Initial roles setup completed")
        return send_response(event, context, 'SUCCESS', {
            'Message': 'Initial roles created successfully'
        })
        
    except Exception as e:
        print(f"❌ Error setting up initial roles: {e}")
        return send_response(event, context, 'FAILED', {
            'Message': str(e)
        })

def send_response(event, context, response_status, response_data):
    """Send response to CloudFormation"""
    import urllib3
    
    response_url = event['ResponseURL']
    response_body = {
        'Status': response_status,
        'Reason': f'See CloudWatch Log Stream: {context.log_stream_name}',
        'PhysicalResourceId': context.log_stream_name,
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'Data': response_data
    }
    
    json_response_body = json.dumps(response_body)
    
    headers = {
        'content-type': '',
        'content-length': str(len(json_response_body))
    }
    
    http = urllib3.PoolManager()
    response = http.request('PUT', response_url, body=json_response_body, headers=headers)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Success')
    }