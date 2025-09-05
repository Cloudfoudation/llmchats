import json
import boto3
import os
import logging
import time
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

# Initialize logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Constants
SERVICE = 'aoss'
REGION = os.environ['REGION_NAME']
AOSS_COLLECTION_ID = os.environ['AOSS_COLLECTION_ID']
HOST = f'https://{AOSS_COLLECTION_ID}.{REGION}.aoss.amazonaws.com'
MAX_RETRIES = 5
RETRY_DELAY = 2  # seconds

def get_openSearch_client():
    credentials = boto3.Session().get_credentials()
    awsauth = AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        REGION,
        SERVICE,
        session_token=credentials.token
    )

    client = OpenSearch(
        hosts=[{'host': HOST.replace('https://', ''), 'port': 443}],
        http_auth=awsauth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=300
    )
    return client

def verify_index_exists(client, index_name):
    """Verify that index exists and is ready"""
    for attempt in range(MAX_RETRIES):
        try:
            if client.indices.exists(index=index_name):
                # Get index settings and mappings to verify it's fully created
                index_info = client.indices.get(index=index_name)
                if index_info and index_name in index_info:
                    settings = index_info[index_name].get('settings', {})
                    mappings = index_info[index_name].get('mappings', {})
                    
                    # Verify the essential settings and mappings are in place
                    if (settings.get('index', {}).get('knn') and 
                        'embedding' in mappings.get('properties', {})):
                        logger.info(f"Index {index_name} verified successfully")
                        return True
            
            logger.info(f"Index {index_name} not fully ready, attempt {attempt + 1}/{MAX_RETRIES}")
            # Legitimate retry delay for index creation verification
            time.sleep(RETRY_DELAY)  # nosemgrep: arbitrary-sleep
        except Exception as e:
            logger.warning(f"Verification attempt {attempt + 1} failed: {str(e)}")
            # Legitimate retry delay for index creation verification
            time.sleep(RETRY_DELAY)  # nosemgrep: arbitrary-sleep
    
    return False

def create_vector_index(client, index_name):
    index_body = {
        'settings': {
            'index': {'knn': True}
        },
        'mappings': {
            'properties': {
                'context': {'type': 'text'},
                'embedding': {
                    'type': 'knn_vector',
                    'dimension': 1024,
                    'method': {
                        'name': 'hnsw',
                        'engine': 'faiss',
                        'space_type': 'l2'
                    }
                },
                'doc_id': {'type': 'keyword'}
            }
        }
    }

    try:
        # Delete index if it exists
        try:
            client.indices.delete(index=index_name)
            logger.info(f"Deleted existing index: {index_name}")
        except Exception as e:
            logger.info(f"Index {index_name} does not exist or could not be deleted: {str(e)}")

        # Create new index
        response = client.indices.create(
            index=index_name,
            body=index_body
        )
        logger.info(f"Created index {index_name}: {response}")

        # Verify index creation
        if not verify_index_exists(client, index_name):
            raise Exception(f"Index {index_name} could not be verified after creation")

        return response
    except Exception as e:
        logger.error(f"Error creating index: {str(e)}")
        raise

def verify_index(client, index_name):
    """Verify index exists and is properly configured"""
    try:
        if client.indices.exists(index=index_name):
            # Get index settings and mapping
            settings = client.indices.get_settings(index=index_name)
            mappings = client.indices.get_mapping(index=index_name)
            
            # Check if index has required configuration
            if (settings[index_name]['settings']['index'].get('knn') and 
                'embedding' in mappings[index_name]['mappings']['properties']):
                return True
        return False
    except Exception as e:
        logger.error(f"Error verifying index: {str(e)}")
        return False

def delete_vector_index(client, index_name):
    """Delete vector index from OpenSearch"""
    try:
        response = client.indices.delete(index=index_name)
        logger.info(f"Deleted vector index {index_name}: {response}")
        return response
    except Exception as e:
        logger.error(f"Error deleting vector index: {str(e)}")
        raise

def handler(event, context):
    try:
        # Parse input
        body = json.loads(event['body']) if 'body' in event else event
        index_name = body.get('indexName')
        action = body.get('action', 'create')  # Default to create
        
        if not index_name:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'indexName is required'})
            }

        # Get OpenSearch client
        client = get_openSearch_client()

        # Handle different actions
        if action == 'verify':
            exists = verify_index(client, index_name)
            return {
                'statusCode': 200 if exists else 404,
                'body': json.dumps({
                    'exists': exists,
                    'indexName': index_name
                })
            }
        elif action == 'delete':
            response = delete_vector_index(client, index_name)
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Vector index deleted successfully',
                    'indexName': index_name,
                    'response': response
                })
            }
        
        # Create vector index
        response = create_vector_index(client, index_name)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Vector index created and verified successfully',
                'indexName': index_name,
                'response': response
            })
        }

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }