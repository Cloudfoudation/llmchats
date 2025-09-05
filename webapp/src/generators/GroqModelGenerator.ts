import { ModelGenerator } from '../lib/ModelGenerator';
import { ModelOption, ProviderType, CategoryType, TierType } from '../types/models';

export class GroqModelGenerator extends ModelGenerator {
    public generateModels(): void {
        // Preview Models
        this.registry.register({
            id: "qwen-2.5-32b",
            name: "Qwen 2.5 32B",
            provider: ProviderType.Groq,
            version: "preview",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.MultilingualSupport
            ],
            tier: TierType.Preview,
            description: "Preview of Alibaba Cloud's Qwen 2.5 32B model with 128K context window",
            longDescription: "Evaluation version of Qwen 2.5 model optimized for Groq's platform, featuring extensive context window and multilingual capabilities.",
            capabilities: [
                "Extended context processing",
                "Multilingual support",
                "Text generation",
                "Chat functionality"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 8192,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Model evaluation",
                    "Testing and development",
                    "Research purposes"
                ],
                notRecommended: ["Production deployments"]
            },
            status: "preview",
            lastUpdated: "2024-03-15"
        });

        this.registry.register({
            id: "deepseek-r1-distill-qwen-32b",
            name: "DeepSeek R1 Distill Qwen 32B",
            provider: ProviderType.Groq,
            version: "preview",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.MultilingualSupport
            ],
            tier: TierType.Preview,
            description: "Preview of DeepSeek's distilled Qwen 32B model with 128K context window",
            longDescription: "Evaluation version of DeepSeek's distilled Qwen model featuring extended context support and optimized performance.",
            capabilities: [
                "Extended context processing",
                "Efficient inference",
                "Text generation",
                "Chat functionality"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 16384,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Model evaluation",
                    "Testing and development",
                    "Research purposes"
                ],
                notRecommended: ["Production deployments"]
            },
            status: "preview",
            lastUpdated: "2024-03-15"
        });

        this.registry.register({
            id: "deepseek-r1-distill-llama-70b-specdec",
            name: "DeepSeek R1 Distill LLaMA 70B SpecDec",
            provider: ProviderType.Groq,
            version: "preview",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Preview,
            description: "Preview of DeepSeek's specialized distilled LLaMA 70B model with 128K context",
            longDescription: "Evaluation version of DeepSeek's distilled LLaMA model with specialized decoder optimizations for enhanced performance.",
            capabilities: [
                "Specialized decoding",
                "Extended context processing",
                "Advanced reasoning",
                "Efficient inference"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 16384,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Model evaluation",
                    "Testing and development",
                    "Research purposes"
                ],
                notRecommended: ["Production deployments"]
            },
            status: "preview",
            lastUpdated: "2024-03-15"
        });

        this.registry.register({
            id: "deepseek-r1-distill-llama-70b",
            name: "DeepSeek R1 Distill LLaMA 70B",
            provider: ProviderType.Groq,
            version: "preview",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Preview,
            description: "Preview of DeepSeek's distilled LLaMA 70B model with 128K context window",
            longDescription: "Evaluation version of DeepSeek's distilled LLaMA model optimized for efficiency while maintaining high performance capabilities.",
            capabilities: [
                "Extended context processing",
                "Efficient inference",
                "Advanced reasoning",
                "Text generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 16384,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Model evaluation",
                    "Testing and development",
                    "Research purposes"
                ],
                notRecommended: ["Production deployments"]
            },
            status: "preview",
            lastUpdated: "2024-03-15"
        });

        // Llama 3.3 70B Versatile
        this.registry.register({
            id: "llama-3.3-70b-versatile",
            name: "Llama 3.3 70B Versatile",
            provider: ProviderType.Groq,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.MultilingualSupport,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Premium,
            description: "Production-ready Llama 3.3 70B model optimized for versatile use cases with 128K context window",
            longDescription: "Groq-hosted Llama 3.3 70B model delivering high-performance capabilities for complex tasks with extended context window support and optimized inference speeds.",
            capabilities: [
                "Enhanced instruction following",
                "Advanced reasoning",
                "Nuanced context understanding",
                "Assistant-like chat",
                "Synthetic data generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 32768,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Production applications",
                    "Complex reasoning tasks",
                    "Natural language generation"
                ],
                notRecommended: ["Image processing tasks"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Llama 3.1 8B Instant
        this.registry.register({
            id: "llama-3.1-8b-instant",
            name: "Llama 3.1 8B Instant",
            provider: ProviderType.Groq,
            version: "v1",
            category: [
                CategoryType.TextToText,
                CategoryType.Chat,
                CategoryType.MultilingualSupport
            ],
            tier: TierType.Standard,
            description: "Production-ready 8B parameter model optimized for fast inference with 128K context window",
            longDescription: "Lightweight Llama model hosted on Groq's infrastructure, delivering rapid responses while maintaining good quality for general purpose tasks.",
            capabilities: [
                "Fast inference",
                "Basic reasoning",
                "Chat functionality",
                "Text generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 8192,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Speed-critical applications",
                    "Basic chat functionality",
                    "Simple text generation"
                ],
                notRecommended: ["Complex reasoning tasks"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Mixtral 8x7B 32K
        this.registry.register({
            id: "mixtral-8x7b-32k",
            name: "Mixtral 8x7B 32K",
            provider: ProviderType.Groq,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Premium,
            description: "Production-ready Mixtral model with 32K context window optimization",
            longDescription: "Groq-hosted Mixtral 8x7B model featuring mixture of experts architecture and extended context window support for complex tasks.",
            capabilities: [
                "Expert-based reasoning",
                "Long context understanding",
                "Advanced text generation",
                "Chat functionality"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 32768,
            maxOutputTokens: 32768,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(32768),
            features: {
                contextWindow: 32768,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Production applications",
                    "Long-form content analysis",
                    "Complex reasoning tasks"
                ],
                notRecommended: ["Image processing tasks"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Gemma2-9B-IT
        this.registry.register({
            id: "gemma2-9b-it",
            name: "Gemma2-9B-IT",
            provider: ProviderType.Groq,
            version: "v1",
            category: [
                CategoryType.TextToText,
                CategoryType.Chat,
                CategoryType.MultilingualSupport
            ],
            tier: TierType.Standard,
            description: "Production-ready Gemma2 9B model optimized for general-purpose tasks with 8,192 context window",
            longDescription: "Google's Gemma2 model hosted on Groq, delivering balanced performance for text-based applications.",
            capabilities: [
                "General-purpose text generation",
                "Basic reasoning",
                "Chat functionality",
                "Text summarization"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 8192,
            maxOutputTokens: 8192,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(8192),
            features: {
                contextWindow: 8192,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "General-purpose text tasks",
                    "Basic chat applications",
                    "Text summarization"
                ],
                notRecommended: ["Complex reasoning tasks"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Llama Guard 3 8B
        this.registry.register({
            id: "llama-guard-3-8b",
            name: "Llama Guard 3 8B",
            provider: ProviderType.Groq,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.ContentModeration
            ],
            tier: TierType.Standard,
            description: "Production-ready Llama Guard 3 8B model with 8,192 context window",
            longDescription: "Meta's Llama Guard model optimized for safety and performance on Groq's platform, ideal for content moderation and safe chat applications.",
            capabilities: [
                "Safe chat functionality",
                "Content moderation",
                "Text generation with safety filters",
                "Basic reasoning"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 8192,
            maxOutputTokens: 8192,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(8192),
            features: {
                contextWindow: 8192,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Safety-critical applications",
                    "Content moderation",
                    "Safe chat interactions"
                ],
                notRecommended: ["Unrestricted text generation"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Llama3 70B 8192
        this.registry.register({
            id: "llama3-70b-8192",
            name: "Llama3 70B 8192",
            provider: ProviderType.Groq,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Premium,
            description: "Production-ready Llama3 70B model with 8,192 context window",
            longDescription: "High-capacity Llama3 model hosted on Groq's platform, optimized for complex reasoning and extended context window support.",
            capabilities: [
                "Advanced reasoning",
                "Long context understanding",
                "High-quality text generation",
                "Chat functionality"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 8192,
            maxOutputTokens: 8192,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(8192),
            features: {
                contextWindow: 8192,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Production applications",
                    "Complex reasoning tasks",
                    "Long-form content generation"
                ],
                notRecommended: ["Image processing tasks"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        })

    }
}