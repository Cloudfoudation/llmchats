'use client'
import { useState, useEffect } from 'react';
import { Group, GroupMember, CreateGroupRequest, GroupRole } from '@/types/groups';
import { useGroups } from '@/hooks/useGroups';
import {
    Users,
    Edit,
    Trash,
    RefreshCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    Plus,
    Crown,
    Shield,
    User,
    Eye
} from 'lucide-react';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { EditGroupModal } from '@/components/groups/EditGroupModal';
import { ManageGroupMembersModal } from '@/components/groups/ManageGroupMembersModal';
import { useAuthContext } from '@/providers/AuthProvider';

export function GroupManagementPage() {
    const { userAttributes } = useAuthContext();
    const {
        groups,
        isLoading,
        error,
        fetchGroups,
        deleteGroup,
        clearError
    } = useGroups();

    // State for modals
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    // State for search and filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);

    // Check if user is admin
    const isAdmin = userAttributes?.['cognito:groups']?.some(
        group => group === 'admin'
    ) || false;

    // Filter groups based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredGroups(groups);
        } else {
            const filtered = groups.filter(group =>
                group.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                group.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredGroups(filtered);
        }
    }, [groups, searchQuery]);

    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Filter is handled by useEffect above
    };

    // Handle refresh
    const handleRefresh = () => {
        fetchGroups();
        clearError();
    };

    // Handle delete group
    const handleDeleteGroup = async (group: Group) => {
        if (!window.confirm(`Are you sure you want to delete the group "${group.groupName}"? This action cannot be undone.`)) {
            return;
        }

        const success = await deleteGroup(group.groupId);
        if (success) {
            // Group list will be automatically refreshed via the hook
        }
    };

    // Handle edit group
    const handleEditGroup = (group: Group) => {
        setSelectedGroup(group);
        setIsEditGroupModalOpen(true);
    };

    // Handle manage members
    const handleManageMembers = (group: Group) => {
        setSelectedGroup(group);
        setIsMembersModalOpen(true);
    };

    // Format date string
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get role icon
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

    // Get role badge color
    const getRoleBadgeColor = (role: GroupRole) => {
        switch (role) {
            case 'owner':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'admin':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'member':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'viewer':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Search and Create Group Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search groups by name or description"
                            className="pl-10 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-700 py-2 px-3
                                     text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                                     focus:border-blue-500 dark:focus:border-blue-400 
                                     focus:ring-blue-500 dark:focus:ring-blue-400 
                                     transition-colors sm:text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        className="ml-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm 
                                 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 
                                 dark:bg-blue-500 dark:hover:bg-blue-600
                                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                 dark:focus:ring-offset-gray-800 transition-colors"
                    >
                        Search
                    </button>
                </form>
                <button
                    onClick={() => setIsCreateGroupModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm 
                             text-sm font-medium text-white bg-green-600 hover:bg-green-700 
                             dark:bg-green-500 dark:hover:bg-green-600
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                             dark:focus:ring-offset-gray-800 transition-colors"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                </button>
            </div>

            {/* Groups Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/50 border dark:border-gray-700">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Group Management</h2>
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-gray-600 dark:bg-gray-500 text-white py-2 px-4 rounded 
                                 hover:bg-gray-700 dark:hover:bg-gray-600 
                                 disabled:bg-gray-400 dark:disabled:bg-gray-600 
                                 disabled:cursor-not-allowed transition-colors"
                    >
                        <RefreshCcw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/50 border-l-4 border-red-400 dark:border-red-500">
                        <p className="text-red-600 dark:text-red-300">{error.message}</p>
                        <button
                            onClick={clearError}
                            className="mt-2 text-sm text-red-600 dark:text-red-300 underline hover:no-underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Group Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Members
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Your Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredGroups.length > 0 ? (
                                filteredGroups.map((group) => (
                                    <tr key={group.groupId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{group.groupName}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: {group.groupId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-xs truncate text-gray-700 dark:text-gray-300" title={group.description}>
                                                {group.description || 'No description'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-gray-900 dark:text-gray-100">
                                                <Users className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                                                {group.memberCount}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 inline-flex items-center text-xs leading-4 font-semibold rounded-full ${getRoleBadgeColor(group.userRole)}`}>
                                                {getRoleIcon(group.userRole)}
                                                <span className="ml-1 capitalize">{group.userRole}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(group.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleManageMembers(group)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 
                                                             transition-colors p-1 rounded"
                                                    title="Manage Members"
                                                >
                                                    <Users className="h-5 w-5" />
                                                    <span className="sr-only">Manage Members</span>
                                                </button>
                                                {(group.userRole === 'owner' || group.userRole === 'admin' || isAdmin) && (
                                                    <button
                                                        onClick={() => handleEditGroup(group)}
                                                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 
                                                                 transition-colors p-1 rounded"
                                                        title="Edit Group"
                                                    >
                                                        <Edit className="h-5 w-5" />
                                                        <span className="sr-only">Edit Group</span>
                                                    </button>
                                                )}
                                                {(group.userRole === 'owner' || isAdmin) && (
                                                    <button
                                                        onClick={() => handleDeleteGroup(group)}
                                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 
                                                                 transition-colors p-1 rounded"
                                                        title="Delete Group"
                                                    >
                                                        <Trash className="h-5 w-5" />
                                                        <span className="sr-only">Delete Group</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <Users className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                                            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No Groups Found</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                                {searchQuery ? 'Try a different search term' : 'Create your first group to get started'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {isLoading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Statistics Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            Showing {filteredGroups.length} of {groups.length} groups
                        </div>
                        <div className="flex space-x-4">
                            <span>Owner: {groups.filter(g => g.userRole === 'owner').length}</span>
                            <span>Admin: {groups.filter(g => g.userRole === 'admin').length}</span>
                            <span>Member: {groups.filter(g => g.userRole === 'member').length}</span>
                            <span>Viewer: {groups.filter(g => g.userRole === 'viewer').length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={isCreateGroupModalOpen}
                onClose={() => setIsCreateGroupModalOpen(false)}
                onGroupCreated={() => {
                    setIsCreateGroupModalOpen(false);
                    fetchGroups();
                }}
            />

            {/* Edit Group Modal */}
            {selectedGroup && (
                <EditGroupModal
                    isOpen={isEditGroupModalOpen}
                    onClose={() => {
                        setIsEditGroupModalOpen(false);
                        setSelectedGroup(null);
                    }}
                    group={selectedGroup}
                    onGroupUpdated={() => {
                        setIsEditGroupModalOpen(false);
                        setSelectedGroup(null);
                        fetchGroups();
                    }}
                />
            )}

            {/* Manage Group Members Modal */}
            {selectedGroup && (
                <ManageGroupMembersModal
                    isOpen={isMembersModalOpen}
                    onClose={() => {
                        setIsMembersModalOpen(false);
                        setSelectedGroup(null);
                    }}
                    group={selectedGroup}
                    onMembersUpdated={() => {
                        fetchGroups();
                    }}
                />
            )}
        </div>
    );
}