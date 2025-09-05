'use client'
import { useState } from 'react';
import { userManagementService } from '@/services/user';
import { UserGroup } from '@/types/user';
import { X } from 'lucide-react';

interface NewUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated: () => void;
}

export function NewUserModal({ isOpen, onClose, onUserCreated }: NewUserModalProps) {
    const [email, setEmail] = useState('');
    const [temporaryPassword, setTemporaryPassword] = useState('');
    const [selectedGroups, setSelectedGroups] = useState<UserGroup[]>(['free']);
    const [sendInvite, setSendInvite] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Available groups
    const availableGroups: UserGroup[] = ['admin', 'paid', 'free'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Email is required');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const response = await userManagementService.createUser({
                email,
                temporaryPassword: temporaryPassword || undefined,
                groups: selectedGroups,
                sendInvite
            });

            if (response.success) {
                resetForm();
                onUserCreated();
            } else if (response.error) {
                setError(response.error.message);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setIsCreating(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setTemporaryPassword('');
        setSelectedGroups(['free']);
        setSendInvite(true);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
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
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold dark:text-gray-200">Create New User</h2>
                    <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email Address*
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                            placeholder="user@example.com"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Temporary Password (optional)
                        </label>
                        <input
                            type="password"
                            value={temporaryPassword}
                            onChange={(e) => setTemporaryPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200"
                            placeholder="Leave blank to auto-generate"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            If left blank, a temporary password will be generated and sent to the user
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            User Groups
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availableGroups.map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => toggleGroup(group)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium
                                        ${selectedGroups.includes(group)
                                            ? group === 'admin'
                                                ? 'bg-purple-600 text-white'
                                                : group === 'paid'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-600 text-white'
                                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="send-invite"
                                checked={sendInvite}
                                onChange={(e) => setSendInvite(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="send-invite" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Send welcome email with login instructions
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium
                                     text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || !email}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                                     text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {isCreating ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}