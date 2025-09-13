# Image Search Service - Project Structure

## Overview

MVP Image Search service with real-person photo matching using AWS Rekognition, serverless architecture.

```
image-search-service/
├── template.yaml              # SAM infrastructure template
├── samconfig.toml            # SAM deployment configuration
├── README.md                 # API documentation and usage
├── DEPLOYMENT.md             # Step-by-step deployment guide
├── PROJECT_STRUCTURE.md      # This file
└── functions/                # Lambda function code
    ├── jwt-authorizer/       # JWT token validation
    │   ├── app.py
    │   └── requirements.txt
    ├── presign-upload/       # Generate S3 presigned URLs
    │   └── app.py
    ├── ingest/              # Index faces with Rekognition
    │   └── app.py
    ├── search/              # Search similar faces
    │   └── app.py
    ├── get-meta/            # Get image metadata
    │   └── app.py
    └── health/              # Health check endpoint
        └── app.py
```

## Infrastructure Components

### AWS Services Used
- **API Gateway HTTP API** - REST endpoints with JWT auth
- **AWS Lambda** - Serverless compute (Python 3.11)
- **Amazon Rekognition** - Face detection and matching
- **Amazon S3** - Image storage with lifecycle policies
- **Amazon DynamoDB** - Metadata storage (On-Demand)
- **CloudWatch** - Monitoring and alarms

### API Endpoints
- `POST /presign` - Generate upload URLs (no auth)
- `POST /ingest` - Index faces (Admin only)
- `POST /search/image` - Find similar faces (Admin/Analyst/Viewer)
- `GET /meta/{imageId}` - Get metadata (Admin/Analyst/Viewer)
- `GET /health` - Health check (no auth)

### S3 Bucket Structure
```
bucket-name/
├── input/          # Original uploaded images
├── thumbs/         # Thumbnail images
└── temp/           # Auto-deleted after 7 days
```

### DynamoDB Tables
- **ImageIndex**: `imageId` → metadata, consent, face IDs
- **FaceMap**: `faceId` → `imageId` mapping

## Key Features

✅ **Security**
- JWT-based authentication with role-based access
- CORS configuration for Nuxt frontend
- Presigned URLs for secure S3 access
- Privacy controls (consent-based results)

✅ **Scalability**
- Serverless architecture (auto-scaling)
- DynamoDB On-Demand billing
- CloudWatch monitoring with alarms

✅ **Privacy**
- Only returns images with `consent: true`
- Similarity labels instead of "match" terminology
- Role-based access control (Admin/Analyst/Viewer)

## Quick Start

1. **Deploy**: Follow `DEPLOYMENT.md`
2. **Test**: Use examples in `README.md`
3. **Integrate**: Connect to your Nuxt frontend

## Future Enhancements

- Two-bucket architecture (public/private)
- Face blurring for non-PII roles
- Enhanced JWT signature verification
- Rate limiting and audit logging