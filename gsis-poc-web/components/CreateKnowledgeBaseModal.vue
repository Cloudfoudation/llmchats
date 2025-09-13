<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <h2 class="text-xl font-semibold mb-4">Create Knowledge Base</h2>
      
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Knowledge base name"
          />
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe what this knowledge base contains"
          />
        </div>

        <!-- File Upload Area -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Upload Files (Optional)</label>
          <div
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent
            class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
          >
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <div>
              <label for="file-upload" class="cursor-pointer">
                <span class="text-blue-600 hover:text-blue-500">Upload files</span>
                <span class="text-gray-500"> or drag and drop</span>
                <input
                  id="file-upload"
                  ref="fileInput"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx,.md"
                  @change="handleFileSelect"
                  class="sr-only"
                />
              </label>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Supported formats: PDF, TXT, DOC, DOCX, MD
            </p>
          </div>

          <!-- Selected Files List -->
          <div v-if="selectedFiles.length > 0" class="mt-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Selected Files</h4>
            <ul class="space-y-2">
              <li
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="flex items-center justify-between bg-gray-50 p-3 rounded-md"
              >
                <div class="flex items-center">
                  <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <div>
                    <span class="text-sm text-gray-700">{{ file.name }}</span>
                    <span class="text-xs text-gray-500 ml-2">({{ formatFileSize(file.size) }})</span>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeFile(index)"
                  class="text-red-500 hover:text-red-700"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </li>
            </ul>
          </div>
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
            type="submit"
            :disabled="loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading ? 'Creating...' : 'Create Knowledge Base' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CreateKnowledgeBaseRequest } from '~/types'
import { useKnowledgeBases } from '~/composables/useKnowledgeBases'

defineEmits<{
  close: []
  created: [kb: any]
}>()

const { createKnowledgeBase, loading } = useKnowledgeBases()
const { $api } = useNuxtApp()

const form = reactive<CreateKnowledgeBaseRequest>({
  name: '',
  description: ''
})

const selectedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement>()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value.push(...Array.from(target.files))
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer?.files) {
    selectedFiles.value.push(...Array.from(event.dataTransfer.files))
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleSubmit = async () => {
  try {
    console.log('🔍 Creating knowledge base with data:', form)
    console.log('🔍 Auth headers:', await $api.knowledgeBase.getAuthHeaders())
    
    // Create knowledge base first
    const kb = await createKnowledgeBase(form)
    
    // Upload files if any are selected
    if (selectedFiles.value.length > 0) {
      for (const file of selectedFiles.value) {
        await $api.knowledgeBase.uploadFile(kb.knowledgeBaseId, file)
      }
    }
    
    $emit('created', kb)
    
    // Reset form
    form.name = ''
    form.description = ''
    selectedFiles.value = []
  } catch (error) {
    console.error('Failed to create knowledge base:', error)
  }
}
</script>
