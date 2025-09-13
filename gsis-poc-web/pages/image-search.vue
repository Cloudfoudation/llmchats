<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
      <div class="max-w-6xl mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <NuxtLink to="/" class="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div class="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <span class="text-white font-bold text-xs">G</span>
              </div>
              <h1 class="text-lg font-semibold text-gray-900">GSIS AI</h1>
            </NuxtLink>
            <div class="hidden sm:block text-gray-300">|</div>
            <h2 class="hidden sm:block text-lg font-medium text-gray-700">Image Search</h2>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-600 hidden sm:block">
              {{ user?.email }}
            </span>
            <button 
              @click="logout"
              class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex">
      <!-- Left Panel - Upload & Search -->
      <div class="w-full lg:w-1/2 p-6 border-r border-gray-200">
        <div class="max-w-lg mx-auto">
          <!-- Upload Section -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              Upload Image
            </h3>
            <ImageUpload @uploaded="handleImageUploaded" :loading="uploadLoading" />
          </div>

          <!-- Search Section -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              Search Similar Faces
            </h3>
            <ImageSearch @search="handleSearch" :loading="searchLoading" />
          </div>

          <!-- Uploaded Images -->
          <div v-if="uploadedImages.length > 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Uploaded Images ({{ uploadedImages.length }})
            </h3>
            <div class="grid grid-cols-2 gap-3">
              <div 
                v-for="image in uploadedImages" 
                :key="image.imageId"
                class="relative group"
              >
                <div class="w-full h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                  <img 
                    v-if="image.thumbUrl"
                    :src="image.thumbUrl" 
                    :alt="`Image ${image.imageId}`"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                  <div v-else class="text-center p-2">
                    <svg class="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p class="text-xs text-gray-500">{{ image.imageId.slice(0, 8) }}...</p>
                  </div>
                </div>
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                  <div class="opacity-0 group-hover:opacity-100 flex space-x-2 transition-all">
                    <button 
                      @click="previewImage(image)"
                      class="bg-white text-gray-700 px-2 py-1 rounded-full text-xs font-medium"
                      title="Preview"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                    <button 
                      @click="viewImageDetails(image)"
                      class="bg-white text-gray-700 px-2 py-1 rounded-full text-xs font-medium"
                      title="Details"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </button>
                    <button 
                      @click="debugImageFaces(image)"
                      class="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium"
                      title="Debug Faces"
                    >
                      🔍
                    </button>
                    <button 
                      @click="searchWithThisImage(image)"
                      class="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium"
                      title="Search Similar"
                    >
                      🔎
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel - Results -->
      <div class="hidden lg:block w-1/2 p-6">
        <SearchResults :results="searchResults" :loading="searchLoading" />
      </div>
    </main>

    <!-- Mobile Results (shown below on mobile) -->
    <div class="lg:hidden">
      <SearchResults :results="searchResults" :loading="searchLoading" />
    </div>

    <!-- Image Preview Modal -->
    <div v-if="previewImageData" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="previewImageData = null">
      <div class="absolute inset-0 bg-black bg-opacity-75"></div>
      <div class="relative max-w-4xl max-h-full">
        <img 
          :src="previewImageData.thumbUrl" 
          :alt="`Preview ${previewImageData.imageId}`"
          class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          @click.stop
        />
        <button 
          @click="previewImageData = null"
          class="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Image Details Modal -->
    <ImageDetailsModal 
      v-if="selectedImage"
      :image="selectedImage"
      @close="selectedImage = null"
    />
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

// Pinia stores
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const { logout } = authStore

// Reactive state
const uploadLoading = ref(false)
const searchLoading = ref(false)
const uploadedImages = ref([])
const searchResults = ref([])
const selectedImage = ref(null)
const previewImageData = ref(null)

// Composable for image search service
const { uploadImage, searchSimilarFaces, getImageMetadata, listImages, debugFaces } = useImageSearch()

