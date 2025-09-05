// src/components/Modal.tsx
import React, { ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-2xl'
}) => {
    const t = useTranslations('common');
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

                <div className={`relative bg-white dark:bg-gray-900 rounded-lg w-full ${maxWidth} p-6`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium dark:text-white">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            aria-label={t('close')}
                        >
                            <IconX size={20} />
                        </button>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
};