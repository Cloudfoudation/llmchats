// src/components/ChatInput.tsx
import React, { useState, useRef } from 'react';
import { ModelSelector } from './ModelSelector';
import { useEffect } from 'react';
import { credentialsDB } from '../../utils/db';
import { ModelOption, CategoryType, ModelParams } from '@/types/models'
import { AgentSelector } from './AgentSelector';
import { IconRobot, IconFileText, IconFile, IconFileWord, IconFileTypography, IconSend, IconStop } from '@tabler/icons-react';
import { IconUpload, IconX, IconSettings, IconChevronUp, IconDownload, IconPaperclip } from '@tabler/icons-react';
import { ParametersPopup } from '@/components/chat/ParametersPopup'
import { Agent } from '@/types/agent'
import { ImageViewer } from '../ImageViewer';
import { useConversationContext } from '@/providers/ConversationProvider';
import { getModelById } from '@/utils/models';
import { useAgentsContext } from '@/providers/AgentsProvider';
import { conversionService } from '@/services/conversion';
import { useAuthContext } from '@/providers/AuthProvider';
import { useSettingsContext } from '@/providers/SettingsProvider';
import { useTranslations } from 'next-intl';

interface CustomFormEvent extends React.FormEvent {
    documentAttachments?: DocumentAttachment[];
}

interface DocumentAttachment {
    id: string;
    name: string;
    type: string;
    content: string;
    size: number;
    previewText?: string;
}

interface ChatInputProps {
    input: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSend: (e: React.FormEvent) => void;
    onStop?: () => void;
    uploadedImage?: string | null;
    onImageUpload: (file: File) => void;
    onClearImage: (index: number) => void;
    uploadedImages: string[];
}

