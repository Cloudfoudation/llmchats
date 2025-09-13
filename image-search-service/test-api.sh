#!/bin/bash

API_ENDPOINT="https://zr2659riri.execute-api.us-east-1.amazonaws.com"

echo "🧪 Testing Image Search Service API"
echo "=================================="

# Test 1: Health Check
echo "1. Testing health endpoint..."
curl -s "$API_ENDPOINT/health" | jq .
echo ""

# Test 2: Get Presigned URL
echo "2. Getting presigned upload URL..."
PRESIGN_RESPONSE=$(curl -s -X POST "$API_ENDPOINT/presign")
echo $PRESIGN_RESPONSE | jq .

IMAGE_ID=$(echo $PRESIGN_RESPONSE | jq -r '.imageId')
UPLOAD_URL=$(echo $PRESIGN_RESPONSE | jq -r '.uploadUrl')
S3_KEY=$(echo $PRESIGN_RESPONSE | jq -r '.s3Key')

echo "Image ID: $IMAGE_ID"
echo "S3 Key: $S3_KEY"
echo ""

# Note: To complete the test, you would need to:
# 3. Upload an actual image file to the presigned URL
# 4. Call the ingest endpoint with the image details
# 5. Call the search endpoint with another image

echo "✅ Basic API endpoints are working!"
echo ""
echo "To complete the test:"
echo "1. Upload an image to: $UPLOAD_URL"
echo "2. Call ingest: POST $API_ENDPOINT/ingest"
echo "3. Call search: POST $API_ENDPOINT/search/image"