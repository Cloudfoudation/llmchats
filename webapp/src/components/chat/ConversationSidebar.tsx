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
    IconSettings,
    IconSearch,
    IconX
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
        <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 z-10 border border-gray-200 dark:border-gray-700 min-w-[200px]">
            <p className="text-sm mb-3 text-gray-700 dark:text-gray-300">{tChat('deleteConversation')}</p>
            <div className="flex gap-2">
                <button
                    onClick={onConfirm}
                    className="flex-1 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors"
                >
                    {t('delete')}
                </button>
                <button
                    onClick={onCancel}
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
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
        <aside className="w-full h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
                            <span className="text-white font-bold text-xs">L</span>
                        </div>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">LEGAIA</h2>
                    </div>
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <IconX className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* New Chat Button */}
                <button
                    onClick={createNewConversation}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
                >
                    <IconPlus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Chat</span>
                </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="relative">
                    <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                </div>

                {/* Agent Filter */}
                {agents.length > 0 && (
                    <select
                        value={selectedAgentId || ''}
                        onChange={(e) => setSelectedAgentId(e.target.value || null)}
                        className="w-full mt-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100"
                    >
                        <option value="">All Agents</option>
                        {agents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                                {agent.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading && filteredConversations.length === 0 && (
                    <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
                    </div>
                )}

                <div className="p-2 space-y-1">
                    {filteredConversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                activeConversation?.id === conversation.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                    : ''
                            }`}
                            onClick={() => setActiveConversation(conversation.id)}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    {conversation.type === 'editor' ? (
                                        <IconFileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    ) : (
                                        <IconMessageCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {conversation.title}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {format(conversation.lastEditedAt, 'MMM d, h:mm a')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newTitle = prompt('Enter new title:', conversation.title);
                                            if (newTitle) {
                                                updateConversation({ id: conversation.id, title: newTitle });
                                            }
                                        }}
                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <IconPencil className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletePopupId(conversation.id);
                                        }}
                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <IconTrash className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                    </button>
                                </div>
                            </div>

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
                    ))}
                </div>

                {isLoading && filteredConversations.length > 0 && (
                    <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500 mx-auto mb-1"></div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Loading more...</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
                <button
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                    onClick={() => openKnowledgeBaseManager()}
                >
                    <IconBook2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Knowledge Bases</span>
                </button>

                <button
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                    onClick={handleOpenSettings}
                >
                    <IconSettings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Settings</span>
                </button>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left"
                >
                    <IconLogout className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600 dark:text-red-400">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}