// Handle image upload
const handleImageUploaded = async (uploadData) => {
  uploadLoading.value = true
  try {
    // Reload the images list to get fresh data
    await loadUploadedImages()
    
    // Debug: Log the actual response
    console.log('🔍 Upload response:', uploadData)
    
    // Show success notification
    const facesIndexed = uploadData.indexed || 0
    const facesUnindexed = uploadData.unindexed || 0
    const reasons = uploadData.reasons || []
    
    if (facesIndexed === 0) {
      let message = 'Image uploaded but no faces indexed!'
      if (facesUnindexed > 0) {
        message += ` ${facesUnindexed} faces detected but rejected due to quality issues.`
      } else {
        message += ' Try uploading a clear photo with visible faces.'
      }
      useNuxtApp().$toast?.error(message)
    } else {
      let message = `✅ Success! ${facesIndexed} face${facesIndexed > 1 ? 's' : ''} indexed successfully!`
      if (facesUnindexed > 0) {
        message += ` (${facesUnindexed} faces rejected)`
      }
      useNuxtApp().$toast?.success(message)
    }
  } catch (error) {
    console.error('Upload error:', error)
    useNuxtApp().$toast?.error('Failed to upload image')
  } finally {
    uploadLoading.value = false
  }
}

// Handle search
const handleSearch = async (searchData) => {
  searchLoading.value = true
  try {
    console.log('🔍 Searching for:', searchData.s3Key)
    const results = await searchSimilarFaces(searchData.s3Key, 80, 10)
    console.log('🔍 Search results:', results)
    
    searchResults.value = results.matches || []
    
    if (results.matches?.length > 0) {
      useNuxtApp().$toast?.success(`Found ${results.matches.length} similar images`)
    } else if (results.message) {
      useNuxtApp().$toast?.info(results.message)
    } else {
      useNuxtApp().$toast?.info('No similar images found - try uploading the same image first to index it')
    }
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
    useNuxtApp().$toast?.error('Search failed')
  } finally {
    searchLoading.value = false
  }
}

// Preview image
const previewImage = (image) => {
  previewImageData.value = image
}

// View image details
const viewImageDetails = async (image) => {
  try {
    const metadata = await getImageMetadata(image.imageId)
    selectedImage.value = { ...image, ...metadata }
  } catch (error) {
    console.error('Failed to load image details:', error)
  }
}

// Handle image load errors
const handleImageError = (event) => {
  console.error('Failed to load thumbnail:', event.target.src)
  event.target.style.display = 'none'
}

// Debug image faces
const debugImageFaces = async (image) => {
  try {
    console.log('🔍 Debugging faces for:', image.s3Key)
    const result = await debugFaces(image.s3Key)
    console.log('🔍 Debug result:', result)
    
    const facesFound = result.facesDetected || 0
    if (facesFound === 0) {
      useNuxtApp().$toast?.error(`No faces detected in this image. Try uploading a clearer photo with visible faces.`)
    } else {
      useNuxtApp().$toast?.success(`Debug: Found ${facesFound} faces! Check console for details.`)
    }
  } catch (error) {
    console.error('Debug failed:', error)
    useNuxtApp().$toast?.error('Debug failed')
  }
}

// Search with uploaded image
const searchWithThisImage = async (image) => {
  searchLoading.value = true
  try {
    console.log('🔎 Searching with uploaded image:', image.s3Key)
    const results = await searchSimilarFaces(image.s3Key, 80, 10)
    console.log('🔎 Search results:', results)
    
    searchResults.value = results.matches || []
    
    if (results.matches?.length > 0) {
      useNuxtApp().$toast?.success(`Found ${results.matches.length} similar images (including itself)`)
    } else if (results.message) {
      useNuxtApp().$toast?.info(results.message)
    } else {
      useNuxtApp().$toast?.warning('No similar images found - this might indicate an indexing issue')
    }
  } catch (error) {
    console.error('Search error:', error)
    searchResults.value = []
    useNuxtApp().$toast?.error('Search failed')
  } finally {
    searchLoading.value = false
  }
}

// Load images on mount
const loadUploadedImages = async () => {
  try {
    const response = await listImages()
    uploadedImages.value = response.images || []
    console.log(`Loaded ${uploadedImages.value.length} images`)
  } catch (error) {
    console.error('Failed to load images:', error)
  }
}

// Load images when component mounts
onMounted(() => {
  loadUploadedImages()
})

// SEO
useHead({
  title: 'Image Search - GSIS AI Portal',
  meta: [
    { name: 'description', content: 'AI-powered face recognition and image search for GSIS' }
  ]
})
</script>