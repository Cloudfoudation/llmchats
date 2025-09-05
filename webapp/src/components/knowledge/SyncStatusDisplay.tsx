import React from 'react';
import { IconLoader2, IconClock, IconClockCheck, IconX, IconHourglass } from '@tabler/icons-react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { SyncJob, SyncSessionStatus } from '@/types/knowledgeBase';

interface SyncStatusDisplayProps {
    knowledgeBaseId: string;
}

export const SyncStatusDisplay: React.FC<SyncStatusDisplayProps> = ({ knowledgeBaseId }) => {
    const { getSyncStatus, currentSyncSession } = useKnowledgeBase();

    // Get both session status (new coordinated sync) and legacy sync status
    const currentSession = currentSyncSession[knowledgeBaseId];
    const syncStatus = getSyncStatus(knowledgeBaseId);

    // Helper functions
    const getSessionStatusColor = (status: SyncSessionStatus['status']) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
            case 'INGESTION_FAILED':
                return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300';
            case 'INGESTION_STARTED':
                return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
        }
    };

    const getLegacyStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETE':
                return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
            case 'FAILED':
                return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300';
            case 'IN_PROGRESS':
            case 'STARTING':
                return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
            case 'STOPPED':
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
            default:
                return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
        }
    };

    const getSessionStatusIcon = (status: SyncSessionStatus['status']) => {
        switch (status) {
            case 'COMPLETED':
                return <IconClockCheck size={14} className="text-green-600" />;
            case 'INGESTION_FAILED':
                return <IconX size={14} className="text-red-600" />;
            case 'PREPARING':
                return <IconHourglass size={14} className="text-yellow-600" />;
            case 'BDA_PROCESSING':
            case 'INGESTION_STARTED':
                return <IconLoader2 className="animate-spin text-blue-600" size={14} />;
            default:
                return <IconClock size={14} className="text-gray-600" />;
        }
    };

    const getSessionStatusLabel = (status: SyncSessionStatus['status']) => {
        switch (status) {
            case 'PREPARING':
                return 'Preparing Files';
            case 'BDA_PROCESSING':
                return 'Processing Files';
            case 'INGESTION_STARTED':
                return 'Syncing to Knowledge Base';
            case 'COMPLETED':
                return 'Sync Complete';
            case 'INGESTION_FAILED':
                return 'Sync Failed';
            default:
                return status;
        }
    };

    const isJobComplete = (status: string): boolean => {
        return ['COMPLETE', 'FAILED', 'STOPPED'].includes(status);
    };

    // Check if there are active legacy jobs
    const hasActiveLegacyJobs = () => {
        if (!syncStatus || !syncStatus.syncStatuses) return false;
        return Object.values(syncStatus.syncStatuses).some((job: any) =>
            job && ['IN_PROGRESS', 'STARTING'].includes(job.status)
        );
    };

    // Render session-based sync status (new coordinated process)
    const renderSessionStatus = () => {
        if (!currentSession) return null;

        const isActive = ['PREPARING', 'BDA_PROCESSING', 'INGESTION_STARTED'].includes(currentSession.status);
        const progress = currentSession.totalFiles > 0
            ? Math.round((currentSession.completedFiles / currentSession.totalFiles) * 100)
            : 0;

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {getSessionStatusIcon(currentSession.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSessionStatusColor(currentSession.status)}`}>
                            {getSessionStatusLabel(currentSession.status)}
                        </span>
                    </div>
                    {currentSession.totalFiles > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {currentSession.completedFiles}/{currentSession.totalFiles} files
                        </span>
                    )}
                </div>

                {/* Progress bar for BDA processing */}
                {currentSession.status === 'BDA_PROCESSING' && currentSession.totalFiles > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>File Processing Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {currentSession.failedFiles > 0 && (
                            <div className="text-xs text-red-600 dark:text-red-400">
                                {currentSession.failedFiles} files failed processing
                            </div>
                        )}
                    </div>
                )}

                {/* Session details */}
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div>Session started: {new Date(currentSession.createdAt).toLocaleString()}</div>
                    {['BDA_PROCESSING', 'INGESTION_STARTED', 'COMPLETED', 'INGESTION_FAILED'].includes(currentSession.status) && currentSession.updatedAt && (
                        <div>Last updated: {new Date(currentSession.updatedAt).toLocaleString()}</div>
                    )}
                    {currentSession.ingestionJobId && (
                        <div className="font-mono text-xs">Job ID: {currentSession.ingestionJobId}</div>
                    )}
                    {currentSession.errorMessage && (
                        <div className="text-red-600 dark:text-red-400 font-medium">
                            Error: {currentSession.errorMessage}
                        </div>
                    )}
                </div>

                {/* Status explanation */}
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border-l-2 border-blue-200 dark:border-blue-600">
                    {currentSession.status === 'PREPARING' && (
                        <span>⏳ Your sync request has been received and files are being queued for processing.</span>
                    )}
                    {currentSession.status === 'BDA_PROCESSING' && (
                        <span>🔄 Files are being processed for optimal indexing. This includes OCR for scanned documents and image analysis.</span>
                    )}
                    {currentSession.status === 'INGESTION_STARTED' && (
                        <span>⚡ Files are being indexed into the knowledge base. This process will complete automatically.</span>
                    )}
                    {currentSession.status === 'COMPLETED' && (
                        <span>✅ All files have been successfully processed and indexed into your knowledge base.</span>
                    )}
                    {currentSession.status === 'INGESTION_FAILED' && (
                        <span>❌ The sync process encountered an error. Please try again or contact support.</span>
                    )}
                </div>
            </div>
        );
    };

    // Render legacy sync status (backward compatibility) or preparing state
    const renderLegacyStatus = () => {
        // If we have a session that's in BDA processing phase, show preparing state for legacy section
        if (currentSession && (currentSession.status === 'PREPARING' || currentSession.status === 'BDA_PROCESSING')) {
            return (
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <IconHourglass size={14} className="text-yellow-600 dark:text-yellow-500" />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300">
                            Preparing for Ingestion
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Waiting for file processing to complete before starting ingestion job
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-2 border-yellow-200 dark:border-yellow-600">
                        ⏳ Ingestion will begin automatically once all files are processed and ready
                    </div>
                </div>
            );
        }

        // Show actual legacy status only if there are legacy jobs
        if (!syncStatus || !syncStatus.syncStatuses || Object.keys(syncStatus.syncStatuses).length === 0) {
            return null;
        }

        const syncJobs = Object.values(syncStatus.syncStatuses) as SyncJob[];
        if (syncJobs.length === 0) return null;

        return (
            <div className="space-y-4">
                {syncJobs.map((job, index) => (
                    <div key={job.ingestionJobId || index} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLegacyStatusColor(job.status)}`}>
                                {job.status === 'IN_PROGRESS' || job.status === 'STARTING' ? (
                                    <IconLoader2 className="animate-spin mr-1" size={12} />
                                ) : null}
                                Ingestion: {job.status}
                            </span>
                            {job.statistics && job.statistics.numberOfDocumentsProcessed && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {job.statistics.numberOfDocumentsProcessed} documents processed
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            {job.startedAt && (
                                <span>Started: {new Date(job.startedAt).toLocaleString()}</span>
                            )}
                            {isJobComplete(job.status) && job.updatedAt && (
                                <span className="ml-2">
                                    Completed: {new Date(job.updatedAt).toLocaleString()}
                                </span>
                            )}
                        </div>
                        {job.statistics && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {job.statistics.numberOfNewDocumentsIndexed !== undefined && (
                                    <div>New: {job.statistics.numberOfNewDocumentsIndexed}</div>
                                )}
                                {job.statistics.numberOfModifiedDocumentsIndexed !== undefined && (
                                    <div>Modified: {job.statistics.numberOfModifiedDocumentsIndexed}</div>
                                )}
                                {job.statistics.numberOfDocumentsFailed !== undefined && (
                                    <div>Failed: {job.statistics.numberOfDocumentsFailed}</div>
                                )}
                            </div>
                        )}
                        {index < syncJobs.length - 1 && <hr className="my-2 border-gray-200 dark:border-gray-700" />}
                    </div>
                ))}
            </div>
        );
    };

    // Don't render if no sync information is available
    if (!currentSession && (!syncStatus || !syncStatus.syncStatuses || Object.keys(syncStatus.syncStatuses).length === 0)) {
        return null;
    }

    return (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <IconLoader2 className="mr-2" size={16} />
                Sync Status
            </h4>

            {/* Always show session status if available */}
            {currentSession && renderSessionStatus()}

            {/* Show legacy section */}
            {(currentSession || (syncStatus && Object.keys(syncStatus.syncStatuses || {}).length > 0)) && (
                <div className={`${currentSession ? 'mt-4 pt-4 border-t border-gray-200 dark:border-gray-700' : ''}`}>
                    {/* Show header only when there are actual legacy jobs or when preparing */}
                    {(hasActiveLegacyJobs() || (currentSession && ['PREPARING', 'BDA_PROCESSING'].includes(currentSession.status))) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                            {currentSession && ['PREPARING', 'BDA_PROCESSING'].includes(currentSession.status)
                                ? 'Ingestion Status'
                                : 'Legacy Sync Status'
                            }
                        </div>
                    )}
                    {renderLegacyStatus()}
                </div>
            )}
        </div>
    );
};