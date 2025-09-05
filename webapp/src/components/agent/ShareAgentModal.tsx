// src/components/agent/ShareAgentModal.tsx
import React, { useState, useEffect } from 'react';
import { IconX, IconUsers, IconLoader2, IconAlertCircle, IconCheck, IconTrash, IconWorld, IconLock } from '@tabler/icons-react';
import { Agent } from '@/types/agent';
import { useGroups } from '@/hooks/useGroups';
import { useSharedResources } from '@/hooks/useSharedResources';
import { Group, GroupRole } from '@/types/groups';
import { useAgents } from '@/hooks/useAgents';

interface ShareAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    agent: Agent;
}

interface SharingState {
    [groupId: string]: {
        isShared: boolean;
        permissions: {
            canEdit: boolean;
            canDelete: boolean;
            canShare: boolean;
        };
        isLoading: boolean;
    };
}

export const ShareAgentModal: React.FC<ShareAgentModalProps> = ({
    isOpen,
    onClose,
    agent
}) => {
    const { groups, isLoading: groupsLoading } = useGroups();
    const { updateAgentVisibility } = useAgents();
    const {
        shareResource,
        unshareResource,
        updateSharedResource,
        getResourceGroups,
        setResourceVisibility,
        isSharing,
        error: shareError
    } = useSharedResources();

    const [sharingStates, setSharingStates] = useState<SharingState>({});
    const [localError, setLocalError] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<'private' | 'public'>('private');
    const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

    // Initialize sharing states when groups load
    useEffect(() => {
        if (agent.id) {
            // Set initial visibility based on agent data
            setVisibility(agent.visibility as 'private' | 'public' || 'private');

            if (groups.length > 0) {
                const initialStates: SharingState = {};
                const sharedResources = getResourceGroups(agent.id, 'agent');

                groups.forEach(group => {
                    const sharedResource = sharedResources.find(sr => sr.groupId === group.groupId);
                    const isCurrentlyShared = !!sharedResource;

                    initialStates[group.groupId] = {
                        isShared: isCurrentlyShared,
                        permissions: isCurrentlyShared && sharedResource?.permissions ? {
                            // Use actual permissions from API response
                            canEdit: sharedResource.permissions.canEdit || false,
                            canDelete: sharedResource.permissions.canDelete || false,
                            canShare: sharedResource.permissions.canShare || false
                        } : {
                            // Default permissions for new shares
                            canEdit: true,
                            canDelete: false,
                            canShare: group.userRole === 'owner' || group.userRole === 'admin'
                        },
                        isLoading: false
                    };
                });

                setSharingStates(initialStates);
            }
        }
    }, [groups, agent.id, getResourceGroups]);

    const handleVisibilityChange = async (newVisibility: 'public' | 'private') => {
        if (!agent.id) return;

        setLocalError(null);
        setIsUpdatingVisibility(true);

        try {
            const success = await setResourceVisibility(
                agent.id,
                'agent',
                newVisibility
            );

            if (success) {
                setVisibility(newVisibility);
                updateAgentVisibility(agent.id, newVisibility);
            } else {
                throw new Error(`Failed to set agent visibility to ${newVisibility}`);
            }
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : `Failed to set agent visibility to ${newVisibility}`);
        } finally {
            setIsUpdatingVisibility(false);
        }
    };

    const handleShare = async (group: Group) => {
        if (!agent.id) return;

        setSharingStates(prev => ({
            ...prev,
            [group.groupId]: {
                ...prev[group.groupId],
                isLoading: true
            }
        }));

        setLocalError(null);

        try {
            const permissions = sharingStates[group.groupId]?.permissions || {
                canEdit: true,
                canDelete: false,
                canShare: group.userRole === 'owner' || group.userRole === 'admin'
            };

            const success = await shareResource(
                agent.id,
                'agent',
                group.groupId,
                permissions
            );

            if (success) {
                setSharingStates(prev => ({
                    ...prev,
                    [group.groupId]: {
                        ...prev[group.groupId],
                        isShared: true,
                        isLoading: false
                    }
                }));
            } else {
                throw new Error('Failed to share agent');
            }
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : 'Failed to share agent');
            setSharingStates(prev => ({
                ...prev,
                [group.groupId]: {
                    ...prev[group.groupId],
                    isLoading: false
                }
            }));
        }
    };

    const handleUnshare = async (group: Group) => {
        if (!agent.id) return;

        setSharingStates(prev => ({
            ...prev,
            [group.groupId]: {
                ...prev[group.groupId],
                isLoading: true
            }
        }));

        setLocalError(null);

        try {
            const success = await unshareResource(agent.id, group.groupId);

            if (success) {
                setSharingStates(prev => ({
                    ...prev,
                    [group.groupId]: {
                        ...prev[group.groupId],
                        isShared: false,
                        isLoading: false
                    }
                }));
            } else {
                throw new Error('Failed to unshare agent');
            }
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : 'Failed to unshare agent');
            setSharingStates(prev => ({
                ...prev,
                [group.groupId]: {
                    ...prev[group.groupId],
                    isLoading: false
                }
            }));
        }
    };

    const handlePermissionChange = async (group: Group, permission: keyof SharingState[string]['permissions'], value: boolean) => {
        if (!agent.id || !sharingStates[group.groupId]?.isShared) return;

        const newPermissions = {
            ...sharingStates[group.groupId].permissions,
            [permission]: value
        };

        setSharingStates(prev => ({
            ...prev,
            [group.groupId]: {
                ...prev[group.groupId],
                permissions: newPermissions
            }
        }));

        try {
            await updateSharedResource(agent.id, group.groupId, {
                permissions: newPermissions
            });
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : 'Failed to update permissions');
            // Revert the change
            setSharingStates(prev => ({
                ...prev,
                [group.groupId]: {
                    ...prev[group.groupId],
                    permissions: {
                        ...newPermissions,
                        [permission]: !value
                    }
                }
            }));
        }
    };

    const canManageSharing = (group: Group): boolean => {
        return group.userRole === 'owner' || group.userRole === 'admin';
    };

    const getRoleDescription = (role: GroupRole): string => {
        switch (role) {
            case 'owner':
                return 'Full control of the group';
            case 'admin':
                return 'Can manage group and resources';
            case 'member':
                return 'Can access shared resources';
            case 'viewer':
                return 'Read-only access';
            default:
                return '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

                <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Share Agent</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Share "{agent.name}" with others
                            </p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <IconX size={20} />
                        </button>
                    </div>

                    {(localError || shareError) && (
                        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded flex items-start">
                            <IconAlertCircle className="mr-2 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="font-medium">Error</p>
                                <p className="text-sm">{localError || shareError?.message}</p>
                            </div>
                        </div>
                    )}

                    {/* Public/Private Visibility Section */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Visibility</h4>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => handleVisibilityChange('private')}
                                disabled={isUpdatingVisibility}
                                className={`flex items-center px-4 py-2 rounded-lg border ${visibility === 'private'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <IconLock size={18} className="mr-2" />
                                <span>Private</span>
                            </button>
                            <button
                                onClick={() => handleVisibilityChange('public')}
                                disabled={isUpdatingVisibility}
                                className={`flex items-center px-4 py-2 rounded-lg border ${visibility === 'public'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <IconWorld size={18} className="mr-2" />
                                <span>Public</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {visibility === 'private'
                                ? 'Only you and group members you share with can access this agent.'
                                : 'Anyone in your organization can access and use this agent.'}
                        </p>

                        {agent.knowledgeBaseId && (
                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start">
                                    <IconAlertCircle size={16} className="mr-1 flex-shrink-0 mt-0" />
                                    <span>
                                        This agent uses a knowledge base. Making this agent public will also make its
                                        knowledge base accessible to all users.
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Share with Groups</h4>
                    </div>

                    {groupsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <IconLoader2 className="animate-spin mr-2 text-gray-500 dark:text-gray-400" size={24} />
                            <span className="text-gray-500 dark:text-gray-400">Loading groups...</span>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-8">
                            <IconUsers className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 mb-2">No groups found</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                Create or join groups to share agents with others.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groups.map(group => {
                                const sharingState = sharingStates[group.groupId];
                                const canManage = canManageSharing(group);

                                return (
                                    <div key={group.groupId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                                        {group.groupName}
                                                    </h4>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${group.userRole === 'owner' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                                        group.userRole === 'admin' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                                            group.userRole === 'member' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                                'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                        }`}>
                                                        {group.userRole}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
                                                    {group.description || 'No description'}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {getRoleDescription(group.userRole)} • {group.memberCount} members
                                                </p>
                                            </div>

                                            <div className="flex items-center space-x-2 ml-4">
                                                {sharingState?.isShared ? (
                                                    <>
                                                        <div className="flex items-center text-green-600 dark:text-green-400">
                                                            <IconCheck size={16} className="mr-1" />
                                                            <span className="text-sm font-medium">Shared</span>
                                                        </div>
                                                        {canManage && (
                                                            <button
                                                                onClick={() => handleUnshare(group)}
                                                                disabled={sharingState.isLoading}
                                                                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                title="Stop sharing"
                                                            >
                                                                {sharingState.isLoading ? (
                                                                    <IconLoader2 className="animate-spin" size={16} />
                                                                ) : (
                                                                    <IconTrash size={16} />
                                                                )}
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleShare(group)}
                                                        disabled={!canManage || sharingState?.isLoading}
                                                        className={`px-3 py-1 text-sm rounded ${canManage
                                                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                            }`}
                                                        title={canManage ? 'Share with this group' : 'You need admin access to share'}
                                                    >
                                                        {sharingState?.isLoading ? (
                                                            <div className="flex items-center">
                                                                <IconLoader2 className="animate-spin mr-1" size={14} />
                                                                Sharing...
                                                            </div>
                                                        ) : (
                                                            'Share'
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Permission Settings */}
                                        {sharingState?.isShared && canManage && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissions</h5>
                                                <div className="space-y-2">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={sharingState.permissions.canEdit}
                                                            onChange={(e) => handlePermissionChange(group, 'canEdit', e.target.checked)}
                                                            className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Can edit agent</span>
                                                    </label>
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={sharingState.permissions.canDelete}
                                                            onChange={(e) => handlePermissionChange(group, 'canDelete', e.target.checked)}
                                                            className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Can delete agent</span>
                                                    </label>
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={sharingState.permissions.canShare}
                                                            onChange={(e) => handlePermissionChange(group, 'canShare', e.target.checked)}
                                                            className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Can share with other groups</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* Access restrictions notice */}
                                        {!canManage && (
                                            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                                                <IconAlertCircle size={14} className="inline mr-1" />
                                                You need admin or owner role in this group to manage sharing.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};