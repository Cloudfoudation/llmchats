// src/components/knowledge/BedrockKnowledgeBaseModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IconX, IconUpload, IconFile, IconSearch, IconChevronLeft, IconChevronRight, IconShare } from '@tabler/icons-react';
import { IconTrash, IconFilter, IconDownload, IconLoader2 } from '@tabler/icons-react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useAuthContext } from '@/providers/AuthProvider';
import { useGroups } from '@/hooks/useGroups';
import { SyncStatusDisplay } from './SyncStatusDisplay';
import { ShareKnowledgeBaseModal } from './ShareKnowledgeBaseModal';
import { KnowledgeBase, KBFile } from '@/types/knowledgeBase';

interface Document {
    id: string;
    name: string;
    path: string;
    size?: number;
    type?: string;
    uploadedAt?: Date;
}

interface BedrockKnowledgeBaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialKnowledgeBase: KnowledgeBase | null;
    hideManager?: boolean;
}

export const BedrockKnowledgeBaseModal: React.FC<BedrockKnowledgeBaseModalProps> = ({
    isOpen,
    onClose,
    initialKnowledgeBase,
    hideManager = true
}) => {
    const [isEditMode, setEditMode] = useState(!!initialKnowledgeBase && !!initialKnowledgeBase.knowledgeBaseId);
    const [isKBCreated, setIsKBCreated] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const {
        createKnowledgeBase,
        uploadFiles,
        deleteFile,
        downloadFile,
        error,
        isLoading,
        isFetching,
        isUploading,
        clearError,
        syncStatuses,
        getSyncStatus,
        startSync,
        listFiles,
        currentSyncSession,
        getSyncSessionStatus
    } = useKnowledgeBase();

    const { groups } = useGroups();

    const [existingDocuments, setExistingDocuments] = useState<Document[]>([]);
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [downloading, setDownloading] = useState<Record<string, boolean>>({});
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortField, setSortField] = useState<'name' | 'size' | 'uploadedAt'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');

    const { user } = useAuthContext();

    const [formData, setFormData] = useState({
        name: initialKnowledgeBase?.name || '',
        description: initialKnowledgeBase?.description || '',
        files: [] as File[],
    });

    const [dragActive, setDragActive] = useState(false);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Check if user can share (has groups)
    const canShare = groups.length > 0;

    // Reset form when modal opens/closes
    useEffect(() => {
        if (initialKnowledgeBase && initialKnowledgeBase.knowledgeBaseId) {
            setFormData(prev => ({
                ...prev,
                name: initialKnowledgeBase.name,
                description: initialKnowledgeBase.description || '',
            }));

            setCurrentFolderId(initialKnowledgeBase.folderId || null);
            setEditMode(!!initialKnowledgeBase && !!initialKnowledgeBase.knowledgeBaseId);
            console.log('Initial Knowledge Base:', initialKnowledgeBase);

            // If KB has a folder ID, fetch documents
            fetchExistingFiles(initialKnowledgeBase.knowledgeBaseId);
        }
    }, [initialKnowledgeBase, isOpen]);

    // Function to fetch existing files
    const fetchExistingFiles = async (knowledgeBaseId: string) => {
        if (!knowledgeBaseId) return;

        try {
            const response = await listFiles(knowledgeBaseId);

            if (response.success && response.data?.files) {
                // Transform to the document format used in the component
                const documents: Document[] = response.data.files.map(file => ({
                    id: file.key,
                    name: file.fileName,
                    path: file.key,
                    size: file.fileSize,
                    type: file.fileType || 'unknown',
                    uploadedAt: new Date(file.lastModified)
                }));

                setExistingDocuments(documents);
                setAllDocuments(documents);
            }
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    // Extract unique file extensions for filter dropdown
    const fileTypes = useMemo(() => {
        const types = new Set<string>();
        allDocuments.forEach(doc => {
            const extension = doc.name.split('.').pop()?.toLowerCase() || '';
            if (extension) types.add(extension);
        });
        return Array.from(types);
    }, [allDocuments]);

    // Filter and sort documents
    const filteredAndSortedDocuments = useMemo(() => {
        return allDocuments
            .filter(doc => {
                const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
                const extension = doc.name.split('.').pop()?.toLowerCase() || '';
                const matchesFileType = fileTypeFilter === 'all' || extension === fileTypeFilter;
                return matchesSearch && matchesFileType;
            })
            .sort((a, b) => {
                if (sortField === 'name') {
                    return sortDirection === 'asc'
                        ? a.name.localeCompare(b.name)
                        : b.name.localeCompare(a.name);
                } else if (sortField === 'size') {
                    const sizeA = a.size || 0;
                    const sizeB = b.size || 0;
                    return sortDirection === 'asc' ? sizeA - sizeB : sizeB - sizeA;
                } else if (sortField === 'uploadedAt') {
                    const dateA = a.uploadedAt ? a.uploadedAt.getTime() : 0;
                    const dateB = b.uploadedAt ? b.uploadedAt.getTime() : 0;
                    return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
                }
                return 0;
            });
    }, [allDocuments, searchTerm, fileTypeFilter, sortField, sortDirection]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredAndSortedDocuments.length / itemsPerPage);
    const paginatedDocuments = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAndSortedDocuments.slice(startIndex, endIndex);
    }, [filteredAndSortedDocuments, currentPage, itemsPerPage]);

    // Handle sort change
    const handleSort = (field: 'name' | 'size' | 'uploadedAt') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, fileTypeFilter]);

    const isInSync = (): boolean => {
        if (initialKnowledgeBase && initialKnowledgeBase.knowledgeBaseId) {
            // Check current sync session first (new coordinated sync)
            const session = currentSyncSession[initialKnowledgeBase.knowledgeBaseId];
            if (session && ['PREPARING', 'BDA_PROCESSING', 'INGESTION_STARTED'].includes(session.status)) {
                return true;
            }

            // Fallback to legacy sync status
            const syncStatus = getSyncStatus(initialKnowledgeBase.knowledgeBaseId);
            if (syncStatus && syncStatus.syncStatuses) {
                const activeJobs = Object.values(syncStatus.syncStatuses).filter(
                    (job: any) => job && (job.status === 'IN_PROGRESS' || job.status === 'STARTING')
                );
                return activeJobs.length > 0;
            }
        }
        return false;
    }

    // Add validation functions
    const isValidName = (name: string): boolean => {
        const namePattern = /^([0-9a-zA-Z][_-]?){1,100}$/;
        return namePattern.test(name);
    };

    const isValidDescription = (description: string): boolean => {
        return description.length >= 1 && description.length <= 200;
    };

    // Add validation state
    const [validationErrors, setValidationErrors] = useState({
        name: '',
        description: ''
    });

    // Update the form handling
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setFormData(prev => ({ ...prev, name: newName }));

        if (!isValidName(newName)) {
            setValidationErrors(prev => ({
                ...prev,
                name: 'Name must contain only alphanumeric characters and optional single hyphens or underscores'
            }));
        } else {
            setValidationErrors(prev => ({ ...prev, name: '' }));
        }
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newDescription = e.target.value;
        setFormData(prev => ({ ...prev, description: newDescription }));

        if (newDescription && !isValidDescription(newDescription)) {
            setValidationErrors(prev => ({
                ...prev,
                description: 'Description must be between 1 and 200 characters'
            }));
        } else {
            setValidationErrors(prev => ({ ...prev, description: '' }));
        }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFormData(prev => ({
                ...prev,
                files: [...prev.files, ...newFiles]
            }));
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const newFiles = Array.from(e.target.files);
            setFormData(prev => ({
                ...prev,
                files: [...prev.files, ...newFiles]
            }));
        }
    }, []);

    const removeFile = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    }, []);

    const handleDownload = async (documentKey: string, filename: string) => {
        if (!initialKnowledgeBase?.knowledgeBaseId) return;

        try {
            setDownloading(prev => ({ ...prev, [documentKey]: true }));
            await downloadFile(initialKnowledgeBase.knowledgeBaseId, documentKey, filename);
        } catch (error) {
            console.error('Download failed for', documentKey, error);
        } finally {
            setDownloading(prev => ({ ...prev, [documentKey]: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValidName(formData.name)) {
            setValidationErrors(prev => ({
                ...prev,
                name: 'Invalid name format'
            }));
            return;
        }

        if (!formData.description || formData.description.trim() === '') {
            setValidationErrors(prev => ({
                ...prev,
                description: 'Description is required and must be between 1 and 200 characters'
            }));
            return;
        }

        if (!isValidDescription(formData.description)) {
            setValidationErrors(prev => ({
                ...prev,
                description: 'Invalid description length'
            }));
            return;
        }

        try {
            if (isEditMode && initialKnowledgeBase && formData.files.length > 0) {
                // For editing, just upload new files to the existing KB
                await uploadFiles(initialKnowledgeBase.knowledgeBaseId, formData.files);
                setFormData(prev => ({ ...prev, files: [] }));

                // Refresh the file list
                fetchExistingFiles(initialKnowledgeBase.knowledgeBaseId);
            } else {
                // For new KB, create it with the initial files
                const newKb = await createKnowledgeBase({
                    name: formData.name,
                    description: formData.description
                });

                // If creation successful and we have files, upload them
                if (newKb && formData.files.length > 0) {
                    await uploadFiles(newKb.knowledgeBaseId, formData.files);
                }
            }

            setIsKBCreated(true);
        } catch (err) {
            console.error('Failed to create/update knowledge base:', err);
        }
    };

    useEffect(() => {
        if (isKBCreated && !isUploading)
            onClose();
    }, [isUploading, isLoading, isKBCreated, onClose]);

    // Function to delete document
    const handleDeleteDocument = async (documentKey: string) => {
        if (!initialKnowledgeBase?.knowledgeBaseId) return;

        setIsDeleting(true);

        try {
            const success = await deleteFile(initialKnowledgeBase.knowledgeBaseId, documentKey);

            if (success) {
                fetchExistingFiles(initialKnowledgeBase.knowledgeBaseId);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Helper function to format file size
    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '-';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    const renderSortIndicator = (field: 'name' | 'size' | 'uploadedAt') => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? ' ▲' : ' ▼';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            {hideManager && <div className="fixed inset-0 bg-black bg-opacity-50" />}
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {isEditMode ? 'Update Knowledge Base' : 'Create New Knowledge Base'}
                            </h3>
                            {isEditMode && canShare && initialKnowledgeBase && (
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 text-sm"
                                    title="Share this knowledge base"
                                >
                                    <IconShare size={16} />
                                    <span>Share</span>
                                </button>
                            )}
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            aria-label="Close"
                        >
                            <IconX size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded">
                            <p>{error.message}</p>
                            <button onClick={clearError} className="text-sm underline mt-2">
                                Dismiss
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-4 mb-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Knowledge Base Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleNameChange}
                                    className={`mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isEditMode ? 'bg-gray-100 dark:bg-gray-600' : ''
                                        } ${validationErrors.name ? 'border-red-500' : ''}`}
                                    placeholder="Enter knowledge base name"
                                    required
                                    readOnly={isEditMode}
                                />
                                {validationErrors.name && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleDescriptionChange}
                                    rows={3}
                                    className={`mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isEditMode ? 'bg-gray-100 dark:bg-gray-600' : ''
                                        } ${validationErrors.description ? 'border-red-500' : ''}`}
                                    placeholder="Enter knowledge base description"
                                />
                                {validationErrors.description && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.description}</p>
                                )}
                            </div>
                        </div>

                        {isEditMode && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                    Existing Documents
                                </h4>

                                {/* Search and Filter Controls */}
                                <div className="flex flex-col md:flex-row gap-3 mb-4">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <IconSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search documents..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="w-full md:w-auto flex gap-3">
                                        <div className="relative flex-1 md:flex-initial">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <IconFilter className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <select
                                                value={fileTypeFilter}
                                                onChange={(e) => setFileTypeFilter(e.target.value)}
                                                className="pl-10 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            >
                                                <option value="all">All file types</option>
                                                {fileTypes.map(type => (
                                                    <option key={type} value={type}>.{type}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                            className="p-2 block rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        >
                                            <option value={5}>5 per page</option>
                                            <option value={10}>10 per page</option>
                                            <option value={25}>25 per page</option>
                                            <option value={50}>50 per page</option>
                                        </select>
                                    </div>
                                </div>

                                {isFetching ? (
                                    <div className="flex items-center justify-center py-8">
                                        <IconLoader2 className="animate-spin h-8 w-8 text-blue-500" />
                                        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading documents...</span>
                                    </div>
                                ) : paginatedDocuments.length > 0 ? (
                                    <div className="border dark:border-gray-600 rounded-lg overflow-hidden">
                                        {/* Desktop view - hidden on mobile */}
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden md:table">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th
                                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[40%] cursor-pointer"
                                                        onClick={() => handleSort('name')}
                                                    >
                                                        Name {renderSortIndicator('name')}
                                                    </th>
                                                    <th
                                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[20%] cursor-pointer"
                                                        onClick={() => handleSort('size')}
                                                    >
                                                        Size {renderSortIndicator('size')}
                                                    </th>
                                                    <th
                                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[30%] cursor-pointer"
                                                        onClick={() => handleSort('uploadedAt')}
                                                    >
                                                        Last Modified {renderSortIndicator('uploadedAt')}
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%]">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {paginatedDocuments.map((doc) => (
                                                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <IconFile size={20} className="text-gray-400 dark:text-gray-500 flex-shrink-0 mr-2" />
                                                                <span className="text-sm text-gray-900 dark:text-gray-100 break-all">
                                                                    {doc.name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {formatFileSize(doc.size)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {doc.uploadedAt ? doc.uploadedAt.toLocaleDateString() : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end space-x-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownload(doc.path, doc.name)}
                                                                    disabled={downloading[doc.path]}
                                                                    className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50"
                                                                    title="Download document"
                                                                >
                                                                    {downloading[doc.path] ? (
                                                                        <IconLoader2 className="animate-spin h-4 w-4" />
                                                                    ) : (
                                                                        <IconDownload size={16} />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                                    disabled={isDeleting}
                                                                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                                                                >
                                                                    <IconTrash size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Mobile view - shown only on mobile */}
                                        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                                            {paginatedDocuments.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="bg-white dark:bg-gray-800 p-4"
                                                    onClick={() => setExpandedRow(expandedRow === doc.id ? null : doc.id)}
                                                >
                                                    <div className="flex items-center justify-between cursor-pointer">
                                                        <div className="flex items-center space-x-2 flex-1">
                                                            <IconFile size={20} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                                            <span className="text-sm text-gray-900 dark:text-gray-100 break-all">
                                                                {doc.name}
                                                            </span>
                                                        </div>
                                                        <button
                                                            className="ml-2 text-gray-400 dark:text-gray-500 focus:outline-none"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedRow(expandedRow === doc.id ? null : doc.id);
                                                            }}
                                                        >
                                                            {expandedRow === doc.id ? (
                                                                <IconX size={16} />
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Expandable content */}
                                                    {expandedRow === doc.id && (
                                                        <div className="mt-3 pl-7 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                                            <div className="flex justify-between items-center">
                                                                <span>Size:</span>
                                                                <span>{formatFileSize(doc.size)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span>Modified:</span>
                                                                <span>{doc.uploadedAt ? doc.uploadedAt.toLocaleDateString() : '-'}</span>
                                                            </div>
                                                            <div className="flex justify-end space-x-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownload(doc.path, doc.name);
                                                                    }}
                                                                    disabled={downloading[doc.path]}
                                                                    className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50 p-2"
                                                                    title="Download document"
                                                                >
                                                                    {downloading[doc.path] ? (
                                                                        <IconLoader2 className="animate-spin h-4 w-4" />
                                                                    ) : (
                                                                        <IconDownload size={16} />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDocument(doc.id);
                                                                    }}
                                                                    disabled={isDeleting}
                                                                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50 p-2"
                                                                >
                                                                    <IconTrash size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination controls */}
                                        <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
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
                                                    disabled={currentPage === totalPages || totalPages === 0}
                                                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${currentPage === totalPages || totalPages === 0
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
                                                        Showing <span className="font-medium">{paginatedDocuments.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedDocuments.length)}</span> of <span className="font-medium">{filteredAndSortedDocuments.length}</span> results
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

                                                        {/* Page numbers */}
                                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                                                            disabled={currentPage === totalPages || totalPages === 0}
                                                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${currentPage === totalPages || totalPages === 0
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
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                        No documents found
                                    </div>
                                )}
                            </div>
                        )}

                        {/* File Upload Area */}
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 ${dragActive
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className="text-center">
                                <IconUpload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                                <div className="mt-2">
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <span className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
                                            Upload files
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400"> or drag and drop</span>
                                        <input
                                            id="file-upload"
                                            type="file"
                                            className="sr-only"
                                            multiple
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* File List */}
                            {formData.files.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Selected Files
                                    </h4>
                                    <ul className="space-y-2">
                                        {formData.files.map((file, index) => (
                                            <li key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                                <div className="flex items-center">
                                                    <IconFile size={20} className="text-gray-400 dark:text-gray-500 mr-2" />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                >
                                                    <IconX size={16} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Add Sync Status Display */}
                        {initialKnowledgeBase?.knowledgeBaseId && (
                            <SyncStatusDisplay
                                knowledgeBaseId={initialKnowledgeBase.knowledgeBaseId}
                            />
                        )}

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                disabled={isLoading || isUploading}
                            >
                                Close
                            </button>
                            <button
                                type="submit"
                                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${isLoading || isUploading || (formData.files.length === 0 && !isEditMode) || isInSync()
                                        ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed'
                                        : 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800'
                                    }`}
                                disabled={isLoading || isUploading || (formData.files.length === 0 && !isEditMode) || isInSync()}
                            >
                                {(isLoading || isUploading || isInSync()) ? (
                                    <span className="flex items-center">
                                        <IconLoader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        {isUploading ? 'Uploading...' : 'Processing...'}
                                    </span>
                                ) : isEditMode ? 'Upload Files' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && initialKnowledgeBase && (
                <ShareKnowledgeBaseModal
                    isOpen={true}
                    onClose={() => setShowShareModal(false)}
                    knowledgeBase={initialKnowledgeBase as any}
                />
            )}
        </div>
    );
};