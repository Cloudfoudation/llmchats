// src/hooks/useApiKey.ts
import { useState, useCallback } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { apiService } from '@/services/apikey';
import { ApiKey, CreateApiKeyRequest } from '@/types/api';

export function useApiKey() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuthContext();

    const createApiKey = useCallback(async (data: CreateApiKeyRequest): Promise<ApiKey> => {
        setIsLoading(true);
        setError(null);

        try {
            apiService.setUser(user);
            const response = await apiService.createApiKey(data);

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to create API key');
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

    const getApiKeys = useCallback(async (): Promise<ApiKey[]> => {
        setIsLoading(true);
        setError(null);

        try {
            apiService.setUser(user);
            const response = await apiService.getApiKeys();
            console.log(response)
            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to fetch API keys');
            }
            return response.data || [];
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const deleteApiKey = useCallback(async (keyId: string): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            apiService.setUser(user);
            const response = await apiService.deleteApiKey(keyId);

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to delete API key');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    return {
        createApiKey,
        getApiKeys,
        deleteApiKey,
        isLoading,
        error,
        clearError: () => setError(null)
    };
}