// src/components/MessageList/MessageList.tsx
import React, { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { CategoryType, ModelOption } from '@/types/models';
import { useConversationContext } from '@/providers/ConversationProvider';
import { ImageViewer } from '../../ImageViewer';
import { MessageContent } from './MessageContent';
import { MessageActions } from './MessageActions';
import { LoadingState } from './LoadingState';

interface MessageListProps {
    streamingContent: string;
    isLoading: boolean;
    selectedModel: ModelOption | undefined;
    onRetry?: () => void;
}

interface ExpandedImagesState {
    images: string[];
    currentIndex: number;
}

export const MessageList: React.FC<MessageListProps> = ({
    streamingContent,
    isLoading,
    selectedModel,
    onRetry
}) => {
    const { activeConversation, deleteLastMessage } = useConversationContext();
    const [expandedImages, setExpandedImages] = useState<ExpandedImagesState | null>(null);

    // Image viewer handlers
    const handleImageClick = useCallback((images: string[], startIndex: number) => {
        setExpandedImages({ images, currentIndex: startIndex });
    }, []);

    const handleCloseViewer = useCallback(() => {
        setExpandedImages(null);
    }, []);

    const handleImageNavigation = useCallback((direction: 'next' | 'previous') => {
        setExpandedImages((prev) => {
            if (!prev) return null;
            const newIndex = direction === 'next'
                ? Math.min(prev.currentIndex + 1, prev.images.length - 1)
                : Math.max(prev.currentIndex - 1, 0);
            return { ...prev, currentIndex: newIndex };
        });
    }, []);

    // Conversation handlers
    const isCurrentConversationEmpty = useCallback((): boolean => {
        if (!activeConversation) return true;
        return !activeConversation || activeConversation.messages.length === 0;

    }, [activeConversation]);

    const handleDelete = useCallback(() => {
        if (!activeConversation) return;

        deleteLastMessage(activeConversation.id);
    }, [activeConversation, deleteLastMessage]);

    const handleRetry = useCallback(() => {
        onRetry?.();
    }, [onRetry]);

    // Render message components
    const renderMessage = useCallback((message: Message, index: number) => {
        const messageClass = message.role === 'user'
            ? 'message message-user bg-blue-500 text-white rounded-lg p-4 ml-auto max-w-[80%] shadow-sm'
            : 'message message-assistant bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 w-[calc(100%-1rem)]';

        return (
            <div key={`${index}-${message.role}`} className="mb-4">
                <div className={messageClass}>
                    <MessageContent
                        message={message}
                        onImageClick={handleImageClick}
                    />
                </div>
            </div>
        );
    }, [handleImageClick]);

    return (
        // Add pb-32 to account for the floating chat input
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {/* Add mb-32 to ensure last message is visible above chat input */}
            <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 mb-48">
                {/* Messages */}
                {activeConversation && activeConversation.messages.map((message, index) => renderMessage(message, index))}

                {/* Image Viewer */}
                {expandedImages && (
                    <ImageViewer
                        images={expandedImages.images}
                        currentIndex={expandedImages.currentIndex}
                        onClose={handleCloseViewer}
                        onNext={() => handleImageNavigation('next')}
                        onPrevious={() => handleImageNavigation('previous')}
                    />
                )}

                {/* Streaming Content */}
                {streamingContent && activeConversation && (
                    <div className="mb-4 animate-fade-in">
                        {renderMessage({
                            role: 'assistant',
                            content: streamingContent,
                            type: 'chat'
                        }, activeConversation.messages.length)}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !streamingContent && selectedModel && (
                    <LoadingState isImageGeneration={selectedModel?.category.includes(CategoryType.Image)} />
                )}

                {/* Message Actions */}
                <MessageActions
                    isConversationEmpty={isCurrentConversationEmpty()}
                    onRetry={handleRetry}
                    onDelete={handleDelete}
                />
            </div>
        </div>
    );
};