import json
import os

ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN', '*')

def lambda_handler(event, context):
    """Health check endpoint"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN
        },
        'body': json.dumps({
            'status': 'ok',
            'service': 'image-search-service'
        })
    }