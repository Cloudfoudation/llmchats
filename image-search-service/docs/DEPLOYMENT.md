# Deployment Guide

## 🚀 Infrastructure

### AWS Resources Created
- **S3 Bucket**: `image-search-service-images-083341655278`
- **DynamoDB Table**: `image-search-service-FaceIndex`
- **Rekognition Collection**: `image-search-service-faces`
- **API Gateway**: `https://zr2659riri.execute-api.us-east-1.amazonaws.com`

### Lambda Functions
- **PresignUploadFunction**: Generate S3 upload URLs
- **IndexFacesFunction**: Index faces in uploaded images
- **SearchFacesFunction**: Search for similar faces
- **ListImagesFunction**: List all uploaded images
- **HealthFunction**: API health check

## 📋 Deployment Steps

### 1. Prerequisites
```bash
# Install AWS SAM CLI
pip install aws-sam-cli

# Configure AWS credentials
aws configure
```

### 2. Deploy Infrastructure
```bash
# Clone repository
git clone <repository-url>
cd image-search-service

# Build and deploy
sam build
sam deploy --guided
```

### 3. Environment Variables
```yaml
# template.yaml - Already configured
Environment:
  Variables:
    BUCKET: !Ref ImageBucket
    RK_COLLECTION: !Sub "${AWS::StackName}-faces"
    FACE_TABLE: !Ref FaceIndexTable
    ALLOWED_ORIGIN: "*"
```

## 🔧 Configuration

### CORS Settings
```yaml
# API Gateway CORS - Already enabled
CorsConfiguration:
  AllowMethods: ['*']
  AllowHeaders: ['*']
  AllowOrigins: ['*']
```

### IAM Permissions
```yaml
# Lambda permissions - Already configured
Policies:
  - S3ReadPolicy: !Ref ImageBucket
  - DynamoDBCrudPolicy: !Ref FaceIndexTable
  - Statement:
      Effect: Allow
      Action: rekognition:*
      Resource: '*'
```

## 📊 Monitoring

### CloudWatch Logs
- `/aws/lambda/image-search-service-IndexFacesFunction-*`
- `/aws/lambda/image-search-service-SearchFacesFunction-*`
- `/aws/lambda/image-search-service-ListImagesFunction-*`

### Health Check
```bash
curl https://zr2659riri.execute-api.us-east-1.amazonaws.com/health
```

## 🔒 Security

### Current Settings
- **Authentication**: None (public API)
- **CORS**: Allow all origins
- **S3**: Private bucket with presigned URLs
- **DynamoDB**: Private table access via Lambda

### Production Recommendations
```yaml
# Add API authentication
Auth:
  DefaultAuthorizer: AWS_IAM
  
# Restrict CORS origins
CorsConfiguration:
  AllowOrigins: ['https://yourdomain.com']
  
# Add rate limiting
ThrottleSettings:
  RateLimit: 100
  BurstLimit: 200
```

## 📈 Scaling

### Current Limits
- **Rekognition Collection**: 20M faces max
- **DynamoDB**: Auto-scaling enabled
- **S3**: Unlimited storage
- **Lambda**: 1000 concurrent executions

### Performance Optimization
```yaml
# Increase Lambda memory for better performance
MemorySize: 512
Timeout: 60

# Enable DynamoDB auto-scaling
BillingMode: PAY_PER_REQUEST
```

## 🛠️ Maintenance

### Update Deployment
```bash
# Make changes to code
sam build
sam deploy  # Uses existing configuration
```

### View Logs
```bash
# Real-time logs
sam logs -n IndexFacesFunction --stack-name image-search-service --tail

# Filter logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/image-search-service-IndexFacesFunction-*" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### Cleanup (if needed)
```bash
# Delete stack and all resources
sam delete --stack-name image-search-service
```

## 🔍 Troubleshooting

### Common Issues

**1. Face Detection Returns 0 Faces**
```bash
# Check image quality
aws rekognition detect-faces \
  --image '{"S3Object":{"Bucket":"bucket","Name":"key"}}' \
  --attributes ALL
```

**2. Search Returns No Results**
```bash
# Verify faces are indexed
aws dynamodb scan --table-name image-search-service-FaceIndex --max-items 5
```

**3. CORS Errors**
- Verify `ALLOWED_ORIGIN` environment variable
- Check browser network tab for preflight requests

### Debug Commands
```bash
# Test API endpoints
curl -X POST https://zr2659riri.execute-api.us-east-1.amazonaws.com/presign
curl https://zr2659riri.execute-api.us-east-1.amazonaws.com/images
curl https://zr2659riri.execute-api.us-east-1.amazonaws.com/health

# Check S3 bucket contents
aws s3 ls s3://image-search-service-images-083341655278/input/

# Check DynamoDB records
aws dynamodb scan --table-name image-search-service-FaceIndex --max-items 10
```

## 📋 Stack Outputs
```
ApiEndpoint: https://zr2659riri.execute-api.us-east-1.amazonaws.com
BucketName: image-search-service-images-083341655278
FaceCollection: image-search-service-faces
FaceTable: image-search-service-FaceIndex
```