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
      
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body)
        return body.agents || []
      }
      return []
    } catch (error) {
      console.error('Error fetching agents:', error)
      throw error
    }
  }

  async createAgent(agent: CreateAgentRequest): Promise<Agent> {
    try {
      const payload = {
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        modelParams: {
          modelId: agent.model,
          temperature: 0.7,
          maxTokens: 2000
        },
        type: 'custom'
      }

      const url = `${this.baseUrl.replace(/\/$/, '')}/agents`
      const response = await $fetch<any>(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: payload
      })

      if (response.statusCode === 200 || response.statusCode === 201) {
        const body = JSON.parse(response.body)
        return {
          id: body.id,
          name: body.name,
          description: body.description,
          model: body.modelParams?.modelId || agent.model,
          systemPrompt: body.systemPrompt,
          createdAt: new Date(body.createdAt).toISOString(),
          updatedAt: new Date(body.lastEditedAt).toISOString()
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
