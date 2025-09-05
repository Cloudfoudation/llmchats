// src/providers/AgentsProvider.tsx
import React, { createContext, useContext } from 'react';
import { Agent, AgentType } from '@/types/agent';
import { useAgents } from '@/hooks/useAgents';

interface AgentsContextType {
    agents: Agent[];
    currentAgent: Agent | null | undefined;
    setCurrentAgent: (agent: Agent | null) => void;
    saveAgent: (config: Agent) => Promise<Agent>;
    deleteAgent: (agent: Agent) => Promise<void>;
    isLoading: boolean;
    error: Error | null;
    // Add new utility methods
    getAgentsByType: (type: AgentType) => Agent[];
    getCustomAgents: () => Agent[];
    getBedrockAgents: () => Agent[];
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export const AgentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const Agents = useAgents();

    return (
        <AgentsContext.Provider value={Agents} >
            {children}
        </AgentsContext.Provider>
    );
};

export const useAgentsContext = () => {
    const context = useContext(AgentsContext);
    if (context === undefined) {
        throw new Error('useAgentsContext must be used within an AgentsProvider');
    }
    return context;
};