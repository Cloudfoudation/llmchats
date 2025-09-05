import {
    BedrockAgentRuntimeClient,
    RetrieveCommand,
    SearchType,
    RetrieveCommandInput,
    RetrievalResultLocation,
} from '@aws-sdk/client-bedrock-agent-runtime';
import {
    BedrockRuntimeClient,
    InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { CategoryType, ModelOption } from '@/types/models';
import { Dispatch, SetStateAction } from 'react';
import { Conversation, Message } from '@/types/chat';
import { Agent } from '@/types/agent';
import { knowledgeBaseService } from '@/services/knowledgeBase';

export let currentKBAbortController: AbortController | null = null;

interface RetrievedDocument {
    content: string;
    location?: RetrievalResultLocation;
    source?: string;
}

// Updated to use API instead of direct AWS SDK calls
async function retrieveFromKB(
    knowledgeBaseId: string,
    query: string,
    client: BedrockAgentRuntimeClient
): Promise<{ prompt: string; citations: RetrievedDocument[] }> {
    try {
        // First try using the API service
        const response = await knowledgeBaseService.retrieveFromKnowledgeBase(
            knowledgeBaseId,
            query
        );

        if (response.success && response.data) {
            const citations: RetrievedDocument[] = response.data.retrievalResults.map((result: any) => ({
                content: result.content.text,
                location: result.location,
                source: result.location?.s3Location?.uri || result.metadata?.source || null
            }));

            const chunks: string[] = citations.map((citation, index) =>
                `Document[${index + 1}]:${citation.content};`
            );

            const prompt = `
                Use the following data to answer the question. When you use information from a specific source, 
                cite it using [n] where n is the source number. Always cite your sources inline.
                
                Sources:
                ${chunks.join("\n")}
                
                Question: ${query}
                
                Answer with citations:
            `.trim();

            return {
                prompt,
                citations
            };
        } else {
            // Fallback to direct SDK call if API fails
            console.warn("API retrieve failed, falling back to direct SDK call", response.error);
            return fallbackRetrieveFromKB(knowledgeBaseId, query, client);
        }
    } catch (error) {
        console.error("Error using KB service API, falling back to direct SDK:", error);
        return fallbackRetrieveFromKB(knowledgeBaseId, query, client);
    }
}

// Fallback method using direct SDK calls
async function fallbackRetrieveFromKB(
    knowledgeBaseId: string,
    query: string,
    client: BedrockAgentRuntimeClient
): Promise<{ prompt: string; citations: RetrievedDocument[] }> {
    const input: RetrieveCommandInput = {
        knowledgeBaseId,
        retrievalQuery: {
            text: query,
        },
        retrievalConfiguration: {
            vectorSearchConfiguration: {
                numberOfResults: 5,
                overrideSearchType: SearchType.HYBRID,
            },
        },
    };

    const command = new RetrieveCommand(input);
    const response = await client.send(command);

    const citations: RetrievedDocument[] = [];
    const chunks: string[] = [];

    for (const result of response.retrievalResults || []) {
        if (result.content?.text) {
            const citationIndex = citations.length + 1;
            const chunkText: string = `Document[${citationIndex}]:${result.content.text};`;
            chunks.push(chunkText);

            citations.push({
                content: result.content.text,
                location: result.location
            });
        }
    }

    const prompt = `
        Use the following data to answer the question. When you use information from a specific source, 
        cite it using [n] where n is the source number. Always cite your sources inline.
        
        Sources:
        ${chunks.join("\n")}
        
        Question: ${query}
        
        Answer with citations:
    `.trim();

    return {
        prompt,
        citations
    };
}

const buildKBRequestBody = (
    selectedModel: ModelOption,
    prompt: string,
    modelParams: any,
    systemPrompt?: string,
    conversationHistory: Message[] = []
) => {
    switch (selectedModel.provider) {
        case 'DeepSeek':
            return {
                prompt: prompt,
                max_gen_len: modelParams.maxTokens || 2048
            };
        case 'Meta':
            // Helper function to format Llama conversation
            const formatLlamaKBConversation = (
                messages: Message[],
                prompt: string,
                systemPrompt: string,
                modelId: string,
            ) => {
                let conversation = '';

                // Add system prompt
                conversation += `<|begin_of_text|><|start_header_id|>system<|end_header_id|>${systemPrompt}<|eot_id|>`;

                // Add conversation history
                messages.forEach(msg => {
                    conversation += `<|begin_of_text|><|start_header_id|>${msg.role}<|end_header_id|>${msg.content}<|eot_id|>`;
                });

                // Add current user input with KB prompt
                conversation += `<|begin_of_text|><|start_header_id|>user<|end_header_id|>${prompt}<|eot_id|>`;

                // Add assistant marker for response
                conversation += `<|start_header_id|>assistant<|end_header_id|>`;

                return conversation;
            };

            // Base request parameters
            const metaRequest = {
                temperature: modelParams.temperature || 0.7,
                top_p: modelParams.topP || 0.9,
                max_gen_len: modelParams.maxTokens || 4096
            };

            if (selectedModel.id.includes('llama3-3')) {
                // Llama 3.3 (latest instruction-tuned model)
                return {
                    ...metaRequest,
                    prompt: formatLlamaKBConversation(
                        conversationHistory,
                        prompt,
                        systemPrompt || "You are a helpful AI assistant.",
                        selectedModel.id
                    )
                };
            } else if (selectedModel.id.includes('llama3-2')) {
                // Llama 3.2
                return {
                    ...metaRequest,
                    prompt: formatLlamaKBConversation(
                        conversationHistory,
                        prompt,
                        systemPrompt || "You are a helpful AI assistant.",
                        selectedModel.id
                    )
                };
            } else if (selectedModel.id.includes('llama3-1')) {
                // Llama 3.1
                if (selectedModel.id.includes('pretrained')) {
                    // Pretrained model format
                    return {
                        ...metaRequest,
                        prompt: `<|begin_of_text|>${prompt}`
                    };
                } else {
                    // Instruction-tuned model format
                    return {
                        ...metaRequest,
                        prompt: formatLlamaKBConversation(
                            conversationHistory,
                            prompt,
                            systemPrompt || "You are a helpful AI assistant.",
                            selectedModel.id
                        )
                    };
                }
            } else {
                // Earlier Llama versions
                const conversationString = conversationHistory
                    .map(msg => `<|begin_of_text|><|start_header_id|>${msg.role}<|end_header_id|>${msg.content}<|eot_id|>`)
                    .join('');

                return {
                    ...metaRequest,
                    prompt: `${conversationString}<|begin_of_text|><|start_header_id|>user<|end_header_id|>${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`
                };
            }

        case 'Amazon':
            if (selectedModel.id.includes('nova')) {
                return {
                    schemaVersion: "messages-v1",
                    system: [{
                        text: systemPrompt || "You are a helpful AI assistant."
                    }],
                    messages: [
                        ...conversationHistory.map(msg => ({
                            role: msg.role,
                            content: [{ text: msg.content }]
                        })),
                        {
                            role: "user",
                            content: [{ text: prompt }]
                        }
                    ],
                    inferenceConfig: {
                        max_new_tokens: modelParams.maxTokens || 4096,
                        temperature: modelParams.temperature || 0.7,
                        top_p: modelParams.topP || 0.9,
                        top_k: 50,
                        stopSequences: []
                    }
                };
            }
            break;

        case 'Anthropic':
            if (selectedModel.id.includes('claude-3')) {
                return {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: modelParams.maxTokens || 4096,
                    messages: [
                        {
                            role: "user",
                            content: [{
                                type: "text",
                                text: prompt
                            }]
                        }
                    ],
                    system: systemPrompt,
                    temperature: modelParams.temperature,
                    top_p: modelParams.topP
                };
            } else {
                return {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: modelParams.maxTokens || 4096,
                    messages: [
                        {
                            role: "user",
                            content: [{
                                type: "text",
                                text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
                            }]
                        }
                    ]
                };
            }

        default:
            throw new Error('Unsupported model provider');
    }
};

export const handleKBStreamingResponse = async (
    selectedModel: ModelOption,
    knowledgeBaseId: string,
    input: string,
    modelParams: any,
    bedrockClient: BedrockRuntimeClient,
    bedrockAgentRuntimeClient: BedrockAgentRuntimeClient,
    setStreamingContent: Dispatch<SetStateAction<string>>,
    appendMessage: (message: Conversation['messages'][number]) => Promise<void>,
    systemPrompt?: string,
    conversationHistory: Message[] = []
) => {
    try {
        currentKBAbortController = new AbortController();
        const { prompt: kbPrompt, citations } = await retrieveFromKB(
            knowledgeBaseId,
            input,
            bedrockAgentRuntimeClient
        );

        const requestBody = buildKBRequestBody(
            selectedModel,
            kbPrompt,
            modelParams,
            systemPrompt,
            conversationHistory
        );

        const command = new InvokeModelWithResponseStreamCommand({
            modelId: selectedModel.id,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody)
        });

        const response = await bedrockClient.send(command, {
            abortSignal: currentKBAbortController.signal
        });

        let fullResponse = '';
        let lastUpdateTime = Date.now();
        const DEBOUNCE_INTERVAL = 50;

        if (response.body) {
            for await (const chunk of response.body) {
                if ('chunk' in chunk && chunk.chunk) {
                    try {
                        const decoded = new TextDecoder().decode(chunk.chunk.bytes);
                        const parsed = JSON.parse(decoded);

                        let content = '';

                        if (selectedModel.provider === 'Meta') {
                            content = parsed.generation || '';
                        } else if (selectedModel.provider === 'Amazon' && selectedModel.id.includes('nova')) {
                            content = parsed.contentBlockDelta?.delta?.text || '';
                        } else if (selectedModel.provider === 'DeepSeek') {
                            if (parsed.choices && parsed.choices[0]) {
                                content = parsed.choices[0].text || '';
                            }
                        } else {
                            content = parsed.delta?.text || '';
                        }

                        if (content) {
                            fullResponse += content;

                            const currentTime = Date.now();
                            if (currentTime - lastUpdateTime >= DEBOUNCE_INTERVAL) {
                                setStreamingContent(fullResponse);
                                lastUpdateTime = currentTime;
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }
            }
        }

        await appendMessage({
            role: 'assistant',
            content: fullResponse,
            type: CategoryType.Text,
            metadata: {
                citations: citations,
                guardrailAction: null
            }
        });

    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            return '';
        }
        throw error;
    } finally {
        currentKBAbortController = null;
        setStreamingContent('');
    }
};