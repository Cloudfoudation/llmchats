// src/components/apikeys/index.tsx
'use client'
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import { useApiKey } from '@/hooks/useApiKey';
import { ApiKey } from '@/types/api';
import { NewKeyModal } from './NewKeyModal';
import { CodeExamples } from './CodeExamples';
import { useTranslations } from 'next-intl';

export function ManageApiKeys() {
    const t = useTranslations('common');
    const tApiKeys = useTranslations('apiKeys');
    const { logout, userAttributes } = useAuthContext();
    const router = useRouter();
    const [isCreatingKey, setIsCreatingKey] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [expiryDays, setExpiryDays] = useState(30);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const { createApiKey, getApiKeys, deleteApiKey, isLoading, error } = useApiKey();
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
    const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);

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

    const handleBack = () => {
        router.push('/');
    };

    useEffect(() => {
        fetchApiKeys();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100">
            <Head>
                <title>Manage API Keys</title>
                <meta name="description" content="Manage your API keys" />
            </Head>

            {/* Header */}
            <header className="bg-white shadow">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                        <button
                            onClick={handleBack}
                            className="w-full md:w-auto bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>{t('previous')}</span>
                        </button>

                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                            {tApiKeys('title')}
                        </h1>

                        <button
                            onClick={logout}
                            className="w-full md:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Create New API Key Form */}
                <form onSubmit={handleCreateKey} className="mb-8 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">{tApiKeys('createKey')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <input
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                placeholder="API Key Name"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="col-span-1">
                            <input
                                type="number"
                                value={expiryDays}
                                onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                                min="1"
                                max="365"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="col-span-1">
                            <button
                                type="submit"
                                disabled={isCreatingKey || !newKeyName.trim()}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
                            >
                                {isCreatingKey ? 'Creating...' : 'Create API Key'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* API Keys List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="flex justify-between items-center p-6 border-b">
                        <h2 className="text-xl font-semibold">{tApiKeys('yourApiKeys')}</h2>
                        <button
                            onClick={refreshApiKeys}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:bg-gray-300"
                        >
                            {isRefreshing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Refreshing...
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                    Refresh
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 text-red-600 bg-red-50">
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {apiKeys.length > 0 ? (
                                    apiKeys.map((key, index) => (
                                        <tr key={key.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-6 py-4 text-sm text-gray-900">{key.name}</td>
                                            <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                                {key.apiKey}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(key.createdAt * 1000).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(key.expiresAt * 1000).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                ${key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {key.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center space-y-3">
                                                <svg
                                                    className="h-12 w-12 text-gray-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                                <p className="text-lg font-medium">No API Keys Found</p>
                                                <p className="text-sm text-gray-400">
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
                {/* Add the CodeExamples component */}
                <CodeExamples />
            </main>
            <NewKeyModal
                apiKey={newlyCreatedKey}
                isOpen={isNewKeyModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
}