import type { Agent, CreateAgentRequest } from '~/types'
import { createAgentService } from '~/services/agentService'

export const useAgents = () => {
  const agents = ref<Agent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const config = useRuntimeConfig()
  
  // Auth headers function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
  
  // Create service instance
  const agentService = createAgentService(
    config.public.agentManagementApiUrl,
    getAuthHeaders
  )

  const fetchAgents = async () => {
    loading.value = true
    error.value = null
    try {
      console.log('🔍 Fetching agents...')
      console.log('🔍 API URL:', config.public.agentManagementApiUrl)
      
      // Check if user has required permissions
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('No access token found. Please login again.')
      }
      
      // Decode JWT to see user info (not groups since we use RBAC now)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        console.log('🔍 JWT user ID:', payload.sub)
        console.log('🔍 JWT email:', payload.email)
      } catch (e) {
        console.log('🔍 Could not decode JWT:', e)
      }
      
      console.log('🔍 Auth headers:', getAuthHeaders())
      
      agents.value = await agentService.getAgents()
    } catch (err) {
      console.error('❌ Error fetching agents:', err)
      if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        error.value = 'Access denied. You may not have permission to manage agents. Please contact your administrator.'
      } else {
        error.value = err instanceof Error ? err.message : 'Failed to fetch agents'
      }
    } finally {
      loading.value = false
    }
  }

  const createAgent = async (agent: CreateAgentRequest) => {
    loading.value = true
    error.value = null
    try {
      const newAgent = await agentService.createAgent(agent)
      agents.value.push(newAgent)
      return newAgent
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create agent'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteAgent = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await agentService.deleteAgent(id)
      agents.value = agents.value.filter(agent => agent.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete agent'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    agents: readonly(agents),
    loading: readonly(loading),
    error: readonly(error),
    fetchAgents,
    createAgent,
    deleteAgent
  }
}
