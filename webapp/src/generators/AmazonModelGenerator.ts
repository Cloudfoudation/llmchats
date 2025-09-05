// Amazon Titan Models Generator
import { ModelGenerator } from '../lib/ModelGenerator';
import { ModelOption, ProviderType, CategoryType, TierType } from '../types/models';

export class AmazonTitanModelGenerator extends ModelGenerator {
    public generateModels(): void {
        // Titan Embeddings G1 - Text
        // this.registry.register({
        //     id: "amazon.titan-embed-text-v1",
        //     name: "Titan Embeddings G1 - Text",
        //     provider: ProviderType.Amazon,
        //     version: "1.2",
        //     category: [CategoryType.Embedding, CategoryType.Vector],
        //     tier: TierType.Standard,
        //     description: "Titan Embeddings model optimized for text retrieval tasks with multi-language support",
        //     longDescription: "The Titan Embeddings G1 – Text can intake up to 8k tokens and outputs a vector of 1536 dimensions. The model works in 25+ different languages and is optimized for text retrieval tasks, semantic similarity, and clustering.",
        //     capabilities: [
        //         "text retrieval",
        //         "semantic similarity",
        //         "clustering",
        //         "document segmentation"
        //     ],
        //     inputModalities: ["text"],
        //     outputModalities: ["embedding"],
        //     maxInputTokens: 8000,
        //     streaming: false,
        //     regions: [
        //         "us-east-1",
        //         "us-west-2",
        //         "ap-northeast-1",
        //         "eu-central-1"
        //     ],
        //     parameters: this.getCommonTextModelParams(8000),
        //     features: {
        //         contextWindow: 8000,
        //         multilingual: true,
        //         vectorDimensions: 1536,
        //         supportedLanguages: [
        //             "English", "Arabic", "Chinese (Sim.)", "French", "German",
        //             "Hindi", "Japanese", "Spanish", "Czech", "Filipino",
        //             "Hebrew", "Italian", "Korean", "Portuguese", "Russian",
        //             "Swedish", "Turkish", "Chinese (trad)", "Dutch", "Kannada",
        //             "Malayalam", "Marathi", "Polish", "Tamil", "Telugu"
        //         ]
        //     },
        //     status: "stable",
        //     lastUpdated: "2023-09-28"
        // });

        // // Titan Text G1 - Lite
        // this.registry.register({
        //     id: "amazon.titan-text-lite-v1",
        //     name: "Titan Text G1 - Lite",
        //     provider: ProviderType.Amazon,
        //     version: "1.0",
        //     category: [
        //         CategoryType.TextGeneration,
        //         CategoryType.TextSummarization
        //     ],
        //     tier: TierType.Basic,
        //     description: "Lightweight efficient model ideal for fine-tuning English-language tasks",
        //     capabilities: [
        //         "summarization",
        //         "copywriting",
        //         "fine-tuning"
        //     ],
        //     inputModalities: ["text"],
        //     outputModalities: ["text"],
        //     maxInputTokens: 4000,
        //     streaming: true,
        //     regions: [
        //         "us-east-1", "us-west-2", "ap-south-1", "ap-southeast-2",
        //         "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2",
        //         "eu-west-3", "sa-east-1"
        //     ],
        //     parameters: this.getCommonTextModelParams(4000),
        //     features: {
        //         contextWindow: 4000,
        //         multilingual: false,
        //         finetuning: true,
        //         customTraining: true
        //     },
        //     status: "stable",
        //     lastUpdated: "2023-11-29"
        // });

        // // Titan Text G1 - Express
        // this.registry.register({
        //     id: "amazon.titan-text-express-v1",
        //     name: "Titan Text G1 - Express",
        //     provider: ProviderType.Amazon,
        //     version: "1.0",
        //     category: [
        //         CategoryType.TextGeneration,
        //         CategoryType.Chat,
        //         CategoryType.RAG
        //     ],
        //     tier: TierType.Standard,
        //     description: "Model for advanced language tasks with extensive multilingual support",
        //     capabilities: [
        //         "open-ended text generation",
        //         "conversational chat",
        //         "RAG support",
        //         "multilingual processing"
        //     ],
        //     inputModalities: ["text"],
        //     outputModalities: ["text", "chat"],
        //     maxInputTokens: 8000,
        //     streaming: true,
        //     regions: [
        //         "us-east-1", "us-west-2", "us-gov-west-1", "ap-northeast-1",
        //         "ap-south-1", "ap-southeast-2", "ca-central-1", "eu-central-1",
        //         "eu-west-1", "eu-west-2", "eu-west-3", "sa-east-1"
        //     ],
        //     parameters: this.getCommonTextModelParams(8000),
        //     features: {
        //         contextWindow: 8000,
        //         multilingual: true,
        //         supportedLanguages: ["English", "100+ additional languages (Preview)"]
        //     },
        //     status: "stable",
        //     lastUpdated: "2023-11-29"
        // });

        this.registry.register({
            id: "amazon.titan-image-generator-v2:0",
            name: "Titan Image Generator G1 v2",
            provider: ProviderType.Amazon,
            version: "2.0",
            category: [
                CategoryType.Image,
                CategoryType.TextToText,
                CategoryType.ImageToText
            ],
            tier: TierType.Standard,
            description: "Image generation model with text-to-image, image editing, and background removal capabilities",
            longDescription: "Titan Image Generator is an image generation model. It generates images from text, allows users to upload and edit an existing or generated image. Users can edit an image with a text prompt (without a mask), parts of an image with an image mask, generate variations of an image or remove background automatically.",
            capabilities: [
                "Text to image generation",
                "Image editing",
                "Background removal",
                "Image conditioning",
                "Subject preservation",
                "Image variations"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["image"],
            maxInputTokens: 512,
            maxOutputTokens: 4096,
            streaming: false,
            regions: ["us-east-1", "us-west-2"],
            parameters: this.getCommonImageModelParams(),
            features: {
                contextWindow: 512,
                multilingual: false,
                formatting: true,
                imageGeneration: true,
                imageAnalysis: true
            },
            useCase: {
                recommended: [
                    "Image generation",
                    "Image editing",
                    "Background removal",
                    "Image variations"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-08-06"
        });

        // Titan Image Generator G1 (v1)
        this.registry.register({
            id: "amazon.titan-image-generator-v1",
            name: "Titan Image Generator G1",
            provider: ProviderType.Amazon,
            version: "1.0",
            category: [
                CategoryType.Image,
                CategoryType.TextToText
            ],
            tier: TierType.Standard,
            description: "First generation image generation model with text-to-image and image editing capabilities",
            capabilities: [
                "Text to image generation",
                "Image editing",
                "Image masking",
                "Outpainting",
                "Image variations"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["image"],
            maxInputTokens: 512,
            streaming: false,
            regions: ["us-east-1", "us-west-2", "ap-south-1", "eu-west-1", "eu-west-2"],
            parameters: this.getCommonImageModelParams(),
            features: {
                contextWindow: 512,
                multilingual: false,
                formatting: true,
                imageGeneration: true,
                imageAnalysis: true
            },
            useCase: {
                recommended: [
                    "Image generation",
                    "Image editing",
                    "Outpainting",
                    "Image variations"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2023-11-29"
        });

        // Titan Multimodal Embeddings G1
        // this.registry.register({
        //     id: "amazon.titan-embed-image-v1",
        //     name: "Titan Multimodal Embeddings G1",
        //     provider: ProviderType.Amazon,
        //     version: "1.0",
        //     category: [
        //         CategoryType.Embedding,
        //         CategoryType.Vector,
        //         CategoryType.Search
        //     ],
        //     tier: TierType.Standard,
        //     description: "Multimodal embeddings model for image and text search use cases",
        //     capabilities: [
        //         "Image search",
        //         "Text search",
        //         "Combined text and image search",
        //         "Recommendations"
        //     ],
        //     inputModalities: ["text", "image"],
        //     outputModalities: ["embedding"],
        //     maxInputTokens: 128,
        //     streaming: false,
        //     regions: [
        //         "us-east-1", "us-west-2", "ap-south-1", "ap-southeast-2",
        //         "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2",
        //         "eu-west-3", "sa-east-1"
        //     ],
        //     parameters: this.getCommonEmbeddingModelParams(),
        //     features: {
        //         contextWindow: 128,
        //         multilingual: false,
        //         formatting: true,
        //         vectorDimensions: [1024, 384, 256]
        //     },
        //     useCase: {
        //         recommended: [
        //             "Image search",
        //             "Multimodal search",
        //             "Recommendations"
        //         ],
        //         notRecommended: []
        //     },
        //     status: "stable",
        //     lastUpdated: "2023-11-29"
        // });

        // this.registry.register({
        //     id: "amazon.titan-embed-text-v2:0",
        //     name: "Titan Text Embeddings V2",
        //     provider: ProviderType.Amazon,
        //     version: "2.0",
        //     category: [CategoryType.Embedding],
        //     tier: TierType.Standard,
        //     description: "Light weight, efficient model for high accuracy retrieval tasks at different dimensions",
        //     longDescription: "Amazon Titan Text Embeddings V2 is a light weight, efficient model ideal for high accuracy retrieval tasks at different dimensions. The model supports flexible embeddings sizes (1024, 512, and 256) and prioritizes accuracy maintenance at smaller dimension sizes, making it possible to reduce storage costs without compromising on accuracy.",
        //     capabilities: [
        //         "Multiple embedding dimensions (1024, 512, 256)",
        //         "Multi-lingual support for 100+ languages",
        //         "Unit vector normalization"
        //     ],
        //     inputModalities: ["text"],
        //     outputModalities: ["embedding"],
        //     maxInputTokens: 8000,
        //     streaming: false,
        //     regions: [
        //         "us-east-1", "us-east-2", "us-west-2", "us-gov-west-1",
        //         "ap-northeast-2", "ap-southeast-2", "ca-central-1",
        //         "eu-central-1", "eu-central-2", "eu-west-2", "sa-east-1"
        //     ],
        //     parameters: this.getCommonEmbeddingModelParams(),
        //     features: {
        //         contextWindow: 8000,
        //         multilingual: true,
        //         formatting: true
        //     },
        //     useCase: {
        //         recommended: ["Embedding generation", "Retrieval tasks", "Vector search"],
        //         notRecommended: []
        //     },
        //     status: "stable",
        //     lastUpdated: "2024-04-30"
        // });

        // // Rerank 1.0
        // this.registry.register({
        //     id: "amazon.rerank-v1:0",
        //     name: "Rerank",
        //     provider: ProviderType.Amazon,
        //     version: "1.0",
        //     category: [CategoryType.Search],
        //     tier: TierType.Standard,
        //     description: "Orders documents based on their relevance to user queries",
        //     longDescription: "Amazon's Rerank model orders a set of documents based on their relevance to a user's query. This ordering helps you prioritize the most relevant content to be passed to a foundation model for response generation, which in turn boosts the relevance and accuracy of the generated responses.",
        //     capabilities: [
        //         "Document reranking",
        //         "Relevance scoring",
        //         "Multi-lingual support"
        //     ],
        //     maxInputTokens: 10000,
        //     inputModalities: ["text"],
        //     outputModalities: ["text"],
        //     streaming: false,
        //     regions: ["us-east-1"], // Assuming default region since not specified
        //     parameters: this.getCommonTextModelParams(10000),
        //     features: {
        //         contextWindow: 20000,
        //         multilingual: true,
        //         formatting: true
        //     },
        //     useCase: {
        //         recommended: ["Document ranking", "Search optimization", "Content prioritization"],
        //         notRecommended: []
        //     },
        //     status: "stable",
        //     lastUpdated: "2024-12-01"
        // });

        // Nova Pro
        this.registry.register({
            id: "us.amazon.nova-pro-v1:0",
            name: "Nova Pro",
            provider: ProviderType.Amazon,
            version: "1.0",
            category: [CategoryType.Multimodal],
            tier: TierType.Premium,
            description: "Multimodal understanding foundation model",
            longDescription: "Nova Pro is a multimodal understanding foundation model. It is multilingual and can reason over text, images and videos.",
            capabilities: [
                "Text understanding",
                "Image analysis",
                "Video analysis",
                "Document processing",
                "Multi-lingual support",
                "Teacher for Lite and Micro models"
            ],
            inputModalities: ["text", "image", "video"],
            outputModalities: ["text"],
            maxInputTokens: 300000,
            maxOutputTokens: 10000,
            streaming: true,
            regions: ["us-east-1", "ap-northeast-1", "us-gov-west-1"],
            parameters: this.getCommonTextModelParams(300000),
            features: {
                contextWindow: 300000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true,
                documentSupport: true,
                supportedDocuments: ["pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"],
                supportedLanguages: ["200+"],
                streamingSupport: true,
                batchInference: true,
                fineTuning: true,
                provisionedThroughput: true,
                modelDistillation: "Teacher to: Lite and Micro"
            },
            useCase: {
                recommended: ["Multimodal analysis", "Content understanding", "Cross-modal reasoning"],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-12-03"
        });

        // Nova Premier
        this.registry.register({
            id: "us.amazon.nova-premier-v1:0",
            name: "Nova Premier",
            provider: ProviderType.Amazon,
            version: "1.0",
            category: [
                CategoryType.Multimodal,
                CategoryType.Agents,
                CategoryType.Chat,
                CategoryType.CodeGeneration,
                // CategoryType.Analytics,
                CategoryType.RAG
            ],
            tier: TierType.Premium,
            description: "Most capable Amazon multimodal model for complex reasoning tasks and model distillation",
            longDescription: "Amazon Nova Premier is the most capable of Amazon's multimodal models for complex reasoning tasks and for use as the best teacher for distilling custom models.",
            capabilities: [
                "Complex reasoning",
                "Multimodal understanding",
                "Model distillation",
                "Document processing",
                "Teacher for Pro, Lite, and Micro models"
            ],
            inputModalities: ["text", "image", "video"],
            outputModalities: ["text"],
            maxInputTokens: 1000000,
            maxOutputTokens: 10000,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(1000000),
            features: {
                contextWindow: 1000000,
                multilingual: true,
                formatting: true,
                imageAnalysis: true,
                multimodal: true,
                documentSupport: true,
                supportedDocuments: ["pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"],
                supportedLanguages: ["200+"],
                streamingSupport: true,
                batchInference: true,
                modelDistillation: "Teacher to: Pro, Lite, and Micro"
            },
            useCase: {
                recommended: [
                    "Complex reasoning tasks",
                    "Model distillation",
                    "Multimodal analysis",
                    "Document processing"
                ],
                notRecommended: []
            },
            status: "preview",
            lastUpdated: "2025-04-30"
        });

        // Nova Lite
        this.registry.register({
            id: "us.amazon.nova-lite-v1:0",
            name: "Nova Lite",
            provider: ProviderType.Amazon,
            version: "1.0",
            category: [
                CategoryType.Multimodal,
                CategoryType.TextToText,
                CategoryType.ImageToText,
            ],
            tier: TierType.Standard,
            description: "Nova Lite is a multimodal understanding foundation model. It is multilingual and can reason over text, images and videos.",
            capabilities: [
                "text understanding",
                "image understanding",
                "video understanding",
                "multilingual support"
            ],
            inputModalities: ["text", "image", "video"],
            outputModalities: ["text"],
            maxInputTokens: 300000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-east-1"],
            parameters: this.getCommonTextModelParams(300000),
            features: {
                contextWindow: 300000,
                multilingual: true,
                formatting: true,
                multimodal: true,
                imageAnalysis: true,
                streamingSupport: true,
                supportedLanguages: ["200+"]
            },
            useCase: {
                recommended: ["Multimodal analysis", "Multilingual tasks", "Text generation"],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-12-03"
        });

        // Nova Micro
        this.registry.register({
            id: "us.amazon.nova-micro-v1:0",
            name: "Nova Micro",
            provider: ProviderType.Amazon,
            version: "1.0",
            category: [
                CategoryType.TextToText,
                CategoryType.NaturalLanguageProcessing
            ],
            tier: TierType.Basic,
            description: "Nova Micro is a text - text understanding foundation model. It is multilingual and can reason over text.",
            capabilities: [
                "text understanding",
                "multilingual support"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 10000,
            streaming: true,
            regions: ["us-east-1", "ap-northeast-1", "us-gov-west-1"],
            parameters: this.getCommonTextModelParams(128000),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                streamingSupport: true,
                supportedLanguages: ["200+"],
                documentSupport: false,
                batchInference: true,
                fineTuning: true,
                provisionedThroughput: true,
                modelDistillation: "Student of: Premier and Pro"
            },
            useCase: {
                recommended: ["Text analysis", "Multilingual tasks"],
                notRecommended: ["Multimodal tasks"]
            },
            status: "stable",
            lastUpdated: "2024-12-03"
        });

        // Nova Canvas
        this.registry.register({
            id: "amazon.nova-canvas-v1:0",
            name: "Nova Canvas",
            provider: ProviderType.Amazon,
            version: "1.0",
            category: [
                CategoryType.Image,
                CategoryType.TextToImage,
                CategoryType.ImageToImage
            ],
            tier: TierType.Standard,
            description: "Image generation model with text-to-image and image editing capabilities",
            longDescription: "Nova Canvas is an image generation model. It generates images from text and allows users to upload and edit an existing image. Users can edit an image with a text prompt (without a mask) or parts of an image with an image mask, or extend the boundaries of an image with outpainting. It can also generate variations of an image.",
            capabilities: [
                "Text to image generation",
                "Image editing",
                "Image masking",
                "Outpainting",
                "Image variations"
            ],
            inputModalities: ["text", "image"],
            outputModalities: ["image"],
            maxInputTokens: 1024,
            streaming: false,
            regions: ["us-east-1"],
            parameters: this.getCommonImageModelParams(),
            features: {
                contextWindow: 1024,
                multilingual: false,
                formatting: true,
                imageGeneration: true,
                imageEditing: true
            },
            useCase: {
                recommended: [
                    "Image generation",
                    "Image editing",
                    "Outpainting",
                    "Image variations"
                ],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-12-03"
        });

        // // Nova Reel
        // this.registry.register({
        //     id: "amazon.nova-reel-v1:0",
        //     name: "Nova Reel",
        //     provider: ProviderType.Amazon,
        //     version: "1.0",
        //     category: [
        //         CategoryType.Video,
        //         CategoryType.TextToVideo,
        //         CategoryType.ImageToVideo
        //     ],
        //     tier: TierType.Standard,
        //     description: "Video generation model for creating short high-definition videos",
        //     longDescription: "Nova Reel is a video generation model. It generates short high-definition videos, up to 9 seconds long from input images or a natural language prompt.",
        //     capabilities: [
        //         "Text to video generation",
        //         "Image to video generation",
        //         "High-definition video output",
        //         "Variable duration control"
        //     ],
        //     inputModalities: ["text", "image"],
        //     outputModalities: ["video"],
        //     maxInputTokens: 512,
        //     streaming: false,
        //     regions: ["us-east-1"],
        //     parameters: this.getCommonVideoModelParams(),
        //     features: {
        //         contextWindow: 512,
        //         multilingual: false,
        //         formatting: true,
        //         videoGeneration: true,
        //         maxDuration: 9,
        //         supportedResolutions: ["1280x720"],
        //         fps: 24
        //     },
        //     useCase: {
        //         recommended: [
        //             "Video generation",
        //             "Video content creation",
        //             "Animation"
        //         ],
        //         notRecommended: []
        //     },
        //     status: "stable",
        //     lastUpdated: "2024-12-03"
        // });
    }

    private getCommonEmbeddingModelParams() {
        return {
            supportsTemperature: false,
            supportsTopP: false,
            defaultValues: {},
            limits: {}
        };
    }
    private getCommonVideoModelParams() {
        return {
            supportsTemperature: false,
            supportsTopP: false,
            defaultValues: {
                durationSeconds: 6,
                fps: 24,
                dimension: "1280x720"
            },
            limits: {
                maxDuration: 9,
                minDuration: 1
            }
        };
    }
}