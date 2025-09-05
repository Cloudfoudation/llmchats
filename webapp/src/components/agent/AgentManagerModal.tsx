// src/components/AgentManagerModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Agent } from '@/types/agent';
import {
    IconX,
    IconEdit,
    IconTrash,
    IconPlus,
    IconSearch,
    IconChevronLeft,
    IconChevronRight,
    IconShare,
    IconUsers,
    IconEye
} from '@tabler/icons-react';
import { AgentConfigModal } from './AgentConfigModal';
import { ShareAgentModal } from './ShareAgentModal';
import { useAgentsContext } from '@/providers/AgentsProvider';
import { useGroups } from '@/hooks/useGroups';
import { useSharedResources } from '@/hooks/useSharedResources';

interface AgentManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AgentViewMode = 'my-agents' | 'shared-agents';

export const AgentManagerModal: React.FC<AgentManagerModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { agents, deleteAgent, saveAgent, getCustomAgents, getBedrockAgents } = useAgentsContext();
    const { groups } = useGroups();
    const { agents: sharedAgents, getGroupSharedResources } = useSharedResources();

    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [viewMode, setViewMode] = useState<AgentViewMode>('my-agents');

    // Pagination and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Get agents based on view mode
    const displayAgents = useMemo(() => {
        if (viewMode === 'my-agents') {
            // Only show custom agents that are owned by the user (not shared)
            return getCustomAgents().filter(agent => agent.isOwner !== false);
        } else {
            // Show shared agents from all groups
            console.log(sharedAgents)
            return sharedAgents.map(sharedAgent => {
                // Find the original agent if it exists in our agents list
                const matchingAgent = agents.find(a => a.id === sharedAgent.id);
                return {
                    ...matchingAgent, // Use base agent data if available
                    ...sharedAgent,    // Override with shared agent properties
                    isOwner: false,
                    sharedBy: sharedAgent.createdBy,
                    groupName: sharedAgent.group.groupName,
                    permissions: sharedAgent.permissions
                };
            });
        }
    }, [viewMode, getCustomAgents, agents, sharedAgents]);

    // Filter agents by search term
    const filteredAgents = useMemo(() => {
        return displayAgents.filter(agent => {
            const matchesSearch = (agent.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (agent.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());

            if (viewMode === 'shared-agents') {
                // For shared agents, also search by group name
                return matchesSearch ||
                    ((agent as any).groupName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            }

            return matchesSearch;
        });
    }, [displayAgents, searchTerm, viewMode]);

    // Calculate pagination
    const totalAgents = filteredAgents.length;
    const totalPages = Math.max(1, Math.ceil(totalAgents / itemsPerPage));

    // Reset to first page when search term or view mode changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, viewMode]);

    const paginatedAgents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAgents.slice(startIndex, endIndex);
    }, [filteredAgents, currentPage, itemsPerPage]);

    const handleSaveAgent = async (agent: Agent) => {
        await saveAgent(agent);
        setShowConfigModal(false);
        setSelectedAgent(null);
    };

    const handleDeleteAgent = async (agent: Agent) => {
        if (confirm('Are you sure you want to delete this agent?')) {
            await deleteAgent(agent);
        }
    };

    const handleShareAgent = (agent: Agent) => {
        setSelectedAgent(agent);
        setShowShareModal(true);
    };

    const getAgentTypeLabel = (agent: any) => {
        // First check if it's a shared agent
        if (viewMode === 'shared-agents' || agent.isOwner === false) {
            return (
                <div className="flex items-center space-x-1">
                    <IconUsers size={14} className="text-blue-500 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                        Shared from {agent.groupName || agent.sharedVia || 'a group'}
                        {agent.sharedBy ? ` by ${agent.sharedBy}` : ''}
                    </span>
                </div>
            );
        }

        if (agent.type === 'bedrock') {
            return (
                <div className="flex items-center space-x-1">
                    <IconEye size={14} className="text-orange-500 dark:text-orange-400" />
                    <span className="text-xs text-orange-600 dark:text-orange-400">Bedrock Agent</span>
                </div>
            );
        }

        return (
            <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Custom Agent</span>
            </div>
        );
    };

    const canEditAgent = (agent: any) => {
        if (viewMode === 'shared-agents') {
            return agent.permissions?.canEdit === true;
        }
        return agent.type !== 'bedrock'; // Can edit custom agents
    };

    const canDeleteAgent = (agent: any) => {
        if (viewMode === 'shared-agents') {
            return agent.permissions?.canDelete === true;
        }
        return agent.type !== 'bedrock'; // Can delete custom agents
    };

    const canShareAgent = (agent: any) => {
        return viewMode === 'my-agents' && agent.type !== 'bedrock' && groups.length > 0;
    };

    if (!isOpen) return null;

    const listContainerHeight = itemsPerPage * 150;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

                <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Agent Manager</h3>
                        <button 
                            onClick={onClose} 
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            aria-label="Close"
                        >
                            <IconX size={20} />
                        </button>
                    </div>

                    {/* View Mode Tabs */}
                    <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('my-agents')}
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${viewMode === 'my-agents'
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            My Agents ({getCustomAgents().filter(agent => agent.isOwner !== false).length})
                        </button>
                        <button
                            onClick={() => setViewMode('shared-agents')}
                            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${viewMode === 'shared-agents'
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Shared Agents ({sharedAgents.length})
                        </button>
                    </div>

                    {/* Search and Pagination Controls */}
                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IconSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder={viewMode === 'my-agents' ? "Search your agents..." : "Search shared agents..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>
                        <div className="w-full md:w-auto">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value={5}>5 per page</option>
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                            </select>
                        </div>
                    </div>

                    {/* Agent List - Fixed height container */}
                    <div
                        className="mt-4 space-y-4 overflow-y-auto"
                        style={{
                            minHeight: `${Math.min(listContainerHeight, 450)}px`,
                            maxHeight: `${Math.min(listContainerHeight, 450)}px`
                        }}
                    >
                        {paginatedAgents.length > 0 ? (
                            paginatedAgents.map((agent: any) => (
                                <div
                                    key={`${agent.id}-${agent.userId || ''}`}
                                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{agent.name || "Unnamed Agent"}</h4>
                                            {getAgentTypeLabel(agent)}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md mb-2">
                                            {agent.description || "No description provided"}
                                        </p>
                                        {viewMode === 'shared-agents' && (
                                            <div className="flex items-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
                                                <span>Shared by: {agent.sharedBy || "Unknown"}</span>
                                                <span>Group: {agent.groupName || agent.sharedVia || "Unknown group"}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        {canShareAgent(agent) && (
                                            <button
                                                onClick={() => handleShareAgent(agent)}
                                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                title="Share agent"
                                            >
                                                <IconShare size={20} />
                                            </button>
                                        )}
                                        {canEditAgent(agent) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedAgent(agent);
                                                    setShowConfigModal(true);
                                                }}
                                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                                                title="Edit agent"
                                            >
                                                <IconEdit size={20} />
                                            </button>
                                        )}
                                        {canDeleteAgent(agent) && (
                                            <button
                                                onClick={() => handleDeleteAgent(agent)}
                                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                title="Delete agent"
                                            >
                                                <IconTrash size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                                <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                                    {searchTerm ? (
                                        `No ${viewMode === 'my-agents' ? 'personal' : 'shared'} agents found matching your search`
                                    ) : viewMode === 'my-agents' ? (
                                        "No custom agents configured yet"
                                    ) : (
                                        "No shared agents available"
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalAgents > itemsPerPage && (
                        <div className="mt-4 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalAgents)}</span> of{' '}
                                        <span className="font-medium">{totalAgents}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${currentPage === 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                                                            ? 'z-10 bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
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
                                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
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

                    {/* Add New Agent Button - Only show in my-agents view */}
                    {viewMode === 'my-agents' && (
                        <button
                            onClick={() => {
                                setSelectedAgent(null);
                                setShowConfigModal(true);
                            }}
                            className="w-full mt-4 py-3 flex items-center justify-center space-x-2 
                           text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-300 dark:border-blue-600
                           rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                            <IconPlus size={20} />
                            <span>Add New Agent</span>
                        </button>
                    )}

                    {/* Information Notes */}
                    <div className="mt-6 space-y-2">
                        {viewMode === 'my-agents' && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300 rounded-lg">
                                <p>
                                    <strong>Note:</strong> Bedrock agents are managed through the AWS Bedrock console and will appear automatically in the agent selector. You can share custom agents with your groups using the share button.
                                </p>
                            </div>
                        )}
                        {viewMode === 'shared-agents' && sharedAgents.length === 0 && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 rounded-lg">
                                <p>
                                    Shared agents from your groups will appear here. Ask group members to share their agents with the group to see them here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Agent Config Modal */}
            {showConfigModal && (
                <AgentConfigModal
                    isOpen={showConfigModal}
                    onClose={() => {
                        setShowConfigModal(false);
                        setSelectedAgent(null);
                    }}
                    onSave={handleSaveAgent}
                    initialAgent={selectedAgent}
                />
            )}

            {/* Share Agent Modal */}
            {showShareModal && selectedAgent && (
                <ShareAgentModal
                    isOpen={showShareModal}
                    onClose={() => {
                        setShowShareModal(false);
                        setSelectedAgent(null);
                    }}
                    agent={selectedAgent}
                />
            )}
        </div>
    );
};