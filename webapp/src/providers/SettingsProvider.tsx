// providers/SettingsProvider.tsx
'use client'
import { createContext, useContext, ReactNode } from 'react';
import { useSettings } from '@/hooks/useSettings';

const SettingsContext = createContext<ReturnType<typeof useSettings>>({} as any);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const settings = useSettings();
    return (
        <SettingsContext.Provider value={settings}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettingsContext = () => useContext(SettingsContext);