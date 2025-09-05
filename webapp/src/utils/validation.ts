// src/utils/validation.ts
import { ModelOption } from '@/types/models';

export function validateModel(model: ModelOption): void {
    const requiredFields: (keyof ModelOption)[] = [
        'id', 'name', 'provider', 'category', 'tier',
        'description', 'capabilities', 'parameters'
    ];

    for (const field of requiredFields) {
        if (!model[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    if (!model.inputModalities?.length || !model.outputModalities?.length) {
        throw new Error('Model must specify input and output modalities');
    }
}