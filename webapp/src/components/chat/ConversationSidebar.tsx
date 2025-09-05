'use client'
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useConversationContext } from '@/providers/ConversationProvider';
import { useModal } from '@/providers/ModalProvider';
import { useAgentsContext } from '@/providers/AgentsProvider';
import {
    IconPlus,
    IconMessageCircle,
    IconFileText,
    IconPencil,
    IconTrash,
    IconBook2,
    IconLogout,
    IconSettings
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface SidebarProps {
    isSidebarVisible: boolean;
    toggleSidebar: () => void;
    setShowAgentManager: (show: boolean) => void;
}

interface DeletePopupProps {
    onConfirm: (e: any) => void;
    onCancel: () => void;
}

// Create a DeletePopup component
const DeletePopup = ({ onConfirm, onCancel }: DeletePopupProps) => {
    const t = useTranslations('common');
    const tChat = useTranslations('chat');
    
    return (
        <div className="absolute right-0 mt-1 bg-gray-700 dark:bg-gray-800 rounded-md shadow-lg p-2 z-10 border border-gray-600 dark:border-gray-500">
            <p className="text-sm mb-2 text-gray-200 dark:text-gray-100">{tChat('deleteConversation')}</p>
            <div className="flex space-x-2">
                <button
                    onClick={onConfirm}
                    className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded text-white"
                >
                    {t('delete')}
                </button>
                <button
                    onClick={onCancel}
                    className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-white"
                >
                    {t('cancel')}
                </button>
            </div>
        </div>
    );
};

export function Sidebar({
    isSidebarVisible,
    toggleSidebar,
    setShowAgentManager
}: SidebarProps) {
    const t = useTranslations('common');
    const tChat = useTranslations('chat');
    const tNav = useTranslations('navigation');
    const [deletePopupId, setDeletePopupId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const { logout } = useAuthContext();
    const {
        activeConversation,
        conversations,
        createNewConversation,
        deleteConversation,
        setActiveConversation,
        updateConversation,
        isLoading, // Use the loading state from your conversation context
    } = useConversationContext();
    const { openKnowledgeBaseManager, openSettings } = useModal();

    const { agents } = useAgentsContext();
    const router = useRouter();

    const filteredConversations = useMemo(() => {
        let filtered = conversations;

        // Filter by agent if selected
        if (selectedAgentId) {
            filtered = filtered.filter(conv => conv.agentId === selectedAgentId);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(conv =>
                conv.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [conversations, searchQuery, selectedAgentId]);

    const handleChanRoblesKB = () => {
        router.push('/kbbuild');
    };

    const handleOpenSettings = () => {
        router.push('/settings');
    };

    return (
        <aside className="w-80 bg-gray-800 dark:bg-gray-900 text-white flex flex-col h-full border-r border-gray-700 dark:border-gray-600">
            {/* Header with Title and Toggle */}
            <div className="p-4 border-b border-gray-700 dark:border-gray-600 flex justify-between items-center">
                <h1 className="text-xl font-bold text-white">Bedrock Chat</h1>
                <div className="flex items-center">
                    <button
                        onClick={createNewConversation}
                        className="hidden lg:flex items-center p-2 hover:bg-gray-700 dark:hover:bg-gray-800 rounded-md text-gray-200 hover:text-white"
                        title={tChat('newConversation')}
                    >
                        <IconMessageCircle className="h-5 w-5 mr-1" />
                        <span>{tNav('chat')}</span>
                    </button>

                    {/* Mobile toggle button */}
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden p-2 hover:bg-gray-700 dark:hover:bg-gray-800 rounded-md text-gray-200 hover:text-white"
                        aria-label={t('close')}
                    >
                        <IconPlus className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Search Box */}
            <div className="p-4">
                <input
                    type="text"
                    placeholder={tChat('searchConversations')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-700 dark:bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 border border-gray-600 dark:border-gray-500 placeholder-gray-400"
                />
            </div>

            {/* Agent Filter Dropdown */}
            <div className="px-4 pb-2">
                <select
                    value={selectedAgentId || ''}
                    onChange={(e) => setSelectedAgentId(e.target.value || null)}
                    className="w-full bg-gray-700 dark:bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 border border-gray-600 dark:border-gray-500"
                >
                    <option value="">{tChat('allAgents')}</option>
                    {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                            {agent.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Conversations List with loading indicator */}
            <div className="flex-1 overflow-y-auto">
                {isLoading && filteredConversations.length === 0 && (
                    <div className="p-4 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                        {t('loading')}
                    </div>
                )}

                <div className="space-y-1 p-2">
                    {filteredConversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={`group p-2 rounded-lg cursor-pointer transition-colors duration-150 relative
                                ${activeConversation?.id === conversation.id
                                    ? 'bg-gray-600 dark:bg-gray-700'
                                    : 'hover:bg-gray-700 dark:hover:bg-gray-800'}`}
                            onClick={() => setActiveConversation(conversation.id)}
                        >
                            <div className="flex flex-col">
                                {/* Title row with type-specific icon */}
                                <div className="flex items-center space-x-2">
                                    {conversation.type === 'editor' ? (
                                        <IconFileText className="h-4 w-4 flex-shrink-0 text-gray-300" />
                                    ) : (
                                        <IconMessageCircle className="h-4 w-4 flex-shrink-0 text-gray-300" />
                                    )}
                                    <p className="truncate text-sm flex-grow text-gray-100">{conversation.title}</p>
                                </div>

                                {/* Date and actions row */}
                                <div className="flex items-center justify-between mt-1 text-xs text-gray-400 dark:text-gray-500">
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        {format(conversation.lastEditedAt, 'MMM d, yyyy h:mm a')}
                                    </span>

                                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newTitle = prompt('Enter new title:', conversation.title);
                                                if (newTitle) {
                                                    updateConversation({ id: conversation.id, title: newTitle });
                                                }
                                            }}
                                            className="p-1 hover:bg-gray-500 dark:hover:bg-gray-600 rounded text-gray-300 hover:text-white"
                                        >
                                            <IconPencil className="h-3 w-3" />
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletePopupId(conversation.id);
                                            }}
                                            className="p-1 hover:bg-gray-500 dark:hover:bg-gray-600 rounded text-gray-300 hover:text-white"
                                        >
                                            <IconTrash className="h-3 w-3" />
                                        </button>

                                        {deletePopupId === conversation.id && (
                                            <DeletePopup
                                                onConfirm={(e) => {
                                                    e.stopPropagation();
                                                    deleteConversation(conversation.id);
                                                    setDeletePopupId(null);
                                                }}
                                                onCancel={() => setDeletePopupId(null)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Show loading indicator when more conversations are being loaded */}
                {isLoading && filteredConversations.length > 0 && (
                    <div className="p-2 text-center text-gray-400 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mb-1"></div>
                        Loading more conversations...
                    </div>
                )}
            </div>

            {/* Settings Section */}
            <div className="p-4 border-t border-gray-700 dark:border-gray-600 space-y-2">
                <button
                    className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800 flex items-center text-gray-200 hover:text-white"
                    onClick={() => openKnowledgeBaseManager()}
                >
                    <IconBook2 className="h-5 w-5 mr-2" />
                    Knowledge Bases
                </button>

                {/* Show Settings button only for premium users */}
                <button
                    className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800 flex items-center text-gray-200 hover:text-white"
                    onClick={handleOpenSettings}
                >
                    <IconSettings className="h-5 w-5 mr-2" />
                    Settings
                </button>

                <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-gray-800 flex items-center text-red-400 hover:text-red-300"
                >
                    <IconLogout className="h-5 w-5 mr-2" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}