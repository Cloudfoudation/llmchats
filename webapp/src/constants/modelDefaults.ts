// src/constants/modelDefaults.ts

export const MODEL_DEFAULTS = {
    TEXT: {
        temperature: 0.7,
        topP: 0.9,
    },
    IMAGE: {
        quality: "standard",
        size: "1024x1024"
    }
} as const;

export const SUPPORTED_REGIONS = {
    US: ['us-east-1', 'us-west-2'],
    EU: ['eu-west-1', 'eu-central-1'],
    ASIA: ['ap-southeast-1', 'ap-south-1']
} as const;