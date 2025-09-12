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
        const isUser = message.role === 'user';
        
        return (
            <div key={`${index}-${message.role}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
                <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
                    {/* Avatar */}
                    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            isUser 
                                ? 'bg-blue-500' 
                                : 'bg-gradient-to-br from-purple-500 to-pink-500'
                        }`}>
                            <span className="text-white text-sm font-medium">
                                {isUser ? 'U' : 'L'}
                            </span>
                        </div>
                        
                        {/* Message Bubble */}
                        <div className={`flex-1 ${
                            isUser 
                                ? 'bg-blue-500 text-white rounded-2xl rounded-tr-md' 
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-md border border-gray-200 dark:border-gray-700 shadow-sm'
                        } px-4 py-3`}>
                            <MessageContent
                                message={message}
                                onImageClick={handleImageClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [handleImageClick]);

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
                {/* Messages */}
                {activeConversation && activeConversation.messages.map((message, index) => 
                    renderMessage(message, index)
                )}

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
                    <div className="animate-fade-in">
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