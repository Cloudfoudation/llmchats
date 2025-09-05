// src/hooks/useResearch.ts
import { useState, useCallback } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { researchService } from '@/services/research';
import {
  StartResearchRequest,
  ResearchResponse,
  ResearchStatusResponse,
  ResearchOutlineResponse,
  ResearchFeedbackRequest,
  TasksListResponse,
  ResearchTask,
  ResearchPdfResponse,
  ResearchStatus,
  UserPromptsResponse,
  UpdatePromptsRequest
} from '@/types/research';


const needsPolling = (status: ResearchStatus): boolean => {
  return ['started', 'generating', 'regenerating', 'regenerating_outline', 'prompts_updated'].includes(status);
};

export function useResearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();

  const startResearch = useCallback(async (data: StartResearchRequest): Promise<ResearchResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const response = await researchService.startResearch(data);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getResearchStatus = useCallback(async (taskId: string): Promise<ResearchStatusResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const response = await researchService.getResearchStatus(taskId);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getResearchOutline = useCallback(async (taskId: string): Promise<ResearchOutlineResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const response = await researchService.getResearchOutline(taskId);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const provideFeedback = useCallback(async (taskId: string, feedback: ResearchFeedbackRequest): Promise<ResearchResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      console.log("Sending feedback to API:", taskId, feedback);
      const response = await researchService.provideFeedback(taskId, feedback);
      console.log("API feedback response:", response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error("Feedback error:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const listResearchTasks = useCallback(async (
    limit: number = 10,
    offset: number = 0,
    status?: string,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<TasksListResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const response = await researchService.listResearchTasks(
        limit,
        offset,
        status,
        sortBy,
        sortOrder
      );

      // Ensure all fields are properly parsed
      const sanitizedTasks = response.tasks.map(task => ({
        ...task,
        progress: typeof task.progress === 'string' ? parseFloat(task.progress) :
          (task.progress ?? 0),
        created_at: typeof task.created_at === 'string' ? parseInt(task.created_at) :
          (task.created_at ?? Math.floor(Date.now() / 1000))
      }));

      return {
        ...response,
        tasks: sanitizedTasks
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return {
        tasks: [],
        total: 0,
        limit,
        offset,
        filtered: !!status
      };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // New function to download article content from URL
  const downloadArticle = useCallback(async (url: string): Promise<string> => {
    // Don't set global loading state as we might have multiple downloads in parallel
    setError(null);

    try {
      researchService.setUser(user);
      const content = await researchService.downloadArticleContent(url);
      return content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to download article: ${errorMessage}`);
      throw err;
    }
  }, [user]);

  // New function to retrieve article with multiple fallback approaches
  const retrieveArticleContent = useCallback(async (taskId: string, maxAttempts: number = 3): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const content = await researchService.retrieveArticleContent(taskId, maxAttempts);
      return content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to retrieve article content: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // New function to check if a task has output files available
  const getTaskFiles = useCallback(async (taskId: string): Promise<string[]> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const files = await researchService.getTaskFiles(taskId);
      return files;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getResearchPdf = useCallback(async (taskId: string): Promise<ResearchPdfResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const response = await researchService.getResearchPdf(taskId);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to get PDF: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshURLs = useCallback(async (taskId: string): Promise<ResearchStatusResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const response = await researchService.refreshURLs(taskId);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getUserPrompts = useCallback(async (taskId: string): Promise<UserPromptsResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const response = await researchService.getUserPrompts(taskId);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);


  const updatePrompts = useCallback(async (taskId: string, data: UpdatePromptsRequest): Promise<ResearchResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      researchService.setUser(user);
      const response = await researchService.updatePrompts(taskId, data);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    startResearch,
    getResearchStatus,
    getResearchOutline,
    provideFeedback,
    listResearchTasks,
    downloadArticle,
    retrieveArticleContent,
    getTaskFiles,
    getResearchPdf,
    refreshURLs,
    getUserPrompts,
    updatePrompts,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}