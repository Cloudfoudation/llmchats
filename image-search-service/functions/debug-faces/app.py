import json
import boto3
import os
import logging
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

rekognition_client = boto3.client('rekognition')

BUCKET = os.environ['BUCKET']
ALLOWED_ORIGIN = os.environ['ALLOWED_ORIGIN']

def lambda_handler(event, context):
    """Debug face detection in an image"""
    logger.info("🔍 Debug faces function started")
    
    try:
        body = json.loads(event['body'])
        s3_key = body['s3Key']
        
        logger.info(f"🖼️ Analyzing image: {s3_key}")
        
        # Detect faces with detailed attributes
        response = rekognition_client.detect_faces(
            Image={'S3Object': {'Bucket': BUCKET, 'Name': s3_key}},
            Attributes=['ALL']
        )
        
        face_details = response.get('FaceDetails', [])
        logger.info(f"👥 Found {len(face_details)} faces")
        
        # Process face details
        faces = []
        for i, face in enumerate(face_details):
            face_info = {
                'faceId': i + 1,
                'confidence': face.get('Confidence', 0),
                'ageRange': face.get('AgeRange', {}),
                'gender': face.get('Gender', {}),
                'emotions': face.get('Emotions', []),
                'quality': face.get('Quality', {}),
                'pose': face.get('Pose', {}),
                'landmarks': len(face.get('Landmarks', [])),
                'boundingBox': face.get('BoundingBox', {})
            }
            faces.append(face_info)
            
            logger.info(f"  Face {i+1}: Confidence={face_info['confidence']:.2f}%, Quality={face_info['quality']}")
        
        result = {
            's3Key': s3_key,
            'facesDetected': len(face_details),
            'faces': faces
        }
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps(result, default=str)
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