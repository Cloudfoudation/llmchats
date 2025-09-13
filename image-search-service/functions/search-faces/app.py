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

logger = logging.getLogger()
logger.setLevel(logging.INFO)

rekognition = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

BUCKET = os.environ['BUCKET']
COLLECTION = os.environ['RK_COLLECTION']
FACE_TABLE = os.environ['FACE_TABLE']
ALLOWED_ORIGIN = os.environ['ALLOWED_ORIGIN']

face_table = dynamodb.Table(FACE_TABLE)

def lambda_handler(event, context):
    """Search for similar faces by image"""
    logger.info("🔍 Search faces function started")
    
    try:
        body = json.loads(event.get('body', '{}'))
        s3_key = body.get('s3Key')
        max_results = body.get('maxResults', 5)
        threshold = body.get('threshold', 80)
        
        if not s3_key:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
                'body': json.dumps({'error': 's3Key required'})
            }
        
        logger.info(f"🔍 Searching faces for: {s3_key} (threshold: {threshold}%, max: {max_results})")
        
        # Check if image exists
        try:
            s3_client.head_object(Bucket=BUCKET, Key=s3_key)
        except ClientError:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
                'body': json.dumps({'error': 'Search image not found in S3'})
            }
        
        # Search faces by image
        try:
            response = rekognition.search_faces_by_image(
                CollectionId=COLLECTION,
                Image={'S3Object': {'Bucket': BUCKET, 'Name': s3_key}},
                FaceMatchThreshold=threshold,
                MaxFaces=max_results
            )
        except rekognition.exceptions.InvalidParameterException as e:
            if 'no faces' in str(e).lower():
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
                    'body': json.dumps({
                        'matches': [],
                        'message': 'No faces detected in search image'
                    })
                }
            raise e
        
        face_matches = response.get('FaceMatches', [])
        logger.info(f"✅ Found {len(face_matches)} face matches")
        
        # Get face details from DynamoDB
        matches = []
        for match in face_matches:
            face_id = match['Face']['FaceId']
            similarity = match['Similarity']
            
            try:
                # Get face record from DynamoDB
                db_response = face_table.get_item(Key={'FaceId': face_id})
                
                if 'Item' in db_response:
                    item = db_response['Item']
                    
                    # Only return consented faces
                    if item.get('consent', False):
                        # Generate signed URL for thumbnail
                        thumb_url = s3_client.generate_presigned_url(
                            'get_object',
                            Params={'Bucket': BUCKET, 'Key': item['s3Key']},
                            ExpiresIn=3600
                        )
                        
                        matches.append({
                            'similarity': similarity,
                            'faceId': face_id,
                            's3Key': item['s3Key'],
                            'externalId': item.get('externalId'),
                            'thumbUrl': thumb_url,
                            'confidence': item.get('confidence', 0)
                        })
                        
                        logger.info(f"  ✅ Match: {similarity:.1f}% similarity, {item['s3Key']}")
                    else:
                        logger.info(f"  ⚠️ Skipped non-consented face: {face_id}")
                else:
                    logger.warning(f"  ❌ Face not found in DB: {face_id}")
                    
            except Exception as e:
                logger.error(f"  ❌ Error getting face {face_id}: {e}")
                continue
        
        # Sort by similarity descending
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        
        result = {
            'matches': matches,
            'totalMatches': len(matches)
        }
        
        logger.info(f"🎉 Returning {len(matches)} consented matches")
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps(result, cls=DecimalEncoder)
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': str(e)})
        }