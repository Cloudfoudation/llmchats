// src/hooks/useSharedResources.ts
import { useState, useCallback, useEffect } from 'react';
import {
    SharedResource,
    SharedKnowledgeBaseExtended,
    SharedAgentExtended,
    CreateSharedResourceRequest,
    UpdateSharedResourceRequest,
    SharedResourcesFilter,
    SharedResourcesState,
    SharedResourceError
} from '@/types/shared-resources';
import { ResourceVisibility } from '@/types/agent';
import { sharedResourcesService } from '@/services/sharedResourcesService';
import { useAuthContext } from '@/providers/AuthProvider';
import { useGroups } from './useGroups';

export const useSharedResources = () => {
    const { identityId, user } = useAuthContext();
    const { groups } = useGroups();

    const [state, setState] = useState<SharedResourcesState>({
        resources: [],
        knowledgeBases: [],
        agents: [],
        isLoading: false,
        isSharing: false,
        error: null
    });

    useEffect(() => {
        if (user) {
            sharedResourcesService.setUser(user);
        }
    }, [user]);

    const handleError = useCallback((error: unknown, operation: string): SharedResourceError => {
        let sharedResourceError: SharedResourceError;

        if (error instanceof SharedResourceError) {
            sharedResourceError = error;
        } else if (error instanceof Error) {
            sharedResourceError = new SharedResourceError(error.message, 'OPERATION_FAILED');
        } else {
            sharedResourceError = new SharedResourceError('Unknown error occurred', 'UNKNOWN_ERROR');
        }

        setState(prev => ({
            ...prev,
            error: sharedResourceError,
            isLoading: false,
            isSharing: false
        }));

        return sharedResourceError;
    }, []);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Fetch shared resources for user's groups
    const fetchSharedResources = useCallback(async (filter?: SharedResourcesFilter) => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            const response = await sharedResourcesService.listSharedResources(filter);

            if (response.success && response.data) {
                const resources = response.data.resources;

                // Separate resources by type
                const knowledgeBases: SharedKnowledgeBaseExtended[] = [];
                const agents: SharedAgentExtended[] = [];

                resources.forEach(resource => {
                    if (resource.type === 'knowledge-base') {
                        knowledgeBases.push({
                            ...resource,
                            type: 'knowledge-base',
                            knowledgeBaseId: {} as any, // This would be populated from KB service
                            syncStatus: 'idle'
                        });
                    } else if (resource.type === 'agent') {
                        agents.push({
                            ...resource,
                            type: 'agent',
                            agent: {} as any // This would be populated from agent service
                        });
                    }
                });

                setState(prev => ({
                    ...prev,
                    resources,
                    knowledgeBases,
                    agents,
                    isLoading: false
                }));
            } else {
                throw new SharedResourceError('Failed to fetch shared resources', 'FETCH_FAILED');
            }

        } catch (error) {
            handleError(error, 'FETCH_SHARED_RESOURCES');
        }
    }, [handleError]);

    // Set visibility for a resource (public/private)
    const setResourceVisibility = useCallback(async (
        resourceId: string,
        resourceType: 'knowledge-base' | 'agent',
        visibility: ResourceVisibility
    ): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isSharing: true, error: null }));

            const request = {
                resourceId,
                resourceType,
                visibility
            };

            const response = await sharedResourcesService.setResourceVisibility(request);

            if (response.success) {
                setState(prev => ({ ...prev, isSharing: false }));
                return true;
            } else {
                throw new SharedResourceError(
                    `Failed to set resource visibility to ${visibility}`,
                    'VISIBILITY_UPDATE_FAILED'
                );
            }
        } catch (error) {
            handleError(error, 'SET_RESOURCE_VISIBILITY');
            return false;
        }
    }, [handleError]);

    // Share a resource with a group
    const shareResource = useCallback(async (
        resourceId: string,
        resourceType: 'knowledge-base' | 'agent',
        groupId: string,
        permissions?: Partial<any>
    ): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isSharing: true, error: null }));

            const request: CreateSharedResourceRequest = {
                resourceId,
                resourceType,
                groupId,
                permissions
            };

            const response = await sharedResourcesService.shareResource(request);

            if (response.success) {
                setState(prev => ({ ...prev, isSharing: false }));

                // Refresh shared resources
                await fetchSharedResources();

                return true;
            } else {
                throw new SharedResourceError('Failed to share resource', 'SHARE_FAILED');
            }

        } catch (error) {
            handleError(error, 'SHARE_RESOURCE');
            return false;
        }
    }, [handleError, fetchSharedResources]);

    // Update shared resource permissions
    const updateSharedResource = useCallback(async (
        resourceId: string,
        groupId: string,
        request: UpdateSharedResourceRequest
    ): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isSharing: true, error: null }));

            // Determine resource type from existing shared resources
            const existingResource = state.resources.find(r => r.id === resourceId && r.groupId === groupId);
            if (!existingResource) {
                throw new SharedResourceError('Resource not found', 'RESOURCE_NOT_FOUND');
            }

            const response = await sharedResourcesService.updateSharedResource(
                existingResource.type,
                resourceId,
                groupId,
                request
            );

            if (response.success) {
                setState(prev => ({ ...prev, isSharing: false }));

                // Update local state
                setState(prev => ({
                    ...prev,
                    resources: prev.resources.map(resource =>
                        resource.id === resourceId && resource.groupId === groupId
                            ? { ...resource, permissions: { ...resource.permissions, ...request.permissions } }
                            : resource
                    )
                }));

                return true;
            } else {
                throw new SharedResourceError('Failed to update shared resource', 'UPDATE_FAILED');
            }

        } catch (error) {
            handleError(error, 'UPDATE_SHARED_RESOURCE');
            return false;
        }
    }, [handleError, state.resources]);

    // Unshare a resource from a group
    const unshareResource = useCallback(async (
        resourceId: string,
        groupId: string
    ): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isSharing: true, error: null }));

            // Determine resource type from existing shared resources
            const existingResource = state.resources.find(r => r.id === resourceId && r.groupId === groupId);
            if (!existingResource) {
                throw new SharedResourceError('Resource not found', 'RESOURCE_NOT_FOUND');
            }

            const response = await sharedResourcesService.unshareResource(
                existingResource.type,
                resourceId,
                groupId
            );

            if (response.success) {
                setState(prev => ({ ...prev, isSharing: false }));

                // Remove from local state
                setState(prev => ({
                    ...prev,
                    resources: prev.resources.filter(resource =>
                        !(resource.id === resourceId && resource.groupId === groupId)
                    ),
                    knowledgeBases: prev.knowledgeBases.filter(kb =>
                        !(kb.id === resourceId && kb.groupId === groupId)
                    ),
                    agents: prev.agents.filter(agent =>
                        !(agent.id === resourceId && agent.groupId === groupId)
                    )
                }));

                return true;
            } else {
                throw new SharedResourceError('Failed to unshare resource', 'UNSHARE_FAILED');
            }

        } catch (error) {
            handleError(error, 'UNSHARE_RESOURCE');
            return false;
        }
    }, [handleError, state.resources]);

    // Get resources shared with a specific group
    const getGroupSharedResources = useCallback((groupId: string) => {
        return {
            knowledgeBases: state.knowledgeBases.filter(kb => kb.groupId === groupId),
            agents: state.agents.filter(agent => agent.groupId === groupId)
        };
    }, [state.knowledgeBases, state.agents]);

    // Get resources shared by the current user
    const getUserSharedResources = useCallback(() => {
        if (!identityId) return { knowledgeBases: [], agents: [] };

        return {
            knowledgeBases: state.knowledgeBases.filter(kb => kb.sharedBy === identityId),
            agents: state.agents.filter(agent => agent.sharedBy === identityId)
        };
    }, [state.knowledgeBases, state.agents, identityId]);

    // Check if a resource is shared with any group
    const isResourceShared = useCallback((resourceId: string, resourceType: 'knowledge-base' | 'agent') => {
        return state.resources.some(resource =>
            resource.id === resourceId && resource.type === resourceType
        );
    }, [state.resources]);

    // Get groups that a resource is shared with
    const getResourceGroups = useCallback((resourceId: string, resourceType: 'knowledge-base' | 'agent') => {
        const sharedResources = state.resources.filter(resource =>
            resource.id === resourceId && resource.type === resourceType
        );

        // Return the full shared resource data, not just the group info
        return sharedResources;
    }, [state.resources]);

    // Load shared resources on mount
    useEffect(() => {
        if (identityId && groups.length > 0) {
            fetchSharedResources();
        }
    }, [identityId, groups, fetchSharedResources]);

    return {
        // State
        ...state,

        // Actions
        fetchSharedResources,
        shareResource,
        updateSharedResource,
        unshareResource,
        setResourceVisibility,
        clearError,

        // Utility methods
        getGroupSharedResources,
        getUserSharedResources,
        isResourceShared,
        getResourceGroups,

        // Computed values
        totalSharedResources: state.resources.length,
        sharedKnowledgeBasesCount: state.knowledgeBases.length,
        sharedAgentsCount: state.agents.length
    };
};