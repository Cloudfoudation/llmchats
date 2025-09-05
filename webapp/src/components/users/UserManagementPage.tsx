'use client'
import { useState, useEffect } from 'react';
import { User, CreateUserRequest, UserGroup } from '@/types/user';
import { userManagementService } from '@/services/user';
import { Check, X, Edit, Trash, RefreshCcw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { NewUserModal } from '@/components/users/NewUserModal';
import { EditUserGroupsModal } from '@/components/users/EditUserGroupsModal';
import { useAuthContext } from '@/providers/AuthProvider';

export function UserManagementPage() {
    // State for user list and pagination
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paginationToken, setPaginationToken] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageTokens, setPageTokens] = useState<(string | null)[]>([null]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValue, setFilterValue] = useState('');
    const { user } = useAuthContext();

    const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
    const [newUserData, setNewUserData] = useState<CreateUserRequest>({
        email: '',
        groups: ['free'],
        sendInvite: true
    });

    const [isEditGroupsModalOpen, setIsEditGroupsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    userManagementService.setUser(user)

    // Fetch users on component mount and when pagination token changes
    const fetchUsers = async (token?: string, filter?: string, pageIndex?: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await userManagementService.listUsers({
                limit: 10,
                paginationToken: token || undefined,
                filter: filter || undefined
            });

            if (response.success && response.data) {
                setUsers(response.data.users);

                if (response.data.paginationToken && pageIndex !== undefined) {
                    const newPageTokens = [...pageTokens];
                    while (newPageTokens.length <= pageIndex + 1) {
                        newPageTokens.push(null);
                    }
                    newPageTokens[pageIndex + 1] = response.data.paginationToken;
                    setPageTokens(newPageTokens);
                }

                setPaginationToken(response.data.paginationToken || null);
            } else if (response.error) {
                setError(response.error.message);
                setUsers([]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(undefined, undefined, 0);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(0);
        setPageTokens([null]);
        setPaginationToken(null);

        const filter = searchQuery ? `email ^= "${searchQuery}" or username ^= "${searchQuery}"` : '';
        setFilterValue(filter);
        fetchUsers(undefined, filter, 0);
    };

    const handleNextPage = () => {
        if (paginationToken) {
            const nextPageIndex = currentPage + 1;
            setCurrentPage(nextPageIndex);
            fetchUsers(paginationToken, filterValue, nextPageIndex);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            const prevPageIndex = currentPage - 1;
            setCurrentPage(prevPageIndex);
            const prevToken = pageTokens[prevPageIndex];
            fetchUsers(prevToken || undefined, filterValue, prevPageIndex);
        }
    };

    const handleRefresh = () => {
        const currentToken = pageTokens[currentPage];
        fetchUsers(currentToken || undefined, filterValue, currentPage);
    };

    const handleDeleteUser = async (username: string) => {
        if (!window.confirm(`Are you sure you want to delete user ${username}?`)) {
            return;
        }

        try {
            const response = await userManagementService.deleteUser(username);

            if (response.success) {
                fetchUsers(pageTokens[currentPage] || undefined, filterValue, currentPage);
            } else if (response.error) {
                setError(response.error.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user');
        }
    };

    const handleEditGroups = (user: User) => {
        setSelectedUser(user);
        setIsEditGroupsModalOpen(true);
    };

    const handleGroupsUpdated = () => {
        fetchUsers(pageTokens[currentPage] || undefined, filterValue, currentPage);
        setIsEditGroupsModalOpen(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Search and Add User Bar */}
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
                            placeholder="Search users by email or username"
                            className="pl-10 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 
                                     text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        className="ml-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                                 text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                 dark:focus:ring-offset-gray-800 transition-colors"
                    >
                        Search
                    </button>
                </form>
                <button
                    onClick={() => setIsNewUserModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                             text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                             dark:focus:ring-offset-gray-800 transition-colors"
                >
                    Add User
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Management</h2>
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
                    >
                        <RefreshCcw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {error && (
                    <div className="p-4 text-red-600 dark:text-red-200 bg-red-50 dark:bg-red-900/50 border-l-4 border-red-400 dark:border-red-500">
                        <p>{error}</p>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username/Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created At</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Groups</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr key={user.username} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                            <div className="font-medium">{user.username}</div>
                                            <div className="text-gray-500 dark:text-gray-400 text-sm">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                    ${user.status === 'CONFIRMED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                        user.status === 'UNCONFIRMED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                    {user.status}
                                                </span>
                                                {user.enabled ?
                                                    <Check className="h-4 w-4 text-green-500 dark:text-green-400" /> :
                                                    <X className="h-4 w-4 text-red-500 dark:text-red-400" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.groups.map(group => (
                                                    <span key={group} className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full
                                                        ${group === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                            group === 'paid' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                                        {group}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleEditGroups(user)}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                    title="Edit Groups"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                    <span className="sr-only">Edit Groups</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.username)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash className="h-5 w-5" />
                                                    <span className="sr-only">Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <p className="text-lg font-medium">No Users Found</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                                {searchQuery ? 'Try a different search term' : 'Add users using the button above'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 0}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md
                                    text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                                    disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-400 transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={!paginationToken}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md
                                    text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                                    disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-400 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                Showing <span className="font-medium">{users.length}</span> results
                                {currentPage > 0 && <span> (Page {currentPage + 1})</span>}
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 0}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600
                                           bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700
                                           disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-400 transition-colors"
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    disabled={!paginationToken}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600
                                           bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700
                                           disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-400 transition-colors"
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* New User Modal */}
            <NewUserModal
                isOpen={isNewUserModalOpen}
                onClose={() => setIsNewUserModalOpen(false)}
                onUserCreated={() => {
                    setIsNewUserModalOpen(false);
                    fetchUsers(pageTokens[currentPage] || undefined, filterValue, currentPage);
                }}
            />

            {/* Edit User Groups Modal */}
            {selectedUser && (
                <EditUserGroupsModal
                    isOpen={isEditGroupsModalOpen}
                    onClose={() => setIsEditGroupsModalOpen(false)}
                    user={selectedUser}
                    onGroupsUpdated={handleGroupsUpdated}
                />
            )}
        </div>
    );
}