# Shared Resources Module

## Purpose
Enable sharing of agents and knowledge bases between users and groups, with permission management and discovery features.

## API Integration

### Shared Resources API
- **Base URL**: `https://efa3i4mkj7.execute-api.us-east-1.amazonaws.com/dev/`
- **Authentication**: Bearer token (Cognito ID token)

### API Endpoints
```typescript
// Agent Sharing
GET    /shared-agents                    // List shared agents user can access
POST   /shared-agents                   // Share an agent
DELETE /shared-agents/{shareId}         // Unshare an agent
GET    /shared-agents/by-group/{groupId} // Get agents shared with specific group

// Knowledge Base Sharing
GET    /shared-knowledge-bases          // List shared knowledge bases
POST   /shared-knowledge-bases          // Share a knowledge base
DELETE /shared-knowledge-bases/{shareId} // Unshare a knowledge base
GET    /shared-knowledge-bases/by-group/{groupId} // Get KBs shared with group

// Discovery
GET    /discover/agents                 // Discover available shared agents
GET    /discover/knowledge-bases        // Discover available shared knowledge bases
```

### DynamoDB Tables
- **Shared Agents**: `gsis-poc-shared-agents`
- **Shared Knowledge Bases**: `gsis-poc-shared-knowledge-bases`

## Key Components

### 1. Share Agent Modal (`src/components/agent/ShareAgentModal.tsx`)
```typescript
// Agent sharing interface
- Select groups to share with
- Set sharing permissions (read-only, edit)
- Manage existing shares
- Revoke sharing access
```

### 2. Share Knowledge Base Modal (`src/components/knowledge/ShareKnowledgeBaseModal.tsx`)
```typescript
// Knowledge base sharing interface
- Group selection for sharing
- Permission configuration
- Share management
- Access control
```

### 3. Shared Resources Discovery
```typescript
// Integrated into main components
- Agent selector shows shared agents
- Knowledge base manager shows shared KBs
- Search and filter shared resources
- Access shared resources seamlessly
```

## Implementation

### Shared Resources Service (`src/services/sharedResourcesService.ts`)
```typescript
class SharedResourcesService {
  private baseUrl = process.env.NEXT_PUBLIC_SHARED_RESOURCES_API_URL;

  // List shared agents user can access
  async listSharedAgents(): Promise<ListSharedAgentsResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get('/shared-agents', { headers });
    return response.data;
  }

  // Share an agent with groups
  async shareAgent(shareData: ShareAgentRequest): Promise<ShareAgentResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/shared-agents', shareData, { headers });
    return response.data;
  }

  // Unshare an agent
  async unshareAgent(shareId: string): Promise<UnshareResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.delete(`/shared-agents/${shareId}`, { headers });
    return response.data;
  }

  // List shared knowledge bases
  async listSharedKnowledgeBases(): Promise<ListSharedKnowledgeBasesResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.get('/shared-knowledge-bases', { headers });
    return response.data;
  }

  // Share a knowledge base with groups
  async shareKnowledgeBase(shareData: ShareKnowledgeBaseRequest): Promise<ShareKnowledgeBaseResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.post('/shared-knowledge-bases', shareData, { headers });
    return response.data;
  }

  // Unshare a knowledge base
  async unshareKnowledgeBase(shareId: string): Promise<UnshareResponse> {
    const headers = await this.getHeaders();
    const response = await this.axiosInstance.delete(`/shared-knowledge-bases/${shareId}`, { headers });
    return response.data;
  }

  // Discover available shared agents
  async discoverSharedAgents(filters?: DiscoveryFilters): Promise<DiscoverAgentsResponse> {
    const headers = await this.getHeaders();
    const params = new URLSearchParams();
    
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.groupId) params.append('groupId', filters.groupId);

    const response = await this.axiosInstance.get(
      `/discover/agents?${params.toString()}`,
      { headers }
    );
    return response.data;
  }

  // Discover available shared knowledge bases
  async discoverSharedKnowledgeBases(filters?: DiscoveryFilters): Promise<DiscoverKnowledgeBasesResponse> {
    const headers = await this.getHeaders();
    const params = new URLSearchParams();
    
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.groupId) params.append('groupId', filters.groupId);

    const response = await this.axiosInstance.get(
      `/discover/knowledge-bases?${params.toString()}`,
      { headers }
    );
    return response.data;
  }
}
```

