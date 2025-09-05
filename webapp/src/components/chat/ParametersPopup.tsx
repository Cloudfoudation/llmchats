import React, { useState, useEffect, useRef } from 'react';
import { ModelOption, CategoryType } from '@/types/models';
import { ProviderType } from '@/types/models'
import {
    AmazonImageTaskType, AmazonControlMode, AmazonOutpaintingMode, ModelParams,
    STABILITY_OUTPUT_FORMATS,
    STABILITY_ASPECT_RATIOS,
    IMAGE_SIZES,
    VideoDimension,
    VideoQuality
} from '@/types/models'

export const ParametersPopup = ({
    isOpen,
    onClose,
    modelParams,
    selectedModel,
    onModelParamsChange,
    buttonRef
}: {
    isOpen: boolean;
    onClose: () => void;
    modelParams: ModelParams;
    selectedModel: ModelOption | undefined;
    onModelParamsChange: (params: ModelParams) => void;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const isImageModel = selectedModel?.category.includes(CategoryType.Image);
    const isStabilityModel = selectedModel?.provider === ProviderType.StabilityAI;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            // Get viewport width
            const viewportWidth = window.innerWidth;

            if (buttonRef.current && dropdownRef.current) {
                const buttonRect = buttonRef.current.getBoundingClientRect();
                const dropdownHeight = dropdownRef.current.offsetHeight;
                const dropdownWidth = dropdownRef.current.offsetWidth;

                // For mobile (viewport width < 640px), center horizontally
                if (viewportWidth < 640) {
                    setPosition({
                        top: buttonRect.top - dropdownHeight - 8,
                        left: (viewportWidth - dropdownWidth) / 2
                    });
                } else {
                    // Desktop positioning
                    setPosition({
                        top: buttonRect.top - dropdownHeight - 8,
                        left: buttonRect.left - 100
                    });
                }
            }
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !selectedModel) return null;

    return (
        <div
            ref={dropdownRef}
            className="fixed w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden z-50"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                maxWidth: '90vw',
                transform: 'translateY(-8px)',
            }}
        >
            <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Model Parameters</h3>
            </div>

            <div className="p-3 space-y-4 max-h-[400px] overflow-y-auto">
                {/* Text model parameters */}
                {!isImageModel && (
                    <>
                        {/* Existing text model parameters */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Max Tokens
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="range"
                                    value={modelParams.maxTokens}
                                    onChange={(e) => onModelParamsChange({
                                        ...modelParams,
                                        maxTokens: parseInt(e.target.value)
                                    })}
                                    min={1}
                                    max={selectedModel.maxOutputTokens || 4096}
                                    className="flex-1"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                    {modelParams.maxTokens}
                                </span>
                            </div>
                        </div>

                        {/* Add turn round controls */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Max Conversation Turns
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="range"
                                    value={modelParams.maxTurns}
                                    onChange={(e) => onModelParamsChange({
                                        ...modelParams,
                                        maxTurns: parseInt(e.target.value)
                                    })}
                                    min={1}
                                    max={25}
                                    className="flex-1"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                    {modelParams.maxTurns}
                                </span>
                            </div>
                        </div>

                        {selectedModel.parameters.supportsTemperature && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step="0.1"
                                        value={modelParams.temperature}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            temperature: parseFloat(e.target.value)
                                        })}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                        {modelParams.temperature}
                                    </span>
                                </div>
                            </div>
                        )}

                        {selectedModel.parameters.supportsTopP && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Top P</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step="0.1"
                                        value={modelParams.topP}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            topP: parseFloat(e.target.value)
                                        })}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                        {modelParams.topP}
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Add extended thinking toggle for Claude 3.7 Sonnet */}
                {(selectedModel?.id.includes('claude-sonnet-4') || selectedModel.id.includes('claude-opus-4') || selectedModel?.id.includes('claude-3-7-sonnet')) && (
                    <>
                        <div className="border-t border-gray-200 dark:border-gray-600 my-3 pt-3">
                            <label className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={modelParams.extendedThinking || false}
                                    onChange={(e) => onModelParamsChange({
                                        ...modelParams,
                                        extendedThinking: e.target.checked,
                                        budgetTokens: e.target.checked ? (modelParams.budgetTokens || 4000) : undefined
                                    })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 rounded mr-2"
                                />
                                Extended Thinking
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Enable step-by-step reasoning for complex tasks
                            </p>
                        </div>

                        {modelParams.extendedThinking && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Thinking Budget (tokens)
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="range"
                                        value={modelParams.budgetTokens || 4000}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            budgetTokens: parseInt(e.target.value)
                                        })}
                                        min={1024}
                                        max={Math.min(modelParams.maxTokens - 1024, 32000)}
                                        step={100}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
                                        {modelParams.budgetTokens || 4000}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Recommended: 4,000+ tokens for comprehensive reasoning
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Image model parameters */}
                {isImageModel && isStabilityModel && (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Aspect Ratio
                            </label>
                            <select
                                value={modelParams.aspectRatio}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    aspectRatio: e.target.value as typeof STABILITY_ASPECT_RATIOS[number]
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {STABILITY_ASPECT_RATIOS.map(ratio => (
                                    <option key={ratio} value={ratio}>{ratio}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Output Format
                            </label>
                            <select
                                value={modelParams.outputFormat}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    outputFormat: e.target.value as typeof STABILITY_OUTPUT_FORMATS[number]
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {STABILITY_OUTPUT_FORMATS.map(format => (
                                    <option key={format} value={format}>{format.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Negative Prompt
                            </label>
                            <textarea
                                value={modelParams.negativePrompt}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    negativePrompt: e.target.value
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                                placeholder="What to avoid in the image..."
                                rows={2}
                            />
                        </div>

                        {modelParams.mode === 'image-to-image' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Strength
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step="0.1"
                                        value={modelParams.strength}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            strength: parseFloat(e.target.value)
                                        })}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                        {modelParams.strength}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Seed
                            </label>
                            <input
                                type="number"
                                value={modelParams.seed}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    seed: parseInt(e.target.value)
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </>
                )}

                {/* Image model parameters */}
                {isImageModel && selectedModel?.provider === ProviderType.Amazon && (
                    <>
                        {/* Task Type Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Task Type
                            </label>
                            <select
                                value={modelParams.taskType || 'TEXT_IMAGE'}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    taskType: e.target.value as AmazonImageTaskType
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="TEXT_IMAGE">Text to Image</option>
                                <option value="INPAINTING">Inpainting</option>
                                <option value="OUTPAINTING">Outpainting</option>
                                <option value="IMAGE_VARIATION">Image Variation</option>
                                {(selectedModel.id.includes('v2') || selectedModel.id.includes('canvas')) && (
                                    <>
                                        <option value="COLOR_GUIDED_GENERATION">Color Guided</option>
                                        <option value="BACKGROUND_REMOVAL">Background Removal</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {modelParams.taskType !== 'BACKGROUND_REMOVAL' && (
                            <>
                                {/* Common Image Settings */}
                                {/* Image Size Controls with Custom Input */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Image Size
                                    </label>

                                    {/* Preset sizes dropdown */}
                                    <select
                                        value={modelParams.imageSize || 'custom'}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                // Keep current width/height when switching to custom
                                                onModelParamsChange({
                                                    ...modelParams,
                                                    imageSize: 'custom',
                                                    imageWidth: modelParams.imageWidth || 1024,
                                                    imageHeight: modelParams.imageHeight || 1024
                                                });
                                            } else {
                                                // Parse selected preset size
                                                const [width, height] = e.target.value.split('x').map(Number);
                                                onModelParamsChange({
                                                    ...modelParams,
                                                    imageSize: e.target.value as typeof IMAGE_SIZES[number],
                                                    imageWidth: width,
                                                    imageHeight: height
                                                });
                                            }
                                        }}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="custom">Custom Size</option>
                                        {IMAGE_SIZES.map(size => (
                                            <option key={size} value={size}>{size}</option>
                                        ))}
                                    </select>

                                    {/* Custom size input on new row */}
                                    {(modelParams.imageSize === 'custom' || !modelParams.imageSize) && (
                                        <div className="mt-2">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    placeholder="width"
                                                    value={modelParams.imageWidth || ''}
                                                    onChange={(e) => {
                                                        const width = parseInt(e.target.value);
                                                        onModelParamsChange({
                                                            ...modelParams,
                                                            imageSize: 'custom',
                                                            imageWidth: width || undefined
                                                        });
                                                    }}
                                                    className="flex-1 w-10 px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <span className="text-gray-500 dark:text-gray-400">×</span>
                                                <input
                                                    type="text"
                                                    placeholder="height"
                                                    value={modelParams.imageHeight || ''}
                                                    onChange={(e) => {
                                                        const height = parseInt(e.target.value);
                                                        onModelParamsChange({
                                                            ...modelParams,
                                                            imageSize: 'custom',
                                                            imageHeight: height || undefined
                                                        });
                                                    }}
                                                    className="flex-1 w-10 px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Enter size in format: widthxheight (e.g. 1280x720)
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Number of Images */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Number of Images
                                    </label>
                                    <input
                                        type="number"
                                        value={modelParams.numImages || 1}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            numImages: parseInt(e.target.value)
                                        })}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        min={1}
                                        max={4}
                                    />
                                </div>

                                {/* CFG Scale */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        CFG Scale
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="range"
                                            min={1}
                                            max={20}
                                            step={0.5}
                                            value={modelParams.cfgScale || 7.5}
                                            onChange={(e) => onModelParamsChange({
                                                ...modelParams,
                                                cfgScale: parseFloat(e.target.value)
                                            })}
                                            className="flex-1"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                            {modelParams.cfgScale || 7.5}
                                        </span>
                                    </div>
                                </div>

                                {/* Seed */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Seed
                                    </label>
                                    <input
                                        type="number"
                                        value={modelParams.seed || 0}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            seed: parseInt(e.target.value)
                                        })}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Negative Prompt */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Negative Prompt
                                    </label>
                                    <textarea
                                        value={modelParams.negativeText}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            negativeText: e.target.value
                                        })}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                                        placeholder="What to avoid in the image (minimum 3 characters)..."
                                        rows={2}
                                    />
                                </div>
                            </>
                        )}

                        {/* Task-Specific Controls */}
                        {modelParams.taskType === 'TEXT_IMAGE' && selectedModel.id.includes('v2') && (
                            <>
                                {/* Control Mode */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Control Mode
                                    </label>
                                    <select
                                        value={modelParams.controlMode || 'CANNY_EDGE'}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            controlMode: e.target.value as AmazonControlMode
                                        })}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="CANNY_EDGE">Canny Edge</option>
                                        <option value="SEGMENTATION">Segmentation</option>
                                    </select>
                                </div>

                                {/* Control Strength */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Control Strength
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            value={modelParams.controlStrength || 0.7}
                                            onChange={(e) => onModelParamsChange({
                                                ...modelParams,
                                                controlStrength: parseFloat(e.target.value)
                                            })}
                                            className="flex-1"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                            {modelParams.controlStrength || 0.7}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {(modelParams.taskType === 'INPAINTING' || modelParams.taskType === 'OUTPAINTING') && (
                            <>
                                {/* Mask Prompt */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mask Prompt
                                    </label>
                                    <input
                                        type="text"
                                        value={modelParams.maskPrompt || ''}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            maskPrompt: e.target.value
                                        })}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Describe the area to mask..."
                                    />
                                </div>

                                {/* Return Mask Toggle */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="returnMask"
                                        checked={modelParams.returnMask || false}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            returnMask: e.target.checked
                                        })}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 rounded"
                                    />
                                    <label htmlFor="returnMask" className="ml-2 block text-xs text-gray-700 dark:text-gray-300">
                                        Return Mask
                                    </label>
                                </div>
                            </>
                        )}

                        {modelParams.taskType === 'OUTPAINTING' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Outpainting Mode
                                </label>
                                <select
                                    value={modelParams.outpaintingMode || 'DEFAULT'}
                                    onChange={(e) => onModelParamsChange({
                                        ...modelParams,
                                        outpaintingMode: e.target.value as AmazonOutpaintingMode
                                    })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="DEFAULT">Default</option>
                                    <option value="PRECISE">Precise</option>
                                </select>
                            </div>
                        )}

                        {modelParams.taskType === 'IMAGE_VARIATION' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Similarity Strength
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="range"
                                        min={0.2}
                                        max={1}
                                        step={0.1}
                                        value={modelParams.similarityStrength || 0.7}
                                        onChange={(e) => onModelParamsChange({
                                            ...modelParams,
                                            similarityStrength: parseFloat(e.target.value)
                                        })}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                                        {modelParams.similarityStrength || 0.7}
                                    </span>
                                </div>
                            </div>
                        )}

                        {modelParams.taskType === 'COLOR_GUIDED_GENERATION' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Color Hex Codes
                                </label>
                                <input
                                    type="text"
                                    value={modelParams.colors?.join(', ') || ''}
                                    onChange={(e) => onModelParamsChange({
                                        ...modelParams,
                                        colors: e.target.value.split(',').map(c => c.trim())
                                    })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="#FF0000, #00FF00, #0000FF"
                                />
                            </div>
                        )}
                    </>
                )}
                {/* Video model parameters */}
                {selectedModel?.category.includes(CategoryType.Video) && (
                    <>
                        {/* Task Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Task Type
                            </label>
                            <select
                                value={modelParams.videoTaskType || 'TEXT_VIDEO'}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    videoTaskType: e.target.value as 'TEXT_VIDEO' | 'IMAGE_VIDEO'
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="TEXT_VIDEO">Text to Video</option>
                                <option value="IMAGE_VIDEO">Image to Video</option>
                            </select>
                        </div>

                        {/* Video Duration */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Duration (seconds)
                            </label>
                            <input
                                type="number"
                                value={modelParams.durationSeconds || 6}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    durationSeconds: parseInt(e.target.value)
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                min={1}
                                max={9}
                            />
                        </div>

                        {/* FPS */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Frames Per Second
                            </label>
                            <select
                                value={modelParams.fps || 24}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    fps: parseInt(e.target.value)
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value={24}>24 FPS</option>
                                <option value={30}>30 FPS</option>
                            </select>
                        </div>

                        {/* Video Resolution */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Resolution
                            </label>
                            <select
                                value={modelParams.videoDimension || '1280x720'}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    videoDimension: e.target.value as VideoDimension
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="1280x720">HD (1280x720)</option>
                                <option value="1920x1080">Full HD (1920x1080)</option>
                            </select>
                        </div>

                        {/* Video Quality */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Quality
                            </label>
                            <select
                                value={modelParams.videoQuality || 'standard'}
                                onChange={(e) => onModelParamsChange({
                                    ...modelParams,
                                    videoQuality: e.target.value as VideoQuality
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="standard">Standard</option>
                                <option value="premium">Premium</option>
                            </select>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
};