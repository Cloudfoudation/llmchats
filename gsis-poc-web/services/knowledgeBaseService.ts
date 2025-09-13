import type { KnowledgeBase, CreateKnowledgeBaseRequest, IKnowledgeBaseService } from '~/types'

export class KnowledgeBaseService implements IKnowledgeBaseService {
  private baseUrl: string
  private getAuthHeaders: () => Record<string, string>

  constructor(baseUrl: string, getAuthHeaders: () => Record<string, string>) {
    this.baseUrl = (baseUrl || '').replace(/\/$/, '')
    this.getAuthHeaders = getAuthHeaders
  }

  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    try {
      const response = await $fetch<any>(`${this.baseUrl}/knowledge-bases`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      console.log('🔍 GET Response:', response)

      // Handle direct response format from our Lambda function
      if (response.success && response.data && response.data.knowledgeBases) {
        return response.data.knowledgeBases.map((kb: any) => ({
          knowledgeBaseId: kb.id,
          name: kb.name,
          description: kb.description,
          status: kb.status,
          createdAt: new Date(kb.createdAt * 1000).toISOString(),
          updatedAt: new Date(kb.updatedAt * 1000).toISOString(),
          accessType: 'owner',
          isDuplicate: false,
          permissions: {
            canView: true,
            canEdit: true,
            canDelete: true,
            canSync: true,
            canShare: true
          }
        }))
      }
      return []
    } catch (error) {
      console.error('Error fetching knowledge bases:', error)
      // Return empty array instead of throwing to prevent UI crash
      return []
    }
  }

  async createKnowledgeBase(kb: CreateKnowledgeBaseRequest): Promise<KnowledgeBase> {
    try {
      const response = await $fetch<any>(`${this.baseUrl}/knowledge-bases`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: kb
      })

      console.log('🔍 API Response:', response)

      // Handle direct response format from our Lambda function
      if (response.success && response.data && response.data.knowledgeBase) {
        const data = response.data.knowledgeBase
        return {
          knowledgeBaseId: data.id,
          name: data.name,
          description: data.description,
          status: data.status,
          createdAt: new Date(data.createdAt * 1000).toISOString(), // Convert timestamp to ISO
          updatedAt: new Date(data.updatedAt * 1000).toISOString(), // Convert timestamp to ISO
          accessType: 'owner',
          isDuplicate: false,
          permissions: {
            canView: true,
            canEdit: true,
            canDelete: true,
            canSync: true,
            canShare: true
          }
        }
      }
      
      throw new Error(response.error?.message || 'Failed to create knowledge base')
    } catch (error: any) {
      console.error('🔥 Knowledge Base Creation Error:', error)
      console.error('🔥 Error response:', error.response)
      console.error('🔥 Error data:', error.data)
      console.error('🔥 Error status:', error.status)
      console.error('🔥 Error statusText:', error.statusText)
      throw error
    }
  }

  async deleteKnowledgeBase(id: string): Promise<void> {
    try {
      const response = await $fetch<any>(`${this.baseUrl}/knowledge-bases/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      })

      if (response.statusCode !== 200) {
        throw new Error('Failed to delete knowledge base')
      }
    } catch (error) {
      console.error('Error deleting knowledge base:', error)
      throw error
    }
  }

  async uploadFile(knowledgeBaseId: string, file: File): Promise<void> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${this.baseUrl}/knowledge-bases/${knowledgeBaseId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeaders().Authorization
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }
}

export const createKnowledgeBaseService = (baseUrl: string, getAuthHeaders: () => Record<string, string>): IKnowledgeBaseService => {
  return new KnowledgeBaseService(baseUrl, getAuthHeaders)
}
