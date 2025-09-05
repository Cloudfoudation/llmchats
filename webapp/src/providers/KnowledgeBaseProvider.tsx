// src/providers/KnowledgeBaseProvider.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { KnowledgeBase, DataSource, SyncSessionStatus } from '@/types/knowledgeBase';

interface KnowledgeBaseContextType {
    // Basic KB management
    knowledgeBases: KnowledgeBase[];
    ownedKnowledgeBases: KnowledgeBase[];
    sharedKnowledgeBases: KnowledgeBase[];
    isLoading: boolean;
    isFetching: boolean;
    isUploading: boolean;
    error: Error | null;
    currentOperation: string | null;

    // Sync state
    syncStatuses: Record<string, any>;
    currentSyncSession: Record<string, SyncSessionStatus>;

    // Core operations
    fetchKnowledgeBases: (options?: { refresh?: boolean }) => Promise<void>;
    getKnowledgeBase: (knowledgeBaseId: string) => Promise<KnowledgeBase | null>;
    createKnowledgeBase: (data: any) => Promise<KnowledgeBase | null | undefined>;
    deleteKnowledgeBase: (knowledgeBaseId: string) => Promise<boolean>;

    // File operations
    uploadFiles: (knowledgeBaseId: string, files: File[], onProgress?: (progress: number) => void) => Promise<any[]>;
    deleteFile: (knowledgeBaseId: string, s3Key: string) => Promise<boolean>;

    // Data source operations
    createDataSource: (knowledgeBaseId: string, data: any) => Promise<DataSource | null | undefined>;

    // Sync operations
    startSync: (knowledgeBaseId: string, data?: any) => Promise<any>;
    getSyncStatus: (knowledgeBaseId: string) => any;
    getSyncSessionStatus: (sessionId: string) => Promise<SyncSessionStatus | null | undefined>;

    // Sharing operations
    shareKnowledgeBase: (knowledgeBaseId: string, groupId: string, permissions?: any) => Promise<boolean>;
    unshareKnowledgeBase: (knowledgeBaseId: string, groupId: string) => Promise<boolean>;
    updateSharedKnowledgeBase: (knowledgeBaseId: string, groupId: string, permissions: any) => Promise<boolean>;

    // Helper methods
    clearError: () => void;
    getKnowledgeBasesByAccessType: (accessType?: 'owner' | 'shared') => KnowledgeBase[];
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | null>(null);

interface KnowledgeBaseProviderProps {
    children: ReactNode;
    config?: {
        autoRefreshInterval?: number;
    };
}

export const KnowledgeBaseProvider: React.FC<KnowledgeBaseProviderProps> = ({
    children,
    config
}) => {
    const knowledgeBase = useKnowledgeBase(config);
    const contextValue = {
        ...knowledgeBase
    };

    return (
        <KnowledgeBaseContext.Provider value={contextValue}>
            {children}
        </KnowledgeBaseContext.Provider>
    );
};

export const useKnowledgeBaseContext = () => {
    const context = useContext(KnowledgeBaseContext);
    if (context === null || context === undefined) {
        throw new Error('useKnowledgeBaseContext must be used within a KnowledgeBaseProvider');
    }
    return context;
};