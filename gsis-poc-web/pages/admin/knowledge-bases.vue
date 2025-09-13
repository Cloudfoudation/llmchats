<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">Knowledge Base Management</h1>
          </div>
          <div class="flex items-center space-x-4">
            <NuxtLink to="/admin/agents" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Agent Management
            </NuxtLink>
            <NuxtLink to="/admin/roles" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Role Management
            </NuxtLink>
            <button
              @click="showCreateModal = true"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Knowledge Base
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Knowledge Bases Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="kb in knowledgeBases"
          :key="kb.knowledgeBaseId"
          class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ kb.name }}</h3>
            <span
              :class="{
                'bg-green-100 text-green-800': kb.status === 'ACTIVE',
                'bg-yellow-100 text-yellow-800': kb.status === 'CREATING',
                'bg-red-100 text-red-800': kb.status === 'FAILED'
              }"
              class="px-2 py-1 text-xs font-medium rounded-full"
            >
              {{ kb.status }}
            </span>
          </div>
          
          <p class="text-gray-600 text-sm mb-4">{{ kb.description }}</p>
          
          <div class="text-xs text-gray-500 mb-4">
            Created: {{ new Date(kb.createdAt).toLocaleDateString() }}
          </div>

          <div class="flex space-x-2">
            <button
              @click="uploadFile(kb.knowledgeBaseId)"
              :disabled="kb.status !== 'ACTIVE'"
              class="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Files
            </button>
            <button
              @click="deleteKnowledgeBase(kb.knowledgeBaseId)"
              class="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
            >
              Delete
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="knowledgeBases.length === 0" class="col-span-full text-center py-12">
          <div class="text-gray-500">
            <p class="text-lg mb-2">No knowledge bases yet</p>
            <p class="text-sm">Create your first knowledge base to get started</p>
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
const { knowledgeBases, loading, error, fetchKnowledgeBases, deleteKnowledgeBase: deleteKb } = useKnowledgeBases()

// State
const showCreateModal = ref(false)
const showUploadModal = ref(false)
const selectedKbId = ref('')

// Fetch knowledge bases on mount
onMounted(() => {
  fetchKnowledgeBases()
})

// Handlers
const handleKnowledgeBaseCreated = () => {
  showCreateModal.value = false
  fetchKnowledgeBases()
}

const uploadFile = (kbId: string) => {
  selectedKbId.value = kbId
  showUploadModal.value = true
}

const handleFileUploaded = () => {
  showUploadModal.value = false
}

const deleteKnowledgeBase = async (id: string) => {
  if (confirm('Are you sure you want to delete this knowledge base?')) {
    await deleteKb(id)
  }
}
</script>
