// src/providers/ConversationProvider.tsx
'use client'
import React, { createContext, useContext, ReactNode } from 'react';
import { useConversations } from '@/hooks/useConversations';

const ConversationContext = createContext<ReturnType<typeof useConversations> | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
    const conversationState = useConversations();

    return (
        <ConversationContext.Provider value={conversationState}>
            {children}
        </ConversationContext.Provider>
    );
}

export const useConversationContext = () => {
    const context = useContext(ConversationContext);
    if (context === undefined) {
        throw new Error('useConversationContext must be used within a ConversationProvider');
    }
    return context;
};