<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <h2 class="text-xl font-semibold mb-4">Create New Agent</h2>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Agent name"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            v-model="form.description"
            required
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Agent description"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <select
            v-model="form.model"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a model</option>
            <option value="anthropic.claude-3-5-sonnet-20240620-v1:0">Claude 3.5 Sonnet</option>
            <option value="anthropic.claude-3-sonnet-20240229-v1:0">Claude 3 Sonnet</option>
            <option value="anthropic.claude-3-haiku-20240307-v1:0">Claude 3 Haiku</option>
            <option value="amazon.titan-text-premier-v1:0">Amazon Titan Text Premier</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
          <textarea
            v-model="form.systemPrompt"
            required
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="System prompt for the agent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Knowledge Base (Optional)</label>
          <select
            v-model="form.knowledgeBaseId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No Knowledge Base</option>
            <option
              v-for="kb in knowledgeBases"
              :key="kb.knowledgeBaseId"
              :value="kb.knowledgeBaseId"
              :disabled="kb.status !== 'ACTIVE'"
            >
              {{ kb.name }} ({{ kb.status }})
            </option>
          </select>
          <p class="text-xs text-gray-500 mt-1">
            Select a knowledge base to give your agent access to specific documents and data.
          </p>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
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
            {{ loading ? 'Creating...' : 'Create Agent' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CreateAgentRequest } from '~/types'
import { useKnowledgeBases } from '~/composables/useKnowledgeBases'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'created', agent: CreateAgentRequest): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { createAgent } = useAgents()
const { knowledgeBases, fetchKnowledgeBases } = useKnowledgeBases()
const loading = ref(false)

const form = reactive<CreateAgentRequest>({
  name: '',
  description: '',
  model: '',
  systemPrompt: '',
  knowledgeBaseId: ''
})

onMounted(() => {
  fetchKnowledgeBases()
})

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.model = ''
  form.systemPrompt = ''
  form.knowledgeBaseId = ''
}

const handleSubmit = async () => {
  loading.value = true
  try {
    await createAgent(form)
    emit('created', { ...form })
    emit('close')
    resetForm()
  } catch (error) {
    console.error('Failed to create agent:', error)
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    resetForm()
  }
})
</script>
