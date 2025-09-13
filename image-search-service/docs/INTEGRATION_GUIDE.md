# Frontend Integration Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install axios  # or use fetch API
```

### 2. Basic Setup
```javascript
const API_BASE_URL = 'https://zr2659riri.execute-api.us-east-1.amazonaws.com';

class ImageSearchAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
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

    return await indexResponse.json();
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
      body: JSON.stringify({
        s3Key,
        threshold,
        maxResults: 10
      })
    });

    return await searchResponse.json();
  }

  async listUploadedImages() {
    const response = await fetch(`${this.baseURL}/images`);
    return await response.json();
  }
}
```

### 3. React Hook Example
```javascript
import { useState, useCallback } from 'react';

export const useImageSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);

  const api = new ImageSearchAPI();

  const uploadImage = useCallback(async (file, personName) => {
    setLoading(true);
    try {
      const result = await api.uploadAndIndexImage(file, personName);
      
      if (result.indexed > 0) {
        // Refresh uploaded images list
        const images = await api.listUploadedImages();
        setUploadedImages(images.images);
        
        return { success: true, facesIndexed: result.indexed };
      } else {
        return { success: false, error: 'No faces detected' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const searchFaces = useCallback(async (file) => {
    setLoading(true);
    try {
      const result = await api.searchSimilarFaces(file);
      setResults(result.matches || []);
      return result;
    } catch (error) {
      setResults([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImages = useCallback(async () => {
    try {
      const result = await api.listUploadedImages();
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

### 4. Vue Composable Example
```javascript
import { ref, computed } from 'vue';

export const useImageSearch = () => {
  const loading = ref(false);
  const results = ref([]);
  const uploadedImages = ref([]);

  const api = new ImageSearchAPI();

  const uploadImage = async (file, personName) => {
    loading.value = true;
    try {
      const result = await api.uploadAndIndexImage(file, personName);
      
      if (result.indexed > 0) {
        await loadImages();
        return { success: true, facesIndexed: result.indexed };
      } else {
        return { success: false, error: 'No faces detected' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      loading.value = false;
    }
  };

  const searchFaces = async (file) => {
    loading.value = true;
    try {
      const result = await api.searchSimilarFaces(file);
      results.value = result.matches || [];
      return result;
    } catch (error) {
      results.value = [];
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const loadImages = async () => {
    try {
      const result = await api.listUploadedImages();
      uploadedImages.value = result.images || [];
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  return {
    loading: computed(() => loading.value),
    results: computed(() => results.value),
    uploadedImages: computed(() => uploadedImages.value),
    uploadImage,
    searchFaces,
    loadImages
  };
};
```

## UI Components

### Upload Component
```javascript
const ImageUpload = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [personName, setPersonName] = useState('');
  const [consent, setConsent] = useState(false);
  const { uploadImage, loading } = useImageSearch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !consent) return;

    const result = await uploadImage(file, personName);
    if (result.success) {
      onUpload?.(result);
      setFile(null);
      setPersonName('');
    } else {
      alert(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        required
      />
      <input
        type="text"
        placeholder="Person name"
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        I consent to face recognition
      </label>
      <button type="submit" disabled={loading || !consent}>
        {loading ? 'Uploading...' : 'Upload & Index'}
      </button>
    </form>
  );
};
```

### Search Component
```javascript
const FaceSearch = ({ onResults }) => {
  const [searchFile, setSearchFile] = useState(null);
  const { searchFaces, loading } = useImageSearch();

  const handleSearch = async () => {
    if (!searchFile) return;

    try {
      const result = await searchFaces(searchFile);
      onResults?.(result.matches);
    } catch (error) {
      alert('Search failed: ' + error.message);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setSearchFile(e.target.files[0])}
      />
      <button onClick={handleSearch} disabled={loading || !searchFile}>
        {loading ? 'Searching...' : 'Search Similar Faces'}
      </button>
    </div>
  );
};
```

### Results Display
```javascript
const SearchResults = ({ results }) => {
  if (!results?.length) {
    return <div>No similar faces found</div>;
  }

  return (
    <div className="results-grid">
      {results.map((match, index) => (
        <div key={match.faceId} className="result-card">
          <img src={match.thumbUrl} alt={match.externalId} />
          <div className="result-info">
            <h4>{match.externalId}</h4>
            <p>{match.similarity.toFixed(1)}% similarity</p>
            <small>Confidence: {match.confidence.toFixed(1)}%</small>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Error Handling

### Common Errors
```javascript
const handleAPIError = (error, response) => {
  if (response?.status === 400) {
    return 'Invalid request. Please check your input.';
  } else if (response?.status === 404) {
    return 'Image not found.';
  } else if (response?.status === 500) {
    return 'Server error. Please try again later.';
  } else if (error.message.includes('no faces')) {
    return 'No faces detected in the image. Please use a clear photo with visible faces.';
  } else {
    return 'An unexpected error occurred.';
  }
};
```

### Retry Logic
```javascript
const retryRequest = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Performance Tips

1. **Image Optimization:**
   ```javascript
   const resizeImage = (file, maxWidth = 1920, quality = 0.8) => {
     return new Promise((resolve) => {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       const img = new Image();
       
       img.onload = () => {
         const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
         canvas.width = img.width * ratio;
         canvas.height = img.height * ratio;
         
         ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
         canvas.toBlob(resolve, 'image/jpeg', quality);
       };
       
       img.src = URL.createObjectURL(file);
     });
   };
   ```

2. **Caching:**
   ```javascript
   const cache = new Map();
   
   const cachedFetch = async (url, options) => {
     const key = `${url}-${JSON.stringify(options)}`;
     if (cache.has(key)) {
       return cache.get(key);
     }
     
     const response = await fetch(url, options);
     const data = await response.json();
     cache.set(key, data);
     return data;
   };
   ```

## Testing

### Unit Tests
```javascript
describe('ImageSearchAPI', () => {
  test('should upload and index image', async () => {
    const api = new ImageSearchAPI();
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    const result = await api.uploadAndIndexImage(mockFile, 'Test Person');
    expect(result.indexed).toBeGreaterThan(0);
  });
});
```

### Integration Tests
```javascript
describe('Face Search Integration', () => {
  test('should find uploaded image in search results', async () => {
    const api = new ImageSearchAPI();
    const testImage = new File([''], 'person.jpg', { type: 'image/jpeg' });
    
    // Upload and index
    await api.uploadAndIndexImage(testImage, 'John Doe');
    
    // Search with same image
    const results = await api.searchSimilarFaces(testImage);
    expect(results.matches.length).toBeGreaterThan(0);
    expect(results.matches[0].externalId).toBe('John Doe');
  });
});
```