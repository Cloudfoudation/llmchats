// src/generators/OpenAIModelGenerator.ts
import { ModelGenerator } from '../lib/ModelGenerator';
import { ModelOption, ProviderType, CategoryType, TierType } from '../types/models';

export class OpenAIModelGenerator extends ModelGenerator {
    public generateModels(): void {
        this.registry.register({
            id: "gpt-4-turbo-2024-04-09",
            name: "GPT-4 Turbo",
            provider: ProviderType.OpenAI,
            version: "2024-04-09",
            category: [
                CategoryType.Chat,
                CategoryType.TextToText
            ],
            tier: TierType.Premium,
            description: "Latest GPT-4 Turbo model with improved capabilities",
            capabilities: [
                "text generation",
                "chat",
                "structured outputs",
                "function calling",
                "json mode"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["*"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                jsonMode: true,
                functionCalling: true
            },
            status: "stable",
            lastUpdated: "2024-04-09",
            requiresApiKey: true
        });

        // Add O1 model
        this.registry.register({
            id: "o1-2024-12-17",
            name: "O1",
            provider: ProviderType.OpenAI,
            version: "2024-12-17",
            category: [
                CategoryType.Chat,
                CategoryType.TextToText,
                CategoryType.ImageToText,
                CategoryType.Multimodal
            ],
            tier: TierType.Premium,
            description: "Advanced reasoning model with chain-of-thought capabilities",
            capabilities: [
                "complex reasoning",
                "text generation",
                "chat",
                "image analysis",
                "structured outputs"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text"],
            maxInputTokens: 200000,
            maxOutputTokens: 100000,
            streaming: true,
            regions: ["*"],
            parameters: this.getCommonTextModelParams(200000),
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                reasoning: true,
                imageAnalysis: true,
                multimodal: true
            },
            status: "stable",
            lastUpdated: "2024-12-17",
            requiresApiKey: true
        });

        // Add O1-mini model
        this.registry.register({
            id: "o1-mini-2024-09-12",
            name: "O1 Mini",
            provider: ProviderType.OpenAI,
            version: "2024-09-12",
            category: [
                CategoryType.Chat,
                CategoryType.TextToText
            ],
            tier: TierType.Standard,
            description: "Fast and affordable reasoning model optimized for focused tasks",
            capabilities: [
                "complex reasoning",
                "text generation",
                "chat",
                "structured outputs",
                "chain of thought"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 65536,
            streaming: true,
            regions: ["*"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                reasoning: true,
                chainOfThought: true
            },
            status: "stable",
            lastUpdated: "2024-09-12",
            requiresApiKey: true
        });

        // Add O3-mini model
        this.registry.register({
            id: "o3-mini-2025-01-31",
            name: "O3 Mini",
            provider: ProviderType.OpenAI,
            version: "2025-01-31",
            category: [
                CategoryType.Chat,
                CategoryType.TextToText
            ],
            tier: TierType.Standard,
            description: "Fast, high-intelligence small reasoning model",
            capabilities: [
                "complex reasoning",
                "text generation",
                "chat",
                "structured outputs",
                "function calling",
                "batch processing"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 200000,
            maxOutputTokens: 100000,
            streaming: true,
            regions: ["*"],
            parameters: this.getCommonTextModelParams(200000),
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                reasoning: true,
                functionCalling: true,
                batchProcessing: true
            },
            status: "stable",
            lastUpdated: "2025-01-31",
            requiresApiKey: true
        });

        // GPT-4 Vision
        this.registry.register({
            id: "gpt-4-vision-preview",
            name: "GPT-4 Vision",
            provider: ProviderType.OpenAI,
            version: "1106",
            category: [
                CategoryType.Chat,
                CategoryType.ImageToText,
                CategoryType.Multimodal
            ],
            tier: TierType.Premium,
            description: "GPT-4 with vision capabilities for image analysis and understanding",
            capabilities: [
                "text generation",
                "chat",
                "image analysis",
                "multimodal understanding"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["*"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true
            },
            status: "stable",
            lastUpdated: "2024-01-25",
            requiresApiKey: true
        });

        // GPT-3.5 Turbo
        this.registry.register({
            id: "gpt-3.5-turbo-0125",
            name: "GPT-3.5 Turbo",
            provider: ProviderType.OpenAI,
            version: "0125",
            category: [
                CategoryType.Chat,
                CategoryType.TextToText
            ],
            tier: TierType.Standard,
            description: "Latest GPT-3.5 Turbo with improved format handling and non-English fixes",
            capabilities: [
                "text generation",
                "chat",
                "structured outputs",
                "function calling"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 16385,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["*"],
            parameters: this.getCommonTextModelParams(16385),
            features: {
                contextWindow: 16385,
                multilingual: true,
                formatting: true,
                functionCalling: true
            },
            status: "stable",
            lastUpdated: "2024-01-25",
            requiresApiKey: true
        });

        // DALL-E 3
        this.registry.register({
            id: "dall-e-3",
            name: "DALL-E 3",
            provider: ProviderType.OpenAI,
            version: "3.0",
            category: [CategoryType.Image, CategoryType.TextToImage],
            tier: TierType.Premium,
            description: "Advanced image generation model with high quality and accuracy",
            capabilities: [
                "text to image generation",
                "artistic image creation",
                "photorealistic image generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["image"],
            maxInputTokens: 4000,
            streaming: false,
            regions: ["*"],
            parameters: this.getCommonImageModelParams(),
            features: {
                contextWindow: 4000,
                multilingual: true,
                imageGeneration: true
            },
            status: "stable",
            lastUpdated: "2024-01-25",
            requiresApiKey: true
        });

        // GPT-4o Models
        this.registry.register({
            id: "gpt-4o",
            name: "GPT-4o",
            provider: ProviderType.OpenAI,
            version: "2024-08-06",
            category: [
                CategoryType.Chat,
                CategoryType.TextToText,
                CategoryType.ImageToText,
                CategoryType.Multimodal
            ],
            tier: TierType.Premium,
            description: "Versatile, high-intelligence flagship model with text and image capabilities",
            capabilities: [
                "text generation",
                "chat",
                "image analysis",
                "structured outputs",
                "multimodal"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 16384,
            streaming: true,
            regions: ["*"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true
            },
            status: "stable",
            lastUpdated: "2024-08-06",
            requiresApiKey: true
        });

        // GPT-4o mini
        this.registry.register({
            id: "gpt-4o-mini",
            name: "GPT-4o Mini",
            provider: ProviderType.OpenAI,
            version: "2024-07-18",
            category: [
                CategoryType.Chat,
                CategoryType.TextToText,
                CategoryType.ImageToText,
                CategoryType.Multimodal
            ],
            tier: TierType.Standard,
            description: "Fast, affordable small model for focused tasks with text and image capabilities",
            capabilities: [
                "text generation",
                "chat",
                "image analysis",
                "structured outputs",
                "fine-tuning"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 16384,
            streaming: true,
            regions: ["*"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true,
                finetuning: true
            },
            status: "stable", 
            lastUpdated: "2024-07-18",
            requiresApiKey: true
        });

        // DALL-E 3
        this.registry.register({
            id: "dall-e-3",
            name: "DALL-E 3",
            provider: ProviderType.OpenAI,
            version: "3.0",
            category: [CategoryType.Image, CategoryType.TextToImage],
            tier: TierType.Premium,
            description: "Advanced image generation model with high quality and accuracy",
            capabilities: [
                "text to image generation",
                "artistic image creation",
                "photorealistic image generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["image"],
            maxInputTokens: 4000,
            streaming: false,
            regions: ["*"],
            parameters: this.getCommonImageModelParams(),
            features: {
                contextWindow:4000,
                multilingual: true,
                imageGeneration: true
            },
            status: "stable",
            lastUpdated: "2023-11-06",
            requiresApiKey: true
        });
    }
    
    // @ts-ignore
    private getCommonTextModelParams(maxTokens: number) {
        return {
            supportsTemperature: true,
            supportsTopP: true,
            supportsTopK: false,
            defaultValues: {
                temperature: 1,
                topP: 1,
                maxTokens: maxTokens
            },
            limits: {
                minTemperature: 0,
                maxTemperature: 2,
                minTopP: 0,
                maxTopP: 1
            }
        };
    }

    private getCommonImageModelParams() {
        return {
            supportsTemperature: false,
            supportsTopP: false,
            defaultValues: {
                quality: "standard",
                size: "1024x1024"
            },
            limits: {}
        };
    }
}