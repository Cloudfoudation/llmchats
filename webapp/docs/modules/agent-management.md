# Agent Management Module

## Purpose
Create, configure, and manage AI agents with custom instructions, knowledge bases, and sharing capabilities.

## API Integration

### Agent Management API
- **Base URL**: `https://d8q6coohkc.execute-api.us-east-1.amazonaws.com/dev/`
- **Authentication**: Bearer token (Cognito ID token)

### API Endpoints
```typescript
GET    /agents                    // List user's agents
GET    /agents/{agentId}          // Get agent details
POST   /agents                    // Create new agent
PUT    /agents/{agentId}          // Update agent
DELETE /agents/{agentId}          // Delete agent
```

### DynamoDB Tables
- **Agents**: `gsis-poc-agents`
- **Shared Agents**: `gsis-poc-shared-agents`

## Key Components

### 1. Agent Manager Modal (`src/components/agent/AgentManagerModal.tsx`)
```typescript
// Agent CRUD operations
- List all user agents
- Create new agents
- Edit existing agents
- Delete agents
- Share agents with groups
```

### 2. Agent Config Modal (`src/components/agent/AgentConfigModal.tsx`)
```typescript
// Agent configuration
- Name and description
- System instructions
- Knowledge base selection
- Model preferences
- Temperature and parameters
```

### 3. Share Agent Modal (`src/components/agent/ShareAgentModal.tsx`)
```typescript
// Agent sharing
- Select groups to share with
- Set sharing permissions
- Manage shared access
```

### 4. Agent Selector (`src/components/chat/AgentSelector.tsx`)
```typescript
// Agent selection in chat
- Dropdown of available agents
- Personal and shared agents
- Agent switching in conversations
```

## Implementation

### Agent Service (`src/services/agent.ts`)
```typescript
class AgentManagementService {
  private baseUrl = process.env.NEXT_PUBLIC_AGENT_MANAGEMENT_API_URL;

  // List all agents user has access to
  async listAgents(): Promise<ListAgentsResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get('/agents', { headers });
    return this.processResponse(response.data);
  }

  // Create new agent
  async createAgent(agentData: AgentRequest): Promise<CreateAgentResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/agents', agentData, { headers });
    return this.processResponse(response.data);
  }

  // Update existing agent
  async updateAgent(agentId: string, agentData: AgentRequest): Promise<UpdateAgentResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.put(`/agents/${agentId}`, agentData, { headers });
    return this.processResponse(response.data);
  }

  // Delete agent
  async deleteAgent(agentId: string): Promise<DeleteAgentResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.delete(`/agents/${agentId}`, { headers });
    return this.processResponse(response.data);
  }
}
```

### Agent Hook (`src/hooks/useAgents.ts`)
```typescript
export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Load all agents
  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await agentManagementService.listAgents();
      if (response.success) {
        setAgents(response.data.agents);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new agent
  const createAgent = async (agentData: AgentRequest) => {
    try {
      const response = await agentManagementService.createAgent(agentData);
      if (response.success) {
        await loadAgents(); // Refresh list
        return response.data.agent;
      }
      throw new Error(response.error?.message || 'Failed to create agent');
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  };

  // Update agent
  const updateAgent = async (agentId: string, agentData: AgentRequest) => {
    try {
      const response = await agentManagementService.updateAgent(agentId, agentData);
      if (response.success) {
        await loadAgents(); // Refresh list
        return response.data.agent;
      }
      throw new Error(response.error?.message || 'Failed to update agent');
    } catch (error) {
      console.error('Error updating agent:', error);
      throw error;
    }
  };

  return {
    agents,
    loading,
    selectedAgent,
    setSelectedAgent,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent: async (agentId: string) => {
      await agentManagementService.deleteAgent(agentId);
      await loadAgents();
    }
  };
};
```

### Agent Provider (`src/providers/AgentsProvider.tsx`)
```typescript
export const AgentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sharedAgents, setSharedAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Load user's personal agents
  const loadPersonalAgents = async () => {
    const response = await agentManagementService.listAgents();
    if (response.success) {
      setAgents(response.data.agents.filter(agent => agent.isOwner));
    }
  };

  // Load shared agents from groups
  const loadSharedAgents = async () => {
    const response = await sharedResourcesService.listSharedAgents();
    if (response.success) {
      setSharedAgents(response.data.agents);
    }
  };

  return (
    <AgentsContext.Provider value={{
      agents,
      sharedAgents,
      selectedAgent,
      setSelectedAgent,
      loadPersonalAgents,
      loadSharedAgents
    }}>
      {children}
    </AgentsContext.Provider>
  );
};
```

