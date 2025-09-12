// src/services/bedrock.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';

interface BedrockRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
}

interface BedrockResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

class BedrockService {
  private baseUrl: string;
  private user: AuthUser | null;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BEDROCK_SERVICE_URL || '';
    this.user = null;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      validateStatus: (status) => status < 500
    });
  }

  setUser(user: AuthUser | null) {
    this.user = user;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No valid token found');
      }

      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      throw new Error('Failed to get authentication token');
    }
  }

  async chat(request: BedrockRequest): Promise<BedrockResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await this.axiosInstance.post<BedrockResponse>(
        '/chat',
        request,
        { headers }
      );

      if (response.status >= 400) {
        throw new Error('Failed to get chat response');
      }

      return response.data;
    } catch (error) {
      console.error('Bedrock service error:', error);
      throw error;
    }
  }
}

export const bedrockService = new BedrockService();