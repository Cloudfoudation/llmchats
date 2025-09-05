import { ModelGenerator } from '../lib/ModelGenerator';
import { ModelOption, ProviderType, CategoryType, TierType } from '../types/models';

export class MetaLlamaModelGenerator extends ModelGenerator {
    public generateModels(): void {
        // Llama 3.2 1B Instruct
        this.registry.register({
            id: "us.meta.llama3-2-1b-instruct-v1:0",
            name: "Llama 3.2 1B Instruct",
            provider: ProviderType.Meta,
            version: "v1",
            category: [
                CategoryType.Agents,
                CategoryType.CodeGeneration,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.TextSummarization,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.NaturalLanguageProcessing,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Standard,
            description: "Text-only model, supporting on-device use cases such as multilingual local knowledge retrieval, summarization, and rewriting.",
            longDescription: "The Llama 3.2 1B Instruct model is a lightweight, fine-tuned model that delivers efficient and private capabilities, leveraging 1 billion parameters and text-only functionality to provide fast and accurate results.",
            capabilities: [
                "Multilingual dialogue",
                "Personal information management",
                "Knowledge retrieval",
                "Text rewriting"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 131000,
            streaming: true,
            regions: ["us-east-1", "us-east-2", "us-west-2", "eu-central-1", "eu-west-1", "eu-west-3"],
            parameters: this.getCommonTextModelParams(131000),
            features: {
                contextWindow: 131000,
                multilingual: true,
                formatting: true,
                supportedLanguages: ["English", "German", "French", "Italian", "Portuguese", "Hindi", "Spanish", "Thai"]
            },
            useCase: {
                recommended: ["On-device processing", "Edge device applications", "Multilingual tasks"],
                notRecommended: ["Complex reasoning tasks requiring larger models"]
            },
            status: "stable",
            lastUpdated: "2024-09-25"
        });

        // Llama 3.2 3B Instruct
        this.registry.register({
            id: "us.meta.llama3-2-3b-instruct-v1:0",
            name: "Llama 3.2 3B Instruct",
            provider: ProviderType.Meta,
            version: "v1",
            category: [
                CategoryType.Agents,
                CategoryType.CodeGeneration,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.TextSummarization,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.NaturalLanguageProcessing,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Standard,
            description: "Text-only model, fine-tuned for supporting on-device use cases such as multilingual local knowledge retrieval, summarization, and rewriting.",
            longDescription: "The Llama 3.2 3B Instruct model is a lightweight, fine-tuned model, leveraging 3 billion parameters to deliver highly accurate and relevant results.",
            capabilities: [
                "Advanced text generation",
                "Summarization",
                "Sentiment analysis",
                "Emotional intelligence",
                "Contextual understanding"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 131000,
            streaming: true,
            regions: ["us-east-1", "us-east-2", "us-west-2", "eu-central-1", "eu-west-1", "eu-west-3"],
            parameters: this.getCommonTextModelParams(131000),
            features: {
                contextWindow: 131000,
                multilingual: true,
                formatting: true,
                supportedLanguages: ["English", "German", "French", "Italian", "Portuguese", "Hindi", "Spanish", "Thai"]
            },
            useCase: {
                recommended: ["Mobile AI writing assistants", "Customer service applications", "Edge device applications"],
                notRecommended: ["Tasks requiring visual understanding"]
            },
            status: "stable",
            lastUpdated: "2024-09-25"
        });

        // Llama 3.2 11B Vision Instruct
        this.registry.register({
            id: "us.meta.llama3-2-11b-instruct-v1:0",
            name: "Llama 3.2 11B Vision Instruct",
            provider: ProviderType.Meta,
            version: "v1",
            category: [
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.ImageToText,
                CategoryType.Math,
                CategoryType.MultilingualSupport,
                CategoryType.NaturalLanguageProcessing,
                CategoryType.QuestionAnswering,
                CategoryType.RAG,
                CategoryType.TextGeneration,
                CategoryType.TextToText,
                CategoryType.Translation
            ],
            tier: TierType.Premium,
            description: "Instruction-tuned image reasoning generative model (text + images in / text out) optimized for visual recognition, image reasoning, captioning and answering general questions about the image.",
            longDescription: "The Llama 3.2 11B Vision Instruct model is a multimodal, fine-tuned model, leveraging 11 billion parameters to deliver unparalleled capabilities in image understanding, visual reasoning, and multimodal interaction.",
            capabilities: [
                "Image captioning",
                "Image-text retrieval",
                "Visual grounding",
                "Visual question answering",
                "Document visual question answering"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            streaming: true,
            regions: ["us-east-1", "us-east-2", "us-west-2"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true,
                supportedLanguages: ["English", "German", "French", "Italian", "Portuguese", "Hindi", "Spanish", "Thai"]
            },
            useCase: {
                recommended: ["Image analysis", "Document processing", "Multimodal chatbots"],
                notRecommended: ["Text-only applications"]
            },
            status: "stable",
            lastUpdated: "2024-09-25"
        });
        // Llama 3.2 90B Vision Instruct
        this.registry.register({
            id: "us.meta.llama3-2-90b-instruct-v1:0",
            name: "Llama 3.2 90B Vision Instruct",
            provider: ProviderType.Meta,
            version: "v1",
            category: [
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
                CategoryType.Translation
            ],
            tier: TierType.Premium,
            description: "Instruction-tuned image reasoning generative model optimized for visual recognition, image reasoning, captioning and answering general questions about the image",
            longDescription: "The Llama 3.2 90B Vision Instruct model is a multimodal, fine-tuned model, leveraging 90 billion parameters to deliver unparalleled capabilities in image understanding, visual reasoning, and multimodal interaction...",
            capabilities: [
                "Image captioning",
                "Visual reasoning",
                "Visual question answering",
                "Document visual question answering",
                "Multimodal interaction"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 128000,
            streaming: true,
            regions: ["us-east-1", "us-east-2", "us-west-2"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true,
                supportedLanguages: ["English", "German", "French", "Italian", "Portuguese", "Hindi", "Spanish", "Thai"]
            },
            useCase: {
                recommended: [
                    "Image analysis",
                    "Document processing",
                    "Multimodal chatbots",
                    "Autonomous systems"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-09-25"
        });

        // Llama 3.1 405B Instruct
        this.registry.register({
            id: "meta.llama3-1-405b-instruct-v1:0",
            name: "Llama 3.1 405B Instruct",
            provider: ProviderType.Meta,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.ComplexReasoningAnalysis,
                CategoryType.Conversation,
                CategoryType.MultilingualSupport,
                CategoryType.TextGeneration
            ],
            tier: TierType.Premium,
            description: "Meta Llama 3.1 405B Instruct is the largest and most powerful of the Llama 3.1 Instruct models",
            longDescription: "Meta Llama 3.1 405B Instruct is the largest and most powerful of the Llama 3.1 Instruct models that is a highly advanced model for conversational inference and reasoning, synthetic data generation...",
            capabilities: [
                "Conversational inference",
                "Reasoning",
                "Synthetic data generation",
                "Specialized domain adaptation"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            maxOutputTokens: 128000,
            streaming: true,
            regions: ["us-west-2"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                supportedLanguages: ["English", "German", "French", "Italian", "Portuguese", "Hindi", "Spanish", "Thai"]
            },
            useCase: {
                recommended: [
                    "Assistant-like chat",
                    "Natural language generation",
                    "Synthetic data generation",
                    "Model distillation"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-07-23"
        });

        // Llama 3.1 70B Instruct
        this.registry.register({
            id: "us.meta.llama3-1-70b-instruct-v1:0",
            name: "Llama 3.1 70B Instruct",
            provider: ProviderType.Meta,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.MultilingualSupport,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Premium,
            description: "An update to Meta Llama 3 70B Instruct that includes an expanded 128K context length, multilinguality and improved reasoning capabilities.",
            longDescription: "The Llama 3.1 offering of multilingual large language models (LLMs) is a collection of pretrained and instruction-tuned generative models. The models are optimized for multilingual dialogue use cases and outperform many of the available open source chat models on common industry benchmarks.",
            capabilities: [
                "Multilingual dialogue",
                "Instruction following",
                "Improved reasoning",
                "Assistant-like chat",
                "Synthetic data generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            streaming: true,
            regions: [
                "us-east-1",
                "us-east-2",
                "us-west-2",
                "us-gov-west-1"
            ],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true,
                supportedLanguages: [
                    "English",
                    "German",
                    "French",
                    "Italian",
                    "Portuguese",
                    "Hindi",
                    "Spanish",
                    "Thai"
                ]
            },
            useCase: {
                recommended: [
                    "Multilingual applications",
                    "Assistant-like chat",
                    "Complex reasoning tasks",
                    "Natural language generation"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-07-23"
        });
        // Llama 3.1 8B Instruct
        this.registry.register({
            id: "us.meta.llama3-1-8b-instruct-v1:0",
            name: "Llama 3.1 8B Instruct",
            provider: ProviderType.Meta,
            version: "1.0",
            category: [
                CategoryType.TextToText,
                CategoryType.Chat,
                CategoryType.MultilingualSupport,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Standard,
            description: "An update to Meta Llama 3 8B Instruct that includes an expanded 128K context length, multilinguality and improved reasoning capabilities.",
            capabilities: [
                "Multilingual dialogue",
                "Improved reasoning",
                "Assistant-like chat",
                "Natural language generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            streaming: true,
            regions: ["us-east-1", "us-east-2", "us-west-2", "us-gov-west-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true,
                supportedLanguages: ["English", "German", "French", "Italian", "Portuguese", "Hindi", "Spanish", "Thai"]
            },
            useCase: {
                recommended: ["Multilingual applications", "Dialogue systems", "Assistant-like chat"],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-07-23"
        });

        // // Llama 3 8B Instruct
        // this.registry.register({
        //     id: "meta.llama3-8b-instruct-v1:0",
        //     name: "Llama 3 8B Instruct",
        //     provider: ProviderType.Meta,
        //     version: "1.0",
        //     category: [
        //         CategoryType.TextSummarization,
        //         CategoryType.NaturalLanguageProcessing
        //     ],
        //     tier: TierType.Standard,
        //     description: "Ideal for limited computational power and resources, edge devices, and faster training times.",
        //     capabilities: [
        //         "Text summarization",
        //         "Text classification",
        //         "Sentiment analysis"
        //     ],
        //     inputModalities: ["text"],
        //     outputModalities: ["text", "chat"],
        //     maxInputTokens: 8000,
        //     streaming: true,
        //     regions: ["us-east-1", "us-west-2", "ap-south-1", "ca-central-1", "eu-west-2"],
        //     parameters: this.getCommonTextModelParams(8000),
        //     features: {
        //         contextWindow: 8000,
        //         multilingual: false,
        //         formatting: true,
        //         streamingSupport: true,
        //         supportedLanguages: ["English"]
        //     },
        //     useCase: {
        //         recommended: ["Edge devices", "Limited computational resources", "Fast training"],
        //         notRecommended: []
        //     },
        //     status: "stable",
        //     lastUpdated: "2024-04-18"
        // });

        // // Llama 3 70B Instruct
        // this.registry.register({
        //     id: "meta.llama3-70b-instruct-v1:0",
        //     name: "Llama 3 70B Instruct",
        //     provider: ProviderType.Meta,
        //     version: "1.0",
        //     category: [
        //         CategoryType.TextGeneration,
        //         CategoryType.Chat,
        //         CategoryType.CodeGeneration
        //     ],
        //     tier: TierType.Premium,
        //     description: "Ideal for content creation, conversational AI, language understanding, R&D, and Enterprise applications.",
        //     capabilities: [
        //         "Language modeling",
        //         "Dialog systems",
        //         "Code generation",
        //         "Text classification",
        //         "Text summarization",
        //         "Sentiment analysis"
        //     ],
        //     inputModalities: ["text"],
        //     outputModalities: ["text", "chat"],
        //     maxInputTokens: 8000,
        //     streaming: true,
        //     regions: ["us-east-1", "us-west-2", "ap-south-1", "ca-central-1", "eu-west-2"],
        //     parameters: this.getCommonTextModelParams(8000),
        //     features: {
        //         contextWindow: 8000,
        //         multilingual: false,
        //         formatting: true,
        //         streamingSupport: true,
        //         supportedLanguages: ["English"]
        //     },
        //     useCase: {
        //         recommended: ["Content creation", "Conversational AI", "Enterprise applications", "R&D"],
        //         notRecommended: []
        //     },
        //     status: "stable",
        //     lastUpdated: "2024-04-18"
        // });

        // Llama 3.3 70B Instruct
        this.registry.register({
            id: "us.meta.llama3-3-70b-instruct-v1:0",
            name: "Llama 3.3 70B Instruct",
            provider: ProviderType.Meta,
            version: "v1",
            category: [
                CategoryType.Chat,
                CategoryType.TextGeneration,
                CategoryType.MultilingualSupport,
                CategoryType.ComplexReasoningAnalysis
            ],
            tier: TierType.Premium,
            description: "Latest version of Meta Llama 3 70B Instruct offering on par performance with 405B model at lower cost, featuring 128K context length, enhanced reasoning and multilingual capabilities.",
            longDescription: "The Llama 3.3 70B Instruct model represents a significant improvement in efficiency, delivering performance comparable to the 405B model at reduced cost. It excels in instruction following, reasoning, understanding nuances and context, and multilingual translation.",
            capabilities: [
                "Enhanced instruction following",
                "Advanced reasoning",
                "Nuanced context understanding",
                "Multilingual translation",
                "Assistant-like chat",
                "Synthetic data generation"
            ],
            inputModalities: ["text"],
            outputModalities: ["text", "chat"],
            maxInputTokens: 128000,
            streaming: true,
            regions: [
                "us-east-1",
                "us-east-2",
                "us-west-2",
                "us-gov-west-1"
            ],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true,
                supportedLanguages: [
                    "English",
                    "German",
                    "French",
                    "Italian",
                    "Portuguese",
                    "Hindi",
                    "Spanish",
                    "Thai"
                ]
            },
            useCase: {
                recommended: [
                    "Multilingual applications",
                    "Assistant-like chat",
                    "Complex reasoning tasks",
                    "Natural language generation"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-12-18"
        });
    }
}