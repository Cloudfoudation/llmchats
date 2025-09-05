import boto3
import urllib3
from urllib.parse import urlparse
import logging
import os
from typing import Optional, Dict, Any, List, Tuple
import json
import re
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:%(filename)s:L%(lineno)d - %(message)s",
)
logger = logging.getLogger(__name__)

class S3UrlConverter:
    def __init__(self, bucket_name: str, region: str = 'us-west-2'):
        self.bucket_name = bucket_name
        self.region = region
        self.s3_client = boto3.client('s3', region_name=region)

    def check_s3_key_exists(self, bucket: str, key: str) -> bool:
        """Check if an object exists in S3 bucket"""
        try:
            self.s3_client.head_object(Bucket=bucket, Key=key)
            logger.info(f"S3 object exists: s3://{bucket}/{key}")
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.warning(f"S3 object does not exist: s3://{bucket}/{key}")
                return False
            else:
                logger.error(f"Error checking S3 object: {e}")
                return False

    def ensure_videos_prefix(self, s3_key: str) -> str:
        """Ensure the S3 key starts with 'videos/'"""
        # Remove any leading slash
        if s3_key.startswith('/'):
            s3_key = s3_key[1:]
        
        # Check if the key already starts with videos/
        if not s3_key.startswith('videos/'):
            logger.info(f"Adding 'videos/' prefix to key: {s3_key}")
            return f"videos/{s3_key}"
        return s3_key

    def presigned_url_to_s3_key(self, url: str) -> Optional[str]:
        """Convert a presigned URL to S3 key"""
        try:
            # Parse the URL
            parsed = urlparse(url)
            
            # Extract path
            path = parsed.path
            if path.startswith('/'):
                path = path[1:]

            # Debug the URL components
            logger.info(f"Processing URL: {url[:100]}...")
            logger.info(f"URL parsed components: netloc={parsed.netloc}, path={path}")
            
            # Extract potential S3 key
            s3_key = None
            
            # Special handling for the example URL format
            video_pattern = re.compile(r'videos/[a-zA-Z0-9]+/output\.mp4')
            if video_pattern.search(path) or '/videos/' in path:
                logger.info(f"Matched video pattern in path: {path}")
                s3_key = path
            # Check if this is any S3 URL format
            elif '.s3.' in parsed.netloc:
                logger.info(f"S3 URL detected with path: {path}")
                s3_key = path
            
            if s3_key:
                # Ensure key starts with videos/
                s3_key = self.ensure_videos_prefix(s3_key)
                
                # Check if the key exists in S3
                if self.check_s3_key_exists(self.bucket_name, s3_key):
                    return s3_key
                else:
                    # Try without videos/ prefix if it was added
                    if s3_key.startswith('videos/') and not path.startswith('videos/'):
                        original_key = path
                        if self.check_s3_key_exists(self.bucket_name, original_key):
                            logger.info(f"Found object with original key: {original_key}")
                            return original_key
                    
                    logger.warning(f"S3 key not found in bucket: {s3_key}")
                    return None
            
            return None
            
        except Exception as e:
            logger.error(f"Error converting URL: {url}\nError: {e}")
            return None

    def process_task_data(self, task_data: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, int], bool]:
        """Process task data to convert URLs to S3 keys"""
        stats = {
            "videos_converted": 0,
            "preview_images_converted": 0,
            "selected_images_converted": 0
        }

        updated = False

        # Process video URLs
        if 'video_urls' in task_data and task_data['video_urls']:
            logger.info(f"Processing video URLs for task {task_data.get('task_id')}")
            logger.info(f"Current video_urls: {task_data['video_urls'][:200]}...")
            
            new_video_urls = []
            for url_item in task_data['video_urls']:
                if isinstance(url_item, str) and url_item.startswith('http'):
                    # Process string URL
                    logger.info(f"Processing video URL (string): {url_item[:100]}...")
                    s3_key = self.presigned_url_to_s3_key(url_item)
                    if s3_key:
                        # Ensure key has videos/ prefix
                        s3_key = self.ensure_videos_prefix(s3_key)
                        
                        new_url_item = {
                            's3_key': s3_key,
                            'bucket': self.bucket_name
                        }
                        new_video_urls.append(new_url_item)
                        stats['videos_converted'] += 1
                        updated = True
                        logger.info(f"Converted to S3 object: {new_url_item}")
                    else:
                        new_video_urls.append(url_item)
                        logger.warning(f"Could not convert URL: {url_item[:100]}...")
                elif isinstance(url_item, dict):
                    # Check if it already has s3_key format
                    if 's3_key' in url_item and 'bucket' in url_item:
                        # Ensure key has videos/ prefix
                        s3_key = self.ensure_videos_prefix(url_item['s3_key'])
                        if s3_key != url_item['s3_key']:
                            url_item['s3_key'] = s3_key
                            updated = True
                            stats['videos_converted'] += 1
                        
                        # Verify that this S3 object actually exists
                        if self.check_s3_key_exists(url_item['bucket'], url_item['s3_key']):
                            new_video_urls.append(url_item)
                        else:
                            logger.warning(f"S3 object does not exist: {url_item}")
                            # Keep the original item even if it doesn't exist
                            new_video_urls.append(url_item)
                    # Check if it has URL that needs conversion
                    elif 'url' in url_item and isinstance(url_item['url'], str) and url_item['url'].startswith('http'):
                        logger.info(f"Processing video URL (dict): {url_item['url'][:100]}...")
                        s3_key = self.presigned_url_to_s3_key(url_item['url'])
                        if s3_key:
                            # Ensure key has videos/ prefix
                            s3_key = self.ensure_videos_prefix(s3_key)
                            
                            new_url_item = {
                                's3_key': s3_key,
                                'bucket': self.bucket_name
                            }
                            new_video_urls.append(new_url_item)
                            stats['videos_converted'] += 1
                            updated = True
                            logger.info(f"Converted to S3 object: {new_url_item}")
                        else:
                            new_video_urls.append(url_item)
                            logger.warning(f"Could not convert URL: {url_item['url'][:100]}...")
                    else:
                        new_video_urls.append(url_item)
                else:
                    new_video_urls.append(url_item)
            
            if stats['videos_converted'] > 0:
                task_data['video_urls'] = new_video_urls
                logger.info(f"Updated video_urls: {task_data['video_urls']}")
            else:
                logger.warning("No videos were converted!")

        # # Process preview images
        # if 'preview_image_urls' in task_data and task_data['preview_image_urls']:
        #     logger.info(f"Processing preview images for task {task_data.get('task_id')}")
        #     for idx, img in enumerate(task_data['preview_image_urls']):
        #         if isinstance(img, dict) and 'url' in img and img['url'].startswith('http'):
        #             logger.info(f"Processing preview image URL: {img['url'][:100]}...")
        #             s3_key = self.presigned_url_to_s3_key(img['url'])
        #             if s3_key:
        #                 task_data['preview_image_urls'][idx]['s3_key'] = s3_key
        #                 task_data['preview_image_urls'][idx]['bucket'] = self.bucket_name
        #                 del task_data['preview_image_urls'][idx]['url']
        #                 stats['preview_images_converted'] += 1
        #                 updated = True
        #                 logger.info(f"Converted to S3 key: {s3_key}")

        # # Process selected images
        # if 'selected_images' in task_data and task_data['selected_images']:
        #     logger.info(f"Processing selected images for task {task_data.get('task_id')}")
        #     for idx, img in enumerate(task_data['selected_images']):
        #         if isinstance(img, dict) and 'url' in img and img['url'].startswith('http'):
        #             logger.info(f"Processing selected image URL: {img['url'][:100]}...")
        #             s3_key = self.presigned_url_to_s3_key(img['url'])
        #             if s3_key:
        #                 task_data['selected_images'][idx]['s3_key'] = s3_key
        #                 task_data['selected_images'][idx]['bucket'] = self.bucket_name
        #                 del task_data['selected_images'][idx]['url']
        #                 stats['selected_images_converted'] += 1
        #                 updated = True
        #                 logger.info(f"Converted to S3 key: {s3_key}")

        return task_data, stats, updated

