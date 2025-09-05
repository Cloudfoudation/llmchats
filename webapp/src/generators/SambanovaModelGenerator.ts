import { ModelGenerator } from '../lib/ModelGenerator';
import { ModelOption, ProviderType, CategoryType, TierType } from '../types/models';

export class SambanovaModelGenerator extends ModelGenerator {
    public generateModels(): void {
        // Preview Models
        this.registry.register({
            id: "deepseek-r1",
            name: "DeepSeek R1",
            provider: ProviderType.Sambanova,
            version: "preview",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Preview,
            description: "Preview version of DeepSeek R1 model with 4K context window",
            longDescription: "Early access DeepSeek R1 model for evaluation and testing purposes",
            capabilities: [
                "Text generation",
                "Chat functionality",
                "Complex reasoning"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 4096,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(4096),
            features: {
                contextWindow: 4096,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: ["Model evaluation", "Research", "Testing"],
                notRecommended: ["Production deployments"]
            },
            status: "preview",
            lastUpdated: "2024-03-15"
        });

        // Production Models
        this.registry.register({
            id: "deepseek-r1-distill-llama-70b",
            name: "DeepSeek R1 Distill Llama 70B",
            provider: ProviderType.Sambanova,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Premium,
            description: "Production-ready DeepSeek distilled Llama 70B with 32K context",
            longDescription: "High-performance distilled version of Llama 70B optimized for production use",
            capabilities: [
                "Advanced reasoning",
                "Long context processing",
                "High-quality generation"
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
                recommended: ["Production deployments", "Complex tasks", "Enterprise applications"],
                notRecommended: ["Image or audio processing"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        this.registry.register({
            id: "llama-3.1-tulu-3-405b",
            name: "Llama 3.1 Tulu 3 405B",
            provider: ProviderType.Sambanova,
            version: "v1",
            category: [CategoryType.Chat, CategoryType.TextGeneration],
            tier: TierType.Premium,
            description: "Large-scale Llama model with 16K context window",
            longDescription: "High-performance Llama 3.1 Tulu model optimized for complex reasoning and generation tasks",
            capabilities: [
                "Advanced text generation",
                "Complex reasoning",
                "Chat functionality",
                "Instruction following"
            ],
            inputModalities: ["text"],  // Required field
            outputModalities: ["text", "chat"], // Required field
            maxInputTokens: 16384,
            maxOutputTokens: 16384,
            streaming: true,
            regions: ["us-east-1"], // Required field
            parameters: this.getCommonTextModelParams(16384),
            features: {  // Required field
                contextWindow: 16384,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Complex text generation",
                    "Chat applications",
                    "Content creation"
                ],
                notRecommended: ["Image or audio processing"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Meta Llama 3.3 70B Instruct
        this.registry.register({
            id: "meta-llama-3.3-70b-instruct",
            name: "Meta Llama 3.3 70B Instruct",
            provider: ProviderType.Sambanova,
            version: "v1",
            category: [CategoryType.Chat, CategoryType.TextGeneration],
            tier: TierType.Premium,
            description: "Latest Llama 3.3 instruction-tuned model with 16K context",
            longDescription: "State-of-the-art Llama model optimized for instruction following and complex reasoning tasks",
            capabilities: [
                "Advanced instruction following",
                "Complex reasoning",
                "High-quality text generation",
                "Multi-turn dialogue"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 16384,
            maxOutputTokens: 16384,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(16384),
            features: {
                contextWindow: 16384,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Enterprise applications",
                    "Complex reasoning tasks",
                    "Production deployments"
                ],
                notRecommended: ["Image or audio processing"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Meta Llama 3.2 3B Instruct
        this.registry.register({
            id: "meta-llama-3.2-3b-instruct",
            name: "Meta Llama 3.2 3B Instruct",
            provider: ProviderType.Sambanova,
            version: "v1",
            category: [CategoryType.Chat, CategoryType.TextGeneration],
            tier: TierType.Standard,
            description: "Compact Llama 3.2 model with 8K context window",
            longDescription: "Efficient smaller-scale Llama model suitable for faster inference and simpler tasks",
            capabilities: [
                "Basic text generation",
                "Chat functionality",
                "Quick inference",
                "Instruction following"
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
                    "Lightweight applications",
                    "Quick responses",
                    "Basic chat functionality"
                ],
                notRecommended: ["Complex reasoning tasks", "Large context processing"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Qwen 2.5 72B Instruct
        this.registry.register({
            id: "qwen2.5-72b-instruct",
            name: "Qwen 2.5 72B Instruct",
            provider: ProviderType.Sambanova,
            version: "v1",
            category: [CategoryType.Chat, CategoryType.TextGeneration],
            tier: TierType.Premium,
            description: "Large-scale Qwen model with 16K context window",
            longDescription: "Advanced Qwen model optimized for high-quality text generation and complex tasks",
            capabilities: [
                "Advanced text generation",
                "Complex reasoning",
                "Multilingual support",
                "Instruction following"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 16384,
            maxOutputTokens: 16384,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(16384),
            features: {
                contextWindow: 16384,
                multilingual: true,
                formatting: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Enterprise applications",
                    "Complex content generation",
                    "Multilingual tasks"
                ],
                notRecommended: ["Image or audio processing"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Llama Guard 3 8B
        this.registry.register({
            id: "meta-llama-guard-3-8b",
            name: "Meta Llama Guard 3 8B",
            provider: ProviderType.Sambanova,
            version: "v1",
            category: [CategoryType.Chat, CategoryType.ContentModeration],
            tier: TierType.Standard,
            description: "Safety-focused Llama model with 8K context window",
            longDescription: "Specialized model for content moderation and safe text generation",
            capabilities: [
                "Content moderation",
                "Safety filtering",
                "Policy compliance",
                "Text analysis"
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
                    "Content moderation",
                    "Safety-critical applications",
                    "Policy enforcement"
                ],
                notRecommended: ["General text generation", "Creative tasks"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });

        // Vision model example
        this.registry.register({
            id: "llama-3.2-90b-vision-instruct",
            name: "Llama 3.2 90B Vision Instruct",
            provider: ProviderType.Sambanova,
            version: "v1",
            category: [CategoryType.Multimodal, CategoryType.ImageToText],
            tier: TierType.Premium,
            description: "Multimodal Llama model with 4K context window",
            longDescription: "Large-scale vision-language model for image understanding and analysis",
            capabilities: [
                "Image understanding",
                "Visual question answering",
                "Image captioning",
                "Multimodal reasoning"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 4096,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(4096),
            features: {
                contextWindow: 4096,
                multilingual: true,
                formatting: true,
                streamingSupport: true,
                imageAnalysis: true
            },
            useCase: {
                recommended: [
                    "Image analysis",
                    "Visual QA",
                    "Image-based applications"
                ],
                notRecommended: ["Text-only tasks", "Audio processing"]
            },
            status: "stable",
            lastUpdated: "2024-03-15"
        });
    }
}