## Agent Configuration

### Agent Data Structure
```typescript
interface Agent {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  knowledgeBaseIds: string[];
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  isOwner: boolean;
  isShared: boolean;
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface AgentRequest {
  name: string;
  description?: string;
  instructions: string;
  knowledgeBaseIds?: string[];
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}
```

### Default Agent Configuration
```typescript
export const DEFAULT_AGENT_CONFIG = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
  topK: 50,
  instructions: "You are a helpful AI assistant. Provide accurate and helpful responses to user questions."
};
```

## User Flow

### 1. Create Agent
1. Click "Manage Agents" button
2. Click "Create New Agent"
3. Fill in agent details:
   - Name and description
   - System instructions
   - Select knowledge bases
   - Configure model parameters
4. Save agent
5. Agent appears in personal agents list

### 2. Use Agent in Chat
1. Open chat interface
2. Click agent selector dropdown
3. Choose from personal or shared agents
4. Agent instructions applied to conversation
5. Knowledge bases provide context

### 3. Share Agent
1. Open agent manager
2. Click "Share" on desired agent
3. Select groups to share with
4. Set sharing permissions
5. Shared agent appears in group members' lists

### 4. Edit Agent
1. Select agent from manager
2. Click "Edit" button
3. Modify configuration
4. Save changes
5. Updates apply to all conversations

## Features

### 1. Custom Instructions
- System prompts for agent behavior
- Role-based instructions
- Context-aware responses
- Instruction templates

### 2. Knowledge Base Integration
- Multiple knowledge base selection
- RAG (Retrieval Augmented Generation)
- Document context in responses
- Knowledge base switching

### 3. Model Configuration
- Model selection per agent
- Parameter tuning (temperature, top-p, etc.)
- Token limits
- Response formatting

### 4. Sharing System
- Group-based sharing
- Permission management
- Shared agent discovery
- Access control

## Error Handling

### Common Errors
- `AgentNotFound`: Invalid agent ID
- `UnauthorizedAccess`: No permission to access agent
- `ValidationError`: Invalid agent configuration
- `KnowledgeBaseNotFound`: Invalid knowledge base reference

### Validation Rules
```typescript
const validateAgent = (agent: AgentRequest): string[] => {
  const errors: string[] = [];
  
  if (!agent.name || agent.name.trim().length === 0) {
    errors.push('Agent name is required');
  }
  
  if (agent.name && agent.name.length > 100) {
    errors.push('Agent name must be less than 100 characters');
  }
  
  if (!agent.instructions || agent.instructions.trim().length === 0) {
    errors.push('Agent instructions are required');
  }
  
  if (agent.temperature && (agent.temperature < 0 || agent.temperature > 1)) {
    errors.push('Temperature must be between 0 and 1');
  }
  
  return errors;
};
```

## Usage Examples

### Create Agent
```typescript
const { createAgent } = useAgents();

const handleCreateAgent = async () => {
  try {
    const newAgent = await createAgent({
      name: 'Research Assistant',
      description: 'Helps with research tasks',
      instructions: 'You are a research assistant. Help users find and analyze information.',
      knowledgeBaseIds: ['kb-123', 'kb-456'],
      temperature: 0.7
    });
    
    console.log('Agent created:', newAgent);
  } catch (error) {
    console.error('Failed to create agent:', error);
  }
};
```

### Use Agent in Chat
```typescript
const { selectedAgent, setSelectedAgent } = useAgents();

const handleAgentSelect = (agent: Agent) => {
  setSelectedAgent(agent);
  // Agent instructions will be applied to next messages
};
```

### Share Agent
```typescript
const handleShareAgent = async (agentId: string, groupIds: string[]) => {
  try {
    await sharedResourcesService.shareAgent(agentId, groupIds);
    console.log('Agent shared successfully');
  } catch (error) {
    console.error('Failed to share agent:', error);
  }
};
```