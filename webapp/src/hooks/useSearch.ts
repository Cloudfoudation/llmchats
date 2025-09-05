// useSearch.ts
import { useState, useCallback } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { apiService } from '@/services/api';
import {
    SearchResponse,
    PaginatedResponse,
    SearchHistoryItem,
    SearchSubmitResponse,
    SearchState
} from '@/types/api';

function useSearch() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuthContext();

    const pollResults = useCallback(async (
        requestIds: string | string[],
        onUpdate: (result: SearchResponse) => void,
        interval = 3000,
        maxAttempts = 400
    ) => {
        let attempts = 0;

        const poll = async () => {
            try {
                apiService.setUser(user);
                const response = await apiService.getResults(requestIds);

                if (!response.success || !response.data) {
                    throw new Error(response.error?.message || 'Failed to get results');
                }

                onUpdate(response.data);

                // Check if all items are complete
                const items = response.data.items;
                const allComplete = items.every(item =>
                    item.status === 'completed' || item.status === 'failed'
                );

                // Check for errors
                const errorItem = items.find(item => item.error);
                if (errorItem?.error) {
                    setError(errorItem.error.message);
                    return true;
                }

                // Check knowledge base status
                const failedKB = items.find(item =>
                    item.results?.knowledge_base_config?.status === 'failed'
                );
                if (failedKB) {
                    setError('Knowledge base processing failed');
                    return true;
                }

                if (allComplete) {
                    return true;
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    throw new Error('Processing timeout exceeded');
                }

                return false;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
                setError(errorMessage);
                throw err;
            }
        };

        return new Promise<boolean>((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    const shouldStop = await poll();
                    if (shouldStop) {
                        clearInterval(pollInterval);
                        resolve(true);
                    }
                } catch (error) {
                    clearInterval(pollInterval);
                    reject(error);
                }
            }, interval);
        });
    }, [user]);

    const submitSearch = useCallback(async (query: string): Promise<SearchSubmitResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            apiService.setUser(user);
            const response = await apiService.submitSearch(query);

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to submit search');
            }

            return response.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const getResults = useCallback(async (requestIds: string | string[]): Promise<SearchResponse> => {
        try {
            apiService.setUser(user);
            const response = await apiService.getResults(requestIds);

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to get results');
            }

            // Check for errors in any of the items
            const items = response.data.items;
            const errorItem = items.find(item => item.error);
            if (errorItem?.error) {
                throw new Error(errorItem.error.message);
            }

            // Check knowledge base status for all items
            const failedKB = items.find(item =>
                item.results?.knowledge_base_config?.status === 'failed'
            );
            if (failedKB) {
                throw new Error('Knowledge base processing failed');
            }

            return response.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        }
    }, [user]);

    const getAllResults = useCallback(async (
        nextToken?: string,
        limit?: number
    ): Promise<PaginatedResponse<SearchHistoryItem>> => {
        setIsLoading(true);
        try {
            apiService.setUser(user);
            const response = await apiService.getAllResults({ nextToken, limit });

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to fetch results');
            }

            return response.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    return {
        submitSearch,
        getResults,
        getAllResults,
        pollResults,
        isLoading,
        error,
        clearError: () => setError(null)
    };
}

export { useSearch };