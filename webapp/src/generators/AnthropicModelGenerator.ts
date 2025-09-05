// src/generators/AnthropicModelGenerator.ts
import { ModelGenerator } from '../lib/ModelGenerator';
import { ModelOption, ProviderType, CategoryType, TierType, Modality, ModelParameters, ModelFeatures, ModelUseCase } from '../types/models';
import { MODEL_DEFAULTS, SUPPORTED_REGIONS } from '../constants/modelDefaults';

export class AnthropicModelGenerator extends ModelGenerator {
    public generateModels(): void {
        // Add Claude Sonnet 4
        this.registry.register({
            id: "us.anthropic.claude-sonnet-4-20250514-v1:0",
            name: "Claude Sonnet 4",
            provider: ProviderType.Anthropic,
            version: "v1",
            category: [
                CategoryType.Agents,
                CategoryType.CodeGeneration,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.ImageToText,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.NaturalLanguageProcessing,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextSummarization,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Premium,
            description: "Claude Sonnet 4 balances impressive performance for coding with the right speed and cost for high-volume use cases.",
            longDescription: "Claude Sonnet 4 balances impressive performance for coding with the right speed and cost for high-volume use cases: Coding: Handle everyday development tasks with enhanced performance-power code reviews, bug fixes, API integrations, and feature development with immediate feedback loops. AI Assistants: Power production-ready assistants for real-time applications—from customer support automation to operational workflows that require both intelligence and speed. Efficient research: Perform focused analysis across multiple data sources while maintaining fast response times. Large-scale content: Generate and analyze content at scale with improved quality.",
            capabilities: [
                "Enhanced coding performance",
                "Real-time AI assistants",
                "Efficient research and analysis",
                "Large-scale content generation",
                "Hybrid reasoning",
                "Extended thinking",
                "Computer use",
                "Tool use",
                "Agentic search"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 200000,
            maxOutputTokens: 32000,
            streaming: true,
            regions: ["us-east-1", "us-west-2"],
            parameters: {
                ...this.getCommonTextModelParams(200000),
                supportsExtendedThinking: true
            },
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                streamingSupport: true,
                supportedLanguages: [
                    "English", "French", "Modern Standard Arabic", "Mandarin Chinese", 
                    "Hindi", "Spanish", "Portuguese", "Korean", "Japanese", "German", 
                    "Russian", "Polish", "Other languages"
                ]
            },
            useCase: {
                recommended: [
                    "Code reviews and bug fixes",
                    "API integrations",
                    "Feature development",
                    "Customer support automation",
                    "Business intelligence",
                    "Real-time decision support",
                    "Marketing content generation"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2025-05-14"
        });

        // Add Claude Opus 4
        this.registry.register({
            id: "us.anthropic.claude-opus-4-20250514-v1:0",
            name: "Claude Opus 4",
            provider: ProviderType.Anthropic,
            version: "v1",
            category: [
                CategoryType.Agents,
                CategoryType.CodeGeneration,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.ImageToText,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.NaturalLanguageProcessing,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextSummarization,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Premium,
            description: "Claude Opus 4 is Anthropic's most intelligent model and is state-of-the-art for coding and agent capabilities, especially agentic search.",
            longDescription: "Claude Opus 4 is Anthropic's most intelligent model and is state-of-the-art for coding and agent capabilities, especially agentic search. It excels for customers needing frontier intelligence: Advanced coding: Independently plan and execute complex development tasks end-to-end. AI agents: Enable agents to tackle complex, multi-step tasks that require peak accuracy. Agentic search and research: Connect to multiple data sources to synthesize comprehensive insights. Long-horizon tasks and complex problem solving: Unlock new use cases involving sustained reasoning and long chains of actions.",
            capabilities: [
                "State-of-the-art coding capabilities",
                "Advanced AI agent functionality",
                "Agentic search and research",
                "Long-horizon task execution",
                "Complex problem solving",
                "Human-quality content creation",
                "Hybrid reasoning",
                "Extended thinking",
                "Computer use",
                "Tool use",
                "Memory and sustained reasoning"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 200000,
            maxOutputTokens: 32000,
            streaming: true,
            regions: ["us-east-1", "us-west-2"],
            parameters: {
                ...this.getCommonTextModelParams(200000),
                supportsExtendedThinking: true
            },
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                streamingSupport: true,
                supportedLanguages: [
                    "English", "French", "Modern Standard Arabic", "Mandarin Chinese", 
                    "Hindi", "Spanish", "Portuguese", "Korean", "Japanese", "German", 
                    "Russian", "Polish", "Other languages"
                ]
            },
            useCase: {
                recommended: [
                    "Complex development tasks",
                    "Multi-step AI agents",
                    "Agentic search across data sources",
                    "Long-form creative content",
                    "Technical documentation",
                    "Frontend design mockups",
                    "Virtual collaboration",
                    "Sustained reasoning tasks"
                ],
                notRecommended: [
                    "Simple queries",
                    "Cost-sensitive applications"
                ]
            },
            status: "stable",
            lastUpdated: "2025-05-14"
        });

        this.registry.register({
            id: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
            name: "Claude 3.7 Sonnet",
            provider: ProviderType.Anthropic,
            version: "v1",
            category: [
                CategoryType.Agents,
                CategoryType.CodeGeneration,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.ImageToText,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.NaturalLanguageProcessing,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextSummarization,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Premium,
            description: "Claude 3.7 Sonnet is Anthropic's most intelligent model to date and the first Claude model to offer extended thinking—the ability to solve complex problems with careful, step-by-step reasoning.",
            longDescription: "Claude 3.7 Sonnet is Anthropic's most intelligent model to date and the first Claude model to offer extended thinking—the ability to solve complex problems with careful, step-by-step reasoning. Anthropic is the first AI lab to introduce a single model where users can balance speed and quality by choosing between standard thinking for near-instant responses or extended thinking or advanced reasoning. Claude 3.7 Sonnet is state-of-the-art for coding, and delivers advancements in computer use, agentic capabilities, complex reasoning, and content generation.",
            capabilities: [
                "Extended thinking for complex problems",
                "State-of-the-art coding capabilities",
                "Advanced computer use",
                "Agentic capabilities",
                "Complex reasoning",
                "Content generation",
                "Multilingual support"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 128000,
            streaming: true,
            regions: ["us-east-1", "us-west-2"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                streamingSupport: true,
                supportedLanguages: ["English", "Spanish", "Japanese", "Multiple other languages"]
            },
            useCase: {
                recommended: [
                    "AI agents",
                    "Customer-facing agents",
                    "Complex AI workflows",
                    "Software development",
                    "Complex reasoning tasks",
                    "Content generation"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2025-02-19"
        });
        
        this.registry.register({
            id: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
            name: "Claude 3.5 Haiku",
            provider: ProviderType.Anthropic,
            version: "1.0",
            category: [
                CategoryType.Agents,
                CategoryType.Chat,
                CategoryType.CodeGeneration,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextSummarization,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Premium,
            description: "Anthropic's fastest, most compact model for near-instant responsiveness",
            longDescription: "Claude 3 Haiku is Anthropic's fastest, most compact model for near-instant responsiveness. It answers simple queries and requests with speed. Customers will be able to build seamless AI experiences that mimic human interactions.",
            capabilities: [
                "Fast response times",
                "Image processing",
                "Text generation",
                "Multilingual support"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 200000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-east-1", "us-west-2"],
            parameters: {
                ...this.getCommonTextModelParams(128000),
                supportsExtendedThinking: true
            },
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                streamingSupport: true,
                supportedLanguages: ["English", "Spanish", "Japanese"]
            },
            useCase: {
                recommended: [
                    "Quick responses",
                    "Simple queries",
                    "Seamless AI interactions",
                    "Image analysis"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-10-22"
        });

        this.registry.register({
            id: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            name: "Claude 3.5 Sonnet v2",
            provider: ProviderType.Anthropic,
            version: "v2",
            category: [
                CategoryType.Agents,
                CategoryType.CodeGeneration,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.ImageToText,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.NaturalLanguageProcessing,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextSummarization,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Premium,
            description: "The upgraded Claude 3.5 Sonnet is now state-of-the-art for a variety of tasks including real-world software engineering, agentic capabilities and computer use.",
            capabilities: [
                "Software engineering",
                "Agentic capabilities",
                "Computer use",
                "Multilingual support"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 200000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-east-1", "us-west-2"], // From the regions table
            parameters: this.getCommonTextModelParams(200000),
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                streamingSupport: true,
                supportedLanguages: ["English", "Spanish", "Japanese"] // And others as mentioned
            },
            useCase: {
                recommended: [
                    "Software engineering",
                    "Complex reasoning",
                    "Multi-modal tasks",
                    "Multilingual applications"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-10-22" // From release date
        });


        this.registry.register({
            id: "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
            name: "Claude 3.5 Sonnet",
            provider: ProviderType.Anthropic,
            version: "v1",
            category: [
                CategoryType.Agents,
                CategoryType.Chat,
                CategoryType.CodeGeneration,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.ImageToText,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.NaturalLanguageProcessing,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextSummarization,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Standard, // Mid-tier model according to description
            description: "Claude 3.5 Sonnet raises the industry bar for intelligence, outperforming competitor models and Claude 3 Opus on a wide range of evaluations, with the speed and cost of our mid-tier model.",
            capabilities: [
                "Advanced intelligence and reasoning",
                "High performance across evaluations",
                "Optimized speed and cost efficiency",
                "Image analysis",
                "Multilingual support"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 200000, // From max tokens in source
            maxOutputTokens: 4096,
            streaming: true,
            regions: [
                "us-east-1",
                "us-east-2",
                "us-west-2",
                "us-gov-east-1",
                "us-gov-west-1",
                "ap-northeast-1",
                "ap-northeast-2",
                "ap-south-1",
                "ap-southeast-2",
                "eu-central-1",
                "eu-central-2",
                "eu-west-1",
                "eu-west-3"
            ],
            parameters: this.getCommonTextModelParams(200000),
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                streamingSupport: true,
                supportedLanguages: ["English", "Spanish", "Japanese", "Multiple other languages"]
            },
            useCase: {
                recommended: [
                    "Complex reasoning tasks",
                    "Code generation",
                    "Mathematical problems",
                    "Multilingual applications",
                    "Image analysis",
                    "Text processing and generation"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-06-20"
        });

        this.registry.register({
            id: "us.anthropic.claude-3-opus-20240229-v1:0",
            name: "Claude 3 Opus",
            provider: ProviderType.Anthropic,
            version: "v1",
            category: [
                CategoryType.ImageToText,
                CategoryType.Conversation,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.MultilingualSupport
            ],
            tier: TierType.Premium,
            description: "Claude 3 Opus is Anthropic's most powerful AI model, with state-of-the-art performance on highly complex tasks. It can navigate open-ended prompts and sight-unseen scenarios with remarkable fluency and human-like understanding. Claude 3 Opus shows us the frontier of what's possible with generative AI.",
            capabilities: [
                "State-of-the-art performance on complex tasks",
                "Open-ended prompt handling",
                "Image processing",
                "Multilingual support",
                "Large context window"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 200000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-east-1", "us-west-2"],
            parameters: this.getCommonTextModelParams(200000),
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Complex reasoning",
                    "Image analysis",
                    "Multilingual tasks",
                    "Long-form content generation",
                    "Advanced analysis"
                ],
                notRecommended: [
                    "Simple tasks",
                    "Cost-sensitive applications"
                ]
            },
            status: "stable",
            lastUpdated: "2024-04-16" // From release date
        });

        this.registry.register({
            id: "us.anthropic.claude-3-haiku-20240307-v1:0",
            name: "Claude 3 Haiku",
            provider: ProviderType.Anthropic,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.ImageToText,
                CategoryType.Conversation,
                CategoryType.MultilingualSupport
            ],
            tier: TierType.Standard,
            description: "Claude 3 Haiku is Anthropic's fastest, most compact model for near-instant responsiveness.",
            longDescription: "Claude 3 Haiku is Anthropic's fastest, most compact model for near-instant responsiveness. It answers simple queries and requests with speed. Customers will be able to build seamless AI experiences that mimic human interactions. Claude 3 Haiku can process images and return text outputs, and features a 200K context window.",
            capabilities: [
                "Fast response time",
                "Image processing",
                "Text generation",
                "Multilingual support"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text"],
            maxInputTokens: 200000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: [
                "us-east-1",
                "us-east-2",
                "us-west-2",
                "us-gov-east-1",
                "us-gov-west-1",
                "ap-northeast-1",
                "ap-northeast-2",
                "ap-south-1",
                "ap-southeast-2",
                "ca-central-1",
                "eu-central-1",
                "eu-central-2",
                "eu-west-1",
                "eu-west-2",
                "eu-west-3",
                "sa-east-1"
            ],
            parameters: this.getCommonTextModelParams(200000),
            features: {
                contextWindow: 200000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Quick responses",
                    "Simple queries",
                    "Image analysis",
                    "Real-time applications"
                ],
                notRecommended: [
                    "Complex reasoning tasks",
                    "Long-form content generation"
                ]
            },
            status: "stable",
            lastUpdated: "2024-03-14"
        });
        // this.registry.register({
        //     id: "anthropic.claude-v2:1",
        //     name: "Claude 2.1",
        //     provider: ProviderType.Anthropic,
        //     version: "2.1",
        //     category: [
        //         CategoryType.TextGeneration,
        //         CategoryType.Conversation,
        //         CategoryType.ComplexReasoningAnalysis
        //     ],
        //     tier: TierType.Premium,
        //     description: "An update to Claude 2 that features double the context window, plus improvements across reliability, hallucination rates, and evidence-based accuracy in long document and RAG contexts.",
        //     capabilities: [],
        //     inputModalities: ["text"],
        //     outputModalities: ["text", "chat"],
        //     maxInputTokens: 200000,
        //     streaming: true,
        //     regions: ["us-east-1", "us-west-2", "ap-northeast-1", "eu-central-1"],
        //     parameters: this.getCommonTextModelParams(200000),
        //     features: {
        //         contextWindow: 200000,
        //         multilingual: true,
        //         formatting: true
        //     },
        //     status: "stable",
        //     lastUpdated: "2023-11-29"
        // });

        // // Claude 2
        // this.registry.register({
        //     id: "anthropic.claude-v2",
        //     name: "Claude 2",
        //     provider: ProviderType.Anthropic,
        //     version: "2",
        //     category: [
        //         CategoryType.TextGeneration,
        //         CategoryType.Conversation,
        //         CategoryType.ComplexReasoningAnalysis
        //     ],
        //     tier: TierType.Premium,
        //     description: "Anthropic's highly capable model across a wide range of tasks from sophisticated dialogue and creative content generation to detailed instruction following.",
        //     capabilities: [],
        //     inputModalities: ["text"],
        //     outputModalities: ["text", "chat"],
        //     maxInputTokens: 100000,
        //     streaming: true,
        //     regions: ["us-east-1", "us-west-2", "ap-southeast-1", "eu-central-1"],
        //     parameters: this.getCommonTextModelParams(100000),
        //     features: {
        //         contextWindow: 100000,
        //         multilingual: true,
        //         formatting: true
        //     },
        //     status: "stable",
        //     lastUpdated: "2023-08-01"
        // });

        // // Claude Instant
        // this.registry.register({
        //     id: "anthropic.claude-instant-v1",
        //     name: "Claude Instant",
        //     provider: ProviderType.Anthropic,
        //     version: "1.2",
        //     category: [
        //         CategoryType.TextGeneration,
        //         CategoryType.Conversation
        //     ],
        //     tier: TierType.Standard,
        //     description: "A fast, affordable yet still very capable model, which can handle a range of tasks including casual dialogue, text analysis, summarization, and document question-answering.",
        //     capabilities: [],
        //     inputModalities: ["text"],
        //     outputModalities: ["text", "chat"],
        //     maxInputTokens: 100000,
        //     streaming: true,
        //     regions: ["us-east-1", "us-west-2", "ap-northeast-1", "ap-southeast-1", "eu-central-1"],
        //     parameters: this.getCommonTextModelParams(100000),
        //     features: {
        //         contextWindow: 100000,
        //         multilingual: true,
        //         formatting: true
        //     },
        //     status: "stable",
        //     lastUpdated: "2023-08-01" // Using Claude 2's date as a reference since actual date wasn't provided
        // });
    }
}