// src/providers/ModalProvider.tsx
import React, { createContext, useContext, useState, FunctionComponent } from 'react';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { AgentManagerModal } from '@/components/agent/AgentManagerModal';
// import { ModelConfigurationModal } from '@/components/ModelConfigurationModal';
import { BedrockKnowledgeBaseModal } from '@/components/knowledge/BedrockKnowledgeBaseModal';
import { KnowledgeBaseManager } from '@/components/knowledge/KnowledgeBaseManager';

interface ModalContextType {
    showSettings: boolean;
    showAgentManager: boolean;
    showModelManager: boolean
    showKnowledgeBaseManager: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    openAgentManager: () => void;
    closeAgentManager: () => void;
    openModelManager: () => void;
    closeModelManager: () => void;
    openKnowledgeBaseManager: () => void;
    closeKnowledgeBaseManager: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
    const [showSettings, setShowSettings] = useState(false);
    const [showAgentManager, setShowAgentManager] = useState(false);
    const [showModelManager, setShowModelManager] = useState(false);
    const [showKnowledgeBaseManager, setShowKnowledgeBaseManager] = useState(false);

    const openSettings = () => setShowSettings(true);
    const closeSettings = () => setShowSettings(false);
    const openAgentManager = () => setShowAgentManager(true);
    const closeAgentManager = () => setShowAgentManager(false);
    const openModelManager = () => setShowModelManager(true);
    const closeModelManager = () => setShowModelManager(false);
    const openKnowledgeBaseManager = () => setShowKnowledgeBaseManager(true);
    const closeKnowledgeBaseManager = () => setShowKnowledgeBaseManager(false);   

    return (
        <ModalContext.Provider
            value={{
                showSettings,
                showAgentManager,
                showModelManager,
                showKnowledgeBaseManager,
                openSettings,
                closeSettings,
                openAgentManager,
                closeAgentManager,
                openModelManager,
                closeModelManager,
                openKnowledgeBaseManager,
                closeKnowledgeBaseManager
            }}
        >
            {children}
            {/* Place your modal components here */}
            {showAgentManager && <AgentManagerModal isOpen={showAgentManager} onClose={closeAgentManager} />}
            {showSettings && <SettingsModal isOpen={showSettings} onClose={closeSettings} />}
            {showKnowledgeBaseManager && (
                <KnowledgeBaseManager />
            )}
            {/* {showModelManager && <ModelConfigurationModal isOpen={showModelManager} onClose={closeModelManager} />} */}
        </ModalContext.Provider>
    );
}

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};