// RBAC Service - Single Responsibility Principle
// Handles all RBAC-related API calls

import type { 
  IRBACService, 
  Role, 
  CreateRoleRequest, 
  AssignAgentRequest, 
  UserDashboard, 
  AssignRoleRequest,
  ApiResponse 
} from '~/types'

export class RBACService implements IRBACService {
  private baseUrl: string
  private getAuthHeaders: () => Record<string, string>

  constructor(baseUrl: string, getAuthHeaders: () => Record<string, string>) {
    this.baseUrl = baseUrl
    this.getAuthHeaders = getAuthHeaders
  }

  async getRoles(): Promise<Role[]> {
    try {
      const url = `${this.baseUrl.replace(/\/$/, '')}/roles`
      const response = await $fetch<ApiResponse<{ roles: Role[] }>>(
        url,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch roles')
      }

      return response.data?.roles || []
    } catch (error) {
      console.error('Error fetching roles:', error)
      throw error
    }
  }

  async createRole(role: CreateRoleRequest): Promise<Role> {
    try {
      const response = await $fetch<ApiResponse<Role>>(
        `${this.baseUrl}/roles`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: role
        }
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to create role')
      }

      return response.data!
    } catch (error) {
      console.error('Error creating role:', error)
      throw error
    }
  }

  async assignAgentToRole(roleId: string, request: AssignAgentRequest): Promise<void> {
    try {
      const response = await $fetch<ApiResponse<void>>(
        `${this.baseUrl}/roles/${roleId}/agents`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: request
        }
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to assign agent to role')
      }
    } catch (error) {
      console.error('Error assigning agent to role:', error)
      throw error
    }
  }

  async getUserDashboard(userId: string): Promise<UserDashboard> {
    try {
      const url = `${this.baseUrl.replace(/\/$/, '')}/users/${userId}/dashboard`
      const headers = this.getAuthHeaders()
      
      console.log('🔍 RBAC Service - Fetching dashboard:')
      console.log('- URL:', url)
      console.log('- Headers:', headers)
      
      const response = await $fetch<ApiResponse<UserDashboard>>(url, {
        method: 'GET',
        headers
      })

      console.log('🔍 RBAC Service - API Response:', response)

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user dashboard')
      }

      return response.data!
    } catch (error) {
      console.error('❌ RBAC Service - Error fetching user dashboard:', error)
      throw error
    }
  }

  async assignRoleToUser(userId: string, request: AssignRoleRequest): Promise<void> {
    try {
      const response = await $fetch<ApiResponse<void>>(
        `${this.baseUrl}/users/${userId}/roles`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: request
        }
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to assign role to user')
      }
    } catch (error) {
      console.error('Error assigning role to user:', error)
      throw error
    }
  }
}

// Factory function for dependency injection
export const createRBACService = (baseUrl: string, getAuthHeaders: () => Record<string, string>): IRBACService => {
  return new RBACService(baseUrl, getAuthHeaders)
}