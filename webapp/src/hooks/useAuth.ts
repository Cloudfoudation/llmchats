// useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut, signInWithRedirect, signIn, confirmResetPassword, resetPassword } from 'aws-amplify/auth';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { credentialsDB } from '@/utils/db';
import { storage } from '@/services/sync/IndexedDBStorage';
import { configureAmplify } from '@/utils/amplify-config';
import { AuthState, UserAttributes } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useSettingsContext } from '@/providers/SettingsProvider';
import {
    BedrockAgentRuntimeClient
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
    BedrockAgentClient,
    ListAgentsCommand,
    ListAgentAliasesCommand
} from "@aws-sdk/client-bedrock-agent";
import { jwtDecode } from 'jwt-decode';

export const useAuth = () => {
    const { settings } = useSettingsContext();
    const router = useRouter();

    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        user: null,
        userAttributes: null,
        identityId: null,
        bedrockClient: null,
        bedrockAgentRuntimeClient: null,
        bedrockAgentRuntimeClient_agents: null,
        availableModels: [],
        bedrockAgents: [],
        isLoading: true,
        isLoginLoading: false,
        isSwitchRegionLoading: false,
        isForgotPasswordLoading: false,
        forgotPasswordSent: false
    });

    const updateAuthState = useCallback((updates: Partial<AuthState>) => {
        setAuthState(prev => ({ ...prev, ...updates }));
    }, []);

    const logout = async () => {
        try {
            updateAuthState({ isLoading: true });


            // Clear local storage
            await credentialsDB.clearAll();

            await storage.clearAll();

            // Sign out from auth
            await signOut({ global: true });

            updateAuthState({
                isAuthenticated: false,
                user: null,
                bedrockClient: null,
                availableModels: [],
            });

            router.push('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        } finally {
            updateAuthState({ isLoading: false });
        }
    };

    const getBedrockSession = async () => {
        const session = await fetchAuthSession();
        if (!session.credentials) {
            throw new Error('No valid credentials found');
        }
        return session;
    };

    const fetchBedrockAgents = async (agentClient: BedrockAgentClient, region: string) => {
        try {
            // List agents
            const agentsResponse = await agentClient.send(new ListAgentsCommand({}));

            if (!agentsResponse.agentSummaries || agentsResponse.agentSummaries.length === 0) {
                return [];
            }

            // For each agent, get its aliases and create our agent objects
            const agentsPromises = agentsResponse.agentSummaries.map(async (agent) => {
                try {
                    // Get aliases for this agent - only agentId is required
                    const aliasesResponse = await agentClient.send(new ListAgentAliasesCommand({
                        agentId: agent.agentId
                    }));

                    // Map each alias to our agent format (excluding TSTALIASID)
                    if (aliasesResponse.agentAliasSummaries && aliasesResponse.agentAliasSummaries.length > 0) {
                        return aliasesResponse.agentAliasSummaries
                            .filter(alias => alias.agentAliasId !== "TSTALIASID")
                            .map(alias => ({
                                id: `bedrock-${agent.agentId}-${alias.agentAliasId}`,
                                version: 1,
                                createdAt: Date.now(),
                                lastEditedAt: Date.now(),
                                name: alias.agentAliasName || agent.agentName || 'Unnamed Bedrock Agent',
                                description: agent.description || `Bedrock Agent (${agent.agentName})`,
                                type: 'bedrock' as const,
                                agentId: agent.agentId,
                                agentAliasId: alias.agentAliasId,
                                region: region,
                                modelParams: {
                                    modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
                                }
                            }));
                    }
                    return [];
                } catch (error) {
                    console.error(`Error fetching aliases for agent ${agent.agentId}:`, error);
                    return [];
                }
            });

            // Wait for all promises to resolve
            const results = await Promise.all(agentsPromises);

            // Flatten the array of arrays into a single array of agents
            return results.flat();

        } catch (error) {
            console.error('Error fetching Bedrock agents:', error);
            return [];
        }
    };

    const fetchAvailableModels = async (region: string) => {
        try {
            const session = await getBedrockSession();
            const client = new BedrockClient({
                credentials: session.credentials,
                region
            });

            const response = await client.send(new ListFoundationModelsCommand({}));
            let models = response.modelSummaries || [];

            await credentialsDB.saveAvailableModels({ models, region });
            return models;
        } catch (error) {
            console.error('Error fetching available models:', error);
            return [];
        }
    };

    const createBedrockClients = async (region: string) => {
        try {
            const session = await getBedrockSession();
            const credentials = session.credentials;

            const runtimeClient = new BedrockRuntimeClient({
                credentials,
                region,
            });

            const agentRuntimeClient = new BedrockAgentRuntimeClient({
                credentials,
                region: process.env.NEXT_PUBLIC_AWS_BEDROCK_REGION,
            });

            const agentRuntimeClient_agent = new BedrockAgentRuntimeClient({
                credentials,
                region,
            });

            const agentClient = new BedrockAgentClient({
                credentials,
                region,
            });

            return {
                runtimeClient,
                agentClient,
                agentRuntimeClient,
                agentRuntimeClient_agent
            };
        } catch (error) {
            console.error('Error creating Bedrock clients:', error);
            return {
                runtimeClient: null,
                agentRuntimeClient: null
            };
        }
    };

    const initializeAuth = useCallback(async () => {
        try {
            updateAuthState({ isLoading: true });
            configureAmplify();

            const user = await getCurrentUser();
            const session = await fetchAuthSession();
            if (session.tokens?.idToken) {
                const tokenPayload = session.tokens.idToken.toString();
                const userAttributes = jwtDecode(tokenPayload) as UserAttributes;

                updateAuthState({ isAuthenticated: true, user, identityId: session.identityId, userAttributes: userAttributes });
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'UserUnAuthenticatedException') {
                updateAuthState({ isAuthenticated: false, user: null });
                return;
            }
            console.error('Error initializing auth:', error);
        } finally {
            updateAuthState({ isLoading: false });
        }
    }, [updateAuthState, settings.region]);

    // Authentication methods
    const authMethods = {
        signInWithCredentials: async (username: string, password: string) => {
            try {
                updateAuthState({ isLoginLoading: true });
                
                console.log('Real API: Attempting login for', username);
                
                // Always use real AWS Cognito API - no more mocking
                await signIn({ username, password });
                await initializeAuth();
                router.push('/');
            } catch (error) {
                console.error('Sign in error:', error);
                throw error;
            } finally {
                updateAuthState({ isLoginLoading: false });
            }
        },

        signInWithGoogle: async () => {
            try {
                updateAuthState({ isLoginLoading: true });
                await signInWithRedirect({ provider: 'Google' });
                await initializeAuth();
                router.push('/');
            } catch (error) {
                console.error('Google sign in error:', error);
                throw error;
            } finally {
                updateAuthState({ isLoginLoading: false });
            }
        },
        forgotPassword: async (username: string) => {
            try {
                updateAuthState({
                    isForgotPasswordLoading: true,
                    forgotPasswordSent: false
                });

                await resetPassword({ username });

                updateAuthState({
                    forgotPasswordSent: true
                });
            } catch (error) {
                console.error('Forgot password error:', error);
                throw error;
            } finally {
                updateAuthState({ isForgotPasswordLoading: false });
            }
        },

        forgotPasswordSubmit: async (username: string, code: string, newPassword: string) => {
            try {
                updateAuthState({ isForgotPasswordLoading: true });

                await confirmResetPassword({
                    username,
                    confirmationCode: code,
                    newPassword
                });

                updateAuthState({ forgotPasswordSent: false });
                router.push('/auth/login');
            } catch (error) {
                console.error('Reset password submission error:', error);
                throw error;
            } finally {
                updateAuthState({ isForgotPasswordLoading: false });
            }
        }
    };

    // Effects
    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    useEffect(() => {
        const switchRegion = async (newRegion: string) => {
            if (!newRegion || !authState.user) return;

            try {
                updateAuthState({ isSwitchRegionLoading: true });
                const [models, clients] = await Promise.all([
                    fetchAvailableModels(newRegion),
                    createBedrockClients(newRegion)
                ]);

                // After creating clients, fetch Bedrock agents if available
                let bedrockAgents: any[] = [];
                if (clients.agentRuntimeClient) {
                    bedrockAgents = await fetchBedrockAgents(clients.agentClient, newRegion);
                }

                updateAuthState({
                    availableModels: models,
                    bedrockClient: clients.runtimeClient,
                    bedrockAgentRuntimeClient: clients.agentRuntimeClient,
                    bedrockAgentRuntimeClient_agents: clients.agentRuntimeClient_agent,
                    bedrockAgents: bedrockAgents
                });
            } catch (error) {
                console.error('Region switch error:', error);
                throw error;
            } finally {
                updateAuthState({ isSwitchRegionLoading: false });
            }
        };

        switchRegion(settings.region || process.env.NEXT_PUBLIC_AWS_REGION);
    }, [settings.region, authState.user]);

    return {
        ...authState,
        ...authMethods,
        logout
    };
};