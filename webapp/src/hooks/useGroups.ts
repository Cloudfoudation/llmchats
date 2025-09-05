// src/hooks/useGroups.ts
import { useState, useCallback, useEffect } from 'react';
import {
    Group,
    GroupMember,
    CreateGroupRequest,
    UpdateGroupRequest,
    AddMemberRequest,
    UpdateMemberRoleRequest,
    GroupState,
    GroupError
} from '@/types/groups';
import { groupService } from '@/services/groupService';
import { useAuthContext } from '@/providers/AuthProvider';

export const useGroups = () => {
    const { identityId, user } = useAuthContext();

    const [state, setState] = useState<GroupState>({
        groups: [],
        currentGroup: null,
        members: [],
        sharedKnowledgeBases: [],
        sharedAgents: [],
        isLoading: false,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        error: null
    });

    // Initialize services with user
    useEffect(() => {
        if (user) {
            groupService.setUser(user);
        }
    }, [user]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const handleError = useCallback((error: unknown, operation: string): GroupError => {
        let groupError: GroupError;

        if (error instanceof GroupError) {
            groupError = error;
        } else if (error instanceof Error) {
            groupError = new GroupError(error.message, 'OPERATION_FAILED');
        } else {
            groupError = new GroupError('Unknown error occurred', 'UNKNOWN_ERROR');
        }

        setState(prev => ({
            ...prev,
            error: groupError,
            isLoading: false,
            isCreating: false,
            isUpdating: false,
            isDeleting: false
        }));

        return groupError;
    }, []);

    // Fetch user's groups
    const fetchGroups = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            const response = await groupService.listGroups();

            if (response.success && response.data) {
                setState(prev => ({
                    ...prev,
                    groups: response.data!.groups,
                    isLoading: false
                }));
            } else {
                throw new GroupError('Failed to fetch groups', 'FETCH_FAILED');
            }
        } catch (error) {
            handleError(error, 'FETCH_GROUPS');
        }
    }, [handleError]);

    // Create a new group
    const createGroup = useCallback(async (request: CreateGroupRequest): Promise<Group | null> => {
        try {
            setState(prev => ({ ...prev, isCreating: true, error: null }));

            const response = await groupService.createGroup(request);

            if (response.success && response.data) {
                const newGroup = response.data;
                setState(prev => ({
                    ...prev,
                    groups: [newGroup, ...prev.groups],
                    isCreating: false
                }));
                return newGroup;
            } else {
                throw new GroupError('Failed to create group', 'CREATE_FAILED');
            }
        } catch (error) {
            handleError(error, 'CREATE_GROUP');
            return null;
        }
    }, [handleError]);

    // Get group details
    const getGroup = useCallback(async (groupId: string): Promise<Group | null> => {
        try {
            const response = await groupService.getGroup(groupId);

            if (response.success && response.data) {
                const group = response.data;
                setState(prev => ({
                    ...prev,
                    currentGroup: group
                }));
                return group;
            } else {
                throw new GroupError('Failed to fetch group', 'FETCH_FAILED');
            }
        } catch (error) {
            handleError(error, 'GET_GROUP');
            return null;
        }
    }, [handleError]);

    // Update group
    const updateGroup = useCallback(async (
        groupId: string,
        request: UpdateGroupRequest
    ): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isUpdating: true, error: null }));

            const response = await groupService.updateGroup(groupId, request);

            if (response.success) {
                // Update group in state
                setState(prev => ({
                    ...prev,
                    groups: prev.groups.map(group =>
                        group.groupId === groupId
                            ? { ...group, ...request }
                            : group
                    ),
                    currentGroup: prev.currentGroup?.groupId === groupId
                        ? { ...prev.currentGroup, ...request }
                        : prev.currentGroup,
                    isUpdating: false
                }));
                return true;
            } else {
                throw new GroupError('Failed to update group', 'UPDATE_FAILED');
            }
        } catch (error) {
            handleError(error, 'UPDATE_GROUP');
            return false;
        }
    }, [handleError]);

    // Delete group
    const deleteGroup = useCallback(async (groupId: string): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isDeleting: true, error: null }));

            const response = await groupService.deleteGroup(groupId);

            if (response.success) {
                setState(prev => ({
                    ...prev,
                    groups: prev.groups.filter(group => group.groupId !== groupId),
                    currentGroup: prev.currentGroup?.groupId === groupId ? null : prev.currentGroup,
                    isDeleting: false
                }));
                return true;
            } else {
                throw new GroupError('Failed to delete group', 'DELETE_FAILED');
            }
        } catch (error) {
            handleError(error, 'DELETE_GROUP');
            return false;
        }
    }, [handleError]);

    // Fetch group members
    const fetchMembers = useCallback(async (groupId: string) => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            const response = await groupService.listMembers(groupId);

            if (response.success && response.data) {
                // Check if response has members array
                if ('members' in response.data && Array.isArray(response.data.members)) {
                    setState(prev => ({
                        ...prev,
                        members: response.data!.members,
                        isLoading: false
                    }));
                } else {
                    // API returned group info instead of members
                    console.error('API returned group info instead of members list:', response.data);
                    setState(prev => ({
                        ...prev,
                        members: [],
                        isLoading: false,
                        error: new GroupError('Invalid response format: expected members list', 'INVALID_RESPONSE')
                    }));
                }
            } else {
                throw new GroupError('Failed to fetch members', 'FETCH_FAILED');
            }
        } catch (error) {
            handleError(error, 'FETCH_MEMBERS');
        }
    }, [handleError]);

    // Add member to group
    const addMember = useCallback(async (
        groupId: string,
        request: AddMemberRequest
    ): Promise<GroupMember | null> => {
        try {
            setState(prev => ({ ...prev, isUpdating: true, error: null }));

            const response = await groupService.addMember(groupId, request);

            if (response.success && response.data) {
                const newMember = response.data;
                setState(prev => ({
                    ...prev,
                    members: [...(prev.members || []), newMember],
                    isUpdating: false
                }));
                return newMember;
            } else {
                throw new GroupError('Failed to add member', 'ADD_MEMBER_FAILED');
            }
        } catch (error) {
            handleError(error, 'ADD_MEMBER');
            return null;
        }
    }, [handleError]);

    // Remove member from group
    const removeMember = useCallback(async (
        groupId: string,
        userId: string
    ): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isUpdating: true, error: null }));

            const response = await groupService.removeMember(groupId, userId);

            if (response.success) {
                setState(prev => ({
                    ...prev,
                    members: (prev.members || []).filter(member => member.userId !== userId),
                    isUpdating: false
                }));
                return true;
            } else {
                throw new GroupError('Failed to remove member', 'REMOVE_MEMBER_FAILED');
            }
        } catch (error) {
            handleError(error, 'REMOVE_MEMBER');
            return false;
        }
    }, [handleError]);

    // Update member role
    const updateMemberRole = useCallback(async (
        groupId: string,
        userId: string,
        request: UpdateMemberRoleRequest
    ): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isUpdating: true, error: null }));

            const response = await groupService.updateMemberRole(groupId, userId, request);

            if (response.success) {
                setState(prev => ({
                    ...prev,
                    members: (prev.members || []).map(member =>
                        member.userId === userId
                            ? { ...member, role: request.role }
                            : member
                    ),
                    isUpdating: false
                }));
                return true;
            } else {
                throw new GroupError('Failed to update member role', 'UPDATE_ROLE_FAILED');
            }
        } catch (error) {
            handleError(error, 'UPDATE_MEMBER_ROLE');
            return false;
        }
    }, [handleError]);

    // Load groups on mount
    useEffect(() => {
        if (user && identityId) {
            fetchGroups();
        }
    }, [user, identityId, fetchGroups]);

    return {
        // State
        ...state,

        // Actions
        fetchGroups,
        createGroup,
        getGroup,
        updateGroup,
        deleteGroup,
        fetchMembers,
        addMember,
        removeMember,
        updateMemberRole,
        clearError,

        // Utility methods
        getUserRole: (groupId: string) => {
            const group = state.groups.find(g => g.groupId === groupId);
            return group?.userRole || 'viewer';
        },

        canManageGroup: (groupId: string) => {
            const role = state.groups.find(g => g.groupId === groupId)?.userRole;
            return role === 'owner' || role === 'admin';
        },

        canDeleteGroup: (groupId: string) => {
            const role = state.groups.find(g => g.groupId === groupId)?.userRole;
            return role === 'owner';
        }
    };
};