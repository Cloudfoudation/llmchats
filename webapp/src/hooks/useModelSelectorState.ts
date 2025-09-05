// hooks/useModelSelectorState.ts
import { useState, useEffect } from 'react';
import { FormSelectionState } from '@/types';
import { credentialsDB } from '@/utils/db';
import { CategoryType } from '@/types/models';

const defaultState: FormSelectionState = {
    showAllModels: false,
    selectedCategory: CategoryType.All,
    selectedProvider: 'all',
    selectedTier: 'all'
};

export const useModelSelectorState = (isModalOpen: boolean) => {
    const [state, setState] = useState<FormSelectionState>(defaultState);

    // Load state when modal opens
    useEffect(() => {
        if (isModalOpen) {
            loadState();
        }
    }, [isModalOpen]);

    const loadState = async () => {
        try {
            const saved = await credentialsDB.getFormState();
            if (saved) {
                setState(saved);
            }
        } catch (error) {
            console.error('Error loading form state:', error);
        }
    };

    const saveState = async (newState: FormSelectionState) => {
        try {
            await credentialsDB.saveFormState(newState);
            setState(newState);
        } catch (error) {
            console.error('Error saving form state:', error);
        }
    };

    const updateShowAllModels = async (value: boolean) => {
        const newState = { ...state, showAllModels: value };
        await saveState(newState);
    };

    const updateCategory = async (value: CategoryType) => {
        const newState = { ...state, selectedCategory: value };
        await saveState(newState);
    };

    const updateProvider = async (value: string) => {
        const newState = { ...state, selectedProvider: value };
        await saveState(newState);
    };

    const updateTier = async (value: string) => {
        const newState = { ...state, selectedTier: value };
        await saveState(newState);
    };

    return {
        state,
        updateShowAllModels,
        updateCategory,
        updateProvider,
        updateTier
    };
};