export const ChatInput: React.FC<ChatInputProps> = ({
    input,
    isLoading,
    onInputChange,
    onSend,
    onStop,
    onImageUpload,
    uploadedImage,
    onClearImage,
    uploadedImages
}) => {
    const t = useTranslations('common');
    const tChat = useTranslations('chat');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);
    const [showAgentSelector, setShowAgentSelector] = useState(false);
    const agentButtonRef = useRef<HTMLButtonElement>(null);
    const [showModelSelector, setShowModelSelector] = useState(false);
    const modelButtonRef = useRef<HTMLButtonElement>(null);
    const [showParamsPopup, setShowParamsPopup] = useState(false);
    const maxTokensRef = useRef<HTMLButtonElement>(null);
    const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
    const [documentProcessing, setDocumentProcessing] = useState(false);
    const [documentAttachments, setDocumentAttachments] = useState<DocumentAttachment[]>([]);
    const [isTextareaFocused, setIsTextareaFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        activeConversation,
        updateConversation,
    } = useConversationContext();

    if (!activeConversation) return null;

    const { currentAgent, setCurrentAgent, agents } = useAgentsContext();
    const [modelParams, setModelParams] = useState<ModelParams>(activeConversation?.modelParams)
    const [selectedModel, setSelectedModel] = useState<ModelOption | undefined>(getModelById(activeConversation.modelParams.modelId));
    const { user } = useAuthContext();
    const { updateSettings } = useSettingsContext();
    conversionService.setUser(user)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    useEffect(() => {
        if (activeConversation) {
            const convAgent = activeConversation.agentId ? agents.find(a => a.id === activeConversation.agentId) ?? null : null;
            if (convAgent) {
                setCurrentAgent(convAgent);
                setSelectedModel(getModelById(convAgent.modelParams.modelId));
                setModelParams(convAgent.modelParams);
            } else {
                setCurrentAgent(null);
                setSelectedModel(getModelById(activeConversation.modelParams.modelId));
                setModelParams(activeConversation.modelParams);
            }
        }
    }, [activeConversation])

    useEffect(() => {
        //update to check all params different
        if (currentAgent && currentAgent.modelParams != modelParams) {
            // updateConversation({ id: activeConversation!.id, agentId: currentAgent.id, modelParams: currentAgent.modelParams });
            if (currentAgent) {
                // Check if agent is a Bedrock agent by looking at its type
                const isBedrockAgent = currentAgent.type === 'bedrock';
                updateConversation({
                    id: activeConversation!.id,
                    agentId: currentAgent.id,
                    modelParams: currentAgent.modelParams,
                    // Set a flag in conversation to indicate it's a Bedrock agent
                    isBedrockAgent: isBedrockAgent,
                    // If it's a Bedrock agent, store the agent and alias IDs
                    bedrockAgentId: isBedrockAgent ? currentAgent.bedrockAgentId : undefined,
                    bedrockAgentAliasId: isBedrockAgent ? currentAgent.bedrockAgentAliasId : undefined
                });
            } else {
                updateConversation({ id: activeConversation!.id, agentId: null, isBedrockAgent: false });
            }
        }
    }, [currentAgent])

    const handleAgentSelect = (agent: Agent | null) => {
        setCurrentAgent(agent);
        if (agent) {
            // Check if agent is a Bedrock agent by looking at its type
            const isBedrockAgent = agent.type === 'bedrock';
            updateConversation({
                id: activeConversation!.id,
                agentId: agent.id,
                modelParams: agent.modelParams,
                // Set a flag in conversation to indicate it's a Bedrock agent
                isBedrockAgent: isBedrockAgent,
                // If it's a Bedrock agent, store the agent and alias IDs
                bedrockAgentId: isBedrockAgent ? agent.bedrockAgentId : undefined,
                bedrockAgentAliasId: isBedrockAgent ? agent.bedrockAgentAliasId : undefined
            });
        } else {
            updateConversation({ id: activeConversation!.id, agentId: null, isBedrockAgent: false });
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                if (file && onImageUpload) {
                    onImageUpload(file);
                }
            });
            event.target.value = '';
        }
    };

    // Helper function to generate a unique ID
    const generateId = () => {
        return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    // Helper function to get appropriate icon for file type
    const getFileIcon = (fileType: string) => {
        switch (fileType.toLowerCase()) {
            case 'pdf':
                return <IconFileWord size={18} />;
            case 'docx':
            case 'doc':
                return <IconFileTypography size={18} />;
            case 'txt':
            case 'md':
                return <IconFile size={18} />;
            default:
                return <IconFile size={18} />;
        }
    };

    // Helper function to format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + " bytes";
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
        else return (bytes / 1048576).toFixed(1) + " MB";
    };

    const fileToBase64 = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
                    const base64Content = reader.result.split(',')[1];
                    resolve(base64Content);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleDocumentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        try {
            setDocumentProcessing(true);

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = file.name.toLowerCase();
                let fileType: string;
                let fileContent: string;
                let previewText: string = '';

                // Determine file type based on extension
                if (fileName.endsWith('.pdf')) {
                    fileType = 'pdf';
                    const base64Content = await fileToBase64(file);
                    const result = await conversionService.convertDocument({
                        fileType,
                        fileContent: base64Content
                    });

                    if (result.success && result.data) {
                        fileContent = result.data.text;
                        previewText = truncateText(fileContent, 150);
                    } else {
                        throw new Error('PDF conversion failed');
                    }
                } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
                    fileType = fileName.endsWith('.docx') ? 'docx' : 'doc';
                    const base64Content = await fileToBase64(file);
                    const result = await conversionService.convertDocument({
                        fileType,
                        fileContent: base64Content
                    });

                    if (result.success && result.data) {
                        fileContent = result.data.text;
                        previewText = truncateText(fileContent, 150);
                    } else {
                        throw new Error('Document conversion failed');
                    }
                } else if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
                    fileType = fileName.endsWith('.txt') ? 'txt' : 'md';
                    fileContent = await readTextFile(file);
                    previewText = truncateText(fileContent, 150);
                } else {
                    alert(`Unsupported file type: ${fileName}. Please use PDF, DOCX, DOC, TXT, or MD files.`);
                    continue;
                }

                // Create document attachment
                const newAttachment: DocumentAttachment = {
                    id: generateId(),
                    name: file.name,
                    type: fileType,
                    content: fileContent,
                    size: file.size,
                    previewText
                };

                // Add to document attachments
                setDocumentAttachments(prev => [...prev, newAttachment]);
            }
        } catch (error) {
            console.error('Error processing document:', error);
            alert(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setDocumentProcessing(false);
            if (event.target) event.target.value = '';
        }
    };

    const readTextFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    resolve(e.target.result as string);
                } else {
                    reject(new Error('Failed to read file'));
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const handleFileUploadClick = () => {
        try {
            if (!fileInputRef.current) {
                console.error('File input reference not found');
                return;
            }
            fileInputRef.current.click();
        } catch (error) {
            console.error('Error triggering file upload:', error);
        }
    };

    const handleDocumentUploadClick = () => {
        try {
            if (!documentInputRef.current) {
                console.error('Document input reference not found');
                return;
            }
            documentInputRef.current.click();
        } catch (error) {
            console.error('Error triggering document upload:', error);
        }
    };

    const handleMaxTokensClick = () => {
        setShowParamsPopup(true);
    };

    const handleImageClick = (index: number) => {
        setExpandedImageIndex(index);
    };

    const handleCloseViewer = () => {
        setExpandedImageIndex(null);
    };

    const handleNextImage = () => {
        if (expandedImageIndex !== null && uploadedImages) {
            setExpandedImageIndex(Math.min(expandedImageIndex + 1, uploadedImages.length - 1));
        }
    };

    const handlePreviousImage = () => {
        if (expandedImageIndex !== null) {
            setExpandedImageIndex(Math.max(expandedImageIndex - 1, 0));
        }
    };

    const removeDocumentAttachment = (id: string) => {
        setDocumentAttachments(prev => prev.filter(doc => doc.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        // Create a custom event with document attachments
        const customEvent = e as CustomFormEvent;
        customEvent.documentAttachments = documentAttachments;

        // Rest of existing code...
        if (documentAttachments.length > 0) {
            // Prepare document context for the model
            const docContext = documentAttachments.map(doc =>
                `[Document: ${doc.name} (${formatFileSize(doc.size)})]`
            ).join('\n');

            // If input is empty or just whitespace, add a helpful prompt
            const currentInput = input.trim();
            if (!currentInput) {
                onInputChange(`I've uploaded ${documentAttachments.length === 1 ? 'a document' : 'some documents'} for you to analyze.`);
            } else if (!currentInput.includes('[Document:')) {
                // If there's existing input but no document reference, append the document context
                onInputChange(`${input}\n\n${docContext}`);
            }
        }

        onSend(customEvent);
        // Clear document attachments after sending
        setDocumentAttachments([]);
    };

    const renderImagePreviews = () => {
        if (!uploadedImages?.length) return null;

        return (
            <div className="relative bg-gray-50 dark:bg-gray-800">
                <div className="p-2 flex flex-wrap gap-2">
                    {uploadedImages.map((image, index) => (
                        <div key={index} className="relative w-24 h-24 sm:w-32 sm:h-32">
                            <div className="w-full h-full rounded-lg overflow-hidden">
                                <img
                                    src={image}
                                    alt={`Uploaded ${index + 1}`}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => handleImageClick(index)}
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClearImage(index);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 
                                        rounded-full text-white hover:bg-opacity-75 transition-colors"
                                >
                                    <IconX size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Image Viewer */}
                {expandedImageIndex !== null && (
                    <ImageViewer
                        images={uploadedImages}
                        currentIndex={expandedImageIndex}
                        onClose={handleCloseViewer}
                        onNext={handleNextImage}
                        onPrevious={handlePreviousImage}
                    />
                )}
            </div>
        );
    };

    const renderDocumentAttachments = () => {
        if (!documentAttachments.length) return null;

        return (
            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Uploaded Documents</div>
                <div className="flex flex-wrap gap-2">
                    {documentAttachments.map(doc => (
                        <div
                            key={doc.id}
                            className="flex items-center bg-white dark:bg-gray-700 p-2 rounded-md border border-gray-200 dark:border-gray-600 max-w-full"
                            title={doc.previewText}
                        >
                            <div className="text-blue-500 dark:text-blue-400 mr-2">
                                {getFileIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100" style={{ maxWidth: '150px' }}>{doc.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(doc.size)}</div>
                            </div>
                            <button
                                onClick={() => removeDocumentAttachment(doc.id)}
                                className="ml-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                                title="Remove document"
                            >
                                <IconX size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Save model preference when it changes
    const handleModelSelect = async (modelId: string) => {
        if (activeConversation) {
            const newModelParams = {
                ...activeConversation.modelParams,
                modelId: modelId,
            };

            // Update current conversation
            updateConversation({
                id: activeConversation.id,
                modelParams: newModelParams,
                agentId: null
            });

            // Update default model in settings so future chats use this model
            await updateSettings({
                defaultModelParams: newModelParams
            });

            // Keep legacy preference for backward compatibility
            await credentialsDB.saveModelPreference({
                modelId,
                parameters: newModelParams,
            });
        }
    };

    // Helper function to check if model supports image input
    const supportsImageInput = (model: ModelOption | undefined) => {
        return model?.inputModalities?.includes(CategoryType.Image) || false;
    };

    return (
        <div className="p-4">
            {/* Attachments Preview */}
            {(uploadedImages.length > 0 || documentAttachments.length > 0) && (
                <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {/* Image Previews */}
                    {uploadedImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {uploadedImages.map((image, index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={image}
                                        alt={`Upload ${index + 1}`}
                                        className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                                        onClick={() => setExpandedImageIndex(index)}
                                    />
                                    <button
                                        onClick={() => onClearImage(index)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                    >
                                        <IconX className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Document Attachments */}
                    {documentAttachments.length > 0 && (
                        <div className="space-y-2">
                            {documentAttachments.map(doc => (
                                <div key={doc.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <IconFile className="w-4 h-4 text-blue-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{doc.name}</p>
                                        <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button
                                        onClick={() => setDocumentAttachments(prev => prev.filter(d => d.id !== doc.id))}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                    >
                                        <IconX className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Main Input Area */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <div className="flex items-end gap-2 p-3">
                    {/* Attachment Buttons */}
                    <div className="flex items-center gap-1">
                        {supportsImageInput(selectedModel) && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                disabled={isLoading || documentProcessing}
                            >
                                <IconUpload className="w-5 h-5" />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => documentInputRef.current?.click()}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            disabled={isLoading || documentProcessing}
                        >
                            <IconPaperclip className="w-5 h-5" />
                            <input
                                ref={documentInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.md,.markdown"
                                multiple
                                className="hidden"
                                onChange={handleDocumentChange}
                            />
                        </button>
                    </div>

                    {/* Text Input */}
                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => onInputChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder={documentProcessing ? "Processing document..." : "Ask LEGAIA anything..."}
                            disabled={isLoading || documentProcessing}
                            className="w-full resize-none border-0 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base leading-6 max-h-32"
                            rows={1}
                        />
                    </div>

                    {/* Send Button */}
                    <button
                        type="submit"
                        onClick={isLoading ? onStop : handleSubmit}
                        disabled={(!input.trim() && documentAttachments.length === 0 && uploadedImages.length === 0) || documentProcessing}
                        className={`p-2 rounded-lg transition-all ${
                            isLoading
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : (input.trim() || documentAttachments.length > 0 || uploadedImages.length > 0)
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {isLoading ? (
                            <IconStop className="w-5 h-5" />
                        ) : (
                            <IconSend className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Model Info Bar */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        {currentAgent ? (
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                                Agent: {currentAgent.name}
                            </span>
                        ) : (
                            <button
                                onClick={() => setShowModelSelector(!showModelSelector)}
                                className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                                <IconSettings className="w-4 h-4" />
                                {selectedModel?.name}
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAgentSelector(!showAgentSelector)}
                            className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                            <IconRobot className="w-4 h-4" />
                            Agent
                        </button>
                    </div>
                </div>
            </div>

                    {/* Model Info */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex space-x-2">
                            {/* Settings Button */}
                            {!currentAgent && (<div className="relative">
                                <button
                                    ref={modelButtonRef}
                                    type="button"
                                    onClick={() => setShowModelSelector(!showModelSelector)}
                                    className={`p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none 
                                        focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                                        dark:focus:ring-offset-gray-900 rounded-lg
                                        ${selectedModel ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    title="Select Model"
                                >
                                    <IconSettings
                                        size={20}
                                        className={selectedModel ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                                    />
                                </button>

                                {/* Model Selector Dropdown */}
                                <ModelSelector
                                    onSelectModel={handleModelSelect}
                                    currentModel={modelParams.modelId}
                                    isOpen={showModelSelector}
                                    onClose={() => setShowModelSelector(false)}
                                    buttonRef={modelButtonRef}
                                />
                            </div>)}

                            {/* Agent Selector Button */}
                            <div className="relative">
                                <button
                                    ref={agentButtonRef}
                                    type="button"
                                    onClick={() => setShowAgentSelector(!showAgentSelector)}
                                    className={`p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none 
                                        focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                                        dark:focus:ring-offset-gray-900 rounded-lg
                                        ${currentAgent ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    title={currentAgent ? `Current Agent: ${currentAgent.name}` : 'Select Agent'}
                                >
                                    <IconRobot
                                        size={20}
                                        className={currentAgent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                                    />
                                </button>

                                {/* Render the AgentSelector */}
                                <AgentSelector
                                    onSelectAgent={handleAgentSelect}
                                    currentAgent={currentAgent || null}
                                    isOpen={showAgentSelector}
                                    onClose={() => setShowAgentSelector(false)}
                                    buttonRef={agentButtonRef}
                                />
                            </div>

                            {/* File Upload Button - For Images */}
                            {supportsImageInput(selectedModel) && (
                                <button
                                    type="button"
                                    onClick={handleFileUploadClick}
                                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none 
                                        focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                                        dark:focus:ring-offset-gray-900 rounded-lg"
                                    title="Upload Images"
                                    disabled={isLoading || documentProcessing}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                    />
                                    <IconUpload size={20} className="sm:w-6 sm:h-6" />
                                </button>
                            )}

                            {/* Document Upload Button */}
                            <button
                                type="button"
                                onClick={handleDocumentUploadClick}
                                className={`p-2 ${documentProcessing ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} 
                                    hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none 
                                    focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 
                                    dark:focus:ring-offset-gray-900 rounded-lg`}
                                title="Upload Document"
                                disabled={isLoading || documentProcessing}
                            >
                                <input
                                    type="file"
                                    ref={documentInputRef}
                                    onChange={handleDocumentChange}
                                    accept=".pdf,.doc,.docx,.txt,.md,.markdown"
                                    multiple
                                    className="hidden"
                                />
                                <IconFileText size={20} className={`sm:w-6 sm:h-6 ${documentProcessing ? 'animate-pulse' : ''}`} />
                            </button>
                        </div>
                        {selectedModel && (
                            <>
                                {/* Agent Info */}
                                {currentAgent ? (
                                    <>
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                                            Agent: {currentAgent.name}
                                        </span>
                                        <span>•</span>
                                        <span>{selectedModel.name}</span>
                                    </>
                                ) : (<>
                                    {/* Model Name & Provider - Always show */}
                                    <button
                                        type="button"
                                        ref={maxTokensRef}
                                        className="flex text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                        onClick={handleMaxTokensClick}
                                        title="Max Tokens"
                                    >
                                        <span className="font-medium">{selectedModel.name}</span>
                                        <IconChevronUp className="ml-1 h-4 w-4 text-gray-400 dark:text-gray-500 stroke-[1.5] transition-transform" />
                                    </button>
                                </>)}

                                <span className="hidden sm:inline">•</span>
                                <span className="hidden sm:inline">{selectedModel.provider}</span>

                                {/* Token Info - Show only on desktop */}
                                {selectedModel.maxInputTokens && (
                                    <>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="hidden sm:inline text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full">
                                            {selectedModel.maxInputTokens}
                                        </span>
                                    </>
                                )}

                                {/* Parameters Display */}
                                {!selectedModel.category.includes(CategoryType.Image) ? (
                                    // Text model parameters
                                    <>
                                        <span>•</span>
                                        {/* Always show Max Tokens */}
                                        {modelParams.maxTokens}
                                    </>
                                ) : (
                                    // Image model parameters
                                    <>
                                        <span>•</span>
                                        {selectedModel.provider === 'Amazon' ? (
                                            // Amazon Image Parameters
                                            <>
                                                {/* Show Task Type */}
                                                {modelParams.taskType || 'TEXT_IMAGE'}

                                                {/* Show Number of Images */}
                                                <span>•</span>
                                                {modelParams.numImages || 1}x

                                                {/* Show Size on desktop */}
                                                <span className="hidden sm:inline">•</span>
                                                {`${modelParams.imageSize}`}
                                            </>
                                        ) : (
                                            // Stability Image Parameters
                                            <>
                                                {/* Show Aspect Ratio */}
                                                {modelParams.aspectRatio || '1:1'}

                                                {/* Show Format */}
                                                <span>•</span>
                                                {modelParams.outputFormat || 'png'}

                                                {/* Show Mode on desktop */}
                                                {modelParams.mode && (
                                                    <>
                                                        {modelParams.mode}
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Document Counter */}
                        {documentAttachments.length > 0 && (
                            <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                                {documentAttachments.length} {documentAttachments.length === 1 ? 'document' : 'documents'}
                            </span>
                        )}
                    </div>
                    <ParametersPopup
                        isOpen={!currentAgent && showParamsPopup} // no show in agent mode
                        onClose={() => setShowParamsPopup(false)}
                        modelParams={modelParams}
                        selectedModel={selectedModel}
                        onModelParamsChange={(params) => {
                            updateConversation({ id: activeConversation.id, modelParams: params })
                        }}
                        buttonRef={maxTokensRef}
                    />

                </div>
            </form>
        </div>
    );
};