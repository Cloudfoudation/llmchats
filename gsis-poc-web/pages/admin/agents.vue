<template>
  <div class="flex-1 bg-gray-50">
    <!-- Page Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Agent Management</h1>
          <p class="text-gray-600 mt-1">Create and manage AI agents</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-2.5 md:px-6 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          <span class="md:hidden">+</span>
          <span class="hidden md:inline">+ Create Agent</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-6 py-6">

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
        <button @click="fetchAgents" class="mt-2 text-red-600 hover:text-red-800 text-sm">
          Try again
        </button>
      </div>

      <!-- Agents Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="agent in agents"
          :key="agent.id"
          class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-medium text-gray-900">{{ agent.name }}</h3>
                <p class="text-sm text-gray-600">{{ agent.description }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="handleDeleteAgent(agent.id)"
                class="text-red-400 hover:text-red-600"
                title="Delete agent"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Agent Details -->
          <div class="space-y-3">
            <div>
              <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</span>
              <p class="text-sm text-gray-900">{{ agent.model || 'No model specified' }}</p>
            </div>
            
            <div>
              <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">System Prompt</span>
              <p class="text-sm text-gray-900 line-clamp-2">{{ agent.systemPrompt || 'Default system prompt' }}</p>
            </div>

            <div class="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
              <span>Created {{ formatDate(agent.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && agents.length === 0" class="col-span-full text-center py-12">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
          <p class="text-gray-600 mb-4">Create your first AI agent to get started.</p>
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Agent
          </button>
        </div>
      </div>
    </main>

    <!-- Create Agent Modal -->
    <CreateAgentModal
      :isOpen="showCreateModal"
      @close="showCreateModal = false"
      @created="handleAgentCreated"
    />
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const { user, isAdmin } = storeToRefs(authStore)
const { logout } = authStore

const rbacStore = useRBACStore()
const { userDashboard } = storeToRefs(rbacStore)

const { agents, loading, error, fetchAgents, deleteAgent } = useAgents()
const showCreateModal = ref(false)

// Fetch agents on mount
onMounted(() => {
  console.log('🔍 Current user:', user.value)
  console.log('🔍 User permissions:', userDashboard.value?.permissions)
  console.log('🔍 User roles:', user.value?.role)
  console.log('🔍 Is admin:', isAdmin.value)
  
  fetchAgents()
})

const handleAgentCreated = () => {
  showCreateModal.value = false
  fetchAgents() // Refresh the agents list
}

const handleDeleteAgent = async (id) => {
  if (confirm('Are you sure you want to delete this agent?')) {
    try {
      await deleteAgent(id)
    } catch (error) {
      console.error('Failed to delete agent:', error)
    }
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString()
}

useHead({
  title: 'Agent Management - GSIS AI Portal'
})
</script>