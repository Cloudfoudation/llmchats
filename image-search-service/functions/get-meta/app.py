import json
import boto3
import os
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

BUCKET = os.environ['BUCKET']
TABLE_IMG = os.environ['TABLE_IMG']
ALLOWED_ORIGIN = os.environ['ALLOWED_ORIGIN']

img_table = dynamodb.Table(TABLE_IMG)

def lambda_handler(event, context):
    """Get image metadata and signed URL"""
    try:
        image_id = event['pathParameters']['imageId']
        
        # Get image metadata
        response = img_table.get_item(Key={'imageId': image_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
                'body': json.dumps({'error': 'Image not found'})
            }
        
        img_data = response['Item']
        
        # Generate signed URL for thumbnail
        thumb_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET, 'Key': img_data['thumbKey']},
            ExpiresIn=3600
        )
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({
                'imageId': image_id,
                'consent': img_data.get('consent', False),
                'personId': img_data.get('personId'),
                'facesCount': len(img_data.get('rekognitionFaceIds', [])),
                'thumbUrl': thumb_url
            })
        }
        
    except ClientError as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': str(e)})
        }