### Shared Resources Hook (`src/hooks/useSharedResources.ts`)
```typescript
export const useSharedResources = () => {
  const [sharedAgents, setSharedAgents] = useState<SharedAgent[]>([]);
  const [sharedKnowledgeBases, setSharedKnowledgeBases] = useState<SharedKnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);

  // Load shared agents
  const loadSharedAgents = async () => {
    setLoading(true);
    try {
      const response = await sharedResourcesService.listSharedAgents();
      if (response.success) {
        setSharedAgents(response.data.sharedAgents);
      }
    } catch (error) {
      console.error('Failed to load shared agents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load shared knowledge bases
  const loadSharedKnowledgeBases = async () => {
    setLoading(true);
    try {
      const response = await sharedResourcesService.listSharedKnowledgeBases();
      if (response.success) {
        setSharedKnowledgeBases(response.data.sharedKnowledgeBases);
      }
    } catch (error) {
      console.error('Failed to load shared knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Share agent with groups
  const shareAgent = async (agentId: string, groupIds: string[], permissions: SharePermissions) => {
    try {
      const response = await sharedResourcesService.shareAgent({
        agentId,
        sharedWithGroups: groupIds,
        permissions
      });

      if (response.success) {
        await loadSharedAgents(); // Refresh list
        return response.data.share;
      }
      throw new Error(response.error?.message || 'Failed to share agent');
    } catch (error) {
      console.error('Error sharing agent:', error);
      throw error;
    }
  };

  // Share knowledge base with groups
  const shareKnowledgeBase = async (knowledgeBaseId: string, groupIds: string[], permissions: SharePermissions) => {
    try {
      const response = await sharedResourcesService.shareKnowledgeBase({
        knowledgeBaseId,
        sharedWithGroups: groupIds,
        permissions
      });

      if (response.success) {
        await loadSharedKnowledgeBases(); // Refresh list
        return response.data.share;
      }
      throw new Error(response.error?.message || 'Failed to share knowledge base');
    } catch (error) {
      console.error('Error sharing knowledge base:', error);
      throw error;
    }
  };

  // Unshare agent
  const unshareAgent = async (shareId: string) => {
    try {
      const response = await sharedResourcesService.unshareAgent(shareId);
      if (response.success) {
        setSharedAgents(prev => prev.filter(agent => agent.shareId !== shareId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to unshare agent');
    } catch (error) {
      console.error('Error unsharing agent:', error);
      throw error;
    }
  };

  // Unshare knowledge base
  const unshareKnowledgeBase = async (shareId: string) => {
    try {
      const response = await sharedResourcesService.unshareKnowledgeBase(shareId);
      if (response.success) {
        setSharedKnowledgeBases(prev => prev.filter(kb => kb.shareId !== shareId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to unshare knowledge base');
    } catch (error) {
      console.error('Error unsharing knowledge base:', error);
      throw error;
    }
  };

  return {
    sharedAgents,
    sharedKnowledgeBases,
    loading,
    loadSharedAgents,
    loadSharedKnowledgeBases,
    shareAgent,
    shareKnowledgeBase,
    unshareAgent,
    unshareKnowledgeBase
  };
};
```

## Data Structures

### Shared Resource Objects
```typescript
interface SharedAgent {
  shareId: string;
  agentId: string;
  agentName: string;
  agentDescription?: string;
  ownerId: string;
  ownerName: string;
  sharedWithGroups: string[];
  permissions: SharePermissions;
  sharedAt: string;
  lastUsed?: string;
  usageCount: number;
}

interface SharedKnowledgeBase {
  shareId: string;
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  knowledgeBaseDescription?: string;
  ownerId: string;
  ownerName: string;
  sharedWithGroups: string[];
  permissions: SharePermissions;
  sharedAt: string;
  lastUsed?: string;
  usageCount: number;
  fileCount: number;
}

interface SharePermissions {
  canView: boolean;
  canUse: boolean;
  canEdit: boolean;
  canReshare: boolean;
}

interface ShareAgentRequest {
  agentId: string;
  sharedWithGroups: string[];
  permissions: SharePermissions;
  message?: string; // Optional message to recipients
}

interface ShareKnowledgeBaseRequest {
  knowledgeBaseId: string;
  sharedWithGroups: string[];
  permissions: SharePermissions;
  message?: string;
}
```

### Discovery Filters
```typescript
interface DiscoveryFilters {
  search?: string;
  category?: string;
  groupId?: string;
  sortBy?: 'name' | 'usage' | 'recent';
  sortOrder?: 'asc' | 'desc';
}
```

## User Flow

### 1. Share Agent
1. User opens agent manager
2. Selects agent to share
3. Clicks "Share Agent" button
4. Selects groups to share with
5. Configures permissions:
   - View: Can see agent details
   - Use: Can use agent in conversations
   - Edit: Can modify agent (if owner allows)
   - Reshare: Can share with other groups
