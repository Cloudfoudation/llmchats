// webapp/src/services/conversion.ts
import axios, { AxiosInstance } from 'axios';
import { AuthUser } from '@aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { ApiResponse } from '@/types/api';

import {
  DocumentConversionRequest,
  DocumentConversionResponse
} from '@/types/conversion';

class ConversionService {
  private baseUrl: string;
  private user: AuthUser | null;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_CONVERSION_API_URL || '';
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

  private handleApiError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data?.error;
      if (apiError) {
        throw new Error(`${apiError.code}: ${apiError.message}`);
      }
      throw new Error(`API error: ${error.response?.status} - ${error.message}`);
    }
    throw error;
  }

  async convertDocument(data: DocumentConversionRequest): Promise<ApiResponse<DocumentConversionResponse>> {
    try {
      const headers = await this.getHeaders();

      // For large files, we might need to increase the timeout
      const response = await this.axiosInstance.post<ApiResponse<DocumentConversionResponse>>(
        '/convert/document',
        data,
        {
          headers,
          timeout: 60000 // 60 seconds timeout for larger documents
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to convert document');
      }

      return response.data;
    } catch (error) {
      console.error('Document conversion error:', error);
      this.handleApiError(error);
      throw error;
    }
  }
}

// Create a singleton instance
export const conversionService = new ConversionService();