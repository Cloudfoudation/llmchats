// src/components/MessageList/EmptyState.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { IconMessageCircle2 } from '@tabler/icons-react';
import { useConversationContext } from '@/providers/ConversationProvider';
import { getModelById } from '@/utils/models';

interface EmptyStateProps {
    customMessage?: string;
    customSubMessage?: string;
    onPromptSelect?: (prompt: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    customMessage = "Start a new conversation",
    customSubMessage = "Type a message to begin chatting",
    onPromptSelect
}) => {

    const { activeConversation, updateConversation } = useConversationContext();
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    const handlePromptClick = (prompt: string, modelId?: string) => {
        if (onPromptSelect) {
            onPromptSelect(prompt);
        }

        if (modelId) {
            const model = getModelById(modelId);
            if (activeConversation && model) {
                updateConversation({
                    id: activeConversation.id,
                    modelParams: {
                        ...activeConversation.modelParams,
                        modelId: modelId
                    }
                });
            }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center py-12 px-4"
        >
            <motion.div
                variants={itemVariants}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-auto shadow-sm 
                           border border-gray-200 dark:border-gray-700"
            >
                <motion.div
                    variants={itemVariants}
                    className="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"
                >
                    <IconMessageCircle2
                        className="w-8 h-8 text-blue-500 dark:text-blue-400"
                        stroke={1.5}
                    />
                </motion.div>

                <motion.h3
                    variants={itemVariants}
                    className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2"
                >
                    {customMessage}
                </motion.h3>

                <motion.p
                    variants={itemVariants}
                    className="text-gray-500 dark:text-gray-400 mb-6"
                >
                    {customSubMessage}
                </motion.p>

                <motion.div
                    variants={itemVariants}
                    className="mt-6 space-y-2"
                >
                    <SuggestedPrompt
                        text="Tell me a story"
                        onClick={() => handlePromptClick("Tell me a story", "us.anthropic.claude-3-haiku-20240307-v1:0")}
                    />
                    <SuggestedPrompt
                        text="Explain a complex topic"
                        onClick={() => handlePromptClick("Explain a complex topic", "us.anthropic.claude-3-haiku-20240307-v1:0")}
                    />
                    <SuggestedPrompt
                        text="Create an image of a panda"
                        onClick={() => handlePromptClick("Create an image of a panda", "stability.stable-image-core-v1:0")}
                    />
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

interface SuggestedPromptProps {
    text: string;
    onClick?: () => void;
}

const SuggestedPrompt: React.FC<SuggestedPromptProps> = ({ text, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300 
                     bg-gray-50 dark:bg-gray-700/50 rounded-lg
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     border border-gray-200 dark:border-gray-600
                     transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
            {text}
        </button>
    );
};