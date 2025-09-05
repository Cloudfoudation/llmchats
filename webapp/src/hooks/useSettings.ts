// hooks/useSettings.ts
import { useState, useEffect } from 'react';
import { credentialsDB } from '../utils/db';
import { AppSettings, defaultSettings } from '@/types';

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const stored = await credentialsDB.getSettings();
                if (stored) {
                    setSettings(stored);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        try {
            const updatedSettings = { ...settings, ...newSettings };
            await credentialsDB.saveSettings(updatedSettings);
            setSettings(updatedSettings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    };

    const toggleSidebar = async () => {
        await updateSettings({ isSidebarVisible: !settings.isSidebarVisible });
    };

    const switchRegion = async (newRegion: string) => {
        await updateSettings({ region: newRegion });
    };

    const updateExternalApiKey = async (
        provider: 'openai' | 'groq' | 'sambanova',
        apiKey: string,
        baseUrl?: string
    ) => {
        try {
            const updatedExternalApiKeys = {
                ...settings.externalApiKeys,
                [provider]: provider === 'openai'
                    ? { apiKey, baseUrl: baseUrl || '' }
                    : apiKey
            };
            await updateSettings({
                externalApiKeys: updatedExternalApiKeys
            });
        } catch (error) {
            console.error(`Error updating ${provider} API key:`, error);
            throw error;
        }
    };

    const removeExternalApiKey = async (provider: 'openai' | 'groq' | 'sambanova') => {
        try {
            const updatedExternalApiKeys = {
                ...settings.externalApiKeys,
                [provider]: provider === 'openai'
                    ? { apiKey: '', baseUrl: '' }
                    : ''
            };
            await updateSettings({
                externalApiKeys: updatedExternalApiKeys
            });
        } catch (error) {
            console.error(`Error removing ${provider} API key:`, error);
            throw error;
        }
    };

    return {
        settings,
        isLoading,
        switchRegion,
        updateSettings,
        toggleSidebar,
        updateExternalApiKey,
        removeExternalApiKey,
    };
}