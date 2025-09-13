import type { Agent, CreateAgentRequest, IAgentService } from '~/types'

export class AgentService implements IAgentService {
  private baseUrl: string
  private getAuthHeaders: () => Record<string, string>

  constructor(baseUrl: string, getAuthHeaders: () => Record<string, string>) {
    this.baseUrl = (baseUrl || '').replace(/\/$/, '')
    this.getAuthHeaders = getAuthHeaders
  }

  async getAgents(): Promise<Agent[]> {
    try {
      const url = `${this.baseUrl.replace(/\/$/, '')}/agents`
      console.log('🔍 Making request to:', url)
      console.log('🔍 Headers:', this.getAuthHeaders())
      
      const response = await $fetch<any>(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      console.log('🔍 Response data:', response)
      
      if (response.success && response.data) {
        return response.data.map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          model: agent.modelParams?.modelId || 'Model not available',
          systemPrompt: agent.systemPrompt,
          createdAt: new Date(agent.createdAt).toISOString(),
          updatedAt: new Date(agent.lastEditedAt).toISOString()
        }))
      }
      return []
    } catch (error) {
      console.error('Error fetching agents:', error)
      throw error
    }
  }

  async createAgent(agent: any): Promise<Agent> {
    try {
      const url = `${this.baseUrl.replace(/\/$/, '')}/agents`
      const response = await $fetch<any>(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: agent
      })

      console.log('🔍 Create agent response:', response)
      
      if (response.success && response.data) {
        const data = response.data
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          model: data.modelParams?.modelId,
          systemPrompt: data.systemPrompt,
          createdAt: new Date(data.createdAt).toISOString(),
          updatedAt: new Date(data.lastEditedAt).toISOString()
        }
      }
      throw new Error('Failed to create agent')
    } catch (error) {
      console.error('Error creating agent:', error)
      throw error
    }
  }

  async updateAgent(id: string, agent: Partial<CreateAgentRequest>): Promise<Agent> {
    throw new Error('Update not implemented yet')
  }

  async deleteAgent(id: string): Promise<void> {
    try {
      const url = `${this.baseUrl.replace(/\/$/, '')}/agents/${id}`
      const response = await $fetch<any>(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      })

      if (response.statusCode !== 200) {
        throw new Error('Failed to delete agent')
      }
    } catch (error) {
      console.error('Error deleting agent:', error)
      throw error
    }
  }
}

export const createAgentService = (baseUrl: string, getAuthHeaders: () => Record<string, string>): IAgentService => {
  return new AgentService(baseUrl, getAuthHeaders)
}