6. Adds optional message
7. Confirms sharing
8. Recipients get access immediately

### 2. Share Knowledge Base
1. User opens knowledge base manager
2. Selects knowledge base to share
3. Clicks "Share Knowledge Base" button
4. Selects groups to share with
5. Configures permissions
6. Confirms sharing
7. Knowledge base appears in recipients' lists

### 3. Use Shared Resources
1. User opens agent selector in chat
2. Sees both personal and shared agents
3. Shared agents marked with sharing icon
4. Selects shared agent for conversation
5. Agent works with shared knowledge bases
6. Usage tracked for analytics

### 4. Discover Resources
1. User browses shared resources section
2. Filters by category, group, or search
3. Previews resource details
4. Requests access if not already shared
5. Uses resource once access granted

## Features

### 1. Permission Management
```typescript
export const SHARE_PERMISSION_PRESETS = {
  readOnly: {
    canView: true,
    canUse: true,
    canEdit: false,
    canReshare: false
  },
  
  collaborative: {
    canView: true,
    canUse: true,
    canEdit: true,
    canReshare: false
  },
  
  fullAccess: {
    canView: true,
    canUse: true,
    canEdit: true,
    canReshare: true
  }
};

// Check if user has specific permission for shared resource
const hasSharePermission = (sharedResource: SharedAgent | SharedKnowledgeBase, permission: keyof SharePermissions): boolean => {
  return sharedResource.permissions[permission];
};
```

### 2. Usage Tracking
```typescript
// Track usage of shared resources
const trackResourceUsage = async (shareId: string, resourceType: 'agent' | 'knowledgeBase') => {
  try {
    await sharedResourcesService.trackUsage(shareId, resourceType);
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
};

// Get usage analytics
const getUsageAnalytics = async (resourceId: string) => {
  try {
    const response = await sharedResourcesService.getUsageAnalytics(resourceId);
    return response.data.analytics;
  } catch (error) {
    console.error('Failed to get analytics:', error);
    return null;
  }
};
```

### 3. Access Control
```typescript
// Check if user can access shared resource
const canAccessSharedResource = (sharedResource: SharedAgent | SharedKnowledgeBase, userGroups: string[]): boolean => {
  // Check if user is in any of the shared groups
  return sharedResource.sharedWithGroups.some(group => userGroups.includes(group));
};

// Filter resources by user access
const filterAccessibleResources = <T extends SharedAgent | SharedKnowledgeBase>(
  resources: T[],
  userGroups: string[]
): T[] => {
  return resources.filter(resource => canAccessSharedResource(resource, userGroups));
};
```

### 4. Notification System
```typescript
// Notify users when resources are shared with them
const notifyResourceShared = async (shareData: ShareAgentRequest | ShareKnowledgeBaseRequest) => {
  try {
    await sharedResourcesService.sendShareNotification({
      recipientGroups: shareData.sharedWithGroups,
      resourceType: 'agentId' in shareData ? 'agent' : 'knowledgeBase',
      resourceName: shareData.message || 'A resource has been shared with you',
      sharedBy: getCurrentUser().username
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};
```

## Integration with Other Modules

### 1. Agent Integration
```typescript
// Enhanced agent selector with shared agents
const AgentSelectorWithShared = () => {
  const { agents } = useAgents();
  const { sharedAgents } = useSharedResources();
  
  const allAgents = [
    ...agents.map(agent => ({ ...agent, isShared: false })),
    ...sharedAgents.map(shared => ({ 
      ...shared, 
      isShared: true,
      canEdit: shared.permissions.canEdit 
    }))
  ];

  return (
    <Select>
      <SelectGroup label="Personal Agents">
        {agents.map(agent => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.name}
          </SelectItem>
        ))}
      </SelectGroup>
      
      <SelectGroup label="Shared Agents">
        {sharedAgents.map(shared => (
          <SelectItem key={shared.shareId} value={shared.agentId}>
            <div className="flex items-center gap-2">
              <ShareIcon className="w-4 h-4" />
              {shared.agentName}
              <span className="text-xs text-gray-500">by {shared.ownerName}</span>
            </div>
          </SelectItem>
        ))}
      </SelectGroup>
    </Select>
  );
};
```

