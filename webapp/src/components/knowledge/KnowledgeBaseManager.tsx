// src/components/knowledge/KnowledgeBaseManager.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useModal } from '@/providers/ModalProvider';
import { useKnowledgeBaseContext } from '@/providers/KnowledgeBaseProvider';
import { useGroups } from '@/hooks/useGroups';
import {
    IconPlus, IconRefresh, IconTrash, IconEdit, IconX, IconLoader2,
    IconAlertCircle, IconSearch, IconFilter, IconChevronLeft, IconChevronRight,
    IconShare, IconUsers, IconDatabase
} from '@tabler/icons-react';
import { KnowledgeBase } from '@/types/knowledgeBase';
import { BedrockKnowledgeBaseModal } from './BedrockKnowledgeBaseModal';
import { ShareKnowledgeBaseModal } from './ShareKnowledgeBaseModal';
import { SyncJob, SyncSessionStatus } from '@/types/knowledgeBase';

// Helper function to format date
const formatDate = (date: string | Date) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(dateObj);
};

type KnowledgeBaseTab = 'owned' | 'shared';

export const KnowledgeBaseManager: React.FC = () => {
    const { closeKnowledgeBaseManager } = useModal();
    const {
        ownedKnowledgeBases,
        sharedKnowledgeBases,
        isLoading,
        isFetching,
        error,
        fetchKnowledgeBases,
        deleteKnowledgeBase,
        syncStatuses,
        currentSyncSession,
        clearError
    } = useKnowledgeBaseContext();

    const { groups } = useGroups();

    const [activeTab, setActiveTab] = useState<KnowledgeBaseTab>('owned');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
    const [isDeletingKB, setIsDeletingKB] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<Error | null>(null);
    const [showShareModal, setShowShareModal] = useState<KnowledgeBase | null>(null);

    // Pagination and filtering state
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchKnowledgeBases();
    }, [fetchKnowledgeBases]);

    // Reset to first page when filters or tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, activeTab]);

    // Get the appropriate knowledge bases based on active tab
    const activeKnowledgeBases = useMemo(() => {
        return activeTab === 'owned' ? ownedKnowledgeBases : sharedKnowledgeBases;
    }, [activeTab, ownedKnowledgeBases, sharedKnowledgeBases]);

    // Get unique statuses for filter dropdown
    const statusOptions = useMemo(() => {
        const statuses = new Set<string>();
        activeKnowledgeBases.forEach(kb => {
            if (kb.status) statuses.add(kb.status);
        });
        return Array.from(statuses);
    }, [activeKnowledgeBases]);

    // Filter knowledge bases
    const filteredKBs = useMemo(() => {
        return activeKnowledgeBases.filter(kb => {
            // Apply search filter
            const matchesSearch = (kb.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (kb.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());

            // Apply status filter
            const matchesStatus = statusFilter === 'all' || kb.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [activeKnowledgeBases, searchTerm, statusFilter]);

    // Calculate pagination
    const totalKBs = filteredKBs.length;
    const totalPages = Math.max(1, Math.ceil(totalKBs / itemsPerPage));

    const paginatedKBs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredKBs.slice(startIndex, endIndex);
    }, [filteredKBs, currentPage, itemsPerPage]);

    const handleDeleteKB = async (knowledgeBaseId: string) => {
        try {
            setIsDeletingKB(knowledgeBaseId);
            setDeleteError(null);
            const result = await deleteKnowledgeBase(knowledgeBaseId);

            if (result) {
                setShowDeleteConfirm(null);
            } else {
                throw new Error('Failed to delete knowledge base');
            }
        } catch (err) {
            setDeleteError(err instanceof Error ? err : new Error('An unknown error occurred'));
        } finally {
            setIsDeletingKB(null);
        }
    };

    const handleEditKB = (kb: KnowledgeBase) => {
        clearError();
        setSelectedKB(kb);
    };

    const handleShareKB = (kb: KnowledgeBase) => {
        setShowShareModal(kb);
    };

    const renderSyncStatus = (kb: KnowledgeBase) => {
        if (!kb.knowledgeBaseId) return null;

        // Check for current sync session first (new coordinated sync)
        const currentSession = currentSyncSession[kb.knowledgeBaseId];
        if (currentSession) {
            const getSessionStatusColor = (status: string) => {
                switch (status) {
                    case 'COMPLETED':
                        return 'bg-green-100 text-green-800';
                    case 'INGESTION_FAILED':
                        return 'bg-red-100 text-red-800';
                    case 'INGESTION_STARTED':
                        return 'bg-blue-100 text-blue-800';
                    default:
                        return 'bg-gray-100 text-gray-800';
                }
            };

            // Only show status if it's related to ingestion (not file processing)
            if (['INGESTION_STARTED', 'COMPLETED', 'INGESTION_FAILED'].includes(currentSession.status)) {
                const isSessionActive = currentSession.status === 'INGESTION_STARTED';
                const statusLabel = currentSession.status === 'INGESTION_STARTED'
                    ? 'Ingesting'
                    : currentSession.status === 'COMPLETED'
                        ? 'Ingestion Complete'
                        : 'Ingestion Failed';

                return (
                    <div className="mt-2">
                        <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSessionStatusColor(currentSession.status)}`}>
                                {isSessionActive && (
                                    <IconLoader2 className="animate-spin mr-1" size={12} />
                                )}
                                {statusLabel}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            <span>Updated: {formatDate(currentSession.updatedAt || currentSession.createdAt)}</span>
                            {currentSession.errorMessage && (
                                <span className="ml-2 text-red-500">Error: {currentSession.errorMessage}</span>
                            )}
                        </div>
                    </div>
                );
            }
        }

        // Fallback to legacy sync status
        const kbSync = syncStatuses[kb.knowledgeBaseId];
        if (!kbSync || !Object.keys(kbSync?.syncStatuses || {}).length) return null;

        // For now, just show the first sync job found
        const syncJob = Object.values(kbSync.syncStatuses)[0] as SyncJob;
        if (!syncJob) return null;

        const getStatusColor = (status: string) => {
            switch (status) {
                case 'COMPLETE':
                    return 'bg-green-100 text-green-800';
                case 'FAILED':
                    return 'bg-red-100 text-red-800';
                case 'IN_PROGRESS':
                case 'STARTING':
                    return 'bg-blue-100 text-blue-800';
                case 'STOPPED':
                    return 'bg-gray-100 text-gray-800';
                default:
                    return 'bg-yellow-100 text-yellow-800';
            }
        };

        const isComplete = syncJob.status === 'COMPLETE' ||
            syncJob.status === 'FAILED' ||
            syncJob.status === 'STOPPED';

        return (
            <div className="mt-2">
                <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(syncJob.status)}`}>
                        {syncJob.status === 'IN_PROGRESS' && (
                            <IconLoader2 className="animate-spin mr-1" size={12} />
                        )}
                        Ingestion: {syncJob.status}
                    </span>
                    {syncJob.statistics && syncJob.statistics.numberOfDocumentsProcessed && syncJob.statistics.numberOfDocumentsProcessed > 0 && (
                        <span className="text-xs text-gray-500">
                            {syncJob.statistics.numberOfDocumentsProcessed} documents
                        </span>
                    )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                    {isComplete && syncJob.updatedAt && (
                        <span>
                            Updated: {formatDate(syncJob.updatedAt)}
                        </span>
                    )}
                </div>
            </div>
        );
    };
    const renderSharingInfo = (kb: KnowledgeBase) => {
        // Only show sharing info for shared knowledge bases
        if (kb.accessType !== 'shared' || !kb.groupId) return null;

        return (
            <div className="mt-2">
                <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <IconUsers size={12} className="mr-1" />
                        Shared via group
                    </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                    {kb.sharedBy && <span>Shared by: {kb.sharedBy}</span>}
                    {kb.sharedAt && <span className="ml-2">on {formatDate(kb.sharedAt)}</span>}
                </div>
            </div>
        );
    };

    const listContainerHeight = Math.max(itemsPerPage * 180, 300);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeKnowledgeBaseManager} />

                <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Knowledge Bases</h3>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    clearError();
                                    fetchKnowledgeBases();
                                }}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                disabled={isLoading || isFetching}
                            >
                                {(isLoading || isFetching) ? (
                                    <IconLoader2 className="animate-spin" size={20} />
                                ) : (
                                    <IconRefresh size={20} />
                                )}
                            </button>
                            <button 
                                onClick={closeKnowledgeBaseManager} 
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                aria-label="Close"
                            >
                                <IconX size={20} />
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md flex items-center">
                            <IconAlertCircle className="mr-2 flex-shrink-0" size={20} />
                            <div>
                                <p className="font-medium">{error.name || 'Error'}</p>
                                <p>{error.message}</p>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                        <button
                            onClick={() => setActiveTab('owned')}
                            className={`px-4 py-2 border-b-2 ${activeTab === 'owned'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <span className="flex items-center">
                                <IconDatabase size={16} className="mr-1" />
                                My Knowledge Bases ({ownedKnowledgeBases.length})
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('shared')}
                            className={`px-4 py-2 border-b-2 ml-4 ${activeTab === 'shared'
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <span className="flex items-center">
                                <IconUsers size={16} className="mr-1" />
                                Shared with Me ({sharedKnowledgeBases.length})
                            </span>
                        </button>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="flex flex-col lg:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search knowledge bases..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1 sm:flex-initial min-w-[150px]">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <IconFilter className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-10 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                >
                                    <option value="all">All statuses</option>
                                    {statusOptions.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="p-2 block rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm min-w-[120px]"
                            >
                                <option value={5}>5 per page</option>
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                            </select>
                        </div>
                    </div>

                    {/* Knowledge Base List */}
                    <div
                        className="mt-4 space-y-4 overflow-y-auto"
                        style={{
                            minHeight: `${Math.min(listContainerHeight, 600)}px`,
                            maxHeight: `${Math.min(listContainerHeight, 600)}px`
                        }}
                    >
                        {(isLoading || isFetching) && activeKnowledgeBases.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8">
                                <IconLoader2 className="animate-spin mb-2" size={24} />
                                <p className="text-gray-600 dark:text-gray-400">Loading knowledge bases...</p>
                            </div>
                        ) : paginatedKBs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                <p className="text-gray-500 dark:text-gray-400 mb-2">No knowledge bases found</p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm">
                                    {searchTerm || statusFilter !== 'all'
                                        ? "Try adjusting your search filters"
                                        : activeTab === 'shared'
                                            ? "No knowledge bases have been shared with you"
                                            : "Create your first knowledge base to get started"}
                                </p>
                            </div>
                        ) : (
                            paginatedKBs.map((kb) => (
                                <div
                                    key={kb.knowledgeBaseId}
                                    className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <h4 className="font-medium truncate text-gray-900 dark:text-gray-100">{kb.name}</h4>
                                            {kb.accessType === 'shared' && (
                                                <IconUsers size={16} className="text-blue-500 dark:text-blue-400 flex-shrink-0" title="Shared knowledge base" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md mb-2">
                                            {kb.description || '-'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${kb.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                                                    kb.status === 'CREATING' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                                                        'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                                                }`}>
                                                {kb.status}
                                            </span>
                                        </div>
                                        {renderSyncStatus(kb)}
                                        {renderSharingInfo(kb)}
                                    </div>
                                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 ml-4 flex-shrink-0">
                                        {kb.accessType === 'owner' && (
                                            <>
                                                <button
                                                    onClick={() => handleShareKB(kb)}
                                                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                    disabled={isDeletingKB === kb.knowledgeBaseId}
                                                    title="Share knowledge base"
                                                >
                                                    <IconShare size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleEditKB(kb)}
                                                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                    disabled={isDeletingKB === kb.knowledgeBaseId}
                                                    title="Edit knowledge base"
                                                >
                                                    <IconEdit size={20} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeleteError(null);
                                                        setShowDeleteConfirm(kb.knowledgeBaseId);
                                                    }}
                                                    disabled={isDeletingKB === kb.knowledgeBaseId}
                                                    className={`p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ${isDeletingKB === kb.knowledgeBaseId ? 'opacity-50 cursor-not-allowed' : ''
                                                        }`}
                                                    title="Delete knowledge base"
                                                >
                                                    {isDeletingKB === kb.knowledgeBaseId ? (
                                                        <IconLoader2 className="animate-spin" size={20} />
                                                    ) : (
                                                        <IconTrash size={20} />
                                                    )}
                                                </button>
                                            </>
                                        )}
                                        {kb.accessType === 'shared' && kb.permissions && (
                                            <>
                                                {kb.permissions.canEdit && (
                                                    <button
                                                        onClick={() => handleEditKB(kb)}
                                                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                        title="Edit shared knowledge base"
                                                    >
                                                        <IconEdit size={20} />
                                                    </button>
                                                )}
                                                {kb.permissions.canShare && (
                                                    <button
                                                        onClick={() => handleShareKB(kb)}
                                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                        title="Share knowledge base"
                                                    >
                                                        <IconShare size={20} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalKBs > itemsPerPage && (
                        <div className="mt-4 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${currentPage === 1
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${currentPage === totalPages
                                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">
                                            {Math.min(currentPage * itemsPerPage, totalKBs)}</span> of <span className="font-medium">{totalKBs}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${currentPage === 1
                                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <span className="sr-only">Previous</span>
                                            <IconChevronLeft className="h-5 w-5" aria-hidden="true" />
                                        </button>

                                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            if (pageNum <= totalPages) {
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                                                                ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-300'
                                                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                            }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })}

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${currentPage === totalPages
                                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <span className="sr-only">Next</span>
                                            <IconChevronRight className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add New Knowledge Base Button - only show in owned tab */}
                    {activeTab === 'owned' && (
                        <button
                            onClick={() => {
                                clearError();
                                setShowCreateModal(true);
                            }}
                            className="w-full mt-4 py-3 flex items-center justify-center space-x-2 
                            text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-300 dark:border-blue-600
                            rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            disabled={isLoading}
                        >
                            <IconPlus size={20} />
                            <span>Add New Knowledge Base</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || selectedKB) && (
                <BedrockKnowledgeBaseModal
                    isOpen={true}
                    onClose={() => {
                        setShowCreateModal(false);
                        setSelectedKB(null);
                    }}
                    initialKnowledgeBase={selectedKB}
                />
            )}

            {/* Share Modal */}
            {showShareModal && (
                <ShareKnowledgeBaseModal
                    isOpen={true}
                    onClose={() => setShowShareModal(null)}
                    knowledgeBase={showShareModal as any}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50"
                            onClick={() => !isDeletingKB && setShowDeleteConfirm(null)}
                        />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
                            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Confirm Delete</h3>

                            {deleteError && (
                                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">
                                    <div className="font-medium">{deleteError.name || 'Error'}</div>
                                    {deleteError.message}
                                </div>
                            )}

                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Are you sure you want to delete this knowledge base?
                                This action cannot be undone and will also remove it from any groups it's shared with.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setDeleteError(null);
                                        setShowDeleteConfirm(null);
                                    }}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    disabled={isDeletingKB !== null}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteKB(showDeleteConfirm)}
                                    disabled={isDeletingKB !== null}
                                    className={`px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-800 
                                    ${isDeletingKB !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isDeletingKB !== null ? (
                                        <div className="flex items-center">
                                            <IconLoader2 className="animate-spin mr-2" size={16} />
                                            Deleting...
                                        </div>
                                    ) : (
                                        'Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};