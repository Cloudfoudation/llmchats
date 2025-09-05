'use client'
import { useState, useEffect } from 'react';
import { useApiKey } from '@/hooks/useApiKey';
import { ApiKey } from '@/types/api';
import { NewKeyModal } from '@/components/apikeys/NewKeyModal';
import { CodeExamples } from '@/components/apikeys/CodeExamples';
import { RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';


export function ApiKeysPage() {
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [expiryDays, setExpiryDays] = useState(30);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const { createApiKey, getApiKeys, deleteApiKey, isLoading, error } = useApiKey();
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
    const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
    const [isCodeExamplesVisible, setIsCodeExamplesVisible] = useState(false);

    const fetchApiKeys = async () => {
        try {
            const response = await getApiKeys();
            setApiKeys(response || []);
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
            setApiKeys([]);
        }
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        setIsCreatingKey(true);
        try {
            const response = await createApiKey({
                name: newKeyName,
                expiryDays: expiryDays
            });

            setNewlyCreatedKey(response);
            setIsNewKeyModalOpen(true);

            setNewKeyName('');
            fetchApiKeys();
        } catch (error) {
            console.error('Failed to create API key:', error);
        } finally {
            setIsCreatingKey(false);
        }
    };

    const handleCloseModal = () => {
        setIsNewKeyModalOpen(false);
        setNewlyCreatedKey(null);
    };

    const handleDeleteKey = async (keyId: string) => {
        if (window.confirm('Are you sure you want to delete this API key?')) {
            try {
                await deleteApiKey(keyId);
                fetchApiKeys();
            } catch (error) {
                console.error('Failed to delete API key:', error);
            }
        }
    };

    const refreshApiKeys = async () => {
        setIsRefreshing(true);
        try {
            await fetchApiKeys();
        } catch (error) {
            console.error('Failed to refresh API keys:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const toggleCodeExamples = () => {
        setIsCodeExamplesVisible(!isCodeExamplesVisible);
    };

    useEffect(() => {
        fetchApiKeys();
    }, []);

    return (
        <div className="space-y-6">
            <form onSubmit={handleCreateKey} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Create New API Key</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="API Key Name"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        />
                    </div>
                    <div className="col-span-1">
                        <input
                            type="number"
                            value={expiryDays}
                            onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                            min="1"
                            max="365"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        />
                    </div>
                    <div className="col-span-1">
                        <button
                            type="submit"
                            disabled={isCreatingKey || !newKeyName.trim()}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 transition-colors"
                        >
                            {isCreatingKey ? 'Creating...' : 'Create API Key'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your API Keys</h2>
                    <button
                        onClick={refreshApiKeys}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 bg-gray-600 dark:bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 transition-colors"
                    >
                        <RefreshCcw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {error && (
                    <div className="p-4 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-b border-gray-200 dark:border-gray-700">
                        <p>{error}</p>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">API Key</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expires</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {apiKeys.length > 0 ? (
                                apiKeys.map((key) => (
                                    <tr key={key.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{key.name}</td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                                            {key.apiKey}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(key.createdAt * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(key.expiresAt * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                            ${key.status === 'active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                {key.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDeleteKey(key.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <p className="text-lg font-medium">No API Keys Found</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                                Create your first API key using the form above
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <button
                    onClick={toggleCodeExamples}
                    className="w-full flex items-center justify-between p-6 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Code Examples
                    </h2>
                    {isCodeExamplesVisible ? (
                        <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCodeExamplesVisible ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                    <div className="p-6">
                        <CodeExamples />
                    </div>
                </div>
            </div>

            <NewKeyModal
                apiKey={newlyCreatedKey}
                isOpen={isNewKeyModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
}