### 2. Knowledge Base Integration
```typescript
// Enhanced knowledge base manager with shared KBs
const KnowledgeBaseManagerWithShared = () => {
  const { knowledgeBases } = useKnowledgeBase();
  const { sharedKnowledgeBases } = useSharedResources();

  const allKnowledgeBases = [
    ...knowledgeBases.map(kb => ({ ...kb, isShared: false })),
    ...sharedKnowledgeBases.map(shared => ({ 
      ...shared, 
      isShared: true,
      canEdit: shared.permissions.canEdit 
    }))
  ];

  return (
    <div className="space-y-4">
      <section>
        <h3>Personal Knowledge Bases</h3>
        {knowledgeBases.map(kb => (
          <KnowledgeBaseCard key={kb.id} knowledgeBase={kb} />
        ))}
      </section>
      
      <section>
        <h3>Shared Knowledge Bases</h3>
        {sharedKnowledgeBases.map(shared => (
          <SharedKnowledgeBaseCard key={shared.shareId} sharedKB={shared} />
        ))}
      </section>
    </div>
  );
};
```

## Security and Validation

### Share Validation
```typescript
const validateShareRequest = (shareData: ShareAgentRequest | ShareKnowledgeBaseRequest): string[] => {
  const errors: string[] = [];
  
  if (!shareData.sharedWithGroups || shareData.sharedWithGroups.length === 0) {
    errors.push('At least one group must be selected for sharing');
  }
  
  if (!shareData.permissions.canView) {
    errors.push('View permission is required for sharing');
  }
  
  // Validate group existence
  shareData.sharedWithGroups.forEach(groupId => {
    if (!isValidGroup(groupId)) {
      errors.push(`Invalid group: ${groupId}`);
    }
  });
  
  return errors;
};
```

### Access Control
```typescript
// Ensure user owns resource before sharing
const validateOwnership = async (resourceId: string, resourceType: 'agent' | 'knowledgeBase'): Promise<boolean> => {
  try {
    if (resourceType === 'agent') {
      const agent = await agentManagementService.getAgent(resourceId);
      return agent.success && agent.data.agent.isOwner;
    } else {
      const kb = await knowledgeBaseService.getKnowledgeBase(resourceId);
      return kb.success && kb.data.knowledgeBase.isOwner;
    }
  } catch (error) {
    console.error('Error validating ownership:', error);
    return false;
  }
};
```

## Error Handling

### Common Errors
- `ResourceNotFound`: Invalid agent or knowledge base ID
- `InsufficientPermissions`: User doesn't own resource
- `InvalidGroups`: Non-existent groups specified
- `AlreadyShared`: Resource already shared with group
- `ShareLimitExceeded`: Too many shares for resource

### Error Recovery
```typescript
const handleShareError = (error: any, resourceType: string) => {
  if (error.code === 'ResourceNotFound') {
    return `${resourceType} not found or no longer exists`;
  } else if (error.code === 'InsufficientPermissions') {
    return `You don't have permission to share this ${resourceType}`;
  } else if (error.code === 'InvalidGroups') {
    return 'One or more selected groups are invalid';
  } else if (error.code === 'AlreadyShared') {
    return `${resourceType} is already shared with one or more selected groups`;
  } else {
    return `Failed to share ${resourceType}. Please try again.`;
  }
};
```

## Usage Examples

### Share Agent
```typescript
const { shareAgent } = useSharedResources();

const handleShareAgent = async (agentId: string) => {
  try {
    await shareAgent(agentId, ['research-team', 'developers'], {
      canView: true,
      canUse: true,
      canEdit: false,
      canReshare: false
    });
    
    console.log('Agent shared successfully');
  } catch (error) {
    console.error('Failed to share agent:', error);
  }
};
```

### Use Shared Resource
```typescript
const { sharedAgents } = useSharedResources();

const useSharedAgent = (shareId: string) => {
  const sharedAgent = sharedAgents.find(agent => agent.shareId === shareId);
  
  if (sharedAgent && sharedAgent.permissions.canUse) {
    // Track usage
    trackResourceUsage(shareId, 'agent');
    
    // Use the agent
    return sharedAgent.agentId;
  }
  
  throw new Error('Cannot use this shared agent');
};
```

### Discover Resources
```typescript
const discoverResources = async () => {
  try {
    const [agents, knowledgeBases] = await Promise.all([
      sharedResourcesService.discoverSharedAgents({ search: 'research' }),
      sharedResourcesService.discoverSharedKnowledgeBases({ category: 'documentation' })
    ]);
    
    return {
      agents: agents.success ? agents.data.agents : [],
      knowledgeBases: knowledgeBases.success ? knowledgeBases.data.knowledgeBases : []
    };
  } catch (error) {
    console.error('Discovery failed:', error);
    return { agents: [], knowledgeBases: [] };
  }
};
```