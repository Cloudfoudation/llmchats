// src/modelGenerator.ts
import { ModelRegistry } from '../lib/ModelRegistry';
import { AnthropicModelGenerator } from '../generators/AnthropicModelGenerator';
import { ModelOption } from '@/types/models'
import { ModelGroup, CategoryType, ProviderType } from '@/types/models';
import { StabilityAIModelGenerator } from '@/generators/StabilityAIModelGenerator';
import { AmazonTitanModelGenerator } from '@/generators/AmazonModelGenerator';
import { MetaLlamaModelGenerator } from '@/generators/MetaLlamaModelGenerator';
import { DeepSeekModelGenerator } from '@/generators/DeepSeekModelGenerator';
import { OpenAIModelGenerator } from '@/generators/OpenAIModelGenerator';
import { GroqModelGenerator } from '@/generators/GroqModelGenerator';
import { SambanovaModelGenerator } from '@/generators/SambanovaModelGenerator';
import { MistralModelGenerator } from '@/generators/MistralModelGenerator';

let cachedModels: ModelOption[] | null = null;

export function generateModels(): ModelOption[] {
    if (cachedModels) {
        return cachedModels;
    }

    const registry = ModelRegistry.getInstance();

    // Initialize all model generators
    const generators = [
        new AnthropicModelGenerator(),
        new StabilityAIModelGenerator(),
        new AmazonTitanModelGenerator(),
        new MetaLlamaModelGenerator(),
        new DeepSeekModelGenerator(),
        // new OpenAIModelGenerator(),
        // new GroqModelGenerator(),
        // new SambanovaModelGenerator(),
        // new MistralModelGenerator()
    ];

    // Generate models for each provider
    generators.forEach(generator => generator.generateModels());

    cachedModels = registry.getModels();
    return cachedModels;
}


