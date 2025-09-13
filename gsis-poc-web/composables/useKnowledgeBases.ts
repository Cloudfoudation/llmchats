import type { KnowledgeBase, CreateKnowledgeBaseRequest } from '~/types'

export const useKnowledgeBases = () => {
  const knowledgeBases = ref<KnowledgeBase[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { $api } = useNuxtApp()

  const fetchKnowledgeBases = async () => {
    loading.value = true
    error.value = null
    try {
      knowledgeBases.value = await $api.knowledgeBase.getKnowledgeBases()
    } catch (err) {
      error.value = 'Failed to fetch knowledge bases'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const createKnowledgeBase = async (kb: CreateKnowledgeBaseRequest) => {
    loading.value = true
    error.value = null
    try {
      const newKb = await $api.knowledgeBase.createKnowledgeBase(kb)
      knowledgeBases.value.push(newKb)
      return newKb
    } catch (err) {
      error.value = 'Failed to create knowledge base'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteKnowledgeBase = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await $api.knowledgeBase.deleteKnowledgeBase(id)
      knowledgeBases.value = knowledgeBases.value.filter(kb => kb.knowledgeBaseId !== id)
    } catch (err) {
      error.value = 'Failed to delete knowledge base'
      throw err
    } finally {
      loading.value = false
    }
  }

  const uploadFiles = async (knowledgeBaseId: string, files: File[]) => {
    loading.value = true
    error.value = null
    try {
      await $api.knowledgeBase.uploadFiles(knowledgeBaseId, files)
    } catch (err) {
      error.value = 'Failed to upload files'
      throw err
    } finally {
      loading.value = false
    }
  }

  const startSync = async (knowledgeBaseId: string) => {
    try {
      return await $api.knowledgeBase.startSync(knowledgeBaseId)
    } catch (err) {
      error.value = 'Failed to start sync'
      throw err
    }
  }

  const getSyncStatus = async (knowledgeBaseId: string) => {
    try {
      return await $api.knowledgeBase.getSyncStatus(knowledgeBaseId)
    } catch (err) {
      console.error('Failed to get sync status:', err)
      return null
    }
  }

  const listFiles = async (knowledgeBaseId: string) => {
    try {
      return await $api.knowledgeBase.listFiles(knowledgeBaseId)
    } catch (err) {
      console.error('Failed to list files:', err)
      return []
    }
  }

  return {
    knowledgeBases: readonly(knowledgeBases),
    loading: readonly(loading),
    error: readonly(error),
    fetchKnowledgeBases,
    createKnowledgeBase,
    deleteKnowledgeBase,
    uploadFiles,
    startSync,
    getSyncStatus,
    listFiles
  }
}
