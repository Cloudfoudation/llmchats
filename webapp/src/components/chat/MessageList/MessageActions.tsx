// src/components/MessageList/MessageActions.tsx
import React from 'react';
import { IconRefresh, IconTrash } from '@tabler/icons-react';

export const MessageActions: React.FC<{
    isConversationEmpty: boolean;
    onRetry: () => void;
    onDelete: () => void;
}> = ({ isConversationEmpty, onRetry, onDelete }) => {

    if (isConversationEmpty) return null;

    return (
        <div className="flex justify-end space-x-2 mt-2 mb-4">
            <button
                onClick={onRetry}
                className="p-3 sm:p-2 text-gray-500 dark:text-gray-400 
                         hover:text-gray-700 dark:hover:text-gray-200 
                         rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 
                         transition-colors touch-action-manipulation"
                title="Retry last message"
            >
                <IconRefresh size={20} />
            </button>
            <button
                onClick={onDelete}
                className="p-2 text-gray-500 dark:text-gray-400 
                         hover:text-red-600 dark:hover:text-red-400 
                         rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 
                         transition-colors"
                title="Delete last exchange"
            >
                <IconTrash size={20} />
            </button>
        </div>
    );
};