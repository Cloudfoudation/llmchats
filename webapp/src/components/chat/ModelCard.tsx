// src/components/ModelSelector.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { ModelOption, ModelGroup, MODELS, CategoryType } from '@/types/models';
import { useModelSelectorState } from '@/hooks/useModelSelectorState';
import { useAuthContext } from '@/providers/AuthProvider';
import { IconSearch } from '@tabler/icons-react';

interface ModelCardProps {
    selectedModel: string;
    onModelSelect: (modelId: string) => void;
    isOpen: boolean;
}

export const ModelCard: React.FC<ModelCardProps> = ({
    selectedModel,
    onModelSelect,
    isOpen
}) => {
    const { availableModels } = useAuthContext();
    const {
        state,
        updateCategory,
        updateProvider,
        updateTier
    } = useModelSelectorState(isOpen);
    const [searchQuery, setSearchQuery] = useState('');

    const { selectedCategory, selectedProvider, selectedTier } = state;

    const validModels = useMemo(() => {
        if (!availableModels?.length) return MODELS;
        return MODELS.filter(model =>
            availableModels.some(availableModel =>
                availableModel.modelId === model.id.replace('us.', '')
            )
        );
    }, [availableModels]);

    const categories = [
        { id: CategoryType.All, name: 'All Models' },
        { id: CategoryType.Chat, name: 'Chat' },
        { id: CategoryType.Image, name: 'Image' },
        { id: CategoryType.Multimodal, name: 'Multimodal' }
    ];

    const providers = useMemo(() => {
        const providerSet = new Set<string>();
        const models = availableModels?.length
            ? MODELS.filter(model =>
                availableModels.some(am => am.modelId === model.id.replace('us.', '')))
            : MODELS;
        models.forEach(model => providerSet.add(model.provider));
        return ['all', ...Array.from(providerSet)].map(p => ({
            id: p,
            name: p === 'all' ? 'All Providers' : p
        }));
    }, [availableModels]);

    const tiers = [
        { id: 'all', name: 'All Tiers' },
        { id: 'basic', name: 'Basic' },
        { id: 'standard', name: 'Standard' },
        { id: 'premium', name: 'Premium' }
    ];

    // Filter logic remains the same
    const filteredModels = useMemo(() => {
        // First filter for available models
        let models = availableModels?.length
            ? MODELS.filter(model =>
                availableModels.some(am => am.modelId === model.id.replace('us.', '')))
            : MODELS;

        // Then apply category, provider and tier filters
        models = models.filter(model => {
            const categoryMatch = selectedCategory === CategoryType.All || model.category.includes(selectedCategory);
            const providerMatch = selectedProvider === 'all' || model.provider === selectedProvider;
            const tierMatch = selectedTier === 'all' || model.tier === selectedTier;
            return categoryMatch && providerMatch && tierMatch;
        });

        // Finally apply search filter if exists
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            models = models.filter(model =>
                model.name.toLowerCase().includes(query) ||
                model.provider.toLowerCase().includes(query)
            );
        }

        return models;
    }, [availableModels, selectedCategory, selectedProvider, selectedTier, searchQuery]);


    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (availableModels !== undefined) {
            setIsLoading(false);
        }
    }, [availableModels]);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // No models message
    if (validModels.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
                <div className="text-center text-gray-500 dark:text-gray-400">
                    No models available in this region. Please try another region.
                </div>
            </div>
        );
    }

    const renderModelCard = (model: ModelOption) => (
        <div key={model.id} className="group">
            <button
                type='button'
                onClick={() => onModelSelect(model.id)}
                className={`
              w-full text-left rounded-lg border transition-colors
              ${selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 group-hover:bg-gray-50 dark:border-gray-700 dark:group-hover:bg-gray-800'
                    }
            `}
            >
                <div className="p-3">
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {model.name}
                        </span>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="truncate">{model.provider}</span>
                            <span>•</span>
                            <span className="capitalize">{model.tier}</span>
                        </div>

                        {selectedModel === model.id && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {model.capabilities.map((capability, index) => (
                                    <span
                                        key={index}
                                        className={`
                          px-2 py-1 text-xs rounded-full whitespace-nowrap
                          ${capability === 'chat'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                                : capability === 'text generation'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                                    : capability === 'image generation'
                                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                            }
                        `}
                                    >
                                        {capability}
                                    </span>
                                ))}
                                {model.streaming && (
                                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 rounded-full whitespace-nowrap">
                                        Streaming supported
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </button>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border dark:border-gray-700 flex flex-col h-[calc(100vh-200px)] max-h-[400px] min-w-[300px] lg:min-w-[500px]">
            {/* Header with Search and Filters - Fixed */}
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
                    </div>
                </div>

                {/* Provider Filter */}
                <div className="p-2 border-b dark:border-gray-700">
                    <div className="flex flex-wrap gap-1">
                        {providers.map((provider) => (
                            <button
                                type="button"
                                key={provider.id}
                                onClick={() => updateProvider(provider.id)}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedProvider === provider.id
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {provider.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="p-4">
                    <div className="space-y-2">
                        {filteredModels
                            .filter(model =>
                                searchQuery
                                    ? model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
                                    : true
                            )
                            .map(model => renderModelCard(model))}
                    </div>
                </div>
            </div>
        </div>
    );
};