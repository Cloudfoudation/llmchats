<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-4">
            <NuxtLink to="/" class="text-gray-600 hover:text-gray-900">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">Agent Management</h1>
          </div>
          <div class="flex items-center space-x-4">
            <NuxtLink to="/admin/roles" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Role Management
            </NuxtLink>
            <NuxtLink to="/admin/knowledge-bases" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Knowledge Bases
            </NuxtLink>
            <span class="text-sm text-gray-600">{{ user?.email }}</span>
            <button @click="logout" class="text-gray-600 hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Actions Bar -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-medium text-gray-900">Agents</h2>
          <p class="text-sm text-gray-600">Create and manage AI agents</p>
        </div>
        <div class="flex space-x-3">
          <NuxtLink
            to="/admin/knowledge-bases"
            class="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            Knowledge Bases
          </NuxtLink>
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Create Agent
          </button>
        </div>
      </div>

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
              <p class="text-sm text-gray-900">{{ agent.model || 'Claude 3.5 Sonnet' }}</p>
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
      v-if="showCreateModal"
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
  // Agent is already added to the list by the composable
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