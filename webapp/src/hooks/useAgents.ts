// src/hooks/useAgents.ts
import { useState, useEffect, useCallback } from 'react';
import { Agent, AgentType, AgentRequest } from '@/types/agent';
import { useAuthContext } from '@/providers/AuthProvider';
import { agentManagementService } from '@/services/agent';

export const useAgents = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [currentAgent, setCurrentAgentState] = useState<Agent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const { bedrockAgents, user } = useAuthContext();

    // Set the user in the agent service when it changes
    useEffect(() => {
        if (user) {
            agentManagementService.setUser(user);
        }
    }, [user]);

    // Load all agents
    const loadAgents = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            let customAgents: Agent[] = [];

            // Load from API
            try {
                const response = await agentManagementService.listAgents();

                if (response.success && response.data) {
                    customAgents = response.data;
                } else {
                    throw new Error(response.error?.message || 'Failed to load agents');
                }
            } catch (apiErr) {
                console.error('Error loading agents from API:', apiErr);
                throw apiErr; // Re-throw since we're not handling offline anymore
            }

            // Combine with Bedrock agents
            const combinedAgents = [...customAgents];

            // Add Bedrock agents from auth context
            if (bedrockAgents && bedrockAgents.length > 0) {
                bedrockAgents.forEach(bedrockAgent => {
                    // Check if this Bedrock agent is already in our list
                    const existingIndex = combinedAgents.findIndex(agent =>
                        agent.type === 'bedrock' &&
                        agent.bedrockAgentId === bedrockAgent.agentId &&
                        agent.bedrockAgentAliasId === bedrockAgent.agentAliasId
                    );

                    if (existingIndex >= 0) {
                        // Update existing agent with any new information
                        combinedAgents[existingIndex] = {
                            ...combinedAgents[existingIndex],
                            name: bedrockAgent.name,
                            description: bedrockAgent.description || 'Bedrock Agent',
                            lastEditedAt: bedrockAgent.lastEditedAt
                        };
                    } else {
                        // Create a new Agent entry for this Bedrock agent
                        const newAgent: Agent = {
                            id: bedrockAgent.id,
                            version: bedrockAgent.version || 1,
                            createdAt: bedrockAgent.createdAt,
                            lastEditedAt: bedrockAgent.lastEditedAt,
                            name: bedrockAgent.name,
                            description: bedrockAgent.description || 'Bedrock Agent',
                            type: 'bedrock',
                            systemPrompt: '', // Bedrock agents handle prompting internally
                            modelParams: {
                                modelId: 'us.anthropic.claude-3-haiku-20240307-v1:0',
                                maxTokens: 1024,
                                temperature: 0.5,
                                topP: 0.9,
                                maxTurns: 10
                            },
                            // Bedrock specific fields
                            bedrockAgentId: bedrockAgent.agentId,
                            bedrockAgentAliasId: bedrockAgent.agentAliasId,
                            isOwner: true
                        };
                        combinedAgents.push(newAgent);
                    }
                });
            }

            setAgents(combinedAgents);
        } catch (err) {
            console.error('Error loading agents:', err);
            setError(err instanceof Error ? err : new Error('Failed to load agents'));
        } finally {
            setIsLoading(false);
        }
    }, [bedrockAgents]);

    useEffect(() => {
        if (user)
            loadAgents();
    }, [loadAgents, user]);

    // Restore current agent from session storage
    useEffect(() => {
        const currentAgentId = sessionStorage.getItem('currentAgentId');
        if (currentAgentId && agents.length > 0) {
            const agent = agents.find(a => a.id === currentAgentId);
            if (agent) {
                setCurrentAgentState(agent);
            } else if (currentAgent && currentAgent.id === currentAgentId) {
                // If the current agent is not in the refreshed list, clear it
                setCurrentAgent(null);
            }
        }
    }, [agents]);

    const setCurrentAgent = (agent: Agent | null) => {
        setCurrentAgentState(agent);
        if (agent) {
            sessionStorage.setItem('currentAgentId', agent.id);
        } else {
            sessionStorage.removeItem('currentAgentId');
        }
    };

    const updateAgentVisibility = useCallback((agentId: string, visibility: 'public' | 'private') => {
        setAgents(prevAgents =>
            prevAgents.map(agent =>
                agent.id === agentId
                    ? { ...agent, visibility }
                    : agent
            )
        );

        // Also update current agent if it matches
        if (currentAgent?.id === agentId) {
            setCurrentAgentState(prev => prev ? { ...prev, visibility } : null);
        }
    }, [currentAgent]);

    const saveAgent = async (config: Agent) => {
        try {
            setError(null);

            // Check if this is a Bedrock agent
            if (config.type === 'bedrock') {
                // For Bedrock agents, we don't save them since they're managed by AWS
                setCurrentAgent(config);
                return config;
            }

            // Prepare agent data for saving
            const agentData: AgentRequest = {
                id: config.id || undefined,
                name: config.name,
                description: config.description,
                systemPrompt: config.systemPrompt,
                modelParams: config.modelParams,
                knowledgeBaseId: config.knowledgeBaseId,
                telegramToken: config.telegramToken,
                type: config.type || 'custom',
                version: config.version
            };

            let response;
            let savedAgent: Agent;

            // Check if this agent already exists in our API
            if (!config.id || !agents.some(a => a.id === config.id && a.isOwner)) {
                // Create new agent
                response = await agentManagementService.createAgent(agentData);
            } else {
                // Update existing agent
                response = await agentManagementService.updateAgent(config.id, agentData);
            }

            if (!response.success || !response.data) {
                throw new Error(response.error?.message || 'Failed to save agent');
            }

            savedAgent = response.data;

            // Refresh the agents list
            await loadAgents();

            // Set as current agent
            setCurrentAgent(savedAgent);
            return savedAgent;

        } catch (err) {
            console.error('Error saving agent:', err);
            setError(err instanceof Error ? err : new Error('Failed to save agent'));
            throw err;
        }
    };

    const deleteAgent = async (agent: Agent) => {
        try {
            setError(null);

            // Check if this is a Bedrock agent
            if (agent.type === 'bedrock') {
                // For Bedrock agents, we don't delete them since they're managed by AWS
                if (currentAgent?.id === agent.id) {
                    setCurrentAgent(null);
                }
                return;
            }

            // Only try to delete if it's a server-stored agent
            if (agent.isOwner) {
                const response = await agentManagementService.deleteAgent(agent.id);

                if (!response.success) {
                    throw new Error(response.error?.message || 'Failed to delete agent');
                }
            }

            // Update current agent if needed
            if (currentAgent?.id === agent.id) {
                setCurrentAgent(null);
            }

            // Refresh the agents list
            await loadAgents();

        } catch (err) {
            console.error('Error deleting agent:', err);
            setError(err instanceof Error ? err : new Error('Failed to delete agent'));
            throw err;
        }
    };

    // Filter agents by type
    const getAgentsByType = (type: AgentType) => {
        return agents.filter(agent => agent.type === type);
    };

    // Get custom agents (non-Bedrock)
    const getCustomAgents = () => {
        return agents.filter(agent => !agent.type || agent.type === 'custom');
    };

    // Get Bedrock agents
    const getBedrockAgents = () => {
        return agents.filter(agent => agent.type === 'bedrock');
    };

    return {
        agents,
        currentAgent,
        setCurrentAgent,
        saveAgent,
        updateAgentVisibility,
        deleteAgent,
        isLoading,
        error,
        getAgentsByType,
        getCustomAgents,
        getBedrockAgents,
        refreshAgents: loadAgents
    };
};