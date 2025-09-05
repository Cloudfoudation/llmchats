// src/components/settings/SettingsModal.tsx
import React, { useRef } from 'react';
import { Modal } from '@/components/Modal';
import { ModelCard } from '@/components/chat/ModelCard';
import { ParametersPopup } from '@/components/chat/ParametersPopup';
import { useSettingsContext } from '@/providers/SettingsProvider';
import { getModelById } from '@/utils/models';

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { settings, updateSettings } = useSettingsContext();
    const selectedModel = getModelById(settings.defaultModelParams.modelId);
    const paramButtonRef = useRef<HTMLButtonElement>(null);
    const [showParameters, setShowParameters] = React.useState(false);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings" maxWidth="max-w-4xl">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Default Model</h3>
                    <ModelCard
                        selectedModel={settings.defaultModelParams.modelId}
                        onModelSelect={(modelId) => updateSettings({
                            defaultModelParams: {
                                ...settings.defaultModelParams,
                                modelId
                            }
                        })}
                        isOpen={true}
                    />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    {selectedModel && (
                        <>
                            <ParametersPopup
                                isOpen={showParameters}
                                onClose={() => setShowParameters(false)}
                                modelParams={settings.defaultModelParams}
                                selectedModel={selectedModel}
                                onModelParamsChange={(params) => updateSettings({
                                    defaultModelParams: params
                                })}
                                buttonRef={paramButtonRef}
                            />
                            <button
                                ref={paramButtonRef}
                                onClick={() => setShowParameters(!showParameters)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                Configure Parameters
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};