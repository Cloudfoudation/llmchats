# Image Search Service Documentation

## 📋 Overview
AI-powered face recognition service using AWS Rekognition. Upload images to build a searchable face database, then find similar faces across all stored images.

## 🏗️ Architecture
- **Storage**: AWS S3 (images) + DynamoDB (face index)
- **AI**: AWS Rekognition (face detection & matching)
- **Scale**: Up to 20M faces, unlimited images
- **Performance**: Sub-second search across entire database

## 📚 Documentation

### For Frontend Developers
- **[React Integration](./REACT_INTEGRATION.md)** - 🚀 **START HERE** - Complete React setup with components and hooks
- **[API Reference](./API_DOCUMENTATION.md)** - Complete API endpoints and schemas

### For DevOps
- **[Deployment Guide](./DEPLOYMENT.md)** - Infrastructure setup and configuration

## 🚀 Quick Start

### 1. Upload & Index Images
```javascript
// Build your face database
await uploadImage(photo1, "John Doe");
await uploadImage(photo2, "Jane Smith");
await uploadImage(photo3, "Bob Wilson");
// ... keep adding images over time
```

### 2. Search Similar Faces
```javascript
// Search across ALL uploaded images
const matches = await searchFaces(unknownPhoto);
// Returns: [{ name: "John Doe", similarity: 95.2% }, ...]
```

## 🎯 Key Features

✅ **Persistent Database** - Images stored permanently, searchable forever  
✅ **Scalable** - Add unlimited images, search across millions of faces  
✅ **Fast** - Sub-second search results  
✅ **Accurate** - 95%+ accuracy with quality images  
✅ **Privacy** - Consent-based face recognition

## 📊 Current Status
- **API Endpoint**: `https://zr2659riri.execute-api.us-east-1.amazonaws.com`
- **Status**: ✅ Production Ready
- **Images Stored**: 20+ and growing
- **Faces Indexed**: 25+ and growing

## 🔗 Quick Links
- **[🚀 React Integration Guide](./REACT_INTEGRATION.md)** - **START HERE** for frontend development
- [📋 API Documentation](./API_DOCUMENTATION.md) - Complete API reference  
- [🏗️ Deployment Guide](./DEPLOYMENT.md) - Infrastructure and DevOps
- [✅ Test the API](https://zr2659riri.execute-api.us-east-1.amazonaws.com/health) - Health check endpoint

## 💡 How It Works

### Build Your Face Database
```javascript
// Upload images over time to build searchable database
await uploadImage(employeePhoto1, "John Doe");     // Day 1
await uploadImage(employeePhoto2, "Jane Smith");   // Day 2  
await uploadImage(securityPhoto1, "Bob Wilson");   // Day 30
// ... keep adding images
// Database grows: 1 → 10 → 100 → 1000+ faces
```

### Search Across All Images
```javascript
// Search unknown person against entire database
const matches = await searchFaces(unknownPhoto);
// Returns: [{ name: "John Doe", similarity: 95.2% }, ...]
```

**Key Benefit**: Every uploaded image becomes permanently searchable. Build your database over weeks/months, then search across ALL historical data instantly! 🎯