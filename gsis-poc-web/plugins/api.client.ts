import { createAgentService } from '~/services/agentService'
import { createKnowledgeBaseService } from '~/services/knowledgeBaseService'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  // Ensure we have auth composable available
  const { getAuthHeaders } = useAuth()
  
  // Use specific API URLs for each service
  const agentApiUrl = config.public?.apiUrl || config.public?.agentManagementApiUrl || ''
  const knowledgeBaseApiUrl = config.public?.knowledgeBaseApiUrl || agentApiUrl

  const api = {
    agent: createAgentService(agentApiUrl, getAuthHeaders),
    knowledgeBase: createKnowledgeBaseService(knowledgeBaseApiUrl, getAuthHeaders),

  }

  return {
    provide: {
      api
    }
  }
})
