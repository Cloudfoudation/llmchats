<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <h2 class="text-xl font-semibold mb-4">Upload Files</h2>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Select files to upload
        </label>
        <input
          ref="fileInput"
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx"
          @change="handleFileSelect"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-xs text-gray-500 mt-1">
          Supported formats: PDF, TXT, DOC, DOCX
        </p>
      </div>

      <div v-if="selectedFiles.length > 0" class="mb-4">
        <h3 class="text-sm font-medium text-gray-700 mb-2">Selected Files:</h3>
        <ul class="text-sm text-gray-600">
          <li v-for="file in selectedFiles" :key="file.name">
            {{ file.name }} ({{ formatFileSize(file.size) }})
          </li>
        </ul>
      </div>

      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          @click="handleUpload"
          :disabled="selectedFiles.length === 0 || uploading"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {{ uploading ? 'Uploading...' : 'Upload' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  knowledgeBaseId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  uploaded: []
}>()

const { $api } = useNuxtApp()
const selectedFiles = ref<File[]>([])
const uploading = ref(false)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value = Array.from(target.files)
  }
}

const handleUpload = async () => {
  if (selectedFiles.value.length === 0) return
  
  uploading.value = true
  try {
    for (const file of selectedFiles.value) {
      await $api.knowledgeBase.uploadFile(props.knowledgeBaseId, file)
    }
    emit('uploaded')
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    uploading.value = false
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
