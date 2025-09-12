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