# React Integration Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install axios
```

### 2. API Service
```javascript
// services/imageSearchAPI.js
class ImageSearchAPI {
  constructor() {
    this.baseURL = 'https://zr2659riri.execute-api.us-east-1.amazonaws.com';
  }

  async uploadAndIndexImage(file, personName, hasConsent = true) {
    // Get presigned URL
    const presignResponse = await fetch(`${this.baseURL}/presign`, {
      method: 'POST'
    });
    const { imageId, uploadUrl, s3Key } = await presignResponse.json();

    // Upload to S3
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });

    // Index faces
    const indexResponse = await fetch(`${this.baseURL}/index/faces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        s3Key,
        externalId: personName,
        consent: hasConsent
      })
    });

    const result = await indexResponse.json();
    return { ...result, imageId, s3Key };
  }

  async searchSimilarFaces(searchFile, threshold = 80) {
    // Upload search image
    const presignResponse = await fetch(`${this.baseURL}/presign`, {
      method: 'POST'
    });
    const { uploadUrl, s3Key } = await presignResponse.json();

    await fetch(uploadUrl, {
      method: 'PUT',
      body: searchFile,
      headers: { 'Content-Type': searchFile.type }
    });

    // Search for matches
    const searchResponse = await fetch(`${this.baseURL}/search/faces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3Key, threshold, maxResults: 10 })
    });

    return await searchResponse.json();
  }

  async listUploadedImages() {
    const response = await fetch(`${this.baseURL}/images`);
    return await response.json();
  }
}

export default new ImageSearchAPI();
```

### 3. React Hook
```javascript
// hooks/useImageSearch.js
import { useState, useCallback } from 'react';
import imageSearchAPI from '../services/imageSearchAPI';

