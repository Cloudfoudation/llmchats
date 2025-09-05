// src/components/apikeys/NewKeyModal.tsx
import { ApiKey } from '@/types/api';
import { useState } from 'react';

interface NewKeyModalProps {
    apiKey: ApiKey | null;
    isOpen: boolean;
    onClose: () => void;
}

export function NewKeyModal({ apiKey, isOpen, onClose }: NewKeyModalProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !apiKey) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(apiKey.apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <div>
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                            <svg
                                className="h-6 w-6 text-green-600 dark:text-green-400"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <div className="mt-3 text-center sm:mt-5">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                                API Key Created Successfully
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Please copy your API key now. You won't be able to see it again!
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 sm:mt-6">
                        <div className="flex flex-col space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-600">
                                <div className="flex flex-col space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                    <p className="text-gray-900 dark:text-gray-100">{apiKey.name}</p>
                                </div>
                                <div className="flex flex-col space-y-2 mt-4">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                                    <div className="flex items-center space-x-2">
                                        <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm break-all text-gray-900 dark:text-gray-100">
                                            {apiKey.apiKey}
                                        </code>
                                        <button
                                            onClick={handleCopy}
                                            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                            title="Copy to clipboard"
                                        >
                                            {copied ? (
                                                <svg className="h-5 w-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2 mt-4">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expires</label>
                                    <p className="text-gray-900 dark:text-gray-100">
                                        {new Date(apiKey.expiresAt * 1000).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 sm:text-sm transition-colors"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}