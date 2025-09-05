// src/hooks/useKnowledgeBase.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';

import {
    KnowledgeBase,
    CreateKnowledgeBaseRequest,
    FileUploadRequest,
    DataSource,
    StartSyncRequest,
    ListFilesResponse,
    SyncSessionStatus
} from '@/types/knowledgeBase';
import { knowledgeBaseService } from '@/services/knowledgeBase';
import { sharedResourcesService } from '@/services/sharedResourcesService';

// Interface for Knowledge Base hook state
interface KnowledgeBaseState {
    knowledgeBases: KnowledgeBase[];
    isLoading: boolean;
    isFetching: boolean;
    isUploading: boolean;
    error: Error | null;
    currentOperation: string | null;
    syncStatuses: Record<string, any>;
    currentSyncSession: Record<string, SyncSessionStatus>;
    isListingFiles: boolean;
}

export const useKnowledgeBase = (config: {
    autoRefreshInterval?: number;
} = {}) => {
    const {
        autoRefreshInterval = 30000
    } = config;

    const { user } = useAuthContext();

    const [state, setState] = useState<KnowledgeBaseState>({
        knowledgeBases: [],
        isLoading: false,
        isFetching: false,
        isUploading: false,
        error: null,
        currentOperation: null,
        syncStatuses: {},
        currentSyncSession: {},
        isListingFiles: false
    });

    // Keep track of monitored sync jobs (legacy)
    const monitoredJobs = useRef(new Set<string>());

    // Keep track of monitored sync sessions (new)
    const monitoredSessions = useRef(new Set<string>());

    // Keep track of owned KB IDs to avoid duplication in shared list
    const ownedKbIds = useRef(new Set<string>());

    // Initialize services with user info
    useEffect(() => {
        if (user) {
            knowledgeBaseService.setUser(user);
            sharedResourcesService.setUser(user);
        }
    }, [user]);

    // Handle API errors
    const handleError = useCallback((error: unknown, operation: string): Error => {
        console.error(`Error in operation ${operation}:`, error);

        const errorMessage = error instanceof Error
            ? error.message
            : 'An unknown error occurred';

        const formattedError = new Error(`${operation} failed: ${errorMessage}`);

        setState(prev => ({
            ...prev,
            error: formattedError,
            isLoading: false,
            isFetching: false,
            isUploading: false,
            isListingFiles: false,
            currentOperation: null
        }));

        return formattedError;
    }, []);

    // List files from a knowledge base
    const listFiles = useCallback(async (knowledgeBaseId: string): Promise<ListFilesResponse> => {
        try {
            setState(prev => ({
                ...prev,
                isListingFiles: true,
                error: null
            }));

            const response = await knowledgeBaseService.listFiles(knowledgeBaseId);

            if (!response.success) {
                const errorMsg = response.error?.message || 'Failed to list files';
                throw new Error(errorMsg);
            }

            return response;
        } catch (error) {
            handleError(error, 'LIST_FILES');
            return {
                success: false,
                error: {
                    code: 'LIST_FILES_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to list files'
                }
            };
        } finally {
            setState(prev => ({
                ...prev,
                isListingFiles: false
            }));
        }
    }, [handleError]);

    // Fetch all knowledge bases the user has access to
    const fetchKnowledgeBases = useCallback(async (options: { refresh?: boolean } = {}) => {
        try {
            if (!options.refresh) {
                setState(prev => ({
                    ...prev,
                    isFetching: true,
                    error: null
                }));
            }

            const response = await knowledgeBaseService.listKnowledgeBases();

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to fetch knowledge bases');
            }

            let knowledgeBases = response.data?.knowledgeBases || [];

            // Reset the owned KB IDs set
            ownedKbIds.current.clear();

            // Track owned KB IDs for deduplication
            const ownedKbs = knowledgeBases.filter(kb => kb.accessType === 'owner');
            ownedKbs.forEach(kb => {
                if (kb.knowledgeBaseId) {
                    ownedKbIds.current.add(kb.knowledgeBaseId);
                }
            });

            // Ensure that a KB doesn't appear as both owned and shared
            // If a KB is both owned and shared (shared with a group that includes the owner),
            // we want it to appear only in the "owned" category
            knowledgeBases = knowledgeBases.map(kb => {
                if (kb.accessType === 'shared' && kb.knowledgeBaseId && ownedKbIds.current.has(kb.knowledgeBaseId)) {
                    // Mark this as a duplicate to be filtered out in getKnowledgeBasesByAccessType
                    return {
                        ...kb,
                        isDuplicate: true
                    };
                }
                return kb;
            });

            // Verify that each knowledge base has an accessType property
            knowledgeBases.forEach(kb => {
                if (!kb.accessType) {
                    console.error(`Knowledge base ${kb.knowledgeBaseId} is missing accessType property`);
                }
            });

            setState(prev => ({
                ...prev,
                knowledgeBases: knowledgeBases,
                isFetching: false
            }));

            // Start monitoring active sync jobs for each knowledge base
            if (knowledgeBases.length > 0) {
                knowledgeBases.forEach(kb => {
                    fetchSyncStatus(kb.knowledgeBaseId);
                });
            }
        } catch (error) {
            handleError(error, 'FETCH_KNOWLEDGE_BASES');
        } finally {
            if (!options.refresh) {
                setState(prev => ({
                    ...prev,
                    isFetching: false
                }));
            }
        }
    }, [handleError]);

    // Get a specific knowledge base by ID
    const getKnowledgeBase = useCallback(async (knowledgeBaseId: string): Promise<KnowledgeBase | null> => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'GET_KNOWLEDGE_BASE',
                error: null
            }));

            const response = await knowledgeBaseService.getKnowledgeBase(knowledgeBaseId);

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to get knowledge base');
            }

            // Ensure we return the actual data or null, never undefined
            return response.data || null;
        } catch (error) {
            handleError(error, 'GET_KNOWLEDGE_BASE');
            return null;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [handleError]);

    // Create a new knowledge base
    const createKnowledgeBase = useCallback(async (data: CreateKnowledgeBaseRequest) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'CREATE_KNOWLEDGE_BASE',
                error: null
            }));

            const response = await knowledgeBaseService.createKnowledgeBase(data);

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to create knowledge base');
            }

            // Refresh the list of knowledge bases
            fetchKnowledgeBases();

            return response.data;
        } catch (error) {
            handleError(error, 'CREATE_KNOWLEDGE_BASE');
            return null;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [fetchKnowledgeBases, handleError]);

    // Delete a knowledge base
    const deleteKnowledgeBase = useCallback(async (knowledgeBaseId: string) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'DELETE_KNOWLEDGE_BASE',
                error: null
            }));

            const response = await knowledgeBaseService.deleteKnowledgeBase(knowledgeBaseId);

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to delete knowledge base');
            }

            // Update local state by removing the deleted knowledge base
            setState(prev => ({
                ...prev,
                knowledgeBases: prev.knowledgeBases.filter(kb => kb.knowledgeBaseId !== knowledgeBaseId)
            }));

            // Also remove from owned KB IDs set
            if (knowledgeBaseId) {
                ownedKbIds.current.delete(knowledgeBaseId);
            }

            return true;
        } catch (error) {
            handleError(error, 'DELETE_KNOWLEDGE_BASE');
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [handleError]);

    // Create a data source for a knowledge base
    const createDataSource = useCallback(async (knowledgeBaseId: string, data: { name?: string, groupId?: string }) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'CREATE_DATA_SOURCE',
                error: null
            }));

            const response = await knowledgeBaseService.createDataSource(knowledgeBaseId, data);

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to create data source');
            }

            return response.data;
        } catch (error) {
            handleError(error, 'CREATE_DATA_SOURCE');
            return null;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [handleError]);

    // Start sync (coordinated BDA + ingestion process)
    const startSync = useCallback(async (knowledgeBaseId: string, data: StartSyncRequest = {}) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'START_SYNC',
                error: null
            }));

            const response = await knowledgeBaseService.startSync(knowledgeBaseId, data);

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to start sync');
            }

            // If we get a session ID, start monitoring the sync session
            if (response.data?.sessionId) {
                monitorSyncSession(response.data.sessionId, knowledgeBaseId);
            }

            // For backward compatibility, also monitor legacy ingestion job if present
            if (response.data?.ingestionJobId) {
                monitorSyncStatus(knowledgeBaseId, response.data.ingestionJobId);
            }

            return response.data;
        } catch (error) {
            handleError(error, 'START_SYNC');
            return null;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [handleError]);

    // Get sync session status
    const getSyncSessionStatus = useCallback(async (sessionId: string) => {
        try {
            const response = await knowledgeBaseService.getSyncSessionStatus(sessionId);

            if (!response.success) {
                console.error('Failed to get sync session status:', response.error);
                return null;
            }

            // Update the sync session status in our state
            if (response.data) {
                setState(prev => ({
                    ...prev,
                    currentSyncSession: {
                        ...prev.currentSyncSession,
                        [response.data!.knowledgeBaseId]: response.data!
                    }
                }));
            }

            return response.data;
        } catch (error) {
            console.error('Error fetching sync session status:', error);
            return null;
        }
    }, []);

    // Monitor sync session with polling
    const monitorSyncSession = useCallback((sessionId: string, knowledgeBaseId: string) => {
        // Check if we're already monitoring this session
        if (monitoredSessions.current.has(sessionId)) {
            return;
        }

        // Add session to monitored set
        monitoredSessions.current.add(sessionId);

        let pollInterval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const status = await getSyncSessionStatus(sessionId);

                // Check if session is complete
                if (!status || status.status === 'COMPLETED' || status.status === 'INGESTION_FAILED') {
                    // Cleanup if complete
                    clearInterval(pollInterval);
                    monitoredSessions.current.delete(sessionId);

                    // Also refresh the legacy sync status to get final ingestion job status
                    fetchSyncStatus(knowledgeBaseId);
                    return;
                }
            } catch (error) {
                console.error('Error polling sync session status:', error);
                // Cleanup on error
                clearInterval(pollInterval);
                monitoredSessions.current.delete(sessionId);
            }
        };

        // Initial check
        checkStatus();

        // Start polling every 3 seconds
        pollInterval = setInterval(checkStatus, 3000);

        return () => {
            clearInterval(pollInterval);
            monitoredSessions.current.delete(sessionId);
        };
    }, [getSyncSessionStatus]);

    // Get sync status for a knowledge base (legacy ingestion jobs)
    const fetchSyncStatus = useCallback(async (knowledgeBaseId: string) => {
        try {
            const response = await knowledgeBaseService.getSyncStatus(knowledgeBaseId);

            if (!response.success) {
                console.error('Failed to get sync status:', response.error);
                return;
            }

            // Update the sync status in our state
            if (response.data) {
                setState(prev => ({
                    ...prev,
                    syncStatuses: {
                        ...prev.syncStatuses,
                        [knowledgeBaseId]: response.data
                    }
                }));

                // Start monitoring active jobs
                const syncStatuses = response.data.syncStatuses || {};
                Object.values(syncStatuses).forEach(job => {
                    if (job && (job.status === 'IN_PROGRESS' || job.status === 'STARTING')) {
                        monitorSyncStatus(knowledgeBaseId, job.ingestionJobId);
                    }
                });
            }

            return response.data;
        } catch (error) {
            console.error('Error fetching sync status:', error);
        }
    }, []);

    // Monitor sync status with polling (legacy)
    const monitorSyncStatus = useCallback((knowledgeBaseId: string, ingestionJobId: string) => {
        // Create a unique key for this job
        const jobKey = `${knowledgeBaseId}-${ingestionJobId}`;

        // Check if we're already monitoring this job
        if (monitoredJobs.current.has(jobKey)) {
            return;
        }

        // Add job to monitored set
        monitoredJobs.current.add(jobKey);

        let pollInterval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const status = await fetchSyncStatus(knowledgeBaseId);

                // Check if job is complete
                const job = Object.values(status?.syncStatuses || {})
                    .find(job => job.ingestionJobId === ingestionJobId);

                if (!job || job.status === 'COMPLETE' || job.status === 'FAILED' || job.status === 'STOPPED') {
                    // Cleanup if complete
                    clearInterval(pollInterval);
                    monitoredJobs.current.delete(jobKey);
                    return;
                }
            } catch (error) {
                console.error('Error polling sync status:', error);
                // Cleanup on error
                clearInterval(pollInterval);
                monitoredJobs.current.delete(jobKey);
            }
        };

        // Initial check
        checkStatus();

        // Start polling
        pollInterval = setInterval(checkStatus, 3000);

        return () => {
            clearInterval(pollInterval);
            monitoredJobs.current.delete(jobKey);
        };
    }, [fetchSyncStatus]);

    // Upload files to a knowledge base
    const uploadFiles = useCallback(async (
        knowledgeBaseId: string,
        files: File[],
        onProgress?: (progress: number) => void
    ) => {
        try {
            setState(prev => ({
                ...prev,
                isUploading: true,
                currentOperation: 'UPLOAD_FILES',
                error: null
            }));

            // Step 1: Get pre-signed URLs
            const fileUploadRequest: FileUploadRequest = {
                files: files.map(file => ({
                    name: file.name,
                    type: file.type
                }))
            };

            const urlsResponse = await knowledgeBaseService.uploadFiles(
                knowledgeBaseId,
                fileUploadRequest
            );

            if (!urlsResponse.success || !urlsResponse.data) {
                throw new Error(urlsResponse.error?.message || 'Failed to get upload URLs');
            }

            // Step 2: Upload files using the pre-signed URLs
            const totalFiles = files.length;
            let completedFiles = 0;

            const uploadPromises = urlsResponse.data.uploadUrls.map(async (urlInfo, index) => {
                const file = files.find(f => f.name === urlInfo.fileName);
                if (!file) {
                    throw new Error(`File ${urlInfo.fileName} not found in files array`);
                }

                try {
                    await knowledgeBaseService.uploadFileWithSignedUrl(
                        urlInfo.uploadUrl,
                        file,
                        file.type
                    );

                    completedFiles++;
                    if (onProgress) {
                        onProgress(Math.round((completedFiles / totalFiles) * 100));
                    }

                    return {
                        fileName: file.name,
                        success: true,
                        key: urlInfo.s3Key
                    };
                } catch (error) {
                    console.error(`Failed to upload file ${file.name}:`, error);
                    return {
                        fileName: file.name,
                        success: false,
                        error: error instanceof Error ? error.message : 'Upload failed'
                    };
                }
            });

            const results = await Promise.all(uploadPromises);

            // Step 3: If any files were uploaded successfully, start a coordinated sync
            if (results.some(r => r.success)) {
                try {
                    await startSync(knowledgeBaseId, { processFiles: true });
                } catch (syncError) {
                    console.error('Failed to start sync after upload:', syncError);
                }
            }

            return results;
        } catch (error) {
            handleError(error, 'UPLOAD_FILES');
            return [];
        } finally {
            setState(prev => ({
                ...prev,
                isUploading: false,
                currentOperation: null
            }));
        }
    }, [handleError, startSync]);

    const downloadFile = useCallback(async (knowledgeBaseId: string, fileKey: string, fileName: string) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'DOWNLOAD_FILE',
                error: null
            }));

            // Get presigned URL
            const downloadUrl = await knowledgeBaseService.getDownloadUrl(knowledgeBaseId, fileKey);

            // Create a temporary anchor element to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', fileName); // Set the file name
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return true;
        } catch (error) {
            handleError(error, 'DOWNLOAD_FILE');
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [handleError]);

    // Delete a file from the knowledge base
    const deleteFile = useCallback(async (knowledgeBaseId: string, s3Key: string) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'DELETE_FILE',
                error: null
            }));

            const response = await knowledgeBaseService.deleteFile(knowledgeBaseId, s3Key);

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to delete file');
            }

            // After deleting the file, start a coordinated sync to update the knowledge base
            try {
                await startSync(knowledgeBaseId, { processFiles: true });
            } catch (syncError) {
                console.error('Failed to start sync after file deletion:', syncError);
            }

            return true;
        } catch (error) {
            handleError(error, 'DELETE_FILE');
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [handleError, startSync]);

    // Share a knowledge base with a group
    const shareKnowledgeBase = useCallback(async (
        knowledgeBaseId: string,
        groupId: string,
        permissions?: any
    ) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'SHARE_KNOWLEDGE_BASE',
                error: null
            }));

            const response = await sharedResourcesService.shareResource({
                resourceId: knowledgeBaseId,
                resourceType: 'knowledge-base',
                groupId,
                permissions
            });

            if (response.error) {
                throw new Error(response.error.message || 'Failed to share knowledge base');
            }

            // Refresh the list to get updated sharing info
            fetchKnowledgeBases();

            return true;
        } catch (error) {
            handleError(error, 'SHARE_KNOWLEDGE_BASE');
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [fetchKnowledgeBases, handleError]);

    // Unshare a knowledge base from a group
    const unshareKnowledgeBase = useCallback(async (
        knowledgeBaseId: string,
        groupId: string
    ) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'UNSHARE_KNOWLEDGE_BASE',
                error: null
            }));

            const response = await sharedResourcesService.unshareResource(
                'knowledge-base',
                knowledgeBaseId,
                groupId
            );

            if (response.error) {
                throw new Error(response.error.message || 'Failed to unshare knowledge base');
            }

            // Refresh the list to get updated sharing info
            fetchKnowledgeBases();

            return true;
        } catch (error) {
            handleError(error, 'UNSHARE_KNOWLEDGE_BASE');
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [fetchKnowledgeBases, handleError]);

    // Update permissions for a shared knowledge base
    const updateSharedKnowledgeBase = useCallback(async (
        knowledgeBaseId: string,
        groupId: string,
        permissions: any
    ) => {
        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                currentOperation: 'UPDATE_SHARED_KNOWLEDGE_BASE',
                error: null
            }));

            const response = await sharedResourcesService.updateSharedResource(
                'knowledge-base',
                knowledgeBaseId,
                groupId,
                { permissions }
            );

            if (response.error) {
                throw new Error(response.error.message || 'Failed to update shared knowledge base');
            }

            // Refresh the list to get updated sharing info
            fetchKnowledgeBases();

            return true;
        } catch (error) {
            handleError(error, 'UPDATE_SHARED_KNOWLEDGE_BASE');
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                isLoading: false,
                currentOperation: null
            }));
        }
    }, [fetchKnowledgeBases, handleError]);

    // Filter knowledge bases by access type, removing duplicates
    const getKnowledgeBasesByAccessType = useCallback((accessType?: 'owner' | 'shared') => {
        if (!accessType) return state.knowledgeBases;

        // For 'shared' access type, filter out any duplicates (KBs that the user also owns)
        if (accessType === 'shared') {
            return state.knowledgeBases.filter(kb =>
                kb.accessType === 'shared' && !kb.isDuplicate
            );
        }

        return state.knowledgeBases.filter(kb => kb.accessType === accessType);
    }, [state.knowledgeBases]);

    // Auto-refresh knowledge bases
    useEffect(() => {
        if (user && autoRefreshInterval > 0) {
            const intervalId = setInterval(() => {
                fetchKnowledgeBases({ refresh: true });
            }, autoRefreshInterval);

            return () => clearInterval(intervalId);
        }
    }, [fetchKnowledgeBases, user, autoRefreshInterval]);

    // Initial fetch when the user changes
    useEffect(() => {
        if (user) {
            fetchKnowledgeBases();
        }
    }, [fetchKnowledgeBases, user]);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            monitoredJobs.current.clear();
            monitoredSessions.current.clear();
        };
    }, []);

    // Calculate derived values from the knowledge base list
    const ownedKnowledgeBases = getKnowledgeBasesByAccessType('owner');
    const sharedKnowledgeBases = getKnowledgeBasesByAccessType('shared');

    return {
        // State
        knowledgeBases: state.knowledgeBases,
        ownedKnowledgeBases,
        sharedKnowledgeBases,
        isLoading: state.isLoading,
        isFetching: state.isFetching,
        isUploading: state.isUploading,
        isListingFiles: state.isListingFiles,
        error: state.error,
        currentOperation: state.currentOperation,
        syncStatuses: state.syncStatuses,
        currentSyncSession: state.currentSyncSession,

        // Error handling
        clearError: () => setState(prev => ({ ...prev, error: null })),

        // CRUD operations
        fetchKnowledgeBases,
        getKnowledgeBase,
        createKnowledgeBase,
        deleteKnowledgeBase,

        // Data sources
        createDataSource,

        // File operations
        uploadFiles,
        deleteFile,
        listFiles,
        downloadFile,

        // Sync operations
        startSync,
        getSyncStatus: (knowledgeBaseId: string) => state.syncStatuses[knowledgeBaseId],
        getSyncSessionStatus,

        // Sharing operations
        shareKnowledgeBase,
        unshareKnowledgeBase,
        updateSharedKnowledgeBase,

        // Helper functions
        getKnowledgeBasesByAccessType
    };
};

export default useKnowledgeBase;