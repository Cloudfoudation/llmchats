import json
import boto3
import os
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
    """Search for similar faces in images"""
    logger.info(f"🔍 Search function started")
    logger.info(f"📥 Event: {json.dumps(event, default=str)}")
    
    try:
        
        body = json.loads(event['body'])
        s3_key = body['s3Key']
        
        logger.info(f"🔎 Search request for s3Key: {s3_key}")
        logger.info(f"🪣 Bucket: {BUCKET}, Collection: {RK_COLLECTION}")
        
        # Search faces by image
        logger.info(f"🔍 Searching in collection: {RK_COLLECTION}")
        try:
            response = rekognition_client.search_faces_by_image(
                CollectionId=RK_COLLECTION,
                Image={'S3Object': {'Bucket': BUCKET, 'Name': s3_key}},
                FaceMatchThreshold=70,  # Lowered threshold for better matching
                MaxFaces=10,
                QualityFilter='NONE'  # Less strict quality filter
            )
            
            face_matches = response.get('FaceMatches', [])
            logger.info(f"✅ Rekognition search completed: {len(face_matches)} matches found")
            logger.info(f"📊 Search response: {json.dumps(response, default=str)}")
            
        except rekognition_client.exceptions.InvalidParameterException as e:
            if 'no faces' in str(e).lower():
                logger.warning("⚠️ No faces detected in search image")
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
                    'body': json.dumps({
                        'results': [],
                        'totalMatches': 0,
                        'message': 'No faces detected in the search image'
                    })
                }
            else:
                logger.error(f"❌ Rekognition InvalidParameterException: {str(e)}")
                raise e
        except Exception as e:
            logger.error(f"❌ Rekognition search error: {str(e)}")
            raise e
        
        results = []
        logger.info(f"🔄 Processing {len(face_matches)} face matches")
        
        for i, match in enumerate(face_matches):
            face_id = match['Face']['FaceId']
            confidence = match['Similarity']
            
            logger.info(f"  Match {i+1}: FaceID={face_id}, Confidence={confidence:.2f}%")
            
            # Get image metadata
            logger.info(f"    Looking up face {face_id} in face table")
            face_response = face_table.get_item(Key={'faceId': face_id})
            if 'Item' not in face_response:
                logger.warning(f"    Face {face_id} not found in face table, skipping")
                continue
                
            image_id = face_response['Item']['imageId']
            logger.info(f"    Face {face_id} maps to image {image_id}")
            
            img_response = img_table.get_item(Key={'imageId': image_id})
            if 'Item' not in img_response:
                logger.warning(f"    Image {image_id} not found in image table, skipping")
                continue
                
            img_data = img_response['Item']
            logger.info(f"    Image data: consent={img_data.get('consent')}, personId={img_data.get('personId')}")
            
            # Only return consented images
            if not img_data.get('consent', False):
                logger.info(f"    Skipping image {image_id} - no consent")
                continue
            
            # Generate signed URL for thumbnail
            thumb_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': BUCKET, 'Key': img_data['thumbKey']},
                ExpiresIn=3600
            )
            
            # Determine similarity label
            if confidence >= 95:
                similarity_label = "Very similar"
            elif confidence >= 90:
                similarity_label = "Similar"
            else:
                similarity_label = "Possibly similar"
            
            results.append({
                'imageId': image_id,
                'confidence': confidence,
                'similarityLabel': similarity_label,
                'thumbUrl': thumb_url,
                'personId': img_data.get('personId')
            })
        
        # Sort by confidence descending
        results.sort(key=lambda x: x['confidence'], reverse=True)
        logger.info(f"✅ Final results: {len(results)} consented matches")
        
        final_result = {
            'results': results,
            'totalMatches': len(results)
        }
        
        logger.info(f"🎉 Search completed successfully: {json.dumps(final_result, default=str)}")
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps(final_result)
        }
        
    except ClientError as e:
        logger.error(f"❌ AWS ClientError in search: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': f'AWS Error: {str(e)}'})
        }
    except Exception as e:
        logger.error(f"❌ Unexpected error in search: {str(e)}")
        logger.error(f"📍 Error traceback: {traceback.format_exc()}")
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': ALLOWED_ORIGIN},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }