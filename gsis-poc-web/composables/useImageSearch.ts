export const useImageSearch = () => {
  const config = useRuntimeConfig()
  const API_ENDPOINT = 'https://zr2659riri.execute-api.us-east-1.amazonaws.com'

  // Get presigned upload URL
  const getPresignedUrl = async () => {
    const response = await $fetch(`${API_ENDPOINT}/presign`, {
      method: 'POST'
    })
    return response
  }

  // Upload image to S3
  const uploadToS3 = async (presignedUrl: string, file: File) => {
    await $fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': 'image/jpeg'
      }
    })
  }

  // Index faces in image
  const indexFaces = async (imageData: {
    s3Key: string
    externalId?: string
    consent?: boolean
  }) => {
    try {
      const response = await $fetch(`${API_ENDPOINT}/index/faces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: imageData
      })
      
      console.log('🔍 Raw indexFaces response:', response)
      
      // If response is a string, parse it
      if (typeof response === 'string') {
        console.log('⚠️ Response is string, parsing JSON')
        return JSON.parse(response)
      }
      
      return response
    } catch (error) {
      console.error('❌ IndexFaces error:', error)
      throw error
    }
  }

  // Search for similar faces
  const searchSimilarFaces = async (s3Key: string, threshold: number = 80, maxResults: number = 10) => {
    try {
      console.log('🔍 Searching faces:', { s3Key, threshold, maxResults })
      const response = await $fetch(`${API_ENDPOINT}/search/faces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: { s3Key, threshold, maxResults }
      })
      
      console.log('🔍 Raw search response:', response)
      
      // If response is a string, parse it
      if (typeof response === 'string') {
        console.log('⚠️ Search response is string, parsing JSON')
        return JSON.parse(response)
      }
      
      return response
    } catch (error) {
      console.error('❌ Search error:', error)
      throw error
    }
  }

  // Get image metadata
  const getImageMetadata = async (imageId: string) => {
    const response = await $fetch(`${API_ENDPOINT}/meta/${imageId}`)
    return response
  }

  // Complete upload workflow
  const uploadImage = async (file: File, consent: boolean = true, externalId?: string) => {
    // Step 1: Get presigned URL
    const presignData = await getPresignedUrl()
    
    // Step 2: Upload to S3
    await uploadToS3(presignData.uploadUrl, file)
    
    // Step 3: Index faces
    const indexResult = await indexFaces({
      s3Key: presignData.s3Key,
      externalId: externalId || presignData.imageId,
      consent
    })
    
    return {
      ...presignData,
      ...indexResult
    }
  }

  // List all uploaded images
  const listImages = async () => {
    const response = await $fetch(`${API_ENDPOINT}/images`)
    return response
  }

  // Debug face detection
  const debugFaces = async (s3Key: string) => {
    const response = await $fetch(`${API_ENDPOINT}/debug/faces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: { s3Key }
    })
    return response
  }

  // Health check
  const healthCheck = async () => {
    const response = await $fetch(`${API_ENDPOINT}/health`)
    return response
  }

  return {
    getPresignedUrl,
    uploadToS3,
    indexFaces,
    searchSimilarFaces,
    getImageMetadata,
    uploadImage,
    listImages,
    debugFaces,
    healthCheck
  }
}