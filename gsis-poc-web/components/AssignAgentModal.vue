<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div 
        class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
        @click="$emit('close')"
      ></div>

      <!-- Modal -->
      <div class="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">Assign Agent to Role</h3>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Role Info -->
        <div class="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="font-medium text-blue-900">{{ role.roleName }}</h4>
          <p class="text-sm text-blue-700">{{ role.description }}</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit">
          <!-- Agent Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select Agent *
            </label>
            <select
              v-model="selectedAgentId"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose an agent...</option>
              <option 
                v-for="agent in availableAgents" 
                :key="agent.id" 
                :value="agent.id"
              >
                {{ agent.name }} - {{ agent.description }}
              </option>
            </select>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="!selectedAgentId || isLoading"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading">Assigning...</span>
              <span v-else>Assign Agent</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  role: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'assigned'])

const rbacStore = useRBACStore()
const { assignAgentToRole } = rbacStore

// Form state
const selectedAgentId = ref('')
const isLoading = ref(false)
const error = ref('')

// Mock agents - replace with actual agent API call
const availableAgents = ref([
  {
    id: 'agent-1',
    name: 'General Inquiries Assistant',
    description: 'Handles general public inquiries and information requests'
  },
  {
    id: 'agent-2', 
    name: 'HR Assistant',
    description: 'Assists with HR-related questions and processes'
  },
  {
    id: 'agent-3',
    name: 'Legal Research Assistant', 
    description: 'Helps with legal research and case analysis'
  },
  {
    id: 'agent-4',
    name: 'Executive Assistant',
    description: 'Provides executive-level support and analytics'
  }
])

const handleSubmit = async () => {
  if (!selectedAgentId.value) return

  try {
    isLoading.value = true
    error.value = ''

    await assignAgentToRole(props.role.roleId, selectedAgentId.value)
    
    emit('assigned')
  } catch (err) {
    error.value = err.message || 'Failed to assign agent'
  } finally {
    isLoading.value = false
  }
}
</script>