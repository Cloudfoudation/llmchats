// src/components/ModelSelector.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ModelOption, CategoryType, ProviderType } from '@/types/models';
import { useAuthContext } from '@/providers/AuthProvider';
import { IconSearch, IconCheck, IconSettings } from '@tabler/icons-react';
import { MODELS } from '@/types/models';
import { useModal } from '@/providers/ModalProvider';
import { useSettingsContext } from '@/providers/SettingsProvider';

interface ModelGrouping {
    provider: string;
    models: ModelOption[];
}

interface ModelSelectorProps {
    onSelectModel: (modelId: string) => void;
    currentModel: string;
    isOpen: boolean;
    onClose: () => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    showCapabilities?: boolean;
}

// Define main categories we want to show
const MAIN_CATEGORIES = [
    { id: CategoryType.All, name: 'All' },
    { id: CategoryType.Chat, name: 'Chat' },
    { id: CategoryType.Image, name: 'Image' },
    { id: CategoryType.Multimodal, name: 'Multimodal' },
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    onSelectModel,
    currentModel,
    isOpen,
    onClose,
    buttonRef,
    showCapabilities = false
}) => {
    const { availableModels } = useAuthContext();
    const { settings } = useSettingsContext();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(CategoryType.All);
    const [selectedProvider, setSelectedProvider] = useState('all');

    const { openSettings } = useModal();

    // Get unique providers
    const providers = useMemo(() => {
        const providerSet = new Set<string>();
        MODELS.forEach(model => {
            if (model.provider === ProviderType.OpenAI && !settings?.externalApiKeys?.openai?.apiKey)
                return;
            if (model.provider === ProviderType.Groq && !settings?.externalApiKeys?.groq)
                return;
            if (model.provider === ProviderType.Sambanova && !settings?.externalApiKeys?.sambanova)
                return;

            providerSet.add(model.provider)

        });
        return Array.from(providerSet);
    }, []);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const dropdownHeight = dropdownRef.current?.offsetHeight || 0;

            setPosition({
                top: buttonRect.top - dropdownHeight - 8,
                left: buttonRect.left
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                !buttonRef.current?.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const filteredAndGroupedModels = useMemo(() => {
        let models = availableModels?.length
            ? MODELS.filter(model =>
                availableModels.some(am => am.modelId === model.id.replace('us.', '')))
            : MODELS;

        // Add OpenAI models if API key exists
        if (settings?.externalApiKeys?.openai?.apiKey) {
            const openAIModels = MODELS.filter(model => model.provider === ProviderType.OpenAI);
            models = [...models, ...openAIModels];
        }

        if (settings?.externalApiKeys?.groq) {
            const groqModels = MODELS.filter(model => model.provider === ProviderType.Groq);
            models = [...models, ...groqModels];
        }

        if (settings?.externalApiKeys?.sambanova) {
            const groqModels = MODELS.filter(model => model.provider === ProviderType.Sambanova);
            models = [...models, ...groqModels];
        }

        if (selectedCategory !== CategoryType.All) {
            models = models.filter(model => model.category.includes(selectedCategory));
        }

        if (selectedProvider !== 'all') {
            models = models.filter(model => model.provider === selectedProvider);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            models = models.filter(model =>
                model.name.toLowerCase().includes(query) ||
                model.provider.toLowerCase().includes(query)
            );
        }

        // Group models by provider
        const groupedModels: ModelGrouping[] = [];
        models.forEach(model => {
            const existingGroup = groupedModels.find(g => g.provider === model.provider);
            if (existingGroup) {
                existingGroup.models.push(model);
            } else {
                groupedModels.push({ provider: model.provider, models: [model] });
            }
        });

        return groupedModels;
    }, [availableModels, selectedCategory, selectedProvider, searchQuery, settings?.externalApiKeys?.openai?.apiKey]);


    const renderModelCard = (model: ModelOption) => (
        <button
            type="button"
            key={model.id}
            onClick={() => {
                onSelectModel(model.id);
                onClose();
            }}
            className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-start gap-3 
                ${currentModel === model.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
        >
            <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {model.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span className="truncate">{model.provider}</span>
                    <span>•</span>
                    <span className="capitalize">{model.tier}</span>
                </div>
                {showCapabilities && model.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {model.capabilities.map((cap, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            >
                                {cap}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            {currentModel === model.id && (
                <IconCheck className="text-blue-500 dark:text-blue-400 mt-1 flex-shrink-0" size={20} />
            )}
        </button>
    );

    if (!isOpen) return null;

    return (
        <div
            ref={dropdownRef}
            className="fixed w-90 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-700 overflow-hidden z-50"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                height: '500px',
            }}
        >
            {/* Search and Filters Section - Fixed Height */}
            <div className="flex flex-col h-full">
                <div className="flex-shrink-0">
                    {/* Search Bar */}
                    <div className="p-3 border-b dark:border-gray-700">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <IconSearch className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search models..."
                                    className="w-full pl-9 pr-3 py-2 border dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    openSettings();
                                    onClose();
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
                                title="Model Settings"
                            >
                                <IconSettings size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="p-2 border-b dark:border-gray-700">
                        <div className="flex flex-wrap gap-1">
                            {MAIN_CATEGORIES.map((category) => (
                                <button
                                    type="button"
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedCategory === category.id
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Provider Filter */}
                    <div className="p-2 border-b dark:border-gray-700">
                        <div className="flex flex-wrap gap-1">
                            <button
                                type="button"
                                onClick={() => setSelectedProvider('all')}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedProvider === 'all'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                            >
                                All Providers
                            </button>
                            {providers.map((provider) => (
                                <button
                                    type="button"
                                    key={provider}
                                    onClick={() => setSelectedProvider(provider)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedProvider === provider
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {provider}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Models List - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    {filteredAndGroupedModels.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No models found
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredAndGroupedModels.map((group) => (
                                <div key={group.provider}>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {group.models.map(renderModelCard)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};