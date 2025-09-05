// src/utils/knowledgeBaseRequestBuilder.ts
import { Message } from '@/types/chat';
import { Agent } from '@/types/agent';
import { ModelParams, ModelOption } from '@/types/models';
import { KnowledgeBase } from '@aws-sdk/client-bedrock-agent';

export const buildKnowledgeBaseRequest = (
    input: string,
    selectedModel: ModelOption,
    modelParams: ModelParams,
    conversationHistory: Message[] = [],
    knowledgeBase: KnowledgeBase,
    agent?: Agent | null,
) => {
    // Base configuration for retrieve and generate

    const modelArn = 'arn:aws:bedrock:' + process.env.NEXT_PUBLIC_AWS_REGION + '::foundation-model/' + selectedModel.id;

    const baseConfig = {
        input: input,
        retrieveAndGenerateConfiguration: {
            type: "KNOWLEDGE_BASE",
            knowledgeBaseConfiguration: {
                knowledgeBaseId: knowledgeBase.knowledgeBaseId,
                modelArn: modelArn,
                topK: 3, // Number of relevant passages to retrieve
                returnSourceAttributes: true
            }
        }
    };

    // Provider-specific configurations
    switch (selectedModel.provider) {
        case 'Anthropic':
            return {
                ...baseConfig,
                anthropicConfiguration: {
                    anthropicVersion: "bedrock-2023-05-31",
                    maxTokens: modelParams.maxTokens,
                    temperature: modelParams.temperature,
                    topP: modelParams.topP,
                    systemPrompt: agent?.systemPrompt,
                    messages: conversationHistory.map(msg => ({
                        role: msg.role,
                        content: [{ type: "text", text: msg.content }]
                    }))
                }
            };

        case 'Amazon':
            return {
                ...baseConfig,
                amazonConfiguration: {
                    temperature: modelParams.temperature,
                    topP: modelParams.topP,
                    maxTokens: modelParams.maxTokens,
                    systemPrompt: agent?.systemPrompt,
                    conversationHistory: conversationHistory.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                }
            };

        default:
            throw new Error('Unsupported model provider for knowledge base integration');
    }
};