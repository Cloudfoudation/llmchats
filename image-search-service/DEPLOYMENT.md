# Image Search Service - Deployment Guide

## Prerequisites

Before deploying, ensure you have:

- **AWS CLI** installed and configured with appropriate permissions
- **SAM CLI** installed (version 1.50+)
- **Python 3.11** installed
- **AWS Account** with permissions for:
  - Lambda, API Gateway, S3, DynamoDB, Rekognition, IAM, CloudWatch

## Step-by-Step Deployment

### 1. Prepare Environment

```bash
cd image-search-service
```

### 2. Configure Parameters

Edit `samconfig.toml` to set your preferred:
- Stack name
- AWS region
- CORS allowed origin (your Nuxt app URL)

```toml
parameter_overrides = "Environment=prod AllowedOrigin=https://your-nuxt-app.com"
```

### 3. Build Application

```bash
sam build
```

This will:
- Install Python dependencies for each Lambda function
- Package the code for deployment

### 4. Deploy to AWS

```bash
sam deploy --guided
```

During guided deployment, you'll be prompted for:
- **Stack name**: `image-search-service` (or your preference)
- **AWS Region**: `us-east-1` (or your preference)  
- **Parameter AllowedOrigin**: Your Nuxt frontend URL
- **Confirm changes**: `Y`
- **Allow SAM to create IAM roles**: `Y`
- **Save parameters to config file**: `Y`

### 5. Note the Outputs

After successful deployment, save these outputs:

```
Outputs:
ApiEndpoint: https://abc123.execute-api.us-east-1.amazonaws.com
BucketName: image-search-service-images-123456789
RekognitionCollection: image-search-service-collection
```

## Post-Deployment Verification

### 1. Test Health Endpoint

```bash
curl https://YOUR_API_ENDPOINT/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "image-search-service"
}
```

### 2. Verify S3 Bucket

```bash
aws s3 ls s3://YOUR_BUCKET_NAME/
```

Should show empty bucket with proper permissions.

### 3. Check Rekognition Collection

```bash
aws rekognition describe-collection --collection-id YOUR_COLLECTION_ID
```

## Configuration for Frontend

Update your Nuxt application with these environment variables:

```env
# .env
IMAGE_SEARCH_API_ENDPOINT=https://YOUR_API_ENDPOINT
IMAGE_SEARCH_BUCKET=YOUR_BUCKET_NAME
```

## Testing the Complete Flow

### 1. Get Upload URL

```bash
curl -X POST https://YOUR_API_ENDPOINT/presign
```

### 2. Upload Image

Use the returned `uploadUrl` to PUT your image:

```bash
curl -X PUT "PRESIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test-image.jpg
```

### 3. Ingest Image (Admin JWT required)

```bash
curl -X POST https://YOUR_API_ENDPOINT/ingest \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "IMAGE_ID_FROM_PRESIGN",
    "s3Key": "S3_KEY_FROM_PRESIGN", 
    "consent": true,
    "personId": "test-person-1"
  }'
```

### 4. Search for Similar Faces

```bash
curl -X POST https://YOUR_API_ENDPOINT/search/image \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"s3Key": "input/search-image.jpg"}'
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure AWS CLI has proper IAM permissions
   - Check JWT token is valid and contains required claims

2. **CORS Errors**
   - Verify `AllowedOrigin` parameter matches your frontend URL
   - Check browser network tab for preflight OPTIONS requests

3. **Rekognition Errors**
   - Ensure images are valid JPEG format
   - Check image quality (faces must be detectable)
   - Verify Rekognition service is available in your region

4. **DynamoDB Throttling**
   - Tables use On-Demand billing, should auto-scale
   - Check CloudWatch alarms for throttling alerts

### Logs and Monitoring

View Lambda logs:
```bash
sam logs -n PresignUploadFunction --stack-name image-search-service --tail
```

Check CloudWatch alarms:
```bash
aws cloudwatch describe-alarms --alarm-names "image-search-service-Lambda-Errors"
```

## Cleanup

To remove all resources:

```bash
sam delete --stack-name image-search-service
```

⚠️ **Warning**: This permanently deletes all images and metadata.

## Security Considerations

### Production Checklist

- [ ] Replace JWT signature verification with proper implementation
- [ ] Set specific CORS origins (not `*`)
- [ ] Enable CloudTrail for API access logging
- [ ] Configure VPC endpoints for private API access
- [ ] Set up proper backup strategy for DynamoDB tables
- [ ] Implement rate limiting on API Gateway
- [ ] Enable S3 bucket encryption
- [ ] Set up proper monitoring and alerting

### JWT Token Requirements

Your JWT must include these claims:
```json
{
  "sub": "user-id",
  "custom:role": "Admin|Analyst|Viewer"
}
```

Role permissions:
- **Admin**: All endpoints
- **Analyst**: Search, meta, health
- **Viewer**: Search, meta, health