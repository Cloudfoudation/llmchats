# Image Search Service

MVP Image Search service with real-person photo matching using AWS Rekognition, API Gateway, Lambda, S3, and DynamoDB.

## Architecture

- **API Gateway HTTP API** with JWT authorization
- **AWS Lambda** functions (Python 3.11) for business logic
- **Amazon Rekognition** for face detection and matching
- **Amazon S3** for image storage with prefixes: `input/`, `thumbs/`, `temp/`
- **Amazon DynamoDB** for metadata storage (On-Demand billing)
- **CloudWatch** alarms for monitoring

## Deployment

### Prerequisites

- AWS CLI configured
- SAM CLI installed
- Python 3.11

### Deploy Steps

1. **Build and deploy**:
   ```bash
   sam build
   sam deploy --guided --parameter-overrides AllowedOrigin="https://your-nuxt-app.com"
   ```

2. **Note the outputs**:
   - API endpoint URL
   - S3 bucket name
   - Rekognition collection ID

### Environment Variables

The following environment variables are automatically configured:

- `BUCKET`: S3 bucket name
- `RK_COLLECTION`: Rekognition collection ID
- `TABLE_IMG`: ImageIndex DynamoDB table
- `TABLE_FACE`: FaceMap DynamoDB table
- `ALLOWED_ORIGIN`: CORS allowed origin

## API Endpoints

### POST /presign
Generate presigned URL for image upload.

**Request**: Empty body
**Response**:
```json
{
  "imageId": "uuid",
  "uploadUrl": "https://s3-presigned-url",
  "s3Key": "input/uuid.jpg"
}
```

**Example**:
```bash
curl -X POST https://api-id.execute-api.region.amazonaws.com/presign
```

### POST /ingest
Index faces and store metadata (Admin only).

**Request**:
```json
{
  "imageId": "uuid",
  "s3Key": "input/uuid.jpg",
  "consent": true,
  "personId": "optional-person-id"
}
```

**Response**:
```json
{
  "imageId": "uuid",
  "facesIndexed": 2
}
```

**Example**:
```bash
curl -X POST https://api-id.execute-api.region.amazonaws.com/ingest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "uuid",
    "s3Key": "input/uuid.jpg",
    "consent": true,
    "personId": "person123"
  }'
```

### POST /search/image
Search for similar faces (Admin/Analyst/Viewer).

**Request**:
```json
{
  "s3Key": "input/search-image.jpg"
}
```

**Response**:
```json
{
  "results": [
    {
      "imageId": "uuid",
      "confidence": 95.5,
      "similarityLabel": "Very similar",
      "thumbUrl": "https://signed-s3-url",
      "personId": "person123"
    }
  ],
  "totalMatches": 1
}
```

**Example**:
```bash
curl -X POST https://api-id.execute-api.region.amazonaws.com/search/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"s3Key": "input/search-image.jpg"}'
```

### GET /meta/{imageId}
Get image metadata and signed thumbnail URL.

**Response**:
```json
{
  "imageId": "uuid",
  "consent": true,
  "personId": "person123",
  "facesCount": 2,
  "thumbUrl": "https://signed-s3-url"
}
```

**Example**:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api-id.execute-api.region.amazonaws.com/meta/uuid
```

### GET /health
Health check endpoint (no auth required).

**Response**:
```json
{
  "status": "ok",
  "service": "image-search-service"
}
```

## Access Control

### Roles
- **Admin**: Can call `/ingest` and all other endpoints
- **Analyst**: Can call `/search/image`, `/meta/{imageId}`, `/health`
- **Viewer**: Can call `/search/image`, `/meta/{imageId}`, `/health`

### JWT Claims
The JWT token must contain:
- `sub`: User ID
- `custom:role`: User role (Admin/Analyst/Viewer)

## Privacy & Similarity Labels

- Only images with `consent: true` are returned in search results
- Similarity labels based on confidence:
  - ≥95%: "Very similar"
  - 90-95%: "Similar"  
  - 80-90%: "Possibly similar"

## S3 Bucket Structure

```
bucket-name/
├── input/          # Original uploaded images
├── thumbs/         # Thumbnail images (same as original for now)
└── temp/           # Temporary files (auto-deleted after 7 days)
```

## DynamoDB Tables

### ImageIndex
- **PK**: `imageId`
- **Attributes**: `s3Key`, `thumbKey`, `consent`, `personId`, `rekognitionFaceIds[]`

### FaceMap
- **PK**: `faceId`
- **Attributes**: `imageId`

## Monitoring

CloudWatch alarms are configured for:
- Lambda function errors (>5 in 5 minutes)
- API Gateway 5XX errors (>10 in 5 minutes)
- DynamoDB throttling (≥1 in 5 minutes)

## Future Enhancements

### Two-Bucket Architecture
Consider separating public and private content:
```yaml
PublicBucket:  # For thumbnails accessible to all users
PrivateBucket: # For original images with restricted access
```

### Blurred Thumbnails
Add image processing to blur faces for non-PII roles:
```python
# TODO: Implement face blurring for Viewer role
def blur_faces_for_viewer(image_key, face_locations):
    # Use PIL or OpenCV to blur detected face regions
    pass
```

### Enhanced Security
- Implement proper JWT signature verification
- Add rate limiting
- Implement audit logging
- Add encryption at rest for sensitive metadata

## Cleanup

To delete all resources:
```bash
sam delete --stack-name your-stack-name
```

Note: This will permanently delete all images and metadata.