async def convert_urls_to_s3_keys(
    dynamodb_table_name: str,
    s3_bucket_name: str,
    region: str = 'us-west-2'
) -> Dict[str, Any]:
    """
    Convert all presigned URLs in DynamoDB tasks to S3 keys
    """
    try:
        # Initialize DynamoDB and converter
        dynamodb = boto3.resource('dynamodb', region_name=region)
        table = dynamodb.Table(dynamodb_table_name)
        converter = S3UrlConverter(s3_bucket_name, region)

        # Statistics for conversion
        total_stats = {
            "tasks_processed": 0,
            "tasks_updated": 0,
            "videos_converted": 0,
            "preview_images_converted": 0,
            "selected_images_converted": 0,
            "errors": []
        }

        # Scan the table
        try:
            response = table.scan()
            items = response.get('Items', [])

            logger.info(f"Found {len(items)} items in table")

            # Process all items
            for item in items:
                total_stats['tasks_processed'] += 1
                task_id = item.get('task_id', 'unknown')
                
                try:
                    logger.info(f"Processing task {task_id}")
                    
                    # Convert URLs to S3 keys
                    updated_item, stats, was_updated = converter.process_task_data(item)

                    # Update item if changes were made
                    if was_updated:
                        logger.info(f"Updating task {task_id} in DynamoDB")
                        table.put_item(Item=updated_item)
                        total_stats['tasks_updated'] += 1
                        total_stats['videos_converted'] += stats['videos_converted']
                        total_stats['preview_images_converted'] += stats['preview_images_converted']
                        total_stats['selected_images_converted'] += stats['selected_images_converted']

                except Exception as item_error:
                    error_msg = f"Error processing task {task_id}: {str(item_error)}"
                    total_stats['errors'].append(error_msg)
                    logger.error(error_msg)

            return total_stats

        except Exception as e:
            error_msg = f"Error scanning DynamoDB table: {str(e)}"
            total_stats['errors'].append(error_msg)
            logger.error(error_msg)
            return total_stats

    except Exception as e:
        logger.error(f"Fatal error in conversion process: {e}")
        return {
            "error": str(e),
            "tasks_processed": 0,
            "tasks_updated": 0
        }

def main():
    """Main function to run the conversion"""
    import asyncio

    # Configuration
    DYNAMODB_TABLE = os.environ.get('EVENT_TASKS_TABLE', 'bedrock-event-composer-tasks')
    S3_BUCKET = os.environ.get('EVENT_MEDIA_STORAGE_BUCKET', 'bedrock-event-media-storage')
    AWS_REGION = os.environ.get('AWS_REGION', 'us-west-2')

    # Run the conversion
    results = asyncio.run(convert_urls_to_s3_keys(
        dynamodb_table_name=DYNAMODB_TABLE,
        s3_bucket_name=S3_BUCKET,
        region=AWS_REGION
    ))

    # Print results
    print("\nConversion Results:")
    print(f"Tasks Processed: {results['tasks_processed']}")
    print(f"Tasks Updated: {results['tasks_updated']}")
    print(f"Videos Converted: {results['videos_converted']}")
    print(f"Preview Images Converted: {results['preview_images_converted']}")
    print(f"Selected Images Converted: {results['selected_images_converted']}")
    
    if results.get('errors'):
        print("\nErrors encountered:")
        for error in results['errors']:
            print(f"- {error}")

if __name__ == "__main__":
    main()