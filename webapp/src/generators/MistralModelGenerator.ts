import { ModelGenerator } from '../lib/ModelGenerator';
import { ProviderType, CategoryType, TierType } from '../types/models';

export class MistralModelGenerator extends ModelGenerator {
    public generateModels(): void {
        // Pixtral Large (25.02)
        this.registry.register({
            id: "us.mistral.pixtral-large-2502-v1:0",
            name: "Pixtral Large (25.02)",
            provider: ProviderType.Mistral,
            version: "v1",
            category: [
                CategoryType.ImageToText,
                CategoryType.MultilingualSupport,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration
            ],
            tier: TierType.Premium,
            description: "Multimodal model with 124B parameters for document analysis, visual reasoning, and enterprise document processing.",
            longDescription: "Pixtral Large is a powerful multimodal model with 124B parameters released in 2024, specifically designed for document analysis, visual reasoning, chart interpretation, multimodal RAG, enterprise document processing, and visual Q&A. It supports dozens of languages and delivers strong document understanding capabilities.",
            capabilities: [
                "Document analysis",
                "Visual reasoning",
                "Chart interpretation",
                "Multimodal RAG",
                "Enterprise document processing",
                "Visual question answering"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            streaming: true,
            regions: ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true,
                supportedLanguages: ["English", "French", "German", "Spanish", "Italian", "Chinese", "Japanese", "Korean", "Portuguese", "Dutch", "Polish"]
            },
            useCase: {
                recommended: ["Document analysis", "Visual reasoning", "Chart interpretation", "Enterprise document processing"],
                notRecommended: ["Simple text-only applications"]
            },
            status: "stable",
            lastUpdated: "2024-10-15"
        });

        // Mistral Large 2 (24.07)
        this.registry.register({
            id: "mistral.mistral-large-2407-v1:0",
            name: "Mistral Large 2 (24.07)",
            provider: ProviderType.Mistral,
            version: "v1",
            category: [
                CategoryType.MultilingualSupport,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.TextSummarization,
                CategoryType.CodeGeneration,
                CategoryType.Math,
                CategoryType.Translation
            ],
            tier: TierType.Premium,
            description: "Latest version of Mistral's flagship model with significant improvements in multilingual accuracy and expanded language support.",
            longDescription: "Mistral Large 2 is the latest version of Mistral's flagship model, featuring significant improvements in multilingual accuracy and support for dozens of languages. It excels at multilingual translation, text summarization, complex reasoning, math, and coding tasks with a 128K token context window.",
            capabilities: [
                "Multilingual translation",
                "Text summarization",
                "Complex reasoning",
                "Math tasks",
                "Coding tasks"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            streaming: true,
            regions: ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                supportedLanguages: ["English", "French", "German", "Spanish", "Italian", "Chinese", "Japanese", "Korean", "Portuguese", "Dutch", "Polish"]
            },
            useCase: {
                recommended: ["Multilingual applications", "Complex reasoning tasks", "Translation", "Technical documentation"],
                notRecommended: ["Image analysis"]
            },
            status: "stable",
            lastUpdated: "2024-07-15"
        });

        // Mistral Large (24.02)
        this.registry.register({
            id: "mistral.mistral-large-2402-v1:0",
            name: "Mistral Large (24.02)",
            provider: ProviderType.Mistral,
            version: "v1",
            category: [
                CategoryType.TextSummarization,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Translation,
                CategoryType.CodeGeneration,
                CategoryType.Math
            ],
            tier: TierType.Premium,
            description: "Powerful model with strong reasoning capabilities and precise instruction following across multiple languages.",
            longDescription: "Mistral Large (24.02) features strong reasoning capabilities and precise instruction following. It excels at text summarization, translation, reasoning tasks, math, and coding with a 32K token context window, supporting English, French, Spanish, German, and Italian.",
            capabilities: [
                "Precise instruction following",
                "Text summarization",
                "Translation",
                "Reasoning tasks",
                "Math",
                "Coding"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 32000,
            streaming: true,
            regions: ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"],
            parameters: this.getCommonTextModelParams(32000),
            features: {
                contextWindow: 32000,
                multilingual: true,
                formatting: true,
                supportedLanguages: ["English", "French", "Spanish", "German", "Italian"]
            },
            useCase: {
                recommended: ["Complex reasoning", "Enterprise applications", "Multilingual content generation"],
                notRecommended: ["Image analysis", "Applications requiring very long context"]
            },
            status: "stable",
            lastUpdated: "2024-02-15"
        });

        // Mistral Small (24.02)
        this.registry.register({
            id: "mistral.mistral-small-2402-v1:0",
            name: "Mistral Small (24.02)",
            provider: ProviderType.Mistral,
            version: "v1",
            category: [
                CategoryType.TextGeneration,
                CategoryType.Conversation,
                CategoryType.QuestionAnswering
            ],
            tier: TierType.Standard,
            description: "Cost-effective model optimized for high-volume, low-latency tasks across multiple languages.",
            longDescription: "Mistral Small (24.02) is optimized for high-volume, low-latency tasks, making it cost-effective for bulk operations like classification, customer support, and text generation. It supports English, French, German, Spanish, and Italian with a 32K token context window.",
            capabilities: [
                "Text classification",
                "Customer support",
                "Text generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 32000,
            streaming: true,
            regions: ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"],
            parameters: this.getCommonTextModelParams(32000),
            features: {
                contextWindow: 32000,
                multilingual: true,
                formatting: true,
                supportedLanguages: ["English", "French", "German", "Spanish", "Italian"]
            },
            useCase: {
                recommended: ["Bulk classification", "Customer support", "High-volume text generation"],
                notRecommended: ["Complex reasoning", "Advanced mathematical tasks"]
            },
            status: "stable",
            lastUpdated: "2024-02-15"
        });

        // Mixtral 8x7B
        this.registry.register({
            id: "mistral.mixtral-8x7b-instruct-v0:1",
            name: "Mixtral 8x7B",
            provider: ProviderType.Mistral,
            version: "v1",
            category: [
                CategoryType.TextSummarization,
                CategoryType.QuestionAnswering,
                CategoryType.CodeGeneration
            ],
            tier: TierType.Standard,
            description: "7B sparse mixture of experts model with 12B active parameters out of 45B total parameters.",
            longDescription: "Mixtral 8x7B features a 7B sparse mixture of experts architecture, with 12B active parameters out of 45B total. It's designed for text summarization, structuration, question answering, and code completion across English, French, German, Spanish, and Italian with a 32K token context window.",
            capabilities: [
                "Text summarization",
                "Structuration",
                "Question answering",
                "Code completion"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 32000,
            streaming: true,
            regions: ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"],
            parameters: this.getCommonTextModelParams(32000),
            features: {
                contextWindow: 32000,
                multilingual: true,
                formatting: true,
                supportedLanguages: ["English", "French", "German", "Spanish", "Italian"]
            },
            useCase: {
                recommended: ["Text summarization", "Question answering systems", "Code completion"],
                notRecommended: ["Complex visual tasks"]
            },
            status: "stable",
            lastUpdated: "2023-12-15"
        });

        // Mistral 7B
        this.registry.register({
            id: "mistral.mistral-7b-instruct-v0:2",
            name: "Mistral 7B",
            provider: ProviderType.Mistral,
            version: "v1",
            category: [
                CategoryType.TextSummarization,
                CategoryType.QuestionAnswering,
                CategoryType.CodeGeneration
            ],
            tier: TierType.Standard,
            description: "Small yet powerful 7B dense Transformer model for text summarization and code completion tasks.",
            longDescription: "Mistral 7B is a 7B dense Transformer model that's small yet powerful, fast-deployed, and easily customizable. It excels at text summarization, structuration, question answering, and code completion in English with a 32K token context window.",
            capabilities: [
                "Text summarization",
                "Structuration",
                "Question answering",
                "Code completion"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 32000,
            streaming: true,
            regions: ["us-east-1", "us-west-2", "eu-central-1", "ap-northeast-1"],
            parameters: this.getCommonTextModelParams(32000),
            features: {
                contextWindow: 32000,
                multilingual: false,
                formatting: true,
                supportedLanguages: ["English"]
            },
            useCase: {
                recommended: ["Lightweight applications", "Edge deployment", "Custom fine-tuning"],
                notRecommended: ["Complex multilingual tasks"]
            },
            status: "stable",
            lastUpdated: "2023-09-15"
        });
    }
}