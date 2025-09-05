// src/types/auth.ts
import { z } from 'zod';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime';

export const authSchema = {
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  email: z
    .string()
    .email('Invalid email address')
};

export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  userAttributes: UserAttributes | null;
  identityId: string | null;
  bedrockClient: BedrockRuntimeClient | null;
  availableModels: any[];
  bedrockAgents: any[];
  isLoading: boolean;
  isLoginLoading: boolean;
  isSwitchRegionLoading: boolean;
  bedrockAgentRuntimeClient: BedrockAgentRuntimeClient | null;
  bedrockAgentRuntimeClient_agents: BedrockAgentRuntimeClient | null;
  isForgotPasswordLoading: boolean;
  forgotPasswordSent: boolean;
}

export interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithCredentials: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (username: string) => Promise<void>;
  forgotPasswordSubmit: (username: string, code: string, newPassword: string) => Promise<void>;
}

export interface UserAttributes {
  email: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  'cognito:groups'?: string[];
}