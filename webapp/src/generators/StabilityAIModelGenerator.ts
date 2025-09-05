// src/generators/StabilityAIModelGenerator.ts
import { ModelGenerator } from '@/lib/ModelGenerator';
import { ModelParameters, ProviderType, CategoryType, TierType } from '@/types/models';
import { MODEL_DEFAULTS } from '../constants/modelDefaults';

export class StabilityAIModelGenerator extends ModelGenerator {
    public generateModels(): void {
        // SD3 Large 1.0
        this.registry.register({
            id: "stability.sd3-large-v1:0",
            name: "SD3 Large",
            provider: ProviderType.StabilityAI,
            version: "1.0",
            category: [CategoryType.Image],
            tier: TierType.Premium,
            description: "Stable Diffusion 3 Large (SD3 Large) is our most capable text-to-image model yet, with greatly improved performance in multi-subject prompts, image quality, and spelling abilities.",
            capabilities: [
                "Multi-subject prompts",
                "Enhanced image quality",
                "Improved spelling abilities",
                "Typography handling",
                "Scene composition"
            ],
            inputModalities: ["text"],
            outputModalities: ["image"],
            maxInputTokens: 77,
            streaming: false,
            regions: [], // Not specified in source
            parameters: this.getCommonImageModelParams(),
            features: {
                contextWindow: 77,
                multilingual: false,
                formatting: true,
                imageGeneration: true,
                customTraining: false
            },
            useCase: {
                recommended: ["Text-to-image generation", "Anime", "Cartoons", "Ideation"],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-09-04"
        });

        // Stable Image Core 1.0
        this.registry.register({
            id: "stability.stable-image-core-v1:0",
            name: "Stable Image Core",
            provider: ProviderType.StabilityAI,
            version: "1.0",
            category: [CategoryType.Image],
            tier: TierType.Standard,
            description: "Create and iterate images quickly and affordably with Stable Image Core, the image service that requires no prompt engineering to get high quality images in diverse styles at high speed.",
            capabilities: [
                "Fast image generation",
                "No prompt engineering required",
                "Diverse styles"
            ],
            inputModalities: ["text"],
            outputModalities: ["image"],
            maxInputTokens: 77,
            streaming: false,
            regions: [], // Not specified in source
            parameters: this.getCommonImageModelParams(),
            features: {
                contextWindow: 77,
                multilingual: false,
                formatting: true,
                imageGeneration: true
            },
            useCase: {
                recommended: ["Rapid image generation", "Simple image creation"],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-09-04"
        });

        // Stable Image Ultra 1.0
        this.registry.register({
            id: "stability.stable-image-ultra-v1:0",
            name: "Stable Image Ultra",
            provider: ProviderType.StabilityAI,
            version: "1.0",
            category: [CategoryType.Image],
            tier: TierType.Premium,
            description: "Take your visuals to a whole new level with large, photo realistic output. Enable your organization to go from idea to execution faster, extend your existing resources to achieve more, and empower creative thinking at speed and scale by building on SD3.",
            capabilities: [
                "Photo realistic output",
                "High-quality visuals",
                "Fast execution",
                "Creative ideation"
            ],
            inputModalities: ["text"],
            outputModalities: ["image"],
            maxInputTokens: 77,
            streaming: false,
            regions: [], // Not specified in source
            parameters: this.getCommonImageModelParams(),
            features: {
                contextWindow: 77,
                multilingual: false,
                formatting: true,
                imageGeneration: true
            },
            useCase: {
                recommended: ["Professional photo-realistic images", "High-quality visual content"],
                notRecommended: []
            },
            status: "stable",
            lastUpdated: "2024-09-04"
        });
    }

    protected getCommonImageModelParams(): ModelParameters {

        return {
            supportsTemperature: false,
            supportsTopP: false,
            defaultValues: MODEL_DEFAULTS.IMAGE,
            limits: {
                minTokens: 1,
                maxTokens: 77
            }
        };
    }
}