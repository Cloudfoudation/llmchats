<template>
  <div class="space-y-4">
    <!-- File Drop Zone -->
    <div 
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent
      class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
      :class="{ 'border-blue-400 bg-blue-50': isDragging }"
    >
      <div v-if="!selectedFile" class="space-y-3">
        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div>
          <p class="text-sm text-gray-600">
            <button 
              @click="$refs.fileInput.click()"
              class="font-medium text-blue-600 hover:text-blue-500"
            >
              Upload an image
            </button>
            or drag and drop
          </p>
          <p class="text-xs text-gray-500">PNG, JPG up to 10MB</p>
        </div>
      </div>
      
      <!-- Selected File Preview -->
      <div v-else class="space-y-3">
        <img 
          :src="previewUrl" 
          alt="Preview"
          class="mx-auto h-32 w-32 object-cover rounded-lg border border-gray-200"
        />
        <div>
          <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
          <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
        </div>
        <button 
          @click="clearFile"
          class="text-sm text-red-600 hover:text-red-500"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Hidden File Input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      @change="handleFileSelect"
      class="hidden"
    />

    <!-- Upload Options -->
    <div v-if="selectedFile" class="space-y-3">
      <div class="flex items-center space-x-3">
        <input
          id="consent"
          v-model="consent"
          type="checkbox"
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label for="consent" class="text-sm text-gray-700">
          I consent to use this image for face recognition
        </label>
      </div>
      
      <div>
        <label for="personId" class="block text-sm font-medium text-gray-700 mb-1">
          Person ID (optional)
        </label>
        <input
          id="personId"
          v-model="personId"
          type="text"
          placeholder="Enter person identifier"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      <!-- Upload Button -->
      <button
        @click="uploadImage"
        :disabled="!consent || loading || isUploading"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
      >
        <svg v-if="loading || isUploading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ (loading || isUploading) ? 'Processing...' : 'Upload & Index Faces' }}</span>
      </button>
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

const emit = defineEmits(['uploaded'])

// Reactive state
const selectedFile = ref(null)
const previewUrl = ref('')
const consent = ref(true)
const personId = ref('')
const isDragging = ref(false)
const isUploading = ref(false)

// Composable
const { uploadImage: uploadImageAPI } = useImageSearch()

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    setSelectedFile(file)
  }
}

// Handle drag and drop
const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false
  
  const files = event.dataTransfer.files
  if (files.length > 0) {
    setSelectedFile(files[0])
  }
}

// Set selected file and create preview
const setSelectedFile = (file) => {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    alert('File size must be less than 10MB')
    return
  }
  
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

// Clear selected file
const clearFile = () => {
  selectedFile.value = null
  previewUrl.value = ''
  // Keep consent as true by default
  personId.value = ''
}

// Upload image
const uploadImage = async () => {
  if (!selectedFile.value || !consent.value) return
  
  isUploading.value = true
  try {
    const result = await uploadImageAPI(
      selectedFile.value, 
      consent.value, 
      personId.value || undefined
    )
    
    emit('uploaded', result)
    clearFile()
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  } finally {
    isUploading.value = false
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
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>