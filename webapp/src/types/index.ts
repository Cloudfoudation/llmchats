// types.ts
import { CategoryType } from '@/types/models'

import {
    ModelParams
} from '@/types/models';

export interface AppSettings {
    region: string;
    isSidebarVisible: boolean;
    defaultModelParams: ModelParams;
    externalApiKeys?: {
        openai?: {
            apiKey: string;
            baseUrl?: string;
        };
        groq?: string;
        sambanova?: string;
    };
}

export const defaultSettings: AppSettings = {
    region: 'us-west-2',
    isSidebarVisible: true,
    defaultModelParams: {
        modelId: 'us.anthropic.claude-3-haiku-20240307-v1:0',
        maxTokens: 1024,
        temperature: 0.7,
        topP: 1,
        maxTurns: 10,

        // Image defaults
        imageWidth: 1024,
        imageHeight: 1024,
        numImages: 1,
        quality: 'standard',
        steps: 30,

        // Video defaults
        videoQuality: 'standard',
        videoDimension: '1280x720',
        durationSeconds: 10,
        fps: 30
    },
    externalApiKeys: {
        openai: {
            apiKey: '',
            baseUrl: ''
        },
        groq: ''
    }
};

export interface FormSelectionState {
    selectedCategory: CategoryType;
    selectedProvider: string;
    selectedTier: string;
    showAllModels: boolean;
}