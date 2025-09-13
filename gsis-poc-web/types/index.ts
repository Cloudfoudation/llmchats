// SOLID Principles: Interface Segregation - Clean, focused interfaces

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'paid' | 'free'
  groups: string[]
}

// Knowledge Base Types (aligned with original webapp)
export type ResourceVisibility = 'private' | 'public'

export interface KnowledgeBase {
  knowledgeBaseId: string
  name: string
  description: string
  status: 'CREATING' | 'ACTIVE' | 'DELETING' | 'FAILED'
  createdAt: string
  updatedAt: string
  folderId?: string
  tags?: Record<string, string>
  accessType: 'owner' | 'shared' | 'public'
  visibility?: ResourceVisibility
  isDuplicate: boolean
  permissions: KnowledgeBasePermissions
  groupId?: string
  sharedBy?: string
  sharedAt?: string
}

export interface KnowledgeBasePermissions {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSync: boolean
  canShare: boolean
}

export interface CreateKnowledgeBaseRequest {
  name: string
  description?: string
  tags?: Record<string, string>
  visibility?: ResourceVisibility
}

export interface IKnowledgeBaseService {
  getKnowledgeBases(): Promise<KnowledgeBase[]>
  createKnowledgeBase(kb: CreateKnowledgeBaseRequest): Promise<KnowledgeBase>
  deleteKnowledgeBase(id: string): Promise<void>
  uploadFile(knowledgeBaseId: string, file: File): Promise<void>
}

// RBAC Types - Following Interface Segregation Principle
export interface RBACUser {
  userId: string
  email: string
  username: string
  roles: string[]
  createdAt: string
}

export interface Role {
  roleId: string
  roleName: string
  description: string
  permissions: string[]
  assignedAgentCount?: number
  createdAt: string
  updatedAt: string
}

export interface RoleAgent {
  roleId: string
  agentId: string
  assignedAt: string
}

export interface UserDashboard {
  user: RBACUser
  permissions: string[]
  availableAgents: AgentAssignment[]
}

export interface AgentAssignment {
  agentId: string
  agentName?: string
  assignedViaRole: string
  roleName?: string
}

export interface CreateRoleRequest {
  roleName: string
  description: string
  permissions: string[]
}

export interface AssignAgentRequest {
  agentId: string
}

export interface AssignRoleRequest {
  roleId: string
}

// Permission constants - Single Responsibility Principle
export const PERMISSIONS = {
  KNOWLEDGE_BASE: {
    CREATE: 'KNOWLEDGE_BASE:create',
    READ: 'KNOWLEDGE_BASE:read',
    UPDATE: 'KNOWLEDGE_BASE:update',
    DELETE: 'KNOWLEDGE_BASE:delete',
    ALL: 'KNOWLEDGE_BASE:*'
  },
  USER_MANAGEMENT: {
    CREATE: 'USER_MANAGEMENT:create',
    READ: 'USER_MANAGEMENT:read',
    UPDATE: 'USER_MANAGEMENT:update',
    DELETE: 'USER_MANAGEMENT:delete',
    ALL: 'USER_MANAGEMENT:*'
  },
  AGENT_MANAGEMENT: {
    CREATE: 'AGENT_MANAGEMENT:create',
    READ: 'AGENT_MANAGEMENT:read',
    UPDATE: 'AGENT_MANAGEMENT:update',
    DELETE: 'AGENT_MANAGEMENT:delete',
    ALL: 'AGENT_MANAGEMENT:*'
  },
  FILE_MANAGEMENT: {
    UPLOAD: 'FILE_MANAGEMENT:upload',
    DOWNLOAD: 'FILE_MANAGEMENT:download',
    DELETE: 'FILE_MANAGEMENT:delete',
    ALL: 'FILE_MANAGEMENT:*'
  },
  GROUP_MANAGEMENT: {
    CREATE: 'GROUP_MANAGEMENT:create',
    READ: 'GROUP_MANAGEMENT:read',
    UPDATE: 'GROUP_MANAGEMENT:update',
    DELETE: 'GROUP_MANAGEMENT:delete',
    ALL: 'GROUP_MANAGEMENT:*'
  }
} as const

export interface KnowledgeBase {
  id: string
  name: string
  description: string
  fileCount: number
  lastUpdated: Date
}

export interface BedrockConfig {
  region: string
  userPoolId: string
  userPoolClientId: string
  identityPoolId: string
}

// Agent interface (aligned with original webapp)
export interface Agent {
  id: string
  version: number
  createdAt: number
  lastEditedAt: number
  name: string
  description: string
  systemPrompt: string
  knowledgeBaseId?: string
  type: AgentType
  visibility?: ResourceVisibility
  bedrockAgentId?: string
  bedrockAgentAliasId?: string
  isOwner?: boolean
  sharedBy?: string
  sharedVia?: string
  permissions?: string
  accessType?: 'owner' | 'shared' | 'public'
}

export interface CreateAgentRequest {
  name: string
  description: string
  model: string
  systemPrompt: string
  knowledgeBaseId?: string
  type?: AgentType
  visibility?: ResourceVisibility
}

// Service interfaces for dependency inversion
export interface IChatService {
  sendMessage(message: string): Promise<string>
}

export interface IAuthService {
  login(email: string, password: string): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}

export interface IKnowledgeBaseService {
  list(): Promise<KnowledgeBase[]>
  upload(files: File[]): Promise<void>
  search(query: string): Promise<string[]>
}

// RBAC Service Interfaces - Dependency Inversion Principle
export interface IRBACService {
  getRoles(): Promise<Role[]>
  createRole(role: CreateRoleRequest): Promise<Role>
  assignAgentToRole(roleId: string, request: AssignAgentRequest): Promise<void>
  getUserDashboard(userId: string): Promise<UserDashboard>
  assignRoleToUser(userId: string, request: AssignRoleRequest): Promise<void>
}

export interface IPermissionService {
  hasPermission(userPermissions: string[], requiredPermission: string): boolean
  getAllPermissions(): string[]
  getPermissionsByCategory(): Record<string, string[]>
}

export interface IAgentService {
  getAgents(): Promise<Agent[]>
  createAgent(agent: CreateAgentRequest): Promise<Agent>
  updateAgent(id: string, agent: Partial<CreateAgentRequest>): Promise<Agent>
  deleteAgent(id: string): Promise<void>
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}