'use client'
import { useState, useEffect } from 'react';
import { Group, GroupMember, AddMemberRequest, GroupRole } from '@/types/groups';
import { useGroups } from '@/hooks/useGroups';
import { X, Plus, Trash, Crown, Shield, User, Users, Eye } from 'lucide-react';

interface ManageGroupMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
    onMembersUpdated: () => void;
}

export function ManageGroupMembersModal({ isOpen, onClose, group, onMembersUpdated }: ManageGroupMembersModalProps) {
    const {
        members,
        fetchMembers,
        addMember,
        removeMember,
        updateMemberRole,
        isLoading,
        isUpdating,
        error
    } = useGroups();

    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberData, setNewMemberData] = useState<AddMemberRequest>({
        email: '',
        role: 'member'
    });

    useEffect(() => {
        if (isOpen && group) {
            fetchMembers(group.groupId);
        }
    }, [isOpen, group, fetchMembers]);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMemberData.email.trim()) {
            return;
        }

        const member = await addMember(group.groupId, newMemberData);
        if (member) {
            setNewMemberData({ email: '', role: 'member' });
            setShowAddMember(false);
            onMembersUpdated();
        }
    };

    const handleRemoveMember = async (member: GroupMember) => {
        if (!window.confirm(`Are you sure you want to remove ${member.email || member.userId} from this group?`)) {
            return;
        }

        const success = await removeMember(group.groupId, member.userId);
        if (success) {
            onMembersUpdated();
        }
    };

    const handleUpdateRole = async (member: GroupMember, newRole: GroupRole) => {
        const success = await updateMemberRole(group.groupId, member.userId, { role: newRole });
        if (success) {
            onMembersUpdated();
        }
    };

    const getRoleIcon = (role: GroupRole) => {
        switch (role) {
            case 'owner':
                return <Crown className="h-4 w-4 text-yellow-500" />;
            case 'admin':
                return <Shield className="h-4 w-4 text-blue-500" />;
            case 'member':
                return <User className="h-4 w-4 text-green-500" />;
            case 'viewer':
                return <Eye className="h-4 w-4 text-gray-500" />;
            default:
                return <User className="h-4 w-4 text-gray-500" />;
        }
    };

    const canManageMembers = group.userRole === 'owner' || group.userRole === 'admin';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-2xl 
                          border dark:border-gray-700 max-h-[80vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Manage Members - {group.groupName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 
                                 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 
                                      text-red-700 dark:text-red-300 rounded-md">
                            {error.message}
                        </div>
                    )}

                    {/* Add Member Section */}
                    {canManageMembers && (
                        <div className="mb-6">
                            {!showAddMember ? (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm 
                                             text-sm font-medium text-white bg-green-600 dark:bg-green-500 
                                             hover:bg-green-700 dark:hover:bg-green-600 transition-colors
                                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                                             dark:focus:ring-offset-gray-800"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Member
                                </button>
                            ) : (
                                <form onSubmit={handleAddMember} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <input
                                                type="email"
                                                value={newMemberData.email}
                                                onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                                                placeholder="Enter member's email"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                                                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                                                         focus:border-blue-500 dark:focus:border-blue-400
                                                         bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100
                                                         placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                                                required
                                                disabled={isUpdating}
                                            />
                                        </div>
                                        <div>
                                            <select
                                                value={newMemberData.role}
                                                onChange={(e) => setNewMemberData({ ...newMemberData, role: e.target.value as GroupRole })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                                                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                                                         focus:border-blue-500 dark:focus:border-blue-400
                                                         bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 transition-colors"
                                                disabled={isUpdating}
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="member">Member</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-2 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddMember(false);
                                                setNewMemberData({ email: '', role: 'member' });
                                            }}
                                            disabled={isUpdating}
                                            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                                     bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md 
                                                     hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors
                                                     disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isUpdating || !newMemberData.email.trim()}
                                            className="px-3 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-500 
                                                     border border-transparent rounded-md hover:bg-green-700 dark:hover:bg-green-600 
                                                     transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 
                                                     focus:ring-green-500 dark:focus:ring-offset-gray-800 
                                                     disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUpdating ? 'Adding...' : 'Add Member'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Members List */}
                    <div className="space-y-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Members ({members?.length || 0})
                        </h3>

                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
                            </div>
                        ) : members && members.length > 0 ? (
                            <div className="space-y-2">
                                {members.map((member) => (
                                    <div key={member.userId} className="flex items-center justify-between p-3 
                                                                        bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                                        <div className="flex items-center space-x-3">
                                            {getRoleIcon(member.role)}
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {member.email || member.username || member.userId}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            {canManageMembers && member.role !== 'owner' ? (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleUpdateRole(member, e.target.value as GroupRole)}
                                                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 
                                                             bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 transition-colors
                                                             focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                    disabled={isUpdating}
                                                >
                                                    <option value="viewer">Viewer</option>
                                                    <option value="member">Member</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            ) : (
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize px-2 py-1">
                                                    {member.role}
                                                </span>
                                            )}

                                            {canManageMembers && member.role !== 'owner' && (
                                                <button
                                                    onClick={() => handleRemoveMember(member)}
                                                    disabled={isUpdating}
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 
                                                             transition-colors p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Remove member"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                <p>No members found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md 
                                 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                 dark:focus:ring-offset-gray-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}