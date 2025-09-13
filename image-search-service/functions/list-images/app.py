import json
import boto3
import os
import logging
from decimal import Decimal
from botocore.exceptions import ClientError

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

BUCKET = os.environ['BUCKET']
FACE_TABLE = os.environ['FACE_TABLE']
ALLOWED_ORIGIN = os.environ['ALLOWED_ORIGIN']

face_table = dynamodb.Table(FACE_TABLE)

def lambda_handler(event, context):
    """List all uploaded images"""
    logger.info("📋 List images function started")
    
    try:
        # Scan all faces from DynamoDB and group by s3Key
        response = face_table.scan()
        items = response.get('Items', [])
        
        logger.info(f"📊 Found {len(items)} face records in database")
        
        # Group faces by s3Key to get unique images
        images_map = {}
        for item in items:
            s3_key = item['s3Key']
            if s3_key not in images_map:
                images_map[s3_key] = {
                    'externalId': item.get('externalId', s3_key),
                    'consent': item.get('consent', False),
                    's3Key': s3_key,
                    'faces': [],
                    'createdAt': item.get('createdAt', '')
                }
            images_map[s3_key]['faces'].append({
                'faceId': item['FaceId'],
                'confidence': item.get('confidence', 0)
            })
        
        # Generate signed URLs and format response
        images = []
        for s3_key, data in images_map.items():
            try:
                # Generate signed URL for image
                thumb_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': BUCKET, 'Key': s3_key},
                    ExpiresIn=3600
                )
                
                image_data = {
                    'imageId': data['externalId'],
                    'consent': data['consent'],
                    'facesCount': len(data['faces']),
                    'thumbUrl': thumb_url,
                    's3Key': s3_key,
                    'createdAt': data['createdAt']
                }
                
                images.append(image_data)
                logger.info(f"  ✅ Image {data['externalId']}: {image_data['facesCount']} faces")
                
            except Exception as e:
                logger.error(f"  ❌ Error processing image {s3_key}: {e}")
                continue
        
        # Sort by creation time descending
        images.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        result = {
            'images': images,
            'totalCount': len(images)
        }
        
        logger.info(f"🎉 Returning {len(images)} images")
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps(result, cls=DecimalEncoder)
        }
        
    except ClientError as e:
        logger.error(f"❌ AWS ClientError: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': f'AWS Error: {str(e)}'})
        }
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }