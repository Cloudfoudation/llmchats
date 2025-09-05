// src/contexts/SyncContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SyncManager } from '@/services/sync/SyncManager';
import { SyncState } from '@/types/sync';
import { useAuthContext } from './AuthProvider';

interface SyncContextValue extends SyncState {
    syncManager: SyncManager | undefined;
    forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const [syncState, setSyncState] = useState<SyncState>({
        isSyncing: false,
        lastSyncTime: null,
        pendingChanges: 0,
        syncError: null
    });

    const { identityId } = useAuthContext();

    const [syncManager, setSyncManager] = useState((): SyncManager | undefined => { return undefined });

    const forceSync = async () => {
        try {
            setSyncState(prev => ({ ...prev, isSyncing: true }));

            setSyncState(prev => ({
                ...prev,
                isSyncing: false,
                lastSyncTime: Date.now()
            }));
        } catch (error) {
            setSyncState(prev => ({
                ...prev,
                isSyncing: false,
                syncError: error as Error
            }));
        }
    };

    useEffect(() => {
        if (!syncManager || syncManager.getStatus() != "idle" || !identityId) return;

        syncManager.initialize(identityId).then(() => {
            syncManager.performInitialSync().then(() => {
                setSyncState(prev => ({
                    ...prev,
                    lastSyncTime: Date.now()
                }));
            });
        });

    }, [syncManager, identityId])

    useEffect(() => {
        setSyncManager(() => new SyncManager());
    }, []);

    // Add sync status monitoring
    useEffect(() => {

        if (!syncManager) {
            return;
        }

        const unsubscribe = syncManager.subscribe((status) => {
            // Handle sync status changes
            console.log('Sync status:', status);
        });

        return () => unsubscribe();
    }, [syncManager]);

    return (
        <SyncContext.Provider
            value={{
                ...syncState,
                syncManager,
                forceSync
            }}
        >
            {children}
        </SyncContext.Provider>
    );
}

export const useSyncContext = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSyncContext must be used within a SyncProvider');
    }
    return context;
};