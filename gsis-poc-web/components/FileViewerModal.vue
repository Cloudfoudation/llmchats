<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-900">Knowledge Base Files</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="files.length === 0" class="text-center py-12 text-gray-500">
        No files uploaded yet
      </div>

      <div v-else class="space-y-3 max-h-96 overflow-y-auto">
        <div 
          v-for="file in files" 
          :key="file.key"
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors space-y-3 sm:space-y-0"
        >
          <div class="flex items-center space-x-3 min-w-0 flex-1">
            <div class="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-gray-900 text-sm sm:text-base truncate">{{ file.fileName }}</div>
              <div class="text-xs sm:text-sm text-gray-500">{{ formatFileSize(file.fileSize) }} • {{ formatDate(file.lastModified) }}</div>
            </div>
          </div>
          <button 
            @click="downloadFile(file)"
            class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex-shrink-0"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  knowledgeBaseId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const { $api } = useNuxtApp()
const files = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    files.value = await $api.knowledgeBase.listFiles(props.knowledgeBaseId)
  } catch (error) {
    console.error('Error loading files:', error)
  } finally {
    loading.value = false
  }
})

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

const downloadFile = async (file: any) => {
  try {
    // Get download URL from API
    const response = await $fetch(`${$api.knowledgeBase.baseUrl}/knowledge-bases/${props.knowledgeBaseId}/files/download?key=${encodeURIComponent(file.key)}`, {
      headers: $api.knowledgeBase.getAuthHeaders()
    })
    
    if (response.success) {
      // Open download URL in new tab
      window.open(response.data.downloadUrl, '_blank')
    }
  } catch (error) {
    console.error('Error downloading file:', error)
  }
}
</script>