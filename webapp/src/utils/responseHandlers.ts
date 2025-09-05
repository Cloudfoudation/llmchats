// src/utils/responseHandlers.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ModelParams, CategoryType, ModelOption, ProviderType } from '@/types/models';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

export let currentNonStreamingController: AbortController | null = null;


export const handleBedrockAgentResponse = async (
    agentId: string,
    agentAliasId: string,
    sessionId: string | undefined,
    input: string,
    client: BedrockAgentRuntimeClient,
    onStreamChunk: (content: string) => void,
    onComplete: (content: string) => void
): Promise<void> => {
    try {
        const agentInput = {
            agentId: agentId,
            agentAliasId: agentAliasId,
            sessionId: sessionId,
            inputText: input,
            enableTrace: true
        };

        const command = new InvokeAgentCommand(agentInput);
        const response = await client.send(command);

        if (response.completion) {
            let aggregatedContent = '';

            try {
                for await (const chunkEvent of response.completion) {
                    if (chunkEvent?.chunk && chunkEvent.chunk.bytes) {
                        const chunkContent = new TextDecoder("utf-8").decode(chunkEvent.chunk.bytes);
                        aggregatedContent += chunkContent;
                        onStreamChunk(aggregatedContent);
                    }
                }
                
                onComplete(aggregatedContent);
            } catch (streamingError) {
                console.error("Error processing agent streaming response:", streamingError);
                
                if (aggregatedContent.length > 0) {
                    onComplete(aggregatedContent);
                } else {
                    throw streamingError;
                }
            }
        } else {
            throw new Error("Bedrock agent returned empty response");
        }
    } catch (error) {
        console.error("Bedrock Agent error:", error);
        throw error;
    }
};

export const handleNonStreamingResponse = async (
    selectedModel: ModelOption,
    requestBody: any,
    client: BedrockRuntimeClient,
    input: string,
    modelParams: ModelParams
): Promise<string | string[]> => {
    if (selectedModel.category.includes(CategoryType.Video)) {
        const command = new InvokeModelCommand({
            modelId: modelParams.modelId,
            body: new TextEncoder().encode(JSON.stringify(requestBody)),
            contentType: 'application/json',
            accept: 'application/json',
        });

        try {
            const response = await client.send(command);
            const responseBody = new TextDecoder().decode(response.body);
            const result = JSON.parse(responseBody);

            if (result.jobId) {
                return JSON.stringify({
                    type: 'video',
                    jobId: result.jobId,
                    status: 'processing'
                });
            }

            if (result.video) {
                return `data:video/mp4;base64,${result.video}`;
            }
        } catch (error) {
            console.error('Video generation error:', error);
            throw error;
        }
    }

    // For Claude 3 models
    if (selectedModel.provider === 'Anthropic' && selectedModel.id.includes('claude-3')) {
        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: modelParams.maxTokens,
            messages: [
                {
                    role: "user",
                    content: [{ type: "text", text: input }]
                }
            ]
        };

        try {
            currentNonStreamingController = new AbortController();
            const command = new InvokeModelCommand({
                modelId: modelParams.modelId,
                body: new TextEncoder().encode(JSON.stringify(payload)),
                contentType: 'application/json',
                accept: 'application/json',
            });

            const response = await client.send(command, {
                abortSignal: currentNonStreamingController.signal
            });
            const decodedResponseBody = new TextDecoder().decode(response.body);
            const responseBody = JSON.parse(decodedResponseBody);
            return responseBody.content[0].text;
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                return '';
            }
            throw error;
        } finally {
            currentNonStreamingController = null;
        }
    }

    try {
        currentNonStreamingController = new AbortController();

        const command = new InvokeModelCommand({
            modelId: modelParams.modelId,
            body: new TextEncoder().encode(JSON.stringify(requestBody)),
            contentType: 'application/json',
            accept: selectedModel.category.includes(CategoryType.Image) ? '*/*' : 'application/json',
        });

        const response = await client.send(command, {
            abortSignal: currentNonStreamingController.signal
        });

        const responseBody = new TextDecoder().decode(response.body);
        const result = JSON.parse(responseBody);

        // Add Mistral AI response handling
        if (selectedModel.provider === 'Mistral') {
            if (result.choices && result.choices[0]) {
                return result.choices[0].message?.content || '';
            }

            // For older format
            if (result.outputs && result.outputs[0]) {
                return result.outputs[0].text || '';
            }
        }

        // Existing response processing continues...
        if ('images' in result) {
            if (selectedModel.provider === 'Amazon' || selectedModel.provider === ProviderType.StabilityAI) {
                // Handle multiple images
                const images = result.images.map((imageData: string) =>
                    `data:image/png;base64,${imageData}`
                );

                return images;
            }
        }

        switch (selectedModel.provider) {
            case 'Anthropic':
                return result.completion;
            case 'Amazon':
                if (selectedModel.id.includes('nova')) {
                    return result.outputContent?.text ||
                        result.content?.[0]?.text ||
                        result.message?.content?.[0]?.text || '';
                }
                return result.outputText;
            case 'Meta':
                return result.generation;
            case 'DeepSeek':
                try {
                    const command = new InvokeModelCommand({
                        modelId: modelParams.modelId,
                        body: new TextEncoder().encode(JSON.stringify(requestBody)),
                        contentType: 'application/json',
                        accept: 'application/json',
                    });

                    const response = await client.send(command);
                    const decodedResponse = new TextDecoder().decode(response.body);
                    const result = JSON.parse(decodedResponse);

                    // Handle DeepSeek specific response format
                    return result.completion || result.generation || '';
                } catch (error) {
                    console.error('DeepSeek API error:', error);
                    throw error;
                }
            default:
                return result.text || result.completion || result.outputText;
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            return '';
        }
        throw error;
    } finally {
        currentNonStreamingController = null;
    }
};

export const stopNonStreaming = () => {
    if (currentNonStreamingController) {
        currentNonStreamingController.abort();
    }
};