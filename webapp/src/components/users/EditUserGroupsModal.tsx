'use client'
import { useState } from 'react';
import { User, UserGroup } from '@/types/user';
import { userManagementService } from '@/services/user';
import { X } from 'lucide-react';

interface EditUserGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onGroupsUpdated: () => void;
}

export function EditUserGroupsModal({ isOpen, onClose, user, onGroupsUpdated }: EditUserGroupsModalProps) {
    const [selectedGroups, setSelectedGroups] = useState<UserGroup[]>(user.groups as UserGroup[]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Available groups
    const availableGroups: UserGroup[] = ['admin', 'paid', 'free'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        setError(null);

        try {
            const response = await userManagementService.setUserGroups(user.username, selectedGroups);

            if (response.success) {
                onGroupsUpdated();
            } else if (response.error) {
                setError(response.error.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user groups');
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleGroup = (group: UserGroup) => {
        if (selectedGroups.includes(group)) {
            setSelectedGroups(selectedGroups.filter(g => g !== group));
        } else {
            setSelectedGroups([...selectedGroups, group]);
        }
    };

    // If modal is not open, don't render anything
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit User Groups</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800">
                        {error}
                    </div>
                )}

                <div className="mb-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Editing groups for: <span className="font-semibold text-gray-900 dark:text-gray-100">{user.email}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            User Groups
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availableGroups.map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => toggleGroup(group)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                                        ${selectedGroups.includes(group)
                                            ? group === 'admin'
                                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                : group === 'paid'
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-600 text-white hover:bg-gray-700'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium
                                     text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                                     text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
                        >
                            {isUpdating ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}