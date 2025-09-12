// src/components/Chat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Message, MessageType, RoleType } from '@/types/chat';
import { CategoryType, ModelOption } from '@/types/models';
import { getModelById } from '@/utils/models';
import { ChatInput } from './ChatInput';
import { handleNonStreamingResponse } from '../../utils/responseHandlers';
import { handleStreamingResponse } from '../../utils/streamingHandlers';
import { buildRequestBody, DocumentAttachment } from '../../utils/requestBuilder';
import { ErrorAlert } from '../ErrorAlert';
import { MessageList } from './MessageList/MessageList';
import { useConversationContext } from '@/providers/ConversationProvider';
import { stopStreaming } from '@/utils/streamingHandlers';
import { stopNonStreaming } from '@/utils/responseHandlers';
import { useAuthContext } from '@/providers/AuthProvider'
import { useAgentsContext } from '@/providers/AgentsProvider';
import { useKnowledgeBaseContext } from '@/providers/KnowledgeBaseProvider';
import { handleKBStreamingResponse, currentKBAbortController } from '@/utils/kbStreamingHandlers';
import { SyncAlert } from '../SyncAlert';
import { EmptyState } from '@/components/chat/MessageList/EmptyState';
import { useSettingsContext } from '@/providers/SettingsProvider';
import {
    InvokeAgentCommand
} from "@aws-sdk/client-bedrock-agent-runtime";
import { handleBedrockAgentResponse } from '../../utils/responseHandlers';
import { knowledgeBaseService } from '@/services/knowledgeBase';

interface ChatProps {
}

// Custom event type that includes document attachments
interface CustomFormEvent extends React.FormEvent {
    documentAttachments?: DocumentAttachment[];
}

export const Chat: React.FC<ChatProps> = ({ }) => {
    const [error, setError] = useState<string | null>(null);
    const [input, setInput] = useState<string>('');
    const [streamingContent, setStreamingContent] = useState<string>('');
    const { currentAgent } = useAgentsContext();
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [documentAttachments, setDocumentAttachments] = useState<DocumentAttachment[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { bedrockClient, bedrockAgentRuntimeClient, bedrockAgentRuntimeClient_agents } = useAuthContext();
    const { settings } = useSettingsContext();

    const scrollPositionRef = useRef<number>(0);

    const saveScrollPosition = () => {
        const messageList = document.querySelector('.message-list');
        if (messageList) {
            scrollPositionRef.current = messageList.scrollHeight - messageList.scrollTop;
        }
    };

    const restoreScrollPosition = () => {
        const messageList = document.querySelector('.message-list');
        if (messageList) {
            messageList.scrollTop = messageList.scrollHeight - scrollPositionRef.current;
        }
    };

    const {
        activeConversation,
        createNewConversation,
        updateConversation,
        appendMessage
    } = useConversationContext();

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
    };

    const handleClearImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const clearAllImages = () => {
        setUploadedImages([]);
    };

    useEffect(() => {
        return () => {
            stopStreaming();
            stopNonStreaming();

            // Also stop KB streaming if active
            if (currentKBAbortController) {
                currentKBAbortController.abort();
            }
        };
    }, []);

    const generateConversationTitle = (messages: Message[]): Promise<string | null> => {
        return new Promise(async (resolve, reject) => {
            if (!bedrockClient || messages.length < 2) {
                resolve(null);
                return;
            }

            const filteredMessages = messages.filter(m => ["text", "chat"].includes(m.type));

            try {
                const titlePrompt = `
              Give a less 10 words title for following conversation without explanation:\n
              ${filteredMessages.map(m => `${m.role}:${m.content}`).join('\n')}`;

                const titleRequestBody = {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 12,
                    temperature: 0.7,
                    top_p: 0.9,
                    messages: [
                        {
                            role: "user",
                            content: [{
                                type: "text",
                                text: titlePrompt
                            }]
                        }
                    ]
                };

                const command = new InvokeModelCommand({
                    modelId: "us.anthropic.claude-3-haiku-20240307-v1:0",
                    contentType: "application/json",
                    accept: "application/json",
                    body: JSON.stringify(titleRequestBody)
                });

                const response = await bedrockClient.send(command);
                const responseData = JSON.parse(new TextDecoder().decode(response.body));
                const haiku = responseData.content[0].text.trim();

                resolve(haiku);
            } catch (error) {
                console.error('Error generating title:', error);
                reject(error);
            }
        });
    };

    const handleMessageSend = async (e: CustomFormEvent) => {
        e.preventDefault();

        // Get document attachments if they exist in the event
        const docs = e.documentAttachments || [];
        setDocumentAttachments(docs);

        if ((!input.trim() && docs.length === 0 && uploadedImages.length === 0) || !bedrockClient || !activeConversation) return;

        const selectedModel = getModelById(activeConversation.modelParams.modelId);
        if (!selectedModel) return;

        // Check if model supports image input
        if (uploadedImages.length > 0 && !selectedModel.inputModalities?.includes(CategoryType.Image)) {
            setError('Selected model does not support image input');
            return;
        }

        setError(null);
        const currentInput = input;
        setInput('');
        setStreamingContent('');
        setIsProcessing(true);

        try {
            setUploadedImage(null);
            await processMessage(currentInput, uploadedImages, selectedModel, docs);
            // Clear uploaded images and document attachments after successful processing
            clearAllImages();
            setDocumentAttachments([]);
        } catch (error: any) {
            handleError(error);
            setInput(currentInput);
        } finally {
            setIsProcessing(false);
            setStreamingContent('');
        }
    };

    const getLimitedContextMessages = (maxTurns?: number): Message[] => {
        if (!activeConversation) return [];

        if (!maxTurns) return activeConversation?.messages;

        maxTurns = maxTurns - 1;

        if (maxTurns == 0) return [];

        // Create pairs of messages (user + assistant)
        const pairs: Message[][] = [];
        let currentPair: Message[] = [];

        // Group messages into conversation pairs
        activeConversation.messages.forEach(message => {
            if (message.role === 'system') {
                // Always include system messages
                pairs.push([message]);
            } else {
                currentPair.push(message);
                if (currentPair.length === 2) {
                    pairs.push(currentPair);
                    currentPair = [];
                }
            }
        });

        // Handle any remaining unpaired message
        if (currentPair.length > 0) {
            pairs.push(currentPair);
        }

        // Get the last N turns plus any system messages
        const systemMessages = pairs.filter(pair => pair.length === 1 && pair[0].role === 'system').flat();
        const conversationPairs = pairs.filter(pair => pair.length === 2);
        const limitedPairs = conversationPairs.slice(-maxTurns);

        // Combine system messages with limited conversation pairs
        return [...systemMessages, ...limitedPairs.flat()];
    };

    const processMessage = async (input: string, uploadedImages: string[], selectedModel: ModelOption, documentAttachments: DocumentAttachment[] = []) => {
        // Prepare message metadata with document attachments
        const messageMetadata = documentAttachments.length > 0 ? {
            documentAttachments: documentAttachments.map(doc => ({
                id: doc.id,
                name: doc.name,
                type: doc.type,
                size: doc.size,
                content: doc.content,
            }))
        } : undefined;

        const userMessage: Message = {
            role: 'user',
            content: input,
            type: uploadedImages.length > 0 ? 'multimodal' : (documentAttachments.length > 0 ? 'document' : 'chat'),
            attachments: uploadedImages.length > 0 ? uploadedImages.map(image => ({
                type: 'image',
                data: image
            })) : undefined,
            metadata: messageMetadata
        };

        const contextMessages = selectedModel.category.includes(CategoryType.Image)
            ? [userMessage]
            : [...getLimitedContextMessages(currentAgent?.modelParams.maxTurns), userMessage];

        if (activeConversation) {
            await appendMessage(activeConversation, userMessage);
        }

        try {
            let payload = null;
            setIsProcessing(true);

            // Handle Bedrock Agent if configured in the active conversation
            if (activeConversation?.isBedrockAgent &&
                activeConversation?.bedrockAgentId &&
                activeConversation?.bedrockAgentAliasId &&
                bedrockAgentRuntimeClient_agents) {

                try {
                    // Use the conversation ID as session ID for continuity
                    // or create a dedicated session ID if it doesn't exist
                    const sessionId = activeConversation.bedrockAgentSessionId ||
                        activeConversation.id;

                    // Use the handleBedrockAgentResponse helper function
                    await handleBedrockAgentResponse(
                        activeConversation.bedrockAgentId,
                        activeConversation.bedrockAgentAliasId,
                        sessionId,
                        input,
                        bedrockAgentRuntimeClient_agents,
                        (content) => {
                            // Update streaming content as it arrives
                            setStreamingContent(content);
                            setIsProcessing(true);
                        },
                        async (finalContent) => {
                            // Handle completion with final content
                            const assistantMessage = {
                                role: 'assistant' as RoleType,
                                content: finalContent || "Sorry, I encountered an issue while processing your request.",
                                type: 'chat' as MessageType
                            };

                            // Save the complete message
                            saveScrollPosition();
                            if (activeConversation) {
                                await appendMessage(activeConversation, assistantMessage);

                                // Update conversation if needed
                                if (!activeConversation.bedrockAgentSessionId) {
                                    // Save the session ID for future interactions
                                    updateConversation({
                                        id: activeConversation.id,
                                        bedrockAgentSessionId: sessionId
                                    });
                                }

                                // Generate title if needed
                                const updatedMessages = [...contextMessages, assistantMessage];
                                if (updatedMessages.filter(m => m.role !== 'system').length === 2) {
                                    generateConversationTitle(updatedMessages).then((newTitle) => {
                                        newTitle && updateConversation({
                                            id: activeConversation.id,
                                            title: newTitle
                                        });
                                    });
                                }
                            }
                            setTimeout(restoreScrollPosition, 0);
                        }
                    );

                    return; // Exit early since we've handled the agent response
                } catch (error: unknown) {
                    console.error("Bedrock Agent error:", error);

                    // Create a more specific error message for agent failures
                    if (error instanceof Error) {
                        if (error.message.includes("DependencyFailedException") ||
                            error.message.includes("Retry the request")) {
                            error.message = "The Bedrock agent service is temporarily unavailable. Please try again in a few moments.";
                        } else if (error.message.includes("ThrottlingException")) {
                            error.message = "Too many requests to the Bedrock agent. Please wait a moment and try again.";
                        }
                    }

                    handleError(error);
                    return; // Exit early
                }
            } else if (currentAgent?.knowledgeBaseId && !selectedModel.category.includes(CategoryType.Image)) {
                try {
                    const knowledgeBaseId = currentAgent.knowledgeBaseId;

                    // First try to use the knowledgeBase API service for retrieval
                    try {
                        // Initialize knowledge base service with current user
                        // knowledgeBaseService.setUser(useAuthContext().user);

                        // Handle KB streaming response using the updated handler
                        await handleKBStreamingResponse(
                            selectedModel,
                            knowledgeBaseId!,
                            input,
                            activeConversation!.modelParams,
                            bedrockClient!,
                            bedrockAgentRuntimeClient!,
                            setStreamingContent,
                            async (message) => {
                                saveScrollPosition();
                                if (activeConversation) {
                                    appendMessage(activeConversation, {
                                        ...message,
                                        metadata: message.metadata
                                    }).then(() => {
                                        const updatedMessages = [...contextMessages, { ...message, role: 'assistant' } as Message];
                                        if (updatedMessages.filter(m => m.role !== 'system').length === 2) {
                                            generateConversationTitle(updatedMessages).then((newTitle) => {
                                                newTitle && updateConversation({
                                                    id: activeConversation.id,
                                                    title: newTitle
                                                });
                                            });
                                        }
                                    }).finally(() => {
                                        setTimeout(restoreScrollPosition, 0);
                                    })
                                }
                            },
                            currentAgent.systemPrompt,
                            contextMessages
                        );
                    } catch (error) {
                        console.error("Failed to use KB API service, falling back to direct SDK:", error);
                        throw error; // Let the original handler handle this as a fallback
                    }
                } catch (error: unknown) {
                    console.error("Knowledge base error:", error);
                    handleError(error);
                    return; // Exit early
                }
                return;
            } else {
                payload = buildRequestBody(
                    input,
                    selectedModel,
                    activeConversation!.modelParams,
                    contextMessages,
                    uploadedImages,
                    currentAgent,
                    documentAttachments
                );
            }

            if (shouldUseStreaming(selectedModel)) {
                try {
                    await handleStreamingResponse(
                        selectedModel,
                        payload,
                        bedrockClient!,
                        (content) => {
                            setStreamingContent(content);
                            setIsProcessing(true);
                        },
                        async (message) => {
                            saveScrollPosition();
                            if (activeConversation) {
                                appendMessage(activeConversation, {
                                    ...message,
                                    metadata: message.metadata
                                }).then(() => {
                                    const updatedMessages = [...contextMessages, { ...message, role: 'assistant' } as Message];
                                    if (updatedMessages.filter(m => m.role !== 'system').length === 2) {
                                        generateConversationTitle(updatedMessages).then((newTitle) => {
                                            newTitle && updateConversation({
                                                id: activeConversation.id,
                                                title: newTitle
                                            });
                                        });
                                    }
                                }).finally(() => {
                                    setTimeout(restoreScrollPosition, 0);
                                })
                            }
                        },
                        settings
                    );
                } catch (error: unknown) {
                    console.error("Streaming error:", error);
                    handleError(error);
                    return; // Exit early
                }
            } else {
                try {
                    const content = await handleNonStreamingResponse(
                        selectedModel,
                        payload,
                        bedrockClient!,
                        input,
                        activeConversation!.modelParams
                    );

                    const messageType = determineMessageType(content);
                    const assistantMessage = {
                        role: 'assistant',
                        content: Array.isArray(content) ? 'Generated images' : content,
                        type: messageType,
                        imageData: messageType === CategoryType.Image ? content : undefined
                    } as Message;

                    if (activeConversation) {
                        // Add assistant message
                        await appendMessage(activeConversation, assistantMessage);

                        // Get fresh conversation data
                        const updatedMessages = [...contextMessages, assistantMessage];
                        if (updatedMessages.filter(m => m.role !== 'system').length === 2) {
                            generateConversationTitle(updatedMessages).then((newTitle) => {
                                newTitle && updateConversation({
                                    id: activeConversation.id,
                                    title: newTitle
                                });
                            });
                        }
                    }
                } catch (error: unknown) {
                    console.error("Non-streaming error:", error);
                    handleError(error);
                    return; // Exit early
                }
            }

            // Only clear images on success
            setUploadedImage(null);
            clearAllImages();
        } catch (error: unknown) {
            handleError(error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper function to determine message type
    const determineMessageType = (content: string | string[]): MessageType => {
        if (Array.isArray(content)) {
            return content[0].startsWith('data:image') ? CategoryType.Image : CategoryType.Text;
        }
        return content.startsWith('data:image') ? CategoryType.Image : CategoryType.Text;
    };

    const handleStop = () => {
        stopStreaming();
        stopNonStreaming();

        // Also stop KB streaming if active
        if (currentKBAbortController) {
            currentKBAbortController.abort();
        }

        setIsProcessing(false);
    };

    const shouldUseStreaming = (model: ModelOption): boolean => {
        return model.streaming;
    };

    const handleError = (error: unknown) => {
        console.error("API Error:", error);

        let errorMessage = "An error occurred while processing your request";

        if (error instanceof Error) {
            errorMessage = error.message;

            // Specific error message patterns
            if (errorMessage.includes("knowledge-base") || errorMessage.includes("GetKnowledgeBase")) {
                errorMessage = "You don't have permission to access this knowledge base. Please select a different agent or contact your administrator.";
            }
            else if (errorMessage.includes("inference-profile")) {
                errorMessage = "You don't have permission to use this model with an inference profile. Please select a different model or contact your administrator.";
            }
            else if (errorMessage.includes("not authorized") && errorMessage.includes("assumed-role")) {
                errorMessage = "Your user role doesn't have permission to use this resource. Please contact your administrator.";
            }
            else if (errorMessage.includes("not authorized") || errorMessage.includes("AccessDenied")) {
                errorMessage = "You don't have permission to use this resource. Please contact your administrator.";
            }
        } else if (typeof error === 'object' && error !== null) {
            const err = error as any;
            if (err.message) {
                errorMessage = err.message;

                // Check if it's an AWS error message that needs formatting
                if (errorMessage.includes("not authorized") ||
                    errorMessage.includes("AccessDenied") ||
                    errorMessage.includes("knowledge-base") ||
                    errorMessage.includes("GetKnowledgeBase")) {

                    // Use the parseAwsErrorMessage function logic here
                    if (errorMessage.includes('knowledge-base') || errorMessage.includes('GetKnowledgeBase')) {
                        errorMessage = "You don't have permission to access this knowledge base. Please select a different agent or contact your administrator.";
                    } else if (errorMessage.includes('not authorized') || errorMessage.includes('AccessDenied')) {
                        errorMessage = "You don't have permission to use this resource. Please contact your administrator.";
                    }
                }
            }
        }

        setError(errorMessage);
        setIsProcessing(false);
    };

    const handleRetry = async () => {
        if (!bedrockClient || !activeConversation) return;

        const messages = activeConversation.messages;
        const lastMessage = messages[messages.length - 1];
        let messageToRetry: Message | undefined;

        if (lastMessage.role === 'assistant') {
            // If last message is from assistant, remove it and get the preceding user message
            messages.pop(); // Remove assistant message
            if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
                messageToRetry = messages[messages.length - 1];
                messages.pop(); // Remove user message
            }
        } else if (lastMessage.role === 'user') {
            // If last message is from user, use it directly
            messageToRetry = lastMessage;
            messages.pop();
        }

        if (!messageToRetry) return;

        const selectedModel = getModelById(activeConversation.modelParams.modelId);
        if (!selectedModel) return;

        // Reset state
        setError(null);
        setStreamingContent('');

        // Update state with messages excluding the message(s) to retry
        setIsProcessing(true);

        // Extract document attachments from message metadata if they exist
        let docAttachments: DocumentAttachment[] = [];
        if (messageToRetry.metadata?.documentAttachments) {
            docAttachments = messageToRetry.metadata.documentAttachments.map(doc => ({
                ...doc,
                // Preserve the content from the original attachment if available
                content: doc.content || ''
            }));
        }

        updateConversation({ id: activeConversation.id, messages }).then(() => {
            try {
                if (messageToRetry.attachments && messageToRetry.attachments?.length > 0) {
                    const imageAttachments = messageToRetry.attachments
                        .filter(a => a.type === 'image')
                        .map(a => a.data);

                    processMessage(messageToRetry.content, imageAttachments, selectedModel, docAttachments);
                } else {
                    processMessage(messageToRetry.content, [], selectedModel, docAttachments);
                }
            } catch (error: any) {
                handleError(error);
            } finally {
                setIsProcessing(false);
            }
        })
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            <SyncAlert />
            
            {!activeConversation ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md mx-auto px-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <span className="text-white font-bold text-xl">L</span>
                        </div>
                        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                            Welcome to LEGAIA
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            Your AI-powered legal assistant. Start a conversation to get help with legal research, document analysis, and more.
                        </p>
                        <button
                            onClick={() => createNewConversation()}
                            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                        >
                            <IconMessageCircle className="h-5 w-5" />
                            Start New Chat
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {activeConversation.messages.length === 0 && <EmptyState onPromptSelect={setInput} />}

                    <MessageList
                        key={activeConversation?.id}
                        streamingContent={streamingContent}
                        isLoading={isProcessing}
                        selectedModel={activeConversation?.modelParams?.modelId ?
                            getModelById(activeConversation.modelParams.modelId) :
                            undefined}
                        onRetry={handleRetry}
                    />
                    
                    {/* Chat Input - Fixed at bottom */}
                    <div className="sticky bottom-0 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50">
                        <div className="max-w-4xl mx-auto">
                            <ChatInput
                                input={input}
                                isLoading={isProcessing}
                                onInputChange={setInput}
                                onSend={handleMessageSend}
                                onImageUpload={handleImageUpload}
                                uploadedImage={uploadedImage}
                                onClearImage={handleClearImage}
                                onStop={handleStop}
                                uploadedImages={uploadedImages}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};