export const useImageSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);

  const uploadImage = useCallback(async (file, personName) => {
    setLoading(true);
    try {
      const result = await imageSearchAPI.uploadAndIndexImage(file, personName);
      
      if (result.indexed > 0) {
        await loadImages(); // Refresh list
        return { 
          success: true, 
          message: `✅ ${result.indexed} face(s) indexed successfully!`,
          facesIndexed: result.indexed 
        };
      } else {
        return { 
          success: false, 
          message: '❌ No faces detected. Use a clear photo with visible faces.' 
        };
      }
    } catch (error) {
      return { success: false, message: `❌ Upload failed: ${error.message}` };
    } finally {
      setLoading(false);
    }
  }, []);

  const searchFaces = useCallback(async (file) => {
    setLoading(true);
    try {
      const result = await imageSearchAPI.searchSimilarFaces(file);
      setResults(result.matches || []);
      
      if (result.matches?.length > 0) {
        return { 
          success: true, 
          message: `🎯 Found ${result.matches.length} similar face(s)`,
          matches: result.matches 
        };
      } else {
        return { 
          success: false, 
          message: result.message || '🔍 No similar faces found' 
        };
      }
    } catch (error) {
      setResults([]);
      return { success: false, message: `❌ Search failed: ${error.message}` };
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImages = useCallback(async () => {
    try {
      const result = await imageSearchAPI.listUploadedImages();
      setUploadedImages(result.images || []);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  }, []);

  return {
    loading,
    results,
    uploadedImages,
    uploadImage,
    searchFaces,
    loadImages
  };
};
```

## 📱 React Components

### Upload Component
```javascript
// components/ImageUpload.jsx
import React, { useState } from 'react';
import { useImageSearch } from '../hooks/useImageSearch';

const ImageUpload = ({ onSuccess }) => {
  const [file, setFile] = useState(null);
  const [personName, setPersonName] = useState('');
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState(null);
  const { uploadImage, loading } = useImageSearch();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !consent) return;

    const result = await uploadImage(file, personName);
    
    if (result.success) {
      onSuccess?.(result);
      // Reset form
      setFile(null);
      setPersonName('');
      setPreview(null);
      e.target.reset();
    }
    
    alert(result.message);
  };

  return (
    <div className="upload-container">
      <h3>📤 Upload Image</h3>
      
      <form onSubmit={handleSubmit} className="upload-form">
        {/* File Input */}
        <div className="form-group">
          <label>Select Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required
            className="file-input"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="preview">
            <img src={preview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
          </div>
        )}

        {/* Person Name */}
        <div className="form-group">
          <label>Person Name:</label>
          <input
            type="text"
            placeholder="e.g., John Doe"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="text-input"
          />
        </div>

        {/* Consent */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            I consent to face recognition processing
          </label>
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          disabled={loading || !consent || !file}
          className="submit-btn"
        >
          {loading ? '⏳ Uploading...' : '🚀 Upload & Index Faces'}
        </button>
      </form>
    </div>
  );
};

export default ImageUpload;
```

### Search Component
```javascript
// components/FaceSearch.jsx
import React, { useState } from 'react';
import { useImageSearch } from '../hooks/useImageSearch';

const FaceSearch = ({ onResults }) => {
  const [searchFile, setSearchFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const { searchFaces, loading } = useImageSearch();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSearchFile(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSearch = async () => {
    if (!searchFile) return;

    const result = await searchFaces(searchFile);
    onResults?.(result);
    alert(result.message);
  };

  return (
    <div className="search-container">
      <h3>🔍 Search Similar Faces</h3>
      
      <div className="search-form">
        {/* File Input */}
        <div className="form-group">
          <label>Upload image to search:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="preview">
            <img src={preview} alt="Search Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
          </div>
        )}

        {/* Search Button */}
        <button 
          onClick={handleSearch} 
          disabled={loading || !searchFile}
          className="search-btn"
        >
          {loading ? '🔍 Searching...' : '🎯 Find Similar Faces'}
        </button>
      </div>
    </div>
  );
};

export default FaceSearch;
```

### Results Display
```javascript
// components/SearchResults.jsx
import React from 'react';

const SearchResults = ({ results }) => {
  if (!results?.length) {
    return (
      <div className="no-results">
        <p>🔍 No similar faces found</p>
        <small>Try uploading more images to build your database</small>
      </div>
    );
  }

  return (
    <div className="results-container">
      <h3>🎯 Search Results ({results.length})</h3>
      
      <div className="results-grid">
        {results.map((match, index) => (
          <div key={match.faceId} className="result-card">
            <div className="result-image">
              <img 
                src={match.thumbUrl} 
                alt={match.externalId}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>
            
            <div className="result-info">
              <h4>{match.externalId || 'Unknown'}</h4>
              <div className="similarity-score">
                <span className="score">{match.similarity.toFixed(1)}%</span>
                <span className="label">similarity</span>
              </div>
              <small>Confidence: {match.confidence?.toFixed(1)}%</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
```

### Complete App Example
```javascript
// App.jsx
import React, { useEffect } from 'react';
import ImageUpload from './components/ImageUpload';
import FaceSearch from './components/FaceSearch';
import SearchResults from './components/SearchResults';
import { useImageSearch } from './hooks/useImageSearch';
import './App.css';

function App() {
  const { results, uploadedImages, loadImages } = useImageSearch();

  useEffect(() => {
    loadImages(); // Load existing images on app start
  }, [loadImages]);

  const handleUploadSuccess = (result) => {
    console.log('Upload successful:', result);
  };

  const handleSearchResults = (result) => {
    console.log('Search completed:', result);
  };

  return (
    <div className="app">
      <header>
        <h1>🔍 Face Recognition System</h1>
        <p>Upload images to build your database, then search for similar faces</p>
      </header>

      <main className="main-content">
        <div className="left-panel">
          <ImageUpload onSuccess={handleUploadSuccess} />
          <FaceSearch onResults={handleSearchResults} />
          
          {uploadedImages.length > 0 && (
            <div className="uploaded-images">
              <h3>📁 Database ({uploadedImages.length} images)</h3>
              <div className="images-grid">
                {uploadedImages.map(img => (
                  <div key={img.imageId} className="thumb">
                    <img src={img.thumbUrl} alt={img.imageId} />
                    <small>{img.facesCount} faces</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="right-panel">
          <SearchResults results={results} />
        </div>
      </main>
    </div>
  );
}

export default App;
```

## 🎨 Basic CSS
```css
/* App.css */
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-top: 30px;
}

.upload-container, .search-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.file-input, .text-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.submit-btn, .search-btn {
  background: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

.submit-btn:disabled, .search-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.result-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.result-image img {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.result-info {
  padding: 15px;
}

.similarity-score {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px 0;
}

.score {
  font-weight: bold;
  color: #28a745;
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
```

## 🚀 Usage

1. **Import and use in your React app:**
```javascript
import { useImageSearch } from './hooks/useImageSearch';
import ImageUpload from './components/ImageUpload';
```

2. **Build your face database:**
   - Upload employee photos
   - Upload family photos  
   - Upload security camera captures

3. **Search for matches:**
   - Upload unknown person photo
   - Get instant results with similarity scores

**Your face database grows with every upload and searches become more comprehensive over time!** 🎯