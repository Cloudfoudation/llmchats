import os
import boto3

# Environment variables
JWT_SECRET = os.environ.get('JWT_SECRET')
GET_BOT_DETAILS_FUNCTION = os.environ['GET_BOT_DETAILS_FUNCTION']
GET_ASSOCIATED_KBS_FUNCTION = os.environ['GET_ASSOCIATED_KBS_FUNCTION']
EMBEDDING_ENDPOINT_NAME = os.environ['EMBEDDING_ENDPOINT_NAME']
REGION_NM = boto3.Session().region_name
SERVICE_NM = 'aoss'

# AWS clients
bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-west-2')
lambda_client = boto3.client('lambda')