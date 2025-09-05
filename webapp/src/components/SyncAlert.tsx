// src/components/SyncAlert.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useKnowledgeBaseContext } from '@/providers/KnowledgeBaseProvider';
import { useAgentsContext } from '@/providers/AgentsProvider';
import { SyncStatusDisplay } from './knowledge/SyncStatusDisplay';

// Define sync job status constants to match your API
enum SyncJobStatus {
    COMPLETE = 'COMPLETE',
    FAILED = 'FAILED',
    IN_PROGRESS = 'IN_PROGRESS',
    STARTING = 'STARTING',
    STOPPED = 'STOPPED'
}

interface SyncAlertProps {
}

export const SyncAlert: React.FC<SyncAlertProps> = ({ }) => {
    const { syncStatuses } = useKnowledgeBaseContext();
    const { currentAgent } = useAgentsContext();
    const [dataSourceId, setDataSourceId] = useState<string | null>(null);
    const [isOutOfSync, setIsOutOfSync] = useState(false);

    const checkSync = useCallback(() => {
        if (syncStatuses && currentAgent?.knowledgeBaseId && syncStatuses[currentAgent.knowledgeBaseId]) {
            const kbSync = syncStatuses[currentAgent.knowledgeBaseId];

            // Check if the KB has sync statuses
            if (kbSync && kbSync.syncStatuses) {
                // Iterate through all sync statuses for this KB
                for (const [dsId, syncJob] of Object.entries(kbSync.syncStatuses)) {
                    // Skip if syncJob is not defined or doesn't have status
                    if (!syncJob || typeof syncJob !== 'object') continue;

                    // Type assertion to access status safely
                    const job = syncJob as { status?: string, dataSourceId?: string };

                    // Check if status indicates sync is in progress
                    if (job.status &&
                        job.status !== SyncJobStatus.COMPLETE &&
                        job.status !== SyncJobStatus.FAILED &&
                        job.status !== SyncJobStatus.STOPPED) {

                        setDataSourceId(dsId); // Use the key as dataSourceId
                        setIsOutOfSync(true);
                        return;
                    }
                }
            }

            // If we reach here, no active sync jobs found
            setIsOutOfSync(false);
            return;
        }

        setIsOutOfSync(false);
    }, [syncStatuses, currentAgent]);

    useEffect(() => {
        checkSync();
    }, [checkSync]);

    if (!currentAgent || !isOutOfSync || !currentAgent.knowledgeBaseId) return null;

    return (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
            <div className="flex">
                <SyncStatusDisplay knowledgeBaseId={currentAgent.knowledgeBaseId} />
            </div>
        </div>
    );
};