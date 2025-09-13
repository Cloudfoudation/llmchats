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
          knowledgeBaseId: kb.knowledgeBaseId,
          name: kb.name,
          description: kb.description,
          status: kb.status,
          createdAt: kb.createdAt,
          updatedAt: kb.updatedAt,
          accessType: kb.accessType || 'owner',
          isDuplicate: false,
          permissions: kb.permissions || {
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
      if (response.success && response.data) {
        const data = response.data
        return {
          knowledgeBaseId: data.knowledgeBaseId,
          name: data.name,
          description: data.description,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
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

  async uploadFiles(knowledgeBaseId: string, files: File[]): Promise<void> {
    try {
      // Step 1: Get presigned URLs
      const uploadRequest = {
        files: files.map(file => ({
          name: file.name,
          type: file.type
        }))
      }

      const response = await $fetch<any>(`${this.baseUrl}/knowledge-bases/${knowledgeBaseId}/files`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: uploadRequest
      })

      if (!response.success || !response.data?.uploadUrls) {
        throw new Error('Failed to get upload URLs')
      }

      // Step 2: Upload files to S3 using presigned URLs
      const uploadPromises = response.data.uploadUrls.map(async (urlInfo: any, index: number) => {
        const file = files[index]
        const uploadResponse = await fetch(urlInfo.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        })

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}: ${uploadResponse.statusText}`)
        }
      })

      await Promise.all(uploadPromises)

      // Step 3: Start sync/ingestion
      await this.startSync(knowledgeBaseId)
    } catch (error) {
      console.error('Error uploading files:', error)
      throw error
    }
  }

  async startSync(knowledgeBaseId: string): Promise<any> {
    try {
      const response = await $fetch<any>(`${this.baseUrl}/knowledge-bases/${knowledgeBaseId}/sync`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: { processFiles: true }
      })

      if (!response.success) {
        throw new Error('Failed to start sync')
      }

      return response.data
    } catch (error) {
      console.error('Error starting sync:', error)
      throw error
    }
  }

  async getSyncStatus(knowledgeBaseId: string): Promise<any> {
    try {
      const response = await $fetch<any>(`${this.baseUrl}/knowledge-bases/${knowledgeBaseId}/sync`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return response.success ? response.data : null
    } catch (error) {
      console.error('Error getting sync status:', error)
      return null
    }
  }

  async listFiles(knowledgeBaseId: string): Promise<any[]> {
    try {
      const response = await $fetch<any>(`${this.baseUrl}/knowledge-bases/${knowledgeBaseId}/files`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      return response.success ? response.data.files : []
    } catch (error) {
      console.error('Error listing files:', error)
      return []
    }
  }
}

export const createKnowledgeBaseService = (baseUrl: string, getAuthHeaders: () => Record<string, string>): IKnowledgeBaseService => {
  return new KnowledgeBaseService(baseUrl, getAuthHeaders)
}
