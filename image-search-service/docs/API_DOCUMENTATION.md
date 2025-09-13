# Image Search API Documentation

## Base URL
```
https://zr2659riri.execute-api.us-east-1.amazonaws.com
```

## Overview
AI-powered face recognition and image search service using AWS Rekognition. Upload images to index faces, then search for similar faces across all uploaded images.

## Authentication
No authentication required for current implementation.

## Endpoints

### 1. Get Presigned Upload URL
Get a presigned URL to upload images directly to S3.

**Endpoint:** `POST /presign`

**Request:**
```json
{}
```

**Response:**
```json
{
  "imageId": "uuid-string",
  "uploadUrl": "https://s3-presigned-url",
  "s3Key": "input/uuid.jpg"
}
```

### 2. Index Faces
Index faces from an uploaded image for future searches.

**Endpoint:** `POST /index/faces`

**Request:**
```json
{
  "s3Key": "input/uuid.jpg",
  "externalId": "person-name-or-id",
  "consent": true
}
```

**Response:**
```json
{
  "indexed": 2,
  "unindexed": 0,
  "faceIds": ["face-id-1", "face-id-2"],
  "reasons": []
}
```

### 3. Search Similar Faces
Search for similar faces using an image.

**Endpoint:** `POST /search/faces`

**Request:**
```json
{
  "s3Key": "input/search-image.jpg",
  "threshold": 80,
  "maxResults": 10
}
```

**Response:**
```json
{
  "matches": [
    {
      "similarity": 95.5,
      "faceId": "face-id-1",
      "s3Key": "input/original-image.jpg",
      "externalId": "person-name",
      "thumbUrl": "https://presigned-thumbnail-url",
      "confidence": 99.2
    }
  ],
  "totalMatches": 1
}
```

### 4. List Uploaded Images
Get all uploaded images with face counts.

**Endpoint:** `GET /images`

**Response:**
```json
{
  "images": [
    {
      "imageId": "external-id",
      "consent": true,
      "facesCount": 2,
      "thumbUrl": "https://presigned-thumbnail-url",
      "s3Key": "input/uuid.jpg",
      "createdAt": "2025-01-13T10:30:00Z"
    }
  ],
  "totalCount": 1
}
```

### 5. Health Check
Check API status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T10:30:00Z"
}
```

## Complete Workflow Example

### 1. Upload and Index Image
```javascript
// Step 1: Get presigned URL
const presignResponse = await fetch('/presign', { method: 'POST' });
const { imageId, uploadUrl, s3Key } = await presignResponse.json();

// Step 2: Upload image to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: imageFile,
  headers: { 'Content-Type': 'image/jpeg' }
});

// Step 3: Index faces
const indexResponse = await fetch('/index/faces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    s3Key: s3Key,
    externalId: 'John Doe',
    consent: true
  })
});

const { indexed, unindexed } = await indexResponse.json();
console.log(`Indexed ${indexed} faces, ${unindexed} rejected`);
```

### 2. Search for Similar Faces
```javascript
// Upload search image (same process as above)
const searchResponse = await fetch('/search/faces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    s3Key: searchImageS3Key,
    threshold: 80,
    maxResults: 5
  })
});

const { matches } = await searchResponse.json();
matches.forEach(match => {
  console.log(`Found ${match.externalId} with ${match.similarity}% similarity`);
});
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing parameters)
- `404` - Not Found (image not found)
- `500` - Internal Server Error

## Data Types

### Face Index Record
```typescript
interface FaceRecord {
  FaceId: string;           // Rekognition face ID
  s3Key: string;           // S3 object key
  externalId: string;      // User-provided identifier
  consent: boolean;        // Consent for face recognition
  confidence: number;      // Face detection confidence (0-100)
  createdAt: string;       // ISO timestamp
}
```

### Search Match
```typescript
interface SearchMatch {
  similarity: number;      // Similarity score (0-100)
  faceId: string;         // Rekognition face ID
  s3Key: string;          // Original image S3 key
  externalId: string;     // User-provided identifier
  thumbUrl: string;       // Presigned thumbnail URL (1 hour expiry)
  confidence: number;     // Original face detection confidence
}
```

## Best Practices

### Image Requirements
- **Format:** JPEG, PNG
- **Size:** Max 15MB
- **Face Size:** Minimum 80x80 pixels
- **Quality:** Clear, well-lit faces
- **Orientation:** Frontal faces work best

### Performance Tips
- Use appropriate `threshold` values (80-95 recommended)
- Limit `maxResults` to avoid large responses
- Cache thumbnail URLs (valid for 1 hour)

### Error Handling
```javascript
try {
  const response = await fetch('/index/faces', { /* ... */ });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  const result = await response.json();
} catch (error) {
  console.error('API Error:', error.message);
}
```

## Rate Limits
- No explicit rate limits currently implemented
- AWS Rekognition has service limits (check AWS documentation)

## CORS
- All origins allowed (`*`)
- Methods: `GET, POST, PUT, DELETE, HEAD, OPTIONS`
- Headers: `Content-Type, Authorization, X-Requested-With`