import json
import boto3
import os
import time
import logging
import traceback
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')
rekognition_client = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')

BUCKET = os.environ['BUCKET']
RK_COLLECTION = os.environ['RK_COLLECTION']
TABLE_IMG = os.environ['TABLE_IMG']
TABLE_FACE = os.environ['TABLE_FACE']
ALLOWED_ORIGIN = os.environ['ALLOWED_ORIGIN']

img_table = dynamodb.Table(TABLE_IMG)
face_table = dynamodb.Table(TABLE_FACE)

def lambda_handler(event, context):
    """Ingest image and index faces with Rekognition"""
    logger.info(f"🚀 Ingest function started")
    logger.info(f"📥 Event: {json.dumps(event, default=str)}")
    
    try:
        
        body = json.loads(event['body'])
        image_id = body['imageId']
        s3_key = body['s3Key']
        consent = body.get('consent', False)
        person_id = body.get('personId')
        
        # Log request details
        logger.info(f"📋 Ingest request - imageId: {image_id}, consent: {consent}, personId: {person_id}")
        logger.info(f"🪣 Bucket: {BUCKET}, Collection: {RK_COLLECTION}")
        
        # Wait a moment for S3 to process the upload
        time.sleep(2)
        
        # Check if image exists in S3 first
        try:
            s3_response = s3_client.head_object(Bucket=BUCKET, Key=s3_key)
            logger.info(f"✅ Image exists in S3: {s3_key}")
            logger.info(f"📊 Image size: {s3_response.get('ContentLength', 0)} bytes")
        except ClientError as e:
            logger.error(f"❌ Image not found in S3: {s3_key} - {e}")
            raise Exception(f"Image not found in S3: {s3_key}")
        
        # First, detect faces to see if any are present
        logger.info(f"👁️ Detecting faces in image: {s3_key}")
        detect_response = rekognition_client.detect_faces(
            Image={'S3Object': {'Bucket': BUCKET, 'Name': s3_key}},
            Attributes=['ALL']
        )
        
        detected_faces = detect_response.get('FaceDetails', [])
        logger.info(f"✅ Face detection found {len(detected_faces)} faces")
        
        # Log detailed face information
        for i, face in enumerate(detected_faces):
            confidence = face.get('Confidence', 0)
            quality = face.get('Quality', {})
            brightness = quality.get('Brightness', 0)
            sharpness = quality.get('Sharpness', 0)
            bbox = face.get('BoundingBox', {})
            
            logger.info(f"  Face {i+1}: Confidence={confidence:.2f}%, Brightness={brightness:.2f}, Sharpness={sharpness:.2f}")
            logger.info(f"    BoundingBox: W={bbox.get('Width', 0):.3f}, H={bbox.get('Height', 0):.3f}")
        
        # If no faces detected, provide helpful debugging
        if len(detected_faces) == 0:
            logger.warning("⚠️ No faces detected - this could be due to:")
            logger.warning("  - Image doesn't contain human faces")
            logger.warning("  - Faces are too small (need 80x80 pixels minimum)")
            logger.warning("  - Poor lighting or image quality")
            logger.warning("  - Face is in profile or heavily angled")
            logger.warning("  - Image format issues")
        
        # Index faces with Rekognition
        logger.info(f"🔍 Indexing faces for image: {s3_key}")
        response = rekognition_client.index_faces(
            CollectionId=RK_COLLECTION,
            Image={'S3Object': {'Bucket': BUCKET, 'Name': s3_key}},
            MaxFaces=10,
            QualityFilter='NONE',  # Changed from AUTO to NONE to be less strict
            DetectionAttributes=['ALL']
        )
        
        logger.info(f"📊 Rekognition indexing response: {json.dumps(response, default=str)}")
        
        face_records = response.get('FaceRecords', [])
        face_ids = [face['Face']['FaceId'] for face in face_records]
        
        logger.info(f"✅ Faces indexed: {len(face_ids)}")
        
        # Log indexed face details
        for i, record in enumerate(face_records):
            face_id = record['Face']['FaceId']
            confidence = record['Face'].get('Confidence', 0)
            logger.info(f"  Indexed Face {i+1}: ID={face_id}, Confidence={confidence:.2f}%")
        
        # Log any unindexed faces (faces detected but not indexed)
        unindexed_faces = response.get('UnindexedFaces', [])
        if unindexed_faces:
            logger.warning(f"⚠️ Unindexed faces: {len(unindexed_faces)}")
            for i, unindexed in enumerate(unindexed_faces):
                reasons = unindexed.get('Reasons', [])
                logger.warning(f"  Unindexed Face {i+1}: Reasons={reasons}")
        
        # If no faces detected, provide detailed feedback
        if len(face_ids) == 0:
            logger.warning("⚠️ Warning: No faces were indexed in the image")
            if len(detected_faces) > 0:
                logger.warning(f"💡 {len(detected_faces)} faces detected but none indexed due to quality issues")
                for i, unindexed in enumerate(unindexed_faces):
                    reasons = unindexed.get('Reasons', [])
                    logger.warning(f"  Face {i+1} rejected: {reasons}")
        
        # Create thumbnail (copy for now)
        thumb_key = f"thumbs/{image_id}.jpg"
        logger.info(f"🖼️ Creating thumbnail: {thumb_key} from {s3_key}")
        
        try:
            s3_client.copy_object(
                Bucket=BUCKET,
                CopySource={'Bucket': BUCKET, 'Key': s3_key},
                Key=thumb_key
            )
            logger.info(f"✅ Thumbnail created successfully: {thumb_key}")
        except Exception as copy_error:
            logger.error(f"❌ Failed to create thumbnail: {copy_error}")
            # Use original image as fallback
            thumb_key = s3_key
            logger.info(f"🔄 Using original image as thumbnail: {thumb_key}")
        
        # Store in DynamoDB
        item_data = {
            'imageId': image_id,
            's3Key': s3_key,
            'thumbKey': thumb_key,
            'consent': consent,
            'rekognitionFaceIds': face_ids
        }
        
        # Only add personId if it's provided
        if person_id:
            item_data['personId'] = person_id
            
        logger.info(f"💾 Storing item in DynamoDB: {json.dumps(item_data, default=str)}")
        img_table.put_item(Item=item_data)
        logger.info(f"✅ Item stored successfully in table: {TABLE_IMG}")
        
        # Map faces to image
        logger.info(f"🗺️ Mapping {len(face_ids)} faces to image {image_id}")
        for i, face_id in enumerate(face_ids):
            face_item = {
                'faceId': face_id,
                'imageId': image_id
            }
            face_table.put_item(Item=face_item)
            logger.info(f"  Face {i+1} mapped: {face_id} -> {image_id}")
        
        logger.info(f"✅ All faces mapped successfully in table: {TABLE_FACE}")
        
        result = {
            'imageId': image_id,
            'facesIndexed': len(face_ids),
            'facesDetected': len(detected_faces),
            'unindexedFaces': len(unindexed_faces),
            'debugInfo': {
                'imageSize': s3_response.get('ContentLength', 0) if 's3_response' in locals() else 0,
                'bucket': BUCKET,
                'collection': RK_COLLECTION
            }
        }
        
        logger.info(f"🎉 Ingest completed successfully: {json.dumps(result)}")
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps(result)
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
        logger.error(f"📍 Error traceback: {traceback.format_exc()}")
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }