'use client'
import { useState } from 'react';
import { CreateGroupRequest } from '@/types/groups';
import { useGroups } from '@/hooks/useGroups';
import { X } from 'lucide-react';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGroupCreated: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
    const { createGroup, isCreating, error } = useGroups();
    const [formData, setFormData] = useState<CreateGroupRequest>({
        groupName: '',
        description: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.groupName.trim()) {
            return;
        }

        const group = await createGroup(formData);
        if (group) {
            setFormData({ groupName: '', description: '' });
            onGroupCreated();
        }
    };

    const handleClose = () => {
        if (!isCreating) {
            setFormData({ groupName: '', description: '' });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-md 
                          border dark:border-gray-700 max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Group</h2>
                    <button
                        onClick={handleClose}
                        disabled={isCreating}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 
                                 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 
                                      text-red-700 dark:text-red-300 rounded-md">
                            {error.message}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Group Name *
                            </label>
                            <input
                                type="text"
                                id="groupName"
                                value={formData.groupName}
                                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                                         focus:border-blue-500 dark:focus:border-blue-400
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                         placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                                placeholder="Enter group name"
                                required
                                disabled={isCreating}
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                                         focus:border-blue-500 dark:focus:border-blue-400
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                         placeholder-gray-500 dark:placeholder-gray-400 transition-colors resize-vertical"
                                placeholder="Describe the purpose of this group (optional)"
                                disabled={isCreating}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isCreating}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                     bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md 
                                     hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                     dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || !formData.groupName.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-500 
                                     border border-transparent rounded-md hover:bg-green-700 dark:hover:bg-green-600 
                                     transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 
                                     focus:ring-green-500 dark:focus:ring-offset-gray-800 
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}