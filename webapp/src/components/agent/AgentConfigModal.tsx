import React, { useState, useEffect, useRef } from 'react';
import { ModelCard } from '@/components/chat/ModelCard';
import { IconCheck, IconX, IconLoader2, IconChevronDown, IconChevronRight, IconShare, IconUsers } from '@tabler/icons-react';
import { getModelById } from '@/utils/models';
import { CategoryType } from '@/types/models';
import { Agent } from '@/types/agent';
import { useKnowledgeBaseContext } from '@/providers/KnowledgeBaseProvider';
import { ParametersPopup } from '@/components/chat/ParametersPopup';
import { useAuthContext } from '@/providers/AuthProvider';
import { useGroups } from '@/hooks/useGroups';

const API_URL = process.env.NEXT_PUBLIC_TELEGRAM_API_URL || 'https://api-dev.llmchats.com';

interface AgentConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (agent: Agent) => void;
    initialAgent: Agent | null;
}

interface TelegramWebhookResponse {
    ok: boolean;
    description?: string;
    result?: boolean;
}

export const AgentConfigModal: React.FC<AgentConfigModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialAgent,
}) => {
    const [agent, setAgent] = useState<Agent>(() => {
        if (initialAgent) {
            return { ...initialAgent };
        }
        return {
            id: crypto.randomUUID(),
            name: '',
            description: '',
            systemPrompt: '',
            telegramToken: '',
            type: 'custom',
            modelParams: {
                modelId: '',
                temperature: 0.7,
                topP: 1,
                maxTokens: 1024,
                maxTurns: 10,
            },
            createdAt: Date.now(),
            lastEditedAt: Date.now(),
            version: 1
        };
    });

    const [showParameters, setShowParameters] = useState(false);
    const paramButtonRef = useRef<HTMLButtonElement>(null);
    const selectedModel = getModelById(agent.modelParams.modelId);
    const { ownedKnowledgeBases, sharedKnowledgeBases } = useKnowledgeBaseContext();
    const { identityId } = useAuthContext();
    const { groups } = useGroups();
    const [isRegistering, setIsRegistering] = useState(false);
    const [webhookStatus, setWebhookStatus] = useState<{
        success?: boolean;
        message?: string;
    }>({});
    const [isTelegramExpanded, setIsTelegramExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        if (initialAgent) {
            setAgent({ ...initialAgent });
        }
    }, [initialAgent]);

    const validateAgent = (agent: Agent): boolean => {
        if (!agent.id || !agent.name || !agent.description || !agent.modelParams || !agent.modelParams.modelId) {
            setValidationError('Missing required Agent fields. Please fill all required fields.');
            return false;
        }

        if (agent.systemPrompt === undefined || agent.systemPrompt.trim() === '') {
            setValidationError('System Prompt is required.');
            return false;
        }

        setValidationError(null);
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateAgent(agent)) {
            return;
        }

        onSave({
            ...agent,
            lastEditedAt: Date.now(),
            version: agent.version + 1
        });
    };

    const handleShareAfterSave = () => {
        if (!validateAgent(agent)) {
            return;
        }

        // Save the agent first
        const updatedAgent = {
            ...agent,
            lastEditedAt: Date.now(),
            version: agent.version + 1
        };

        onSave(updatedAgent);
    };

    const copyWebhookUrl = () => {
        const webhookUrl = `${API_URL}/telegram/${identityId}/${agent.id}`;
        navigator.clipboard.writeText(webhookUrl);
    };

    const renderKnowledgeBaseSelection = () => {
        // Combine owned and shared knowledge bases
        const allKnowledgeBases = [
            ...ownedKnowledgeBases.map(kb => ({ ...kb, isOwned: true })),
            ...sharedKnowledgeBases.map(kb => ({ ...kb, isOwned: false }))
        ];

        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Knowledge Base
                </label>
                <select
                    value={agent.knowledgeBaseId || ''}
                    onChange={(e) => setAgent({
                        ...agent,
                        knowledgeBaseId: e.target.value || undefined
                    })}
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                    <option value="">No Knowledge Base</option>

                    {/* Owned Knowledge Bases */}
                    {ownedKnowledgeBases.length > 0 && (
                        <optgroup label="My Knowledge Bases">
                            {ownedKnowledgeBases.map((kb) => (
                                <option key={kb.knowledgeBaseId} value={kb.knowledgeBaseId}>
                                    {kb.name}
                                </option>
                            ))}
                        </optgroup>
                    )}

                    {/* Shared Knowledge Bases */}
                    {sharedKnowledgeBases.length > 0 && (
                        <optgroup label="Shared with Me">
                            {sharedKnowledgeBases.map((kb) => (
                                <option key={kb.knowledgeBaseId} value={kb.knowledgeBaseId}>
                                    {kb.name} {kb.sharedBy ? `(by ${kb.sharedBy})` : ''}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>

                {/* Show additional info for selected KB */}
                {agent.knowledgeBaseId && (() => {
                    const selectedKB = allKnowledgeBases.find(kb => kb.knowledgeBaseId === agent.knowledgeBaseId);
                    if (selectedKB && !selectedKB.isOwned) {
                        return (
                            <div className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
                                <IconUsers size={14} className="mr-1" />
                                <span>Shared knowledge base</span>
                                {selectedKB.sharedBy && (
                                    <span className="ml-1 text-gray-500 dark:text-gray-400">by {selectedKB.sharedBy}</span>
                                )}
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>
        );
    };

    const registerWebhook = async () => {
        if (!agent.telegramToken) {
            setWebhookStatus({
                success: false,
                message: 'Please enter a Telegram bot token first'
            });
            return;
        }

        setIsRegistering(true);
        setWebhookStatus({});

        try {
            const webhookUrl = `${API_URL}/telegram/${identityId}/${agent.id}`;
            const response = await fetch(
                `https://api.telegram.org/bot${agent.telegramToken}/setWebhook`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: webhookUrl,
                        allowed_updates: ['message']
                    })
                }
            );

            const data: TelegramWebhookResponse = await response.json();

            setWebhookStatus({
                success: data.ok,
                message: data.ok ? 'Webhook registered successfully' : data.description
            });
        } catch (error) {
            setWebhookStatus({
                success: false,
                message: 'Failed to register webhook: ' + (error as Error).message
            });
        } finally {
            setIsRegistering(false);
        }
    };

    const canShare = () => {
        return initialAgent && groups.length > 0 && agent.type === 'custom';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {initialAgent ? 'Edit Agent' : 'Create New Agent'}
                        </h3>
                        <button 
                            onClick={onClose} 
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            aria-label="Close"
                        >
                            <IconX size={20} />
                        </button>
                    </div>

                    {validationError && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-md">
                            <p>{validationError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Basic fields */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Agent Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={agent.name}
                                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                                className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={agent.description}
                                onChange={(e) => setAgent({ ...agent, description: e.target.value })}
                                className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                System Prompt <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={agent.systemPrompt || ''}
                                onChange={(e) => setAgent({ ...agent, systemPrompt: e.target.value })}
                                rows={4}
                                className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="You are a helpful AI assistant"
                                required
                            />
                        </div>

                        {/* Knowledge Base selection for non-image models */}
                        {selectedModel?.category.includes(CategoryType.Image) ? null : renderKnowledgeBaseSelection()}

                        {/* Model Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Model <span className="text-red-500">*</span>
                            </label>
                            <ModelCard
                                selectedModel={agent.modelParams.modelId}
                                onModelSelect={(modelId) =>
                                    setAgent({
                                        ...agent,
                                        modelParams: { ...agent.modelParams, modelId },
                                    })
                                }
                                isOpen={true}
                            />
                        </div>

                        {/* Collapsible Telegram Integration Section */}
                        <div className="border border-gray-200 dark:border-gray-600 rounded-md">
                            <button
                                type="button"
                                className="w-full px-4 py-2 flex items-center justify-between text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                                onClick={() => setIsTelegramExpanded(!isTelegramExpanded)}
                            >
                                <div className="flex items-center">
                                    {isTelegramExpanded ? (
                                        <IconChevronDown className="mr-2" size={20} />
                                    ) : (
                                        <IconChevronRight className="mr-2" size={20} />
                                    )}
                                    <span>Telegram Integration</span>
                                </div>
                                {agent.telegramToken && (
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                                        Configured
                                    </span>
                                )}
                            </button>

                            <div
                                ref={contentRef}
                                style={{
                                    maxHeight: isTelegramExpanded ? contentRef.current?.scrollHeight : 0,
                                    overflow: 'hidden',
                                    transition: 'max-height 0.3s ease-in-out',
                                }}
                            >
                                <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Telegram Bot Token
                                            </label>
                                            <div className="mt-1 flex rounded-md shadow-sm">
                                                <input
                                                    type="text"
                                                    value={agent.telegramToken || ''}
                                                    onChange={(e) => setAgent({ ...agent, telegramToken: e.target.value })}
                                                    placeholder="Enter your Telegram bot token"
                                                    className="flex-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                Get your bot token from @BotFather on Telegram
                                            </p>
                                        </div>

                                        {agent.id && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Webhook Configuration
                                                </label>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={`${API_URL}/telegram/${identityId}/${agent.id}`}
                                                        className="flex-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={copyWebhookUrl}
                                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                                                    >
                                                        Copy
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={registerWebhook}
                                                        disabled={isRegistering || !agent.telegramToken}
                                                        className={`px-4 py-2 text-sm font-medium text-white rounded-md 
                                                        ${isRegistering || !agent.telegramToken
                                                                ? 'bg-gray-400 cursor-not-allowed'
                                                                : 'bg-blue-600 hover:bg-blue-700'}`}
                                                    >
                                                        {isRegistering ? (
                                                            <IconLoader2 className="animate-spin" />
                                                        ) : (
                                                            'Register Webhook'
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Webhook Status Message */}
                                                {webhookStatus.message && (
                                                    <div className={`mt-2 flex items-center space-x-2 text-sm
                                                ${webhookStatus.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {webhookStatus.success ? (
                                                            <IconCheck size={16} />
                                                        ) : (
                                                            <IconX size={16} />
                                                        )}
                                                        <span>{webhookStatus.message}</span>
                                                    </div>
                                                )}

                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Click "Register Webhook" to configure your Telegram bot to use this URL
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Parameters Popup */}
                        {selectedModel && (
                            <ParametersPopup
                                isOpen={showParameters}
                                onClose={() => setShowParameters(false)}
                                modelParams={agent.modelParams}
                                selectedModel={selectedModel}
                                onModelParamsChange={(params) =>
                                    setAgent({
                                        ...agent,
                                        modelParams: params
                                    })
                                }
                                buttonRef={paramButtonRef}
                            />
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 mt-6">
                            {selectedModel && (
                                <button
                                    type="button"
                                    ref={paramButtonRef}
                                    onClick={() => setShowParameters(!showParameters)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    Configure Parameters
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                            >
                                {initialAgent ? 'Update Agent' : 'Create Agent'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};