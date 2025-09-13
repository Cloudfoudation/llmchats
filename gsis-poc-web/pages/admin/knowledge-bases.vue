<template>
  <div class="flex-1 bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">Knowledge Bases</h1>
        <button
          @click="showCreateModal = true"
          class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2.5 md:px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          <span class="md:hidden">+</span>
          <span class="hidden md:inline">+ New Knowledge Base</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-6 py-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Knowledge Bases Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div
          v-for="kb in knowledgeBases"
          :key="kb.knowledgeBaseId"
          class="group bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1"
        >
          <div class="flex justify-between items-start mb-4 sm:mb-5">
            <h3 class="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors pr-2">{{ kb.name }}</h3>
            <span
              :class="{
                'bg-emerald-50 text-emerald-700 border-emerald-200': kb.status === 'ACTIVE',
                'bg-amber-50 text-amber-700 border-amber-200': kb.status === 'CREATING',
                'bg-red-50 text-red-700 border-red-200': kb.status === 'FAILED'
              }"
              class="px-2 sm:px-3 py-1 text-xs font-semibold rounded-full border flex-shrink-0"
            >
              {{ kb.status }}
            </span>
          </div>
          
          <p class="text-gray-600 text-sm mb-4 sm:mb-5 leading-relaxed">{{ kb.description }}</p>
          
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 mb-4 sm:mb-5 space-y-2 sm:space-y-0">
            <div class="flex items-center space-x-1">
              <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11m-6 0h6"></path>
              </svg>
              <span>{{ new Date(kb.createdAt).toLocaleDateString() }}</span>
            </div>
            <div class="flex items-center space-x-1 bg-gray-50 px-2 py-1 rounded-lg self-start sm:self-auto">
              <svg class="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span class="font-medium text-gray-700">{{ getFileCount(kb.knowledgeBaseId) }}</span>
            </div>
          </div>

          <div class="space-y-2">
            <!-- File List -->
            <div v-if="kbFiles[kb.knowledgeBaseId]?.length > 0" class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
              <div class="text-xs font-semibold text-blue-700 mb-2 flex items-center">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                Uploaded Files
              </div>
              <div class="space-y-1.5">
                <div 
                  v-for="file in kbFiles[kb.knowledgeBaseId].slice(0, 2)" 
                  :key="file.key"
                  class="text-xs text-gray-700 truncate bg-white/60 px-2 py-1 rounded-lg"
                >
                  {{ file.fileName }}
                </div>
                <div v-if="kbFiles[kb.knowledgeBaseId].length > 2" class="text-xs text-blue-600 font-medium">
                  +{{ kbFiles[kb.knowledgeBaseId].length - 2 }} more files
                </div>
              </div>
            </div>
            
            <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                @click="uploadFile(kb.knowledgeBaseId)"
                :disabled="kb.status !== 'ACTIVE'"
                class="w-full sm:flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Upload
              </button>
              <div class="flex space-x-2 sm:space-x-3">
                <button
                  @click="viewFiles(kb.knowledgeBaseId)"
                  class="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all duration-200"
                >
                  View
                </button>
                <button
                  @click="deleteKnowledgeBase(kb.knowledgeBaseId)"
                  class="flex-1 sm:flex-none px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="knowledgeBases.length === 0" class="col-span-full text-center py-20">
          <div class="max-w-md mx-auto">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7H3a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"></path>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No knowledge bases yet</h3>
            <p class="text-gray-600 mb-6">Create your first knowledge base to start organizing your documents</p>
            <button
              @click="showCreateModal = true"
              class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              Create Knowledge Base
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Knowledge Base Modal -->
    <CreateKnowledgeBaseModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handleKnowledgeBaseCreated"
    />

    <!-- File Upload Modal -->
    <FileUploadModal
      v-if="showUploadModal"
      :knowledge-base-id="selectedKbId"
      @close="showUploadModal = false"
      @uploaded="handleFileUploaded"
    />

    <!-- File Viewer Modal -->
    <FileViewerModal
      v-if="showViewModal"
      :knowledge-base-id="selectedKbId"
      @close="showViewModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useKnowledgeBases } from '~/composables/useKnowledgeBases'

// Page metadata
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// Composables
const { knowledgeBases, loading, error, fetchKnowledgeBases, deleteKnowledgeBase: deleteKb, listFiles } = useKnowledgeBases()
const { $api } = useNuxtApp()

// State
const showCreateModal = ref(false)
const showUploadModal = ref(false)
const showViewModal = ref(false)

const selectedKbId = ref('')
const kbFiles = ref<Record<string, any[]>>({})



// Fetch knowledge bases and files on mount
onMounted(async () => {
  await fetchKnowledgeBases()
  // Load files for each knowledge base
  for (const kb of knowledgeBases.value) {
    try {
      kbFiles.value[kb.knowledgeBaseId] = await $api.knowledgeBase.listFiles(kb.knowledgeBaseId)
    } catch (error) {
      console.error(`Error loading files for KB ${kb.knowledgeBaseId}:`, error)
      kbFiles.value[kb.knowledgeBaseId] = []
    }
  }
})

// Handlers
const handleKnowledgeBaseCreated = async () => {
  showCreateModal.value = false
  await fetchKnowledgeBases()
  // Reload files for all KBs
  for (const kb of knowledgeBases.value) {
    try {
      kbFiles.value[kb.knowledgeBaseId] = await $api.knowledgeBase.listFiles(kb.knowledgeBaseId)
    } catch (error) {
      kbFiles.value[kb.knowledgeBaseId] = []
    }
  }
}

const uploadFile = (kbId: string) => {
  selectedKbId.value = kbId
  showUploadModal.value = true
}

const handleFileUploaded = async () => {
  showUploadModal.value = false
  // Refresh files for the selected KB
  if (selectedKbId.value) {
    try {
      kbFiles.value[selectedKbId.value] = await $api.knowledgeBase.listFiles(selectedKbId.value)
    } catch (error) {
      kbFiles.value[selectedKbId.value] = []
    }
  }
}

const deleteKnowledgeBase = async (id: string) => {
  if (confirm('Are you sure you want to delete this knowledge base?')) {
    await deleteKb(id)
    delete kbFiles.value[id]
  }
}

const getFileCount = (kbId: string) => {
  return kbFiles.value[kbId]?.length || 0
}

const viewFiles = (kbId: string) => {
  selectedKbId.value = kbId
  showViewModal.value = true
}
</script>
