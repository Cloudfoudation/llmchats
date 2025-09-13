# Chat System Module

## Purpose
Core conversational AI functionality using Amazon Bedrock models with real-time streaming responses and conversation management.

## API Integration

### Amazon Bedrock API
- **Direct Integration**: Uses AWS SDK with temporary credentials
- **Streaming**: Real-time response streaming
- **Models**: Claude, Llama, Mistral, and other Bedrock models

### DynamoDB Tables
- **Conversations**: `gsis-poc-conversations`
- **Storage**: Conversation history and metadata

### S3 Buckets
- **Attachments**: `gsis-poc-attachments`
- **File Storage**: Images, documents, and other attachments

## Key Components

### 1. Chat Layout (`src/components/chat/ChatLayout.tsx`)
```typescript
// Main chat interface
- Conversation sidebar
- Message display area
- Input controls
- Model selection
```

### 2. Message List (`src/components/chat/MessageList/MessageList.tsx`)
```typescript
// Message rendering
- User/Assistant message display
- Streaming content updates
- Code block highlighting
- Image/attachment rendering
```

### 3. Chat Input (`src/components/chat/ChatInput.tsx`)
```typescript
// Message composition
- Text input with rich formatting
- File attachment handling
- Send message functionality
- Input validation
```

### 4. Conversation Sidebar (`src/components/chat/ConversationSidebar.tsx`)
```typescript
// Conversation management
- List all conversations
- Create new conversations
- Delete conversations
- Search conversations
```

## Implementation

### Chat Hook (`src/hooks/useConversations.ts`)
```typescript
export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Create new conversation
  const createConversation = async (title: string) => {
    const conversation = {
      id: generateId(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    
    await syncManager.saveConversation(conversation);
    setConversations(prev => [conversation, ...prev]);
    return conversation;
  };

  // Send message to Bedrock
  const sendMessage = async (content: string, attachments?: File[]) => {
    const message = createUserMessage(content, attachments);
    setMessages(prev => [...prev, message]);

    // Stream response from Bedrock
    const response = await streamBedrockResponse(message);
    setMessages(prev => [...prev, response]);
  };
};
```

### Bedrock Integration (`src/utils/streamingHandlers.ts`)
```typescript
// Streaming response handler
export const streamBedrockResponse = async (
  message: Message,
  model: string,
  onChunk: (chunk: string) => void
) => {
  const client = new BedrockRuntimeClient({
    region: process.env.NEXT_PUBLIC_REGION,
    credentials: await getCredentials()
  });

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model,
    body: JSON.stringify({
      messages: formatMessagesForModel(messages),
      max_tokens: 4096,
      temperature: 0.7
    }),
    contentType: 'application/json'
  });

  const response = await client.send(command);
  
  // Process streaming response
  for await (const chunk of response.body) {
    if (chunk.chunk?.bytes) {
      const text = new TextDecoder().decode(chunk.chunk.bytes);
      const parsed = JSON.parse(text);
      
      if (parsed.delta?.text) {
        onChunk(parsed.delta.text);
      }
    }
  }
};
```

### Sync System (`src/services/sync/SyncManager.ts`)
```typescript
export class SyncManager {
  // Save conversation to local and remote storage
  async saveConversation(conversation: Conversation) {
    // Save locally first (offline-first)
    await this.indexedDB.saveConversation(conversation);
    
    // Queue for remote sync
    await this.syncQueue.enqueue({
      type: 'SAVE_CONVERSATION',
      data: conversation,
      timestamp: Date.now()
    });
  }

  // Sync with DynamoDB
  async syncToRemote() {
    const pendingOperations = await this.syncQueue.getPending();
    
    for (const operation of pendingOperations) {
      try {
        await this.dynamoSync.syncConversation(operation.data);
        await this.syncQueue.markComplete(operation.id);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}
```

## Model Integration

### Model Registry (`src/lib/ModelRegistry.ts`)
```typescript
export class ModelRegistry {
  private generators = new Map<string, ModelGenerator>();

  constructor() {
    // Register model generators
    this.generators.set('anthropic', new AnthropicModelGenerator());
    this.generators.set('meta', new MetaLlamaModelGenerator());
    this.generators.set('mistral', new MistralModelGenerator());
    this.generators.set('amazon', new AmazonModelGenerator());
  }

  getAvailableModels(userTier: string): Model[] {
    const models = [];
    
    for (const generator of this.generators.values()) {
      models.push(...generator.getModels(userTier));
    }
    
    return models;
  }
}
```

### Model Generators (`src/generators/`)
```typescript
// Example: Claude model generator
export class AnthropicModelGenerator implements ModelGenerator {
  getModels(userTier: string): Model[] {
    const models = [
      {
        id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        tier: 'paid'
      }
    ];

    return models.filter(model => 
      userTier === 'admin' || 
      userTier === 'paid' || 
      model.tier === 'free'
    );
  }
}
```

## User Flow

### 1. Start Conversation
1. User clicks "New Chat"
2. Creates new conversation in local storage
3. Selects AI model from available options
4. Types message and clicks send

### 2. Message Processing
1. Message saved locally (IndexedDB)
2. Queued for remote sync (DynamoDB)
3. Sent to Bedrock API for processing
4. Streaming response displayed in real-time
5. Complete response saved locally and synced

### 3. Conversation Management
1. All conversations listed in sidebar
2. Click to switch between conversations
3. Search conversations by title/content
4. Delete conversations with confirmation

## Features

### 1. Real-time Streaming
- Character-by-character response display
- Smooth typing animation
- Cancellable requests
- Error handling during streaming

### 2. Offline Support
- IndexedDB for local storage
- Offline-first architecture
- Automatic sync when online
- Conflict resolution

### 3. File Attachments
- Image upload and display
- Document attachment
- S3 presigned URL upload
- File type validation

### 4. Rich Formatting
- Markdown rendering
- Code syntax highlighting
- LaTeX math support
- Copy code blocks

## Configuration

### Model Configuration (`src/constants/modelDefaults.ts`)
```typescript
export const MODEL_DEFAULTS = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
  topK: 50
};

export const STREAMING_CONFIG = {
  chunkSize: 1024,
  timeout: 30000,
  retryAttempts: 3
};
```

### Sync Configuration
```typescript
export const SYNC_CONFIG = {
  batchSize: 10,
  syncInterval: 30000, // 30 seconds
  retryDelay: 5000,
  maxRetries: 3
};
```

## Error Handling

### Common Errors
- `ModelNotFound`: Invalid model ID
- `TokenLimitExceeded`: Message too long
- `RateLimitExceeded`: Too many requests
- `NetworkError`: Connection issues
- `SyncError`: Database sync failures

### Error Recovery
```typescript
// Retry logic for failed requests
const retryBedrockCall = async (request: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await invokeModel(request);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
};
```

## Usage Examples

### Send Message
```typescript
const { sendMessage } = useConversations();

const handleSend = async (content: string) => {
  try {
    await sendMessage(content);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

### Stream Response
```typescript
const handleStream = async (message: string) => {
  let response = '';
  
  await streamBedrockResponse(
    message,
    selectedModel,
    (chunk) => {
      response += chunk;
      setStreamingResponse(response);
    }
  );
};
```