import { useState, useEffect, useCallback } from 'react';
import { Conversation } from '@/types/chat';
import { useSyncContext } from '@/providers/SyncProvider';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/services/sync/IndexedDBStorage';
import { SyncStatus } from '@/types/sync';
import { useSettingsContext } from '@/providers/SettingsProvider';

interface UseConversationsReturn {
    conversations: Conversation[];
    activeConversation: Conversation | null;
    setActiveLastConversation: () => void;
    isLoading: boolean;
    error: Error | null;
    createNewConversation: () => Promise<void>;
    createNewEditorConversation: () => Promise<void>;
    filterConversationsByAgent: (agentId: string | null) => Conversation[];
    setActiveConversation: (conversationId: string) => Promise<void>;
    updateConversation: (updates: Partial<Conversation>) => Promise<void>;
    deleteConversation: (conversationId: string) => Promise<void>;
    appendMessage: (conversation: Conversation, message: Conversation['messages'][number]) => Promise<void>;
    deleteLastMessage: (conversationId: string) => Promise<void>;
}

interface UseConversationsState {
    conversations: Conversation[];
    activeConversation: Conversation | null;
    isLoading: boolean;
    error: Error | null;
}

const initialState: UseConversationsState = {
    conversations: [],
    activeConversation: null,
    isLoading: true,
    error: null,
};

