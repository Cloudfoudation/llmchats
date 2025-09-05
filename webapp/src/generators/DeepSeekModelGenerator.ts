// DeepSeekModelGenerator.ts
import { ModelGenerator } from '../lib/ModelGenerator';
import { ModelOption, ProviderType, CategoryType, TierType } from '../types/models';

export class DeepSeekModelGenerator extends ModelGenerator {
    public generateModels(): void {
        // DeepSeek-R1
        this.registry.register({
            id: "us.deepseek.r1-v1:0",
            name: "DeepSeek R1",
            provider: ProviderType.DeepSeek,
            version: "2.0.1",
            category: [
                CategoryType.TextGeneration
            ],
            tier: TierType.Premium,
            description: "First-generation reasoning model trained via large-scale reinforcement learning",
            longDescription: `DeepSeek-R1 incorporates cold-start data before reinforcement learning to enhance reasoning 
                performance. It addresses challenges like endless repetition, poor readability, and language mixing. The model 
                achieves performance comparable to OpenAI-o1 across math, code, and reasoning tasks, featuring advanced 
                capabilities in chain-of-thought reasoning and problem-solving.`,
            capabilities: [
                "Advanced reasoning",
                "Mathematical problem solving",
                "Code generation and analysis",
                "Natural language processing",
                "Chain-of-thought reasoning",
                "Multi-turn conversations"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-west-2"],
            parameters: this.getDeepSeekModelParams(),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                codeCompletion: true,
                mathSolving: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Complex reasoning tasks",
                    "Mathematical computations",
                    "Code generation and analysis",
                    "Research and analysis",
                    "Educational applications"
                ],
                notRecommended: [
                    "Image or audio processing",
                    "Real-time low-latency applications",
                    "Tasks requiring specialized domain knowledge"
                ]
            },
            // modelArn: "arn:aws:sagemaker:us-west-2:aws:hub-content/SageMakerPublicHub/Model/deepseek-llm-r1/2.0.1",
            status: "stable",
            lastUpdated: "2025-02-03",
            // releaseDate: "2025-02-03T11:57:41.000Z"
        });
/*
        // DeepSeek-R1-Distill-Llama-70B
        this.registry.register({
            id: "arn:aws:sagemaker:us-west-2:808491074893:endpoint/deepseek-llm-r1-distill-llama-70b",
            name: "DeepSeek R1 Distill Llama 70B",
            provider: ProviderType.DeepSeek,
            version: "1.0.0",
            category: [
                CategoryType.TextGeneration
            ],
            tier: TierType.Premium,
            description: "Advanced reasoning model trained via large-scale reinforcement learning with cold-start data",
            longDescription: `DeepSeek-R1-Distill-Llama-70B is part of DeepSeek's first-generation reasoning models. 
                Building on DeepSeek-R1-Zero's foundation, this model incorporates cold-start data before reinforcement 
                learning to address challenges like endless repetition, poor readability, and language mixing. It achieves 
                performance comparable to OpenAI-o1 across math, code, and reasoning tasks.`,
            capabilities: [
                "Advanced reasoning",
                "Mathematical problem solving",
                "Code generation and analysis",
                "Natural language processing",
                "Chain-of-thought reasoning",
                "Multi-turn conversations"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-west-2"],
            parameters: this.getDeepSeekModelParams(),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                codeCompletion: true,
                mathSolving: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Complex reasoning tasks",
                    "Mathematical computations",
                    "Code generation and analysis",
                    "Research and analysis",
                    "Educational applications"
                ],
                notRecommended: [
                    "Image or audio processing",
                    "Real-time low-latency applications",
                    "Tasks requiring specialized domain knowledge"
                ]
            },
            // modelArn: "arn:aws:sagemaker:us-west-2:aws:hub-content/SageMakerPublicHub/Model/deepseek-llm-r1-distill-llama-70b/1.0.0",
            status: "stable",
            lastUpdated: "2025-02-05",
            // releaseDate: "2025-02-05T10:33:37.000Z"
        });        

        // DeepSeek-R1-Distill-Llama-70B
        this.registry.register({
            id: "arn:aws:bedrock:us-west-2:808491074893:imported-model/mjpdsms3v4kk",
            name: "DeepSeek R1 Distill Llama 70B (custom)",
            provider: ProviderType.DeepSeek,
            version: "1.0.0",
            category: [
                CategoryType.TextGeneration
            ],
            tier: TierType.Premium,
            description: "Advanced reasoning model trained via large-scale reinforcement learning with cold-start data",
            longDescription: `DeepSeek-R1-Distill-Llama-70B is part of DeepSeek's first-generation reasoning models. 
                Building on DeepSeek-R1-Zero's foundation, this model incorporates cold-start data before reinforcement 
                learning to address challenges like endless repetition, poor readability, and language mixing. It achieves 
                performance comparable to OpenAI-o1 across math, code, and reasoning tasks.`,
            capabilities: [
                "Advanced reasoning",
                "Mathematical problem solving",
                "Code generation and analysis",
                "Natural language processing",
                "Chain-of-thought reasoning",
                "Multi-turn conversations"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 128000,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-west-2"],
            parameters: this.getDeepSeekModelParams(),
            features: {
                contextWindow: 128000,
                multilingual: true,
                formatting: true,
                codeCompletion: true,
                mathSolving: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Complex reasoning tasks",
                    "Mathematical computations",
                    "Code generation and analysis",
                    "Research and analysis",
                    "Educational applications"
                ],
                notRecommended: [
                    "Image or audio processing",
                    "Real-time low-latency applications",
                    "Tasks requiring specialized domain knowledge"
                ]
            },
            // modelArn: "arn:aws:sagemaker:us-west-2:aws:hub-content/SageMakerPublicHub/Model/deepseek-llm-r1-distill-llama-70b/1.0.0",
            status: "stable",
            lastUpdated: "2025-02-05",
            // releaseDate: "2025-02-05T10:33:37.000Z"
        });

        // DeepSeek-R1-Distill-Qwen-32B
        this.registry.register({
            id: "arn:aws:sagemaker:us-west-2:808491074893:endpoint/deepseek-llm-r1-distill-qwen-32b",
            name: "DeepSeek R1 Distill Qwen 32B",
            provider: ProviderType.DeepSeek,
            version: "1.0.0",
            category: [CategoryType.TextGeneration],
            tier: TierType.Premium,
            description: "Dense model distilled from DeepSeek-R1 based on Qwen architecture achieving state-of-the-art results",
            longDescription: `DeepSeek-R1-Distill-Qwen-32B is a dense model distilled from DeepSeek-R1 using the Qwen 
                architecture. It outperforms OpenAI-o1-mini across various benchmarks, achieving new state-of-the-art results 
                for dense models. The model incorporates advanced reasoning patterns through distillation from larger models, 
                demonstrating that smaller models can achieve powerful reasoning capabilities.`,
            capabilities: [
                "Advanced reasoning",
                "Mathematical problem solving",
                "Natural language processing",
                "Chain-of-thought reasoning",
                "Multi-turn conversations"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 32768,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-west-2"],
            parameters: this.getDeepSeekModelParams(),
            features: {
                contextWindow: 32768,
                multilingual: true,
                formatting: true,
                mathSolving: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Complex reasoning tasks",
                    "Mathematical computations",
                    "Research and analysis",
                    "Educational applications"
                ],
                notRecommended: [
                    "Image or audio processing",
                    "Real-time low-latency applications",
                    "Tasks requiring specialized domain knowledge"
                ]
            },
            // modelArn: "arn:aws:sagemaker:us-west-2:aws:hub-content/SageMakerPublicHub/Model/deepseek-llm-r1-distill-qwen-32b/1.0.0",
            status: "stable",
            lastUpdated: "2025-02-05",
            // releaseDate: "2025-02-05T10:33:44.000Z"
        });

        // DeepSeek-R1-Distill-Llama-8B
        this.registry.register({
            id: "arn:aws:sagemaker:us-west-2:808491074893:endpoint/deepseek-llm-r1-distill-llama-8b",
            name: "DeepSeek R1 Distill Llama 8B",
            provider: ProviderType.DeepSeek,
            version: "1.0.0",
            category: [CategoryType.TextGeneration],
            tier: TierType.Premium,
            description: "Efficient 8B parameter model distilled from DeepSeek-R1 based on Llama architecture",
            longDescription: `DeepSeek-R1-Distill-Llama-8B is a compact model distilled from DeepSeek-R1 using the Llama 
        architecture. It demonstrates that smaller models can effectively learn advanced reasoning patterns through 
        distillation from larger models. This 8B parameter model offers a good balance between performance and 
        computational efficiency, making it suitable for various applications while maintaining strong reasoning 
        capabilities.`,
            capabilities: [
                "Advanced reasoning",
                "Mathematical problem solving",
                "Natural language processing",
                "Chain-of-thought reasoning",
                "Multi-turn conversations"
            ],
            inputModalities: ["text"],
            outputModalities: ["text"],
            maxInputTokens: 32768,
            maxOutputTokens: 4096,
            streaming: true,
            regions: ["us-west-2"],
            parameters: this.getDeepSeekModelParams(),
            features: {
                contextWindow: 32768,
                multilingual: true,
                formatting: true,
                mathSolving: true,
                streamingSupport: true
            },
            useCase: {
                recommended: [
                    "Complex reasoning tasks",
                    "Mathematical computations",
                    "Research and analysis",
                    "Educational applications",
                    "Resource-constrained environments"
                ],
                notRecommended: [
                    "Image or audio processing",
                    "Real-time low-latency applications",
                    "Tasks requiring specialized domain knowledge"
                ]
            },
            status: "stable",
            lastUpdated: "2025-02-05"
        });
*/        
    }

    private getDeepSeekModelParams() {
        return {
            supportsTemperature: true,
            supportsTopP: true,
            defaultValues: {
                temperature: 0.7,
                topP: 0.9,
                maxNewTokens: 128,
                repetitionPenalty: 1.1,
                stopSequences: ["<|end_of_sentence|>"]
            },
            limits: {
                minTemperature: 0.0,
                maxTemperature: 1.0,
                minTopP: 0.0,
                maxTopP: 1.0,
                maxTokens: 4096
            },
            formatters: {
                inputFormat: "<|begin_of_sentence|><|User|>{input}<|Assistant|>",
                outputFormat: "<|end_of_sentence|>"
            }
        };
    }
}