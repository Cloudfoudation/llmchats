import { ModelParams } from "@/types/models";

type MessageType = 'text' | 'chat' | 'image' | 'video' | 'embedding' | 'multimodal' | 'vector' | 'search' | 'document';
type RoleType = 'user' | 'assistant' | 'system';

interface BaseEntity {
  id: string;
  version: number;
  createdAt: number;
  lastEditedAt: number;
}

interface DocumentAttachmentMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
}

interface MessageAttachment {
  type: 'image' | 'document';
  data: string;
}

interface Message {
  role: RoleType;
  content: string;
  type: MessageType;
  imageData?: string[];
  attachments?: MessageAttachment[];
  metadata?: {
    citations?: any[]; // For KB citations
    guardrailAction?: any; // For KB guardrail actions
    documentAttachments?: DocumentAttachmentMetadata[]; // For document attachments
    agentTrace?: any; // For Bedrock agent traces
  };
}

interface Conversation extends BaseEntity {
  title: string;
  messages: Message[];
  modelParams: ModelParams;
  agentId: string | null;
  type?: 'chat' | 'editor';
  editorState?: {
    lastSavedAt?: number;
    lastContent?: {
      json: {};
      html: string;
      markdown: string;
    };
    wordCount?: number;
  };
  
  // Bedrock agent specific fields
  isBedrockAgent?: boolean; // Flag to identify if this conversation uses a Bedrock agent
  bedrockAgentId?: string; // The ID of the Bedrock agent being used
  bedrockAgentAliasId?: string; // The alias ID of the Bedrock agent being used
  bedrockAgentSessionId?: string; // Session ID for maintaining conversation context with the agent
}

// Additional interface for Agent trace information
interface AgentTrace {
  timestamp: string;
  traceId: string;
  actionGroup?: string;
  action?: string;
  steps?: AgentTraceStep[];
  citations?: AgentTraceCitation[];
}

interface AgentTraceStep {
  stepId: string;
  stepType: string;
  stepOutput?: string;
  stepDetails?: any;
}

interface AgentTraceCitation {
  citationId: string;
  retrievedData?: string;
  retrievedFrom?: string;
  confidence?: number;
}

export type {
  MessageType,
  RoleType,
  Message,
  MessageAttachment,
  DocumentAttachmentMetadata,
  Conversation,
  AgentTrace,
  AgentTraceStep,
  AgentTraceCitation
};