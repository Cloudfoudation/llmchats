// src/lib/ModelRegistry.ts
import { ModelOption, CategoryType } from '@/types/models';
import { validateModel } from '@/utils/validation';

export class ModelRegistry {
    private static instance: ModelRegistry;
    private models: Map<string, ModelOption> = new Map();

    private constructor() { }

    static getInstance(): ModelRegistry {
        if (!this.instance) {
            this.instance = new ModelRegistry();
        }
        return this.instance;
    }

    register(model: ModelOption): void {
        validateModel(model);
        this.models.set(model.id, model);
    }

    getModel(id: string): ModelOption | undefined {
        return this.models.get(id);
    }

    getModels(): ModelOption[] {
        return Array.from(this.models.values());
    }

    filterModels(predicate: (model: ModelOption) => boolean): ModelOption[] {
        return this.getModels().filter(predicate);
    }

    getModelsByProvider(provider: string): ModelOption[] {
        return this.filterModels(model => model.provider === provider);
    }

    getModelsByCategory(category: CategoryType): ModelOption[] {
        return this.filterModels(model => model.category.includes(category));
    }
}