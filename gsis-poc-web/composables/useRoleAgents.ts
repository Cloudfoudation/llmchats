export const useRoleAgents = () => {
  const config = useRuntimeConfig()
  
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const assignAgentToRole = async (roleId: string, agentId: string) => {
    try {
      const response = await $fetch(`${config.public.rbacApiUrl}/roles/${roleId}/agents`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { agentId }
      })
      return response
    } catch (error) {
      console.error('Failed to assign agent to role:', error)
      throw error
    }
  }

  const getAvailableAgentsForUser = async () => {
    try {
      const authStore = useAuthStore()
      const userId = authStore.user?.sub
      
      if (!userId) return []
      
      // Get available agent IDs from dashboard
      const dashboardResponse = await $fetch(`${config.public.rbacApiUrl}/users/${userId}/dashboard`, {
        method: 'GET',
        headers: getAuthHeaders()
      })
      
      if (!dashboardResponse.success) return []
      
      const availableAgentIds = dashboardResponse.data.availableAgents || []
      
      // Get full agent details
      const agentsResponse = await $fetch(`${config.public.agentManagementApiUrl}/agents`, {
        method: 'GET',
        headers: getAuthHeaders()
      })
      
      if (!agentsResponse.success) return []
      
      // Filter agents to only include available ones
      const allAgents = agentsResponse.data || []
      const availableAgents = allAgents.filter(agent => 
        availableAgentIds.some(available => available.agentId === agent.id)
      )
      
      return availableAgents
    } catch (error) {
      console.error('Failed to fetch available agents:', error)
      return []
    }
  }

  return {
    assignAgentToRole,
    getAvailableAgentsForUser
  }
}