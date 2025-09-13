<template>
  <div class="space-y-4">
    <!-- Search File Drop Zone -->
    <div 
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent
      class="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors"
      :class="{ 'border-purple-400 bg-purple-50': isDragging }"
    >
      <div v-if="!searchFile" class="space-y-3">
        <svg class="mx-auto h-12 w-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <div>
          <p class="text-sm text-gray-600">
            <button 
              @click="$refs.searchFileInput.click()"
              class="font-medium text-purple-600 hover:text-purple-500"
            >
              Upload image to search
            </button>
            or drag and drop
          </p>
          <p class="text-xs text-gray-500">PNG, JPG up to 10MB</p>
        </div>
      </div>
      
      <!-- Search File Preview -->
      <div v-else class="space-y-3">
        <img 
          :src="searchPreviewUrl" 
          alt="Search Preview"
          class="mx-auto h-32 w-32 object-cover rounded-lg border border-gray-200"
        />
        <div>
          <p class="text-sm font-medium text-gray-900">{{ searchFile.name }}</p>
          <p class="text-xs text-gray-500">{{ formatFileSize(searchFile.size) }}</p>
        </div>
        <button 
          @click="clearSearchFile"
          class="text-sm text-red-600 hover:text-red-500"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Hidden File Input -->
    <input
      ref="searchFileInput"
      type="file"
      accept="image/*"
      @change="handleSearchFileSelect"
      class="hidden"
    />

    <!-- Search Button -->
    <button
      v-if="searchFile"
      @click="performSearch"
      :disabled="loading || isSearching"
      class="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
    >
      <svg v-if="loading || isSearching" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      <span>{{ (loading || isSearching) ? 'Searching...' : 'Search Similar Faces' }}</span>
    </button>

    <!-- Search Info -->
    <div class="bg-purple-50 border border-purple-200 rounded-lg p-3">
      <div class="flex items-start space-x-2">
        <svg class="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="text-xs text-purple-700">
          <p class="font-medium mb-1">How it works:</p>
          <ul class="space-y-1">
            <li>• Upload an image containing faces</li>
            <li>• AI will detect and analyze facial features</li>
            <li>• Search returns similar faces with confidence scores</li>
            <li>• Only consented images are included in results</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['search'])

// Reactive state
const searchFile = ref(null)
const searchPreviewUrl = ref('')
const isDragging = ref(false)
const isSearching = ref(false)

// Composables
const { getPresignedUrl, uploadToS3 } = useImageSearch()

// Handle search file selection
const handleSearchFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    setSearchFile(file)
  }
}

// Handle drag and drop
const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = event.dataTransfer.files
  if (files.length > 0) {
    setSearchFile(files[0])
  }
}

// Set search file and create preview
const setSearchFile = (file) => {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    alert('File size must be less than 10MB')
    return
  }
  
  searchFile.value = file
  searchPreviewUrl.value = URL.createObjectURL(file)
}

// Clear search file
const clearSearchFile = () => {
  searchFile.value = null
  searchPreviewUrl.value = ''
}

// Perform search
const performSearch = async () => {
  if (!searchFile.value) return
  
  isSearching.value = true
  try {
    // Get presigned URL for search image
    const presignData = await getPresignedUrl()
    
    // Upload search image to S3
    await uploadToS3(presignData.uploadUrl, searchFile.value)
    
    // Emit search event with S3 key
    emit('search', { s3Key: presignData.s3Key })
    
    // Clear search file after successful search
    clearSearchFile()
  } catch (error) {
    console.error('Search failed:', error)
    throw error
  } finally {
    isSearching.value = false
  }
}

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Cleanup on unmount
onUnmounted(() => {
  if (searchPreviewUrl.value) {
    URL.revokeObjectURL(searchPreviewUrl.value)
  }
})
</script>