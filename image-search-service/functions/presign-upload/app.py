import json
import boto3
import os
import uuid
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')
BUCKET = os.environ['BUCKET']
ALLOWED_ORIGIN = os.environ['ALLOWED_ORIGIN']

def lambda_handler(event, context):
    """Generate presigned URL for image upload"""
    try:
        image_id = str(uuid.uuid4())
        s3_key = f"input/{image_id}.jpg"
        
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET,
                'Key': s3_key,
                'ContentType': 'image/jpeg'
            },
            ExpiresIn=3600
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN
            },
            'body': json.dumps({
                'imageId': image_id,
                'uploadUrl': presigned_url,
                's3Key': s3_key
            })
        }
        
    except ClientError as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN
            },
            'body': json.dumps({'error': str(e)})
        }