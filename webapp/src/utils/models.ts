import { MODELS, ModelOption } from '@/types/models';

// Get all models available in a specific region
export const getAvailableModelsForRegion = (region: string): ModelOption[] => {
    return MODELS.filter(model => {
        // Handle regions with gates/asterisks
        const normalizedRegions = model.regions.map(r => r.replace(' (Gated)', '').replace('*', ''));
        return normalizedRegions.includes(region);
    });
};

// Get model by ID
export const getModelById = (modelId: string): ModelOption | undefined => {
    const model = MODELS.find(m => m.id === modelId);
    if (model) return model;
    return undefined;
};

// Get all regions where a model is available
export const getModelRegions = (modelId: string): string[] => {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return [];

    // Return normalized regions (remove gates and asterisks)
    return model.regions.map(region => region.replace(' (Gated)', '').replace('*', ''));
};

// Check if model is available in a specific region
export const isModelAvailableInRegion = (modelId: string, region: string): boolean => {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return false;

    // Normalize regions for comparison
    const normalizedRegions = model.regions.map(r => r.replace(' (Gated)', '').replace('*', ''));
    return normalizedRegions.includes(region);
};

// New helper functions

// Check if model is gated in a region
export const isModelGatedInRegion = (modelId: string, region: string): boolean => {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return false;

    const gatedRegion = model.regions.find(r => r.includes(region));
    return gatedRegion ? gatedRegion.includes('(Gated)') : false;
};

// Check if model is in preview/beta in a region
export const isModelPreviewInRegion = (modelId: string, region: string): boolean => {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return false;

    const previewRegion = model.regions.find(r => r.includes(region));
    return previewRegion ? previewRegion.includes('*') : false;
};

// Get all available regions with their status
export const getModelRegionsWithStatus = (modelId: string): Array<{ region: string, gated: boolean, preview: boolean }> => {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return [];

    return model.regions.map(region => ({
        region: region.replace(' (Gated)', '').replace('*', ''),
        gated: region.includes('(Gated)'),
        preview: region.includes('*')
    }));
};