export function useConversations(): UseConversationsReturn {
    const [state, setState] = useState<UseConversationsState>(initialState);
    const { syncManager } = useSyncContext();
    const { settings } = useSettingsContext();

    const updateState = useCallback((updates: Partial<UseConversationsState>) =>
        setState(prev => ({ ...prev, ...updates })), []);

    const handleError = useCallback((error: unknown, fallbackMessage: string) => {
        const errorObject = error instanceof Error ? error : new Error(fallbackMessage);
        updateState({ error: errorObject });
        console.error(errorObject);
        return errorObject;
    }, [updateState]);

    const loadConversations = useCallback(async () => {
        try {
            updateState({ isLoading: true });
            !storage.isInitialized() && await storage.init();

            const conversations = await storage.getAll<Conversation>(storage.STORE_NAMES.CONVERSATIONS);
            updateState({
                conversations: conversations.sort((a, b) => b.lastEditedAt - a.lastEditedAt),
                isLoading: false
            });
        } catch (err) {
            throw handleError(err, 'Failed to load conversations');
        }
    }, [updateState, handleError]);

    const filterConversationsByAgent = (agentId: string | null) => {
        if (!agentId) return state.conversations;
        return state.conversations.filter(conv => conv.agentId === agentId);
    };

    const createNewConversation = async () => {
        const newConversation: Conversation = {
            id: uuidv4(),
            title: 'New Chat',
            messages: [],
            createdAt: Date.now(),
            lastEditedAt: Date.now(),
            version: 1,
            modelParams: settings.defaultModelParams,
            agentId: null,
            // Initialize Bedrock agent fields with default values
            isBedrockAgent: false,
            bedrockAgentId: undefined,
            bedrockAgentAliasId: undefined
        };

        try {
            updateState({                
                conversations: [newConversation, ...state.conversations],
                activeConversation: newConversation
            });
            sessionStorage.setItem('currentConversationId', newConversation.id);
            await storage.set(storage.STORE_NAMES.CONVERSATIONS, newConversation.id, newConversation);
            syncManager?.sync(newConversation, 'CREATE');
        } catch (err) {
            await loadConversations();
            throw handleError(err, 'Failed to create conversation');
        }
    };

    const createNewEditorConversation = async () => {
        const newConversation: Conversation = {
            id: uuidv4(),
            title: 'New Document',
            messages: [],
            createdAt: Date.now(),
            lastEditedAt: Date.now(),
            version: 1,
            modelParams: settings.defaultModelParams,
            agentId: null,
            type: 'editor', // Specify type as editor
            editorState: {
                lastSavedAt: Date.now(),
                lastContent: {
                    json: {}, // Empty initial JSON content
                    html: '',
                    markdown: ''
                },
                wordCount: 0
            },
            // Initialize Bedrock agent fields
            isBedrockAgent: false,
            bedrockAgentId: undefined,
            bedrockAgentAliasId: undefined
        };

        try {
            updateState({                
                conversations: [newConversation, ...state.conversations],
                activeConversation: newConversation
            });
            sessionStorage.setItem('currentConversationId', newConversation.id);
            await storage.set(storage.STORE_NAMES.CONVERSATIONS, newConversation.id, newConversation);
            syncManager?.sync(newConversation, 'CREATE');
        } catch (err) {
            await loadConversations();
            throw handleError(err, 'Failed to create editor conversation');
        }
    };

    const deleteLastMessage = async (conversationId: string) => {
        try {
            const conversation = await storage.get<Conversation>(
                storage.STORE_NAMES.CONVERSATIONS,
                conversationId
            );

            if (!conversation) return;

            const messages = [...conversation.messages];
            
            // Handle document attachments in message metadata when removing messages
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                
                if (lastMessage?.role === 'assistant') {
                    messages.pop(); // Remove assistant message
                    
                    // If there's a user message paired with this assistant message
                    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
                        // Check if the user message has document attachments before removing
                        const userMessage = messages[messages.length - 1];
                        messages.pop(); // Remove user message
                    }
                } else if (lastMessage?.role === 'user') {
                    // Check if the user message has document attachments before removing
                    messages.pop(); // Remove user message
                }
            }

            const updatedConversation: Conversation = {
                ...conversation,
                messages,
                lastEditedAt: Date.now(),
                version: conversation.version + 1
            };

            updateState({
                conversations: state.conversations.map(conv =>
                    conv.id === conversationId ? updatedConversation : conv
                ),
                activeConversation: state.activeConversation?.id === conversationId
                    ? updatedConversation
                    : state.activeConversation
            });

            await storage.set(
                storage.STORE_NAMES.CONVERSATIONS,
                updatedConversation.id,
                updatedConversation
            );

            syncManager?.sync(updatedConversation, 'UPDATE');
        } catch (err) {
            throw handleError(err, 'Failed to delete last message');
        }
    };

    const appendMessage = async (conv: Conversation, message: Conversation['messages'][number]) => {
        try {
            const conversation = await storage.get<Conversation>(
                storage.STORE_NAMES.CONVERSATIONS,
                conv.id
            );

            if (!conversation) return;

            // Ensure message metadata is preserved, especially for document attachments
            // and agent-specific information like agent traces
            const messageToAppend = {
                ...message,
                // Preserve document attachment metadata if it exists
                metadata: message.metadata ? { ...message.metadata } : undefined,
                // Preserve attachments if they exist
                attachments: message.attachments ? [...message.attachments] : undefined
            };

            const updatedConversation: Conversation = {
                ...conversation,
                messages: [...conversation.messages, messageToAppend],
                lastEditedAt: Date.now(),
                version: conversation.version + 1
            };

            updateState({
                conversations: state.conversations.map(conv =>
                    conv.id === conversation.id ? updatedConversation : conv
                ),
                activeConversation: updatedConversation
            });

            await storage.set(
                storage.STORE_NAMES.CONVERSATIONS,
                updatedConversation.id,
                updatedConversation
            );

            syncManager?.sync(updatedConversation, 'UPDATE');
        } catch (err) {
            throw handleError(err, 'Failed to append message');
        }
    };

    const updateConversation = async (updates: Partial<Conversation>) => {
        if (!updates.id) throw new Error('Update id not found');
        try {
            const currentConversation = await storage.get(
                storage.STORE_NAMES.CONVERSATIONS,
                updates.id
            ) as Conversation;

            if (!currentConversation) return;

            // Handle editor-specific updates
            if (currentConversation.type === 'editor' && updates.editorState) {
                updates.lastEditedAt = Date.now();
                if (updates.editorState.lastContent) {
                    updates.editorState.lastSavedAt = Date.now();
                }
            }

            // If updating messages, ensure we properly handle message metadata and attachments
            if (updates.messages) {
                // Deep copy messages to ensure we don't lose metadata or attachments
                updates.messages = updates.messages.map(msg => ({
                    ...msg,
                    metadata: msg.metadata ? { ...msg.metadata } : undefined,
                    attachments: msg.attachments ? [...msg.attachments] : undefined
                }));
            }

            // Handle Bedrock agent updates
            if (updates.agentId !== undefined) {
                // If we're explicitly removing an agent
                if (updates.agentId === null) {
                    updates.isBedrockAgent = false;
                    updates.bedrockAgentId = undefined;
                    updates.bedrockAgentAliasId = undefined;
                }
                // Otherwise, if we need to set Bedrock agent fields, it will be done explicitly
                // in the updates object from the component calling updateConversation
            }

            const updatedConversation = {
                ...currentConversation,
                ...updates,
                version: currentConversation.version + 1,
                lastEditedAt: Date.now()
            };

            updateState({
                conversations: state.conversations.map(conv =>
                    conv.id === updates.id ? updatedConversation : conv
                )
            });

            if (state.activeConversation?.id == updatedConversation.id) {
                updateState({ activeConversation: updatedConversation });
            }

            await storage.set(
                storage.STORE_NAMES.CONVERSATIONS,
                updatedConversation.id,
                updatedConversation
            );

            syncManager?.sync(updatedConversation, 'UPDATE');
        } catch (err) {
            throw handleError(err, 'Failed to update conversation');
        }
    };

    const setActiveConversation = async (conversationId: string) => {
        try {
            const conversation = await storage.get<Conversation>(
                storage.STORE_NAMES.CONVERSATIONS,
                conversationId
            );

            if (conversation && !conversation.modelParams) {
                conversation.modelParams = {
                    modelId: 'us.anthropic.claude-3-haiku-20240307-v1:0',
                    maxTokens: 1024,
                    temperature: 0.5,
                    topP: 0.9,
                    maxTurns: 10,

                    imageSize: '512x512',
                    taskType: 'TEXT_IMAGE',
                    negativePrompt: 'low quality, bad quality, poorly drawn, deformed, blurry, grainy',
                    aspectRatio: '1:1',
                    numImages: 1,
                    stylePreset: 'enhance',
                    cfgScale: 8.0,
                    steps: 50,
                    seed: Math.floor(Math.random() * 2147483647)
                };
            }

            // Ensure Bedrock agent fields are properly initialized
            if (conversation && conversation.isBedrockAgent === undefined) {
                conversation.isBedrockAgent = false;
            }

            updateState({ activeConversation: conversation || null });
            conversation ?
                sessionStorage.setItem('currentConversationId', conversationId) :
                sessionStorage.removeItem('currentConversationId');
        } catch (err) {
            throw handleError(err, 'Failed to set active conversation');
        }
    };

    const setActiveLastConversation = async () => {
        try {
            updateState({ activeConversation: null });
            sessionStorage.removeItem('currentConversationId');
        } catch (err) {
            throw handleError(err, 'Failed to set active last conversation');
        }
    };

    const deleteConversation = async (conversationId: string) => {
        try {
            const conversation = await storage.get<Conversation>(
                storage.STORE_NAMES.CONVERSATIONS,
                conversationId
            );

            if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);

            const remainingConversations = state.conversations
                .filter(conv => conv.id !== conversationId);

            updateState({ conversations: remainingConversations });
            state.activeConversation?.id === conversationId && setActiveLastConversation();

            syncManager?.sync(conversation, 'DELETE');
            await storage.delete(storage.STORE_NAMES.CONVERSATIONS, conversationId);
        } catch (err) {
            await loadConversations();
            throw handleError(err, 'Failed to delete conversation');
        }
    };

    useEffect(() => { loadConversations(); }, [loadConversations]);

    useEffect(() => {
        if (!syncManager) return;
        const unsubscribe = syncManager.subscribe((status) => {
            // Reload conversations on partial sync success and batch progress
            if (status === SyncStatus.INITIAL_SYNC_SUCCESS || 
                status === SyncStatus.PARTIAL_SYNC_SUCCESS ||
                status === SyncStatus.BATCH_SYNC_PROGRESS) {
                loadConversations();
            }
        });
        return () => unsubscribe();
    }, [syncManager, loadConversations]);

    useEffect(() => {
        const activeId = sessionStorage.getItem('currentConversationId');
        activeId && setActiveConversation(activeId);
    }, []);

    return {
        conversations: state.conversations,
        activeConversation: state.activeConversation,
        isLoading: state.isLoading,
        error: state.error,
        filterConversationsByAgent,
        setActiveLastConversation,
        createNewConversation,
        createNewEditorConversation,
        setActiveConversation,
        updateConversation,
        deleteConversation,
        appendMessage,
        deleteLastMessage
    };
}