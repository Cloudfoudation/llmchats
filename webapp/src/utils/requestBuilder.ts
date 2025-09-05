// src/utils/requestBuilder.ts
import { Message } from '@/types/chat';
import { Agent } from '@/types/agent';

import { ModelParams, ModelOption, CategoryType, ProviderType } from '@/types/models';

// Add this interface for document attachments
export interface DocumentAttachment {
    id: string;
    name: string;
    type: string;
    content: string;
    size: number;
    previewText?: string;
}

export const buildRequestBody = (
    input: string,
    selectedModel: ModelOption,
    modelParams: ModelParams,
    conversationHistory: Message[] = [],
    uploadedImages: string[] = [],
    agent?: Agent | null,
    documentAttachments?: DocumentAttachment[],
    bedrockAgentConfig?: {
        agentId: string;
        agentAliasId: string;
        sessionId?: string;
    }
) => {
    // If Bedrock Agent configuration is provided, build agent request
    if (bedrockAgentConfig) {
        return {
            agentId: bedrockAgentConfig.agentId,
            agentAliasId: bedrockAgentConfig.agentAliasId,
            sessionId: bedrockAgentConfig.sessionId || undefined,
            inputText: input,
            enableTrace: true
        };
    }

    if (documentAttachments && documentAttachments.length > 0) {
        // Instead of just adding references, include the actual content
        const docContents = documentAttachments.map(doc =>
            `[UPLOADED DOCUMENT Or ATTACHMENT: ${doc.name}]\n\n${doc.content || "Content unavailable"}\n\n`
        ).join('---\n\n');

        // Enhance the input with document context and content
        input = `${input}\n\n${docContents}`;
    }


    if (selectedModel.provider === 'DeepSeek') {
        const systemPrompt = agent?.systemPrompt || "";

        // Format conversation history
        let conversationString = '';
        if (conversationHistory.length > 0) {
            conversationString = conversationHistory.map(msg => {
                if (msg.role === 'user') {
                    return `<｜User｜>${msg.content}`;
                } else if (msg.role === 'assistant') {
                    return `<｜Assistant｜>${msg.content}`;
                }
                return '';
            }).join('');
        }

        const formattedPrompt = `<｜begin▁of▁sentence｜>${systemPrompt}${conversationString}<｜User｜>${input}<｜Assistant｜>`;

        return {
            prompt: formattedPrompt,
            max_gen_len: modelParams.maxTokens || 2048,
            temperature: modelParams.temperature || 0.7,
            top_p: modelParams.topP || 0.9,
            stream: true
        };
    }

    if (selectedModel.category.includes(CategoryType.Video)) {
        if (selectedModel.provider === 'Amazon' && selectedModel.id.includes('nova')) {
            return {
                taskType: "TEXT_VIDEO",
                textToVideoParams: {
                    text: input,
                    images: uploadedImages.map(image => ({
                        format: "png",
                        source: {
                            bytes: image.split(',')[1]
                        }
                    }))
                },
                videoGenerationConfig: {
                    durationSeconds: 6,
                    fps: 24,
                    dimension: "1280x720",
                    seed: Math.floor(Math.random() * 2147483647)
                }
            };
        }
    }
    if (selectedModel.provider === 'Anthropic' && uploadedImages.length > 0) {
        return {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: modelParams.maxTokens,
            messages: [
                {
                    role: "user",
                    content: [
                        ...uploadedImages.map(image => ({
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/jpeg",
                                data: image.split(',')[1]
                            }
                        })),
                        {
                            type: "text",
                            text: input
                        }
                    ]
                }
            ],
            temperature: modelParams.temperature,
            top_p: modelParams.topP
        };
    }

    if (selectedModel.category.includes(CategoryType.Image)) {
        if (selectedModel.provider === 'Stability AI') {
            // Specific format for Stable Image Core
            const baseRequest = {
                prompt: input,
                negative_prompt: modelParams.negativePrompt || "",
                seed: modelParams.seed || Math.floor(Math.random() * 2147483647),
                output_format: "png"
            };

            if (uploadedImages.length > 0) {
                return {
                    ...baseRequest,
                    mode: "image-to-image",
                    image: uploadedImages[0].split(',')[1], // Use first image for now
                    strength: modelParams.strength || 0.7
                };
            }

            return {
                ...baseRequest,
                aspect_ratio: modelParams.aspectRatio || "1:1",
                mode: "text-to-image"
            };
        }

        if (selectedModel.provider === 'Amazon' && selectedModel.category.includes(CategoryType.Image)) {
            const [width, height] = (modelParams.imageSize && modelParams.imageSize != 'custom') ? modelParams.imageSize.split('x').map(Number) : [modelParams.imageHeight ? modelParams.imageHeight : 1024, modelParams.imageWidth ? modelParams.imageWidth : 1024];

            // Default negative text if none provided or too short
            const getDefaultNegativeText = () => {
                const userNegative = modelParams.negativeText?.trim();
                if (!userNegative || userNegative.length < 3) {
                    return "low quality, bad quality, poorly drawn, deformed, blurry, grainy";
                }
                return userNegative;
            };

            const baseImageConfig = {
                imageGenerationConfig: {
                    numberOfImages: modelParams.numImages || 1,
                    height: width || 1024,
                    width: height || 1024,
                    cfgScale: modelParams.cfgScale || 7.5,
                    seed: modelParams.seed || Math.floor(Math.random() * 2147483647)
                }
            };

            // Helper to get base64 data from data URL
            const getBase64Data = (dataUrl: string) => dataUrl.split(',')[1];

            switch (modelParams.taskType) {
                case 'TEXT_IMAGE':
                    const textToImageParams: any = {
                        text: input,
                        negativeText: getDefaultNegativeText()
                    };

                    // Add conditional image parameters for v2
                    if (selectedModel.id.includes('v2') && uploadedImages.length > 0) {
                        textToImageParams.conditionImage = getBase64Data(uploadedImages[0]);
                        textToImageParams.controlMode = modelParams.controlMode || 'CANNY_EDGE';
                        textToImageParams.controlStrength = modelParams.controlStrength || 0.7;
                    }

                    return {
                        taskType: 'TEXT_IMAGE',
                        textToImageParams,
                        ...baseImageConfig
                    };

                case 'INPAINTING':
                    if (!uploadedImages) {
                        throw new Error('Image required for inpainting');
                    }

                    return {
                        taskType: 'INPAINTING',
                        inPaintingParams: {
                            image: getBase64Data(uploadedImages[0]),
                            text: input,
                            negativeText: getDefaultNegativeText(),
                            maskPrompt: modelParams.maskPrompt || '',
                            ...(modelParams.maskImage && { maskImage: modelParams.maskImage }),
                            returnMask: modelParams.returnMask || false
                        },
                        ...baseImageConfig
                    };

                case 'OUTPAINTING':
                    if (!uploadedImages) {
                        throw new Error('Image required for outpainting');
                    }

                    return {
                        taskType: 'OUTPAINTING',
                        outPaintingParams: {
                            image: getBase64Data(uploadedImages[0]),
                            text: input,
                            negativeText: getDefaultNegativeText(),
                            maskPrompt: modelParams.maskPrompt || '',
                            ...(modelParams.maskImage && { maskImage: modelParams.maskImage }),
                            returnMask: modelParams.returnMask || false,
                            outPaintingMode: modelParams.outpaintingMode || 'DEFAULT'
                        },
                        ...baseImageConfig
                    };

                case 'IMAGE_VARIATION':
                    if (uploadedImages.length === 0) {
                        throw new Error('Image required for variation');
                    }

                    return {
                        taskType: 'IMAGE_VARIATION',
                        imageVariationParams: {
                            text: input,
                            negativeText: modelParams.negativePrompt || "low quality, bad quality",
                            images: uploadedImages.map(img => getBase64Data(img)),
                            similarityStrength: modelParams.similarityStrength || 0.7
                        },
                        imageGenerationConfig: {
                            numberOfImages: modelParams.numImages || 1,
                            height: modelParams.imageHeight || 1024,
                            width: modelParams.imageWidth || 1024,
                            cfgScale: modelParams.cfgScale || 7.5,
                            seed: modelParams.seed || Math.floor(Math.random() * 2147483647)
                        }
                    };

                case 'COLOR_GUIDED_GENERATION':
                    if (!selectedModel.id.includes('v2')) {
                        throw new Error('Color guided generation only available in v2');
                    }

                    return {
                        taskType: 'COLOR_GUIDED_GENERATION',
                        colorGuidedGenerationParams: {
                            text: input,
                            negativeText: getDefaultNegativeText(),
                            ...(modelParams.referenceImage && {
                                referenceImage: getBase64Data(modelParams.referenceImage)
                            }),
                            colors: modelParams.colors || []
                        },
                        ...baseImageConfig
                    };

                case 'BACKGROUND_REMOVAL':
                    if (!uploadedImages) {
                        throw new Error('Image required for background removal');
                    }

                    return {
                        taskType: 'BACKGROUND_REMOVAL',
                        backgroundRemovalParams: {
                            image: getBase64Data(uploadedImages[0])
                        }
                    };

                default:
                    return {
                        taskType: 'TEXT_IMAGE',
                        textToImageParams: {
                            text: input,
                            negativeText: getDefaultNegativeText()
                        },
                        ...baseImageConfig
                    };
            }
        }

        // Default image generation payload
        return {
            taskType: "TEXT_IMAGE",
            textToImageParams: {
                text: input,
                negativeText: modelParams.negativePrompt || "",
            },
            imageGenerationConfig: {
                imageSize: modelParams.imageSize || "1024x1024",
                numberOfImages: modelParams.numImages || 1,
                stylePreset: modelParams.stylePreset || "enhance"
            },
            seed: modelParams.seed || Math.floor(Math.random() * 2147483647)
        };
    }

    // Add document-aware system prompt enhancement for all text models
    let enhancedSystemPrompt = agent?.systemPrompt || "";

    // Include document content in system prompt when agent is used
    if (documentAttachments && documentAttachments?.length > 0) {
        const docContents = documentAttachments.map(doc =>
            `[DOCUMENT: ${doc.name}]\n\n${doc.content || "Content unavailable"}\n\n`
        ).join('---\n\n');

        if (agent?.systemPrompt) {
            enhancedSystemPrompt = `${agent.systemPrompt}\n\nDocuments for analysis:\n\n${docContents}`;
        } else {
            enhancedSystemPrompt =
                "You are a helpful assistant that specializes in analyzing documents and providing insights. " +
                "When a user uploads documents, help them understand the content and answer their questions. " +
                "Reference specific document names when discussing their content. " +
                "Provide thoughtful analysis and be prepared to answer follow-up questions about specific parts of the documents." +
                "\n\nDocuments for analysis:\n\n" + docContents;
        }
    }

    switch (selectedModel.provider) {
        case ProviderType.Sambanova:
        case ProviderType.OpenAI:
        case ProviderType.Groq:
            const messages = conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Add system message if there's an enhanced system prompt
            if (enhancedSystemPrompt) {
                messages.unshift({
                    role: 'system',
                    content: enhancedSystemPrompt
                });
            }

            // Add current message
            messages.push({
                role: 'user',
                content: input
            });

            return {
                model: selectedModel.id,
                messages,
                temperature: modelParams.temperature || 0.7,
                max_tokens: modelParams.maxTokens || 2048,
                top_p: modelParams.topP || 1,
                stream: true
            };
        case 'Anthropic':
            // For Claude 3 models with extended thinking
            if ((selectedModel.id.includes('claude-sonnet-4') || selectedModel.id.includes('claude-opus-4') || selectedModel.id.includes('claude-3-7-sonnet')) && modelParams.extendedThinking) {
                // Convert conversation history to Claude 3 format
                const messages = conversationHistory.map(msg => ({
                    role: msg.role,
                    content: [{ type: "text", text: msg.content }]
                }));

                // Create enhanced system prompt that includes document content if available
                let systemPromptWithDocs = enhancedSystemPrompt;
                if (documentAttachments && documentAttachments?.length > 0) {
                    const docContents = documentAttachments.map(doc =>
                        `[DOCUMENT: ${doc.name}]\n\n${doc.content || "Content unavailable"}\n\n`
                    ).join('---\n\n');

                    systemPromptWithDocs = `${enhancedSystemPrompt}\n\nDocuments for analysis:\n\n${docContents}`;
                }

                return {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: modelParams.maxTokens,
                    messages,
                    temperature: 1,
                    system: systemPromptWithDocs || undefined,
                    thinking: {
                        type: 'enabled',
                        budget_tokens: modelParams.budgetTokens || 4000
                    }
                };
            } else if (selectedModel.id.includes('claude-sonnet-4') || selectedModel.id.includes('claude-opus-4') || selectedModel.id.includes('claude-3')) {
                // Convert conversation history to Claude 3 format
                const messages = conversationHistory.map(msg => ({
                    role: msg.role,
                    content: [{ type: "text", text: msg.content }]
                }));

                // Create enhanced system prompt with document content for Claude 3
                let systemPromptWithDocs = enhancedSystemPrompt;
                if (documentAttachments && documentAttachments?.length > 0) {
                    const docContents = documentAttachments.map(doc =>
                        `[DOCUMENT: ${doc.name}]\n\n${doc.content || "Content unavailable"}\n\n`
                    ).join('---\n\n');

                    systemPromptWithDocs = `${enhancedSystemPrompt}\n\nDocuments for analysis:\n\n${docContents}`;
                }

                return {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: modelParams.maxTokens,
                    messages,
                    temperature: modelParams.temperature,
                    top_p: modelParams.topP,
                    system: systemPromptWithDocs || undefined
                };
            }

            // Format conversation history for Claude 2
            const conversationString = conversationHistory
                .map(msg => `\n\n${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
                .join('');

            // For document input, use an enhanced prompt for Claude 2
            let claudePrompt = `${conversationString}\n\nHuman: ${input}\n\nAssistant:`;

            // For Claude 2, include document content directly in the input prompt
            if (documentAttachments && documentAttachments?.length > 0) {
                const docContents = documentAttachments.map(doc =>
                    `[DOCUMENT: ${doc.name}]\n\n${doc.content || "Content unavailable"}\n\n`
                ).join('---\n\n');

                claudePrompt = `${conversationString}\n\nHuman: ${input}\n\nHere are the documents to analyze:\n\n${docContents}\n\nAssistant:`;
            }

            return {
                prompt: claudePrompt,
                max_tokens_to_sample: modelParams.maxTokens,
                temperature: modelParams.temperature,
                top_p: modelParams.topP
            };
        case 'Amazon':
            if (selectedModel.id.includes('nova')) {
                // Define system prompt
                const systemPrompt = [{
                    text: enhancedSystemPrompt || "You are a helpful AI assistant."
                }];

                // Get all messages except the last one (which is the current input)
                const previousMessages = conversationHistory.slice(0, -1).map(msg => ({
                    role: msg.role,
                    content: [{
                        text: msg.content
                    }]
                }));

                // Get the last message (current input)
                const lastMessage = conversationHistory[conversationHistory.length - 1];

                // Prepare content array for the current message
                let currentContent = [{
                    text: lastMessage.content
                }];

                // Handle image upload if present
                if (uploadedImages.length > 0) {
                    uploadedImages.forEach(image => {
                        currentContent.push({
                            // @ts-ignore
                            image: {
                                format: "jpeg",
                                source: {
                                    bytes: image.split(',')[1]
                                }
                            }
                        });
                    });
                }

                // Combine all messages
                const messages = [
                    ...previousMessages,
                    {
                        role: "user",
                        content: currentContent
                    }
                ];

                const requestBody = {
                    schemaVersion: "messages-v1",
                    system: systemPrompt,
                    messages: messages,
                    inferenceConfig: {
                        max_new_tokens: modelParams.maxTokens,
                        temperature: modelParams.temperature || 0.7,
                        top_p: modelParams.topP || 0.9,
                        top_k: 50,
                        stopSequences: []
                    }
                };

                return requestBody;
            }
        case 'Meta':
            // Helper function to format system prompt
            const formatSystemPrompt = () => {
                if (!enhancedSystemPrompt) {
                    return "You are a helpful, respectful and honest assistant.";
                }
                return enhancedSystemPrompt;
            };

            // Helper function to format conversation for different Llama versions
            const formatLlamaConversation = (
                messages: Message[],
                input: string,
                systemPrompt: string,
                modelId: string,
                images?: string[]
            ) => {
                let conversation = '';

                // Add system prompt
                conversation += `<|begin_of_text|><|start_header_id|>system<|end_header_id|>${systemPrompt}<|eot_id|>`;

                // Add conversation history
                messages.forEach(msg => {
                    conversation += `<|begin_of_text|><|start_header_id|>${msg.role}<|end_header_id|>${msg.content}<|eot_id|>`;
                });

                // Add current user input
                conversation += `<|begin_of_text|><|start_header_id|>user<|end_header_id|>`;

                // Handle images for Llama 3.2 Vision
                if (modelId.includes('llama3-2') && images?.length) {
                    images.forEach(() => {
                        conversation += `<|image|>`;
                    });
                }

                conversation += `${input}<|eot_id|>`;

                // Add assistant marker for response
                conversation += `<|start_header_id|>assistant<|end_header_id|>`;

                return conversation;
            };

            // Helper function to format pretrained model prompt
            const formatPretrainedPrompt = (input: string, images?: string[]) => {
                let prompt = '<|begin_of_text|>';

                // Add images for vision models
                if (images?.length) {
                    images.forEach(() => {
                        prompt += '<|image|>';
                    });
                }

                prompt += input;
                return prompt;
            };

            // Base request parameters
            const metaRequest = {
                temperature: modelParams.temperature || 0.5,
                top_p: modelParams.topP || 0.9,
                max_gen_len: modelParams.maxTokens || 512
            };

            // Process images if present
            const base64Images = uploadedImages.map(image => {
                const base64Data = image.split(',')[1];
                if (!base64Data) {
                    throw new Error('Invalid image format');
                }
                return base64Data;
            });

            // Handle different Llama versions
            if (selectedModel.id.includes('llama3-3')) {
                // Llama 3.3 (latest instruction-tuned model)
                return {
                    ...metaRequest,
                    prompt: formatLlamaConversation(
                        conversationHistory,
                        input,
                        formatSystemPrompt(),
                        selectedModel.id
                    )
                };
            } else if (selectedModel.id.includes('llama3-2')) {
                // Llama 3.2 (including vision models)
                return {
                    ...metaRequest,
                    prompt: formatLlamaConversation(
                        conversationHistory,
                        input,
                        formatSystemPrompt(),
                        selectedModel.id,
                        uploadedImages
                    ),
                    ...(base64Images.length > 0 && {
                        images: base64Images
                    })
                };
            } else if (selectedModel.id.includes('llama3-1')) {
                // Llama 3.1
                if (selectedModel.id.includes('pretrained')) {
                    // Pretrained model format
                    return {
                        ...metaRequest,
                        prompt: formatPretrainedPrompt(input)
                    };
                } else {
                    // Instruction-tuned model format
                    return {
                        ...metaRequest,
                        prompt: formatLlamaConversation(
                            conversationHistory,
                            input,
                            formatSystemPrompt(),
                            selectedModel.id
                        )
                    };
                }
            } else {
                // Earlier Llama versions (2 and below)
                const conversationString = conversationHistory
                    .map(msg => `<|begin_of_text|><|start_header_id|>${msg.role}<|end_header_id|>${msg.content}<|eot_id|>`)
                    .join('');

                return {
                    ...metaRequest,
                    prompt: `${conversationString}<|begin_of_text|><|start_header_id|>user<|end_header_id|>${input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`
                };
            }

        default:
            throw new Error('Unsupported model provider');
    }
};

export const buildAnthropicMessagesPayload = (
    input: string,
    modelParams: ModelParams,
    conversationHistory: Message[] = []
) => {
    const messages = conversationHistory.map(msg => ({
        role: msg.role,
        content: [{ type: "text", text: msg.content }]
    }));

    messages.push({
        role: "user",
        content: [{ type: "text", text: input }]
    });

    return {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: modelParams.maxTokens,
        messages,
        temperature: modelParams.temperature,
        top_p: modelParams.topP
    };
};

export const buildAnthropicCompletionsPayload = (
    input: string,
    modelParams: ModelParams,
    conversationHistory: Message[] = []
) => {
    const conversationString = conversationHistory
        .map(msg => `\n\n${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
        .join('');

    return {
        prompt: `${conversationString}\n\nHuman: ${input}\n\nAssistant:`,
        max_tokens_to_sample: modelParams.maxTokens,
        temperature: modelParams.temperature,
        top_p: modelParams.topP,
        stop_sequences: ["\n\nHuman:"]
    };
};