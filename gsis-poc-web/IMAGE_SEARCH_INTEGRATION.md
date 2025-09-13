# Image Search Integration

## Overview

The Image Search feature has been integrated into the GSIS AI Portal, providing AI-powered face recognition and similarity search capabilities.

## Features

- **Image Upload**: Drag-and-drop interface for uploading images
- **Face Detection**: Automatic face detection and indexing using AWS Rekognition
- **Similarity Search**: Find similar faces with confidence scores
- **Privacy Controls**: Consent-based image inclusion in search results
- **Responsive Design**: Works on desktop and mobile devices

## Components

### Pages
- `/pages/image-search.vue` - Main image search interface

### Components
- `ImageUpload.vue` - File upload with drag-and-drop
- `ImageSearch.vue` - Search interface for finding similar faces
- `SearchResults.vue` - Display search results with similarity scores
- `SimilarityBadge.vue` - Color-coded confidence indicators
- `ImageDetailsModal.vue` - Detailed image information modal

### Composables
- `useImageSearch.ts` - API integration for image search service

### Plugins
- `toast.client.ts` - Simple notification system

## API Integration

The frontend connects to the deployed image search service:
- **Endpoint**: `https://zr2659riri.execute-api.us-east-1.amazonaws.com`
- **S3 Bucket**: `image-search-service-images-083341655278`
- **Rekognition Collection**: `image-search-service-collection`

## Usage Flow

1. **Upload Images**:
   - Navigate to `/image-search`
   - Drag and drop or select images
   - Set consent and optional person ID
   - Click "Upload & Index Faces"

2. **Search Similar Faces**:
   - Upload a search image in the search section
   - Click "Search Similar Faces"
   - View results with similarity scores

3. **View Results**:
   - Results show confidence levels:
     - ≥95%: "Very similar" (green)
     - 90-95%: "Similar" (blue)
     - 80-90%: "Possibly similar" (yellow)

## Navigation

The image search feature is accessible via:
- Header icon (camera icon)
- Mobile menu → "Image Search"

## Privacy & Security

- Only images with consent are included in search results
- Similarity labels avoid "match" terminology
- Secure S3 presigned URLs for image access
- No permanent storage of search images

## Technical Details

- Built with Vue 3 + Nuxt 3
- Follows existing app design patterns
- Uses Tailwind CSS for styling
- Integrates with existing auth system
- Responsive design for all screen sizes

## Future Enhancements

- Real-time notifications (replace alert-based toast)
- Batch image upload
- Advanced filtering options
- Image annotation capabilities
- Export search results