export const generateModelGroups = (models: ModelOption[]): ModelGroup[] => {
    // Filter Anthropic models
    const anthropicModels = models.filter(
        model => model.provider === ProviderType.Anthropic
    );

    // Group models by series and capabilities
    const groups: ModelGroup[] = [
        // Claude 3 Series
        {
            name: 'Claude 3',
            description: 'Latest generation of Claude models with multimodal capabilities',
            models: anthropicModels.filter(model =>
                model.name.toLowerCase().includes('claude-3')
            ),
            category: CategoryType.Multimodal,
            provider: ProviderType.Anthropic,
            tags: ['multimodal', 'latest', 'high-performance'],
            metadata: {
                series: 'claude-3',
                capabilities: ['text', 'image', 'analysis']
            }
        },

        // Claude 2 Series
        {
            name: 'Claude 2',
            description: 'Production-ready models for general-purpose use',
            models: anthropicModels.filter(model =>
                model.name.toLowerCase().includes('claude-2')
            ),
            category: CategoryType.TextGeneration,
            provider: ProviderType.Anthropic,
            tags: ['stable', 'general-purpose'],
            metadata: {
                series: 'claude-2',
                capabilities: ['text', 'analysis']
            }
        },

        // Claude Instant
        {
            name: 'Claude Instant',
            description: 'Fast and cost-effective models for simpler tasks',
            models: anthropicModels.filter(model =>
                model.name.toLowerCase().includes('instant')
            ),
            category: CategoryType.TextGeneration,
            provider: ProviderType.Anthropic,
            tags: ['fast', 'efficient'],
            metadata: {
                series: 'claude-instant',
                capabilities: ['text']
            }
        }
    ];

    // Alternative grouping by capability
    const capabilityGroups: ModelGroup[] = [
        // Multimodal Models
        {
            name: 'Multimodal Models',
            description: 'Models that can process both text and images',
            models: anthropicModels.filter(model =>
                model.inputModalities.includes('image')
            ),
            category: CategoryType.Multimodal,
            provider: ProviderType.Anthropic,
            tags: ['multimodal', 'vision'],
        },

        // Text-Only Models
        {
            name: 'Text Models',
            description: 'Models specialized in text processing and generation',
            models: anthropicModels.filter(model =>
                !model.inputModalities.includes('image')
            ),
            category: CategoryType.TextGeneration,
            provider: ProviderType.Anthropic,
            tags: ['text', 'chat'],
        }
    ];

    // Performance-based groups
    const performanceGroups: ModelGroup[] = [
        // High-Performance Models
        {
            name: 'High-Performance',
            description: 'Most capable models for complex tasks',
            models: anthropicModels.filter(model =>
                model.name.toLowerCase().includes('opus') ||
                model.name.toLowerCase().includes('claude-3')
            ),
            category: CategoryType.ComplexReasoningAnalysis,
            provider: ProviderType.Anthropic,
            tags: ['high-performance', 'complex-tasks'],
        },

        // Balanced Models
        {
            name: 'Balanced Performance',
            description: 'Good balance of capability and efficiency',
            models: anthropicModels.filter(model =>
                model.name.toLowerCase().includes('-2') ||
                model.name.toLowerCase().includes('sonnet')
            ),
            category: CategoryType.TextGeneration,
            provider: ProviderType.Anthropic,
            tags: ['balanced', 'general-purpose'],
        },

        // Efficient Models
        {
            name: 'Efficient Performance',
            description: 'Fast and cost-effective models',
            models: anthropicModels.filter(model =>
                model.name.toLowerCase().includes('instant') ||
                model.name.toLowerCase().includes('haiku')
            ),
            category: CategoryType.TextGeneration,
            provider: ProviderType.Anthropic,
            tags: ['efficient', 'fast'],
        }
    ];

    // Helper function to remove empty groups
    const filterEmptyGroups = (groups: ModelGroup[]): ModelGroup[] => {
        return groups.filter(group => group.models.length > 0);
    };

    // Combine all grouping strategies
    const allGroups = [
        ...filterEmptyGroups(groups),
        ...filterEmptyGroups(capabilityGroups),
        ...filterEmptyGroups(performanceGroups)
    ];

    // Add metadata about token limits
    allGroups.forEach(group => {
        group.metadata = {
            ...group.metadata,
            maxTokens: Math.max(...group.models.map(m => m.maxInputTokens || 0)),
            multilingualSupport: group.models.every(m => m.features?.multilingual),
            streamingSupport: group.models.every(m => m.streaming),
        };
    });

    return allGroups;
};

// Helper function to get recommended model for specific use case
export const getRecommendedModel = (
    models: ModelOption[],
    useCase: string
): ModelOption | undefined => {
    switch (useCase.toLowerCase()) {
        case 'multimodal':
            return models.find(m =>
                m.inputModalities.includes('image') &&
                m.name.toLowerCase().includes('claude-3')
            );

        case 'performance':
            return models.find(m =>
                m.name.toLowerCase().includes('opus') ||
                m.name.toLowerCase().includes('claude-3')
            );

        case 'balanced':
            return models.find(m =>
                m.name.toLowerCase().includes('claude-2') ||
                m.name.toLowerCase().includes('sonnet')
            );

        case 'efficient':
            return models.find(m =>
                m.name.toLowerCase().includes('instant') ||
                m.name.toLowerCase().includes('haiku')
            );

        default:
            return models.find(m =>
                m.name.toLowerCase().includes('claude-2')
            );
    }
};

// Helper function to get model compatibility
export const getModelCompatibility = (model: ModelOption): {
    features: string[];
    limitations: string[];
} => {
    const features = [];
    const limitations = [];

    // Check features
    if (model.inputModalities.includes('image')) {
        features.push('Image input support');
    }
    if (model.features?.multilingual) {
        features.push('Multilingual support');
    }
    if (model.streaming) {
        features.push('Streaming support');
    }
    if (model.maxInputTokens >= 100000) {
        features.push('Large context window');
    }

    // Check limitations
    if (!model.inputModalities.includes('image')) {
        limitations.push('No image input support');
    }
    if (model.maxInputTokens < 100000) {
        limitations.push('Limited context window');
    }

    return { features, limitations };
};