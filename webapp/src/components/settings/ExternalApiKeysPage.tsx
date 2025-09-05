'use client'
import { useState } from 'react'
import { useSettingsContext } from '@/providers/SettingsProvider'

export function ExternalApiKeysPage() {
    const [openAIInput, setOpenAIInput] = useState('')
    const [openAIBaseUrl, setOpenAIBaseUrl] = useState('')
    const [groqInput, setGroqInput] = useState('')
    const [sambanovaInput, setSambanovaInput] = useState('')
    const [error, setError] = useState<string | null>(null)

    const {
        settings,
        isLoading,
        updateExternalApiKey,
        removeExternalApiKey
    } = useSettingsContext()

    const maskApiKey = (key: string | undefined) => {
        if (!key) return ''
        if (key.length < 8) return '****' + key
        return '****' + key.slice(-4)
    }

    const handleSaveKey = async (provider: 'openai' | 'groq' | 'sambanova', apiKey: string, baseUrl?: string) => {
        try {
            setError(null)

            if (!apiKey) {
                setError(`Please enter a valid ${provider} API key`)
                return
            }

            if (provider === 'openai') {
                await updateExternalApiKey(provider, apiKey, baseUrl)
                setOpenAIInput('')
                setOpenAIBaseUrl('')
            } else if (provider === 'groq') {
                await updateExternalApiKey(provider, apiKey)
                setGroqInput('')
            } else {
                await updateExternalApiKey(provider, apiKey)
                setSambanovaInput('')
            }

        } catch (err) {
            setError(`Failed to save ${provider} API key`)
        }
    }

    const handleRemoveKey = async (provider: 'openai' | 'groq' | 'sambanova') => {
        try {
            await removeExternalApiKey(provider)
        } catch (err) {
            setError(`Failed to remove ${provider} API key`)
        }
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">External API Keys</h1>

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg p-4">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                {/* OpenAI Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">OpenAI API Key</h3>

                    {settings.externalApiKeys?.openai?.apiKey && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                            <dl className="space-y-1">
                                <div className="flex text-sm">
                                    <dt className="text-gray-500 dark:text-gray-400 w-24">Current Key:</dt>
                                    <dd className="text-gray-900 dark:text-gray-100 font-mono">
                                        {maskApiKey(settings.externalApiKeys.openai.apiKey)}
                                    </dd>
                                </div>
                                {settings.externalApiKeys.openai.baseUrl && (
                                    <div className="flex text-sm">
                                        <dt className="text-gray-500 dark:text-gray-400 w-24">Base URL:</dt>
                                        <dd className="text-gray-900 dark:text-gray-100">
                                            {settings.externalApiKeys.openai.baseUrl}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                API Key
                            </label>
                            <input
                                type="password"
                                placeholder="Enter OpenAI API key"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onChange={(e) => setOpenAIInput(e.target.value)}
                                value={openAIInput}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Base URL (optional)
                            </label>
                            <input
                                type="text"
                                placeholder="Enter Base URL"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onChange={(e) => setOpenAIBaseUrl(e.target.value)}
                                value={openAIBaseUrl}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                  disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
                                onClick={() => handleSaveKey('openai', openAIInput, openAIBaseUrl)}
                                disabled={isLoading || !openAIInput}
                            >
                                Save
                            </button>
                            {settings.externalApiKeys?.openai?.apiKey && (
                                <button
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 
                    disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed transition-colors"
                                    onClick={() => handleRemoveKey('openai')}
                                    disabled={isLoading}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Groq API Key
                        </h3>

                        {settings.externalApiKeys?.groq && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                <dl className="space-y-1">
                                    <div className="flex text-sm">
                                        <dt className="text-gray-500 dark:text-gray-400 w-24">Current Key:</dt>
                                        <dd className="text-gray-900 dark:text-gray-100 font-mono">
                                            {maskApiKey(settings.externalApiKeys.groq)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter Groq API key"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => setGroqInput(e.target.value)}
                                    value={groqInput}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                    disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
                                    onClick={() => handleSaveKey('groq', groqInput)}
                                    disabled={isLoading || !groqInput}
                                >
                                    Save
                                </button>
                                {settings.externalApiKeys?.groq && (
                                    <button
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 
                      disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed transition-colors"
                                        onClick={() => handleRemoveKey('groq')}
                                        disabled={isLoading}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SambaNova Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            SambaNova API Key
                        </h3>

                        {settings.externalApiKeys?.sambanova && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                <dl className="space-y-1">
                                    <div className="flex text-sm">
                                        <dt className="text-gray-500 dark:text-gray-400 w-24">Current Key:</dt>
                                        <dd className="text-gray-900 dark:text-gray-100 font-mono">
                                            {maskApiKey(settings.externalApiKeys.sambanova)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    API Key
                                </label>
                                <input
                                    type="password"
                                    placeholder="Enter SambaNova API key"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => setSambanovaInput(e.target.value)}
                                    value={sambanovaInput}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                    disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
                                    onClick={() => handleSaveKey('sambanova', sambanovaInput)}
                                    disabled={isLoading || !sambanovaInput}
                                >
                                    Save
                                </button>
                                {settings.externalApiKeys?.sambanova && (
                                    <button
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 
                      disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed transition-colors"
                                        onClick={() => handleRemoveKey('sambanova')}
                                        disabled={isLoading}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Security Notice</h4>
                        <dl className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                            <dd>• Your API keys are stored securely in your browser's local storage.</dd>
                            <dd>• We never send your API keys to our servers.</dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    )
}