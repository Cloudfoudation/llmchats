// src/components/MessageList/LoadingState.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface LoadingStateProps {
    isImageGeneration: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ isImageGeneration }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center my-4"
        >
            <div className="inline-block p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm 
                            border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    <LoadingDots />
                    <span className="text-gray-700 dark:text-gray-300">
                        {isImageGeneration ? 'Generating image...' : 'Thinking...'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

const LoadingDots: React.FC = () => {
    return (
        <div className="flex space-x-1">
            {[0, 1, 2].map((index) => (
                <motion.div
                    key={index}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: index * 0.2
                    }}
                    className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"
                />
            ))}
        </div>
    );
};