import json
import boto3
import os
import logging
from datetime import datetime
from decimal import Decimal
from botocore.exceptions import ClientError

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

def ensure_collection():
    """Ensure Rekognition collection exists"""
    try:
        rekognition.create_collection(CollectionId=COLLECTION)
        logger.info(f"✅ Created collection: {COLLECTION}")
    except rekognition.exceptions.ResourceAlreadyExistsException:
        logger.info(f"✅ Collection already exists: {COLLECTION}")
    except Exception as e:
        logger.error(f"❌ Failed to create collection: {e}")
        raise

def lambda_handler(event, context):
    """Index faces from an image"""
    logger.info("🔍 Index faces function started")
    
    try:
        body = json.loads(event.get('body', '{}'))
        s3_key = body.get('s3Key')
        external_id = body.get('externalId', s3_key)
        consent = body.get('consent', True)
        
        if not s3_key:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
                'body': json.dumps({'error': 's3Key required'})
            }
        
        # Sanitize external_id for Rekognition (only alphanumeric, underscore, dot, dash, colon)
        import re
        # Replace spaces with underscores, then keep only allowed characters
        sanitized_external_id = external_id.replace(' ', '_')
        sanitized_external_id = re.sub(r'[^a-zA-Z0-9_.:-]', '', sanitized_external_id)
        
        # Ensure it's not empty
        if not sanitized_external_id:
            sanitized_external_id = s3_key.split('/')[-1].split('.')[0]  # Use filename as fallback
        
        logger.info(f"📋 Indexing faces for: {s3_key}, externalId: {external_id} -> {sanitized_external_id}")
        
        # Ensure collection exists
        ensure_collection()
        
        # Check if image exists
        try:
            s3_response = s3_client.head_object(Bucket=BUCKET, Key=s3_key)
            logger.info(f"✅ Image exists: {s3_response.get('ContentLength', 0)} bytes")
        except ClientError:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
                'body': json.dumps({'error': 'Image not found in S3'})
            }
        
        # Index faces
        response = rekognition.index_faces(
            CollectionId=COLLECTION,
            Image={'S3Object': {'Bucket': BUCKET, 'Name': s3_key}},
            ExternalImageId=sanitized_external_id,
            DetectionAttributes=['DEFAULT'],
            QualityFilter='NONE'
        )
        
        face_records = response.get('FaceRecords', [])
        unindexed_faces = response.get('UnindexedFaces', [])
        
        logger.info(f"✅ Indexed {len(face_records)} faces, {len(unindexed_faces)} unindexed")
        
        # Store face mappings in DynamoDB
        now = datetime.utcnow().isoformat()
        for record in face_records:
            face_id = record['Face']['FaceId']
            confidence = record['Face']['Confidence']
            
            face_table.put_item(Item={
                'FaceId': face_id,
                's3Key': s3_key,
                'externalId': external_id,
                'consent': consent,
                'confidence': Decimal(str(confidence)),
                'createdAt': now
            })
            
            logger.info(f"  💾 Stored face: {face_id} (confidence: {confidence:.1f}%)")
        
        # Log unindexed faces for debugging
        for unindexed in unindexed_faces:
            reasons = unindexed.get('Reasons', [])
            logger.warning(f"  ⚠️ Unindexed face: {reasons}")
        
        result = {
            'indexed': len(face_records),
            'unindexed': len(unindexed_faces),
            'faceIds': [r['Face']['FaceId'] for r in face_records],
            'reasons': [u.get('Reasons', []) for u in unindexed_faces] if unindexed_faces else []
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Content-Type': 'application/json'
            },
            'body': json.dumps(result)
        }
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': str(e)})
        }