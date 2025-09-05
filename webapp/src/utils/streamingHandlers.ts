// streamingHandlers.ts
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { CategoryType, ModelOption, ProviderType } from '@/types/models';
import { Dispatch, SetStateAction } from 'react';
import { Conversation } from '@/types/chat';
import { AppSettings } from '@/types'

export let currentAbortController: AbortController | null = null;

export const handleStreamingResponse = async (
    selectedModel: ModelOption,
    requestBody: any,
    client: BedrockRuntimeClient,
    setStreamingContent: Dispatch<SetStateAction<string>>,
    appendMessage: (message: Conversation['messages'][number]) => Promise<void>,
    settings: AppSettings
) => {
    try {
        currentAbortController = new AbortController();
        let fullContent = '';
        let lastUpdateTime = Date.now();
        const DEBOUNCE_INTERVAL = 50;

        // Handle OpenAI streaming
        if (selectedModel.provider === ProviderType.OpenAI ||
            selectedModel.provider === ProviderType.Sambanova ||
            selectedModel.provider === ProviderType.Groq) {
            const openAIKey = selectedModel.provider === ProviderType.Groq ? settings.externalApiKeys?.groq : selectedModel.provider === ProviderType.Sambanova ? settings.externalApiKeys?.sambanova : settings.externalApiKeys?.openai?.apiKey;
            const baseUrl = settings.externalApiKeys?.openai?.baseUrl;

            if (!openAIKey) {
                throw new Error('OpenAI API key not configured');
            }

            const apiUrl = selectedModel.provider === ProviderType.Groq ? 'https://api.groq.com/openai/v1/chat/completions' : selectedModel.provider === ProviderType.Sambanova ? 'https://api.sambanova.ai/v1/chat/completions' : baseUrl || 'https://api.openai.com/v1/chat/completions';

            // Adjust request body for new OpenAI model requirements
            const adjustedRequestBody = {
                ...requestBody,
                model: selectedModel.id,
                stream: true
            };

            // Handle parameter adjustments
            if (adjustedRequestBody.max_tokens) {
                adjustedRequestBody.max_completion_tokens = adjustedRequestBody.max_tokens;
                delete adjustedRequestBody.max_tokens;
            }

            // Remove temperature if it's not 1 (default)
            if (adjustedRequestBody.temperature && adjustedRequestBody.temperature !== 1) {
                delete adjustedRequestBody.temperature;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openAIKey}`
                },
                body: JSON.stringify(adjustedRequestBody),
                signal: currentAbortController.signal
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || 'OpenAI API request failed');
            }

            // Rest of the streaming logic remains the same
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices[0]?.delta?.content || '';
                                if (content) {
                                    fullContent += content;
                                    const currentTime = Date.now();
                                    if (currentTime - lastUpdateTime >= DEBOUNCE_INTERVAL) {
                                        setStreamingContent(fullContent);
                                        lastUpdateTime = currentTime;
                                    }
                                }
                            } catch (e) {
                                console.error('Error parsing JSON:', e);
                            }
                        }
                    }
                }
            }

            setStreamingContent(fullContent);
            appendMessage({
                role: 'assistant',
                content: fullContent,
                type: CategoryType.Text,
            });
            return;
        }

        // Format request body based on provider
        let formattedRequestBody;
        if (selectedModel.provider === 'DeepSeek') {
            // Check if we're using the chat format (messages array) or completion format (prompt)
            if (requestBody.messages) {
                // Chat completion format
                formattedRequestBody = {
                    anthropic_version: "bedrock-2023-05-31",  // Include this for compatibility
                    messages: requestBody.messages,
                    max_tokens: requestBody.max_tokens || 2000,
                    temperature: requestBody.temperature || 0.7,
                    top_p: requestBody.top_p || 0.9,
                    stream: true
                };
            } else {
                // Text completion format
                formattedRequestBody = {
                    prompt: requestBody.prompt,
                    max_tokens: requestBody.max_tokens || 2000,
                    temperature: requestBody.temperature || 0.7,
                    top_p: requestBody.top_p || 0.9,
                    stream: true
                };
            }
        } else if (selectedModel.provider === 'Mistral') {
            // Make sure streaming is enabled for Mistral
            formattedRequestBody = {
                ...requestBody,
                stream: true
            };
        } else {
            formattedRequestBody = requestBody;
        }

        const command = new InvokeModelWithResponseStreamCommand({
            modelId: selectedModel.id,
            body: new TextEncoder().encode(JSON.stringify(formattedRequestBody)),
            contentType: 'application/json',
            accept: 'application/json',
        });

        try {
            const response = await client.send(command, {
                abortSignal: currentAbortController.signal
            });

            let addedThinkTag = false;
            if (response.body) {
                for await (const chunk of response.body) {
                    if ('chunk' in chunk && chunk.chunk?.bytes) {
                        try {
                            const decoded = new TextDecoder().decode(chunk.chunk.bytes);
                            let parsed;
                            try {
                                parsed = JSON.parse(decoded);
                            } catch (e) {
                                continue;
                            }

                            let content = '';

                            if (selectedModel.provider === 'Mistral') {
                                if (parsed.choices && parsed.choices[0]) {
                                    // Modern Mistral format (chat completion)
                                    content = parsed.choices[0].delta?.content ||
                                        parsed.choices[0].message?.content || '';
                                } else if (parsed.outputs && parsed.outputs[0]) {
                                    // Older Mistral format (text completion)
                                    content = parsed.outputs[0].text || '';
                                }
                            } else if (selectedModel.provider === 'Anthropic' && (selectedModel.id.includes('claude-sonnet-4') || selectedModel.id.includes('claude-3-7-sonnet'))) {
                                if (parsed.delta?.thinking) {
                                    // Accumulate thinking content instead of adding to fullContent
                                    if (!addedThinkTag) {
                                        content = '<think>' + parsed.delta.thinking;
                                        addedThinkTag = true;
                                    } else {
                                        content = parsed.delta.thinking;
                                    }
                                } else if (parsed.delta?.redacted_thinking) {
                                    if (!addedThinkTag) {
                                        content = '<think>' + parsed.delta.redacted_thinking;
                                        addedThinkTag = true;
                                    } else {
                                        content = parsed.delta.redacted_thinking;
                                    }
                                } else {
                                    // Regular content
                                    content = parsed.delta?.text || '';
                                    if (addedThinkTag) {
                                        content = '</think>' + content;
                                        addedThinkTag = false;
                                    }
                                }
                            } else if (selectedModel.provider === 'Meta') {
                                content = parsed.generation || '';
                            } else if (selectedModel.provider === 'Amazon' && selectedModel.id.includes('nova')) {
                                content = parsed.contentBlockDelta?.delta?.text || '';
                            } else if (selectedModel.provider === 'DeepSeek') {
                                // Updated DeepSeek response handling
                                if (parsed.output?.message?.content && parsed.output.message.content[0]) {
                                    content = parsed.output.message.content[0].text || '';
                                } else if (parsed.choices && parsed.choices[0]) {
                                    content = parsed.choices[0].text || '';
                                } else {
                                    content = parsed.generation || '';
                                }
                            } else {
                                content = parsed.delta?.text || '';
                            }

                            if (content) {
                                fullContent += content;

                                const currentTime = Date.now();
                                if (currentTime - lastUpdateTime >= DEBOUNCE_INTERVAL) {
                                    setStreamingContent(fullContent);
                                    lastUpdateTime = currentTime;
                                }
                            }
                        } catch (error) {
                            continue;
                        }
                    }
                }
            }

            const cleanedContent = fullContent.replace('', '');
            setStreamingContent(cleanedContent);

            appendMessage({
                role: 'assistant',
                content: cleanedContent,
                type: CategoryType.Text,
            });
        } catch (err: unknown) {
            // Type-safe error handling
            if (typeof err === 'object' && err !== null) {
                const awsError = err as any; // Type assertion for property access

                if (awsError.name === 'AccessDeniedException' ||
                    (awsError.$metadata && awsError.$metadata.httpStatusCode === 403)) {
                    const errorMessage = parseAwsErrorMessage(awsError);
                    throw new Error(errorMessage);
                }
            }
            throw err; // Re-throw if it's not a handled error type
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            return '';
        }
        throw error;
    } finally {
        currentAbortController = null;
        setStreamingContent('');
    }
};

/**
 * Parse AWS error messages to provide more user-friendly information
 */
function parseAwsErrorMessage(error: any): string {
    // Default error message
    let message = "You don't have permission to use this model.";

    if (!error) return message;

    // Check if it's an AWS error with a message property
    if (error.message) {
        const errorMsg = error.message;

        // Check for inference profile related errors
        if (errorMsg.includes('inference-profile')) {
            return "You don't have permission to use this model with an inference profile. Please select a different model or contact your administrator.";
        }

        // Check for knowledge base related errors
        if (errorMsg.includes('knowledge-base') || errorMsg.includes('GetKnowledgeBase')) {
            return "You don't have permission to access this knowledge base. Please select a different agent or contact your administrator to grant access.";
        }

        // Check for role-based permission errors
        if (errorMsg.includes('assumed-role') && errorMsg.includes('is not authorized')) {
            return "Your user role doesn't have permission to use this resource. Please contact your administrator to grant access.";
        }

        // Check for general authorization errors
        if (errorMsg.includes('not authorized') || errorMsg.includes('AccessDenied')) {
            return "You don't have permission to use this resource. Please contact your administrator.";
        }

        // Return the original message if we can't match specific patterns
        return errorMsg;
    }

    // Check for HTTP status code-based errors
    if (error.$metadata && error.$metadata.httpStatusCode === 403) {
        return "Access denied (HTTP 403). You don't have permission to use this resource. Please contact your administrator.";
    }

    return message;
}

export const stopStreaming = () => {
    if (currentAbortController) {
        currentAbortController.abort();
    }
};