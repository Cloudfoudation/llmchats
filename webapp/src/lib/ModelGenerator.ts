// src/lib/ModelGenerator.ts
import { ModelParameters } from '../types/models';
import { ModelRegistry } from './ModelRegistry';
import { MODEL_DEFAULTS } from '../constants/modelDefaults';

export abstract class ModelGenerator {
    protected registry: ModelRegistry;

    constructor() {
        this.registry = ModelRegistry.getInstance();
    }

    protected abstract generateModels(): void;

    protected getCommonTextModelParams(maxTokens: number) {
        return {
            supportsTemperature: true,
            supportsTopP: true,
            defaultValues: { ...MODEL_DEFAULTS.TEXT, maxTokens },
            limits: {
                minTemperature: 0,
                maxTemperature: 1,
                minTopP: 0,
                maxTopP: 1,
                minTokens: 1,
                maxTokens
            }
        };
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