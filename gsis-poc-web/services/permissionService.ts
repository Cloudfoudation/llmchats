// Permission Service - Single Responsibility Principle
// Handles permission checking and management logic

import type { IPermissionService } from '~/types'
import { PERMISSIONS } from '~/types'

export class PermissionService implements IPermissionService {
  
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Check for exact permission match
    if (userPermissions.includes(requiredPermission)) {
      return true
    }

    // Check for wildcard permissions
    const [category, action] = requiredPermission.split(':')
    const wildcardPermission = `${category}:*`
    
    if (userPermissions.includes(wildcardPermission)) {
      return true
    }

    // Check for super admin permission
    if (userPermissions.includes('*:*')) {
      return true
    }

    return false
  }

  getAllPermissions(): string[] {
    const allPermissions: string[] = []
    
    Object.values(PERMISSIONS).forEach(category => {
      Object.values(category).forEach(permission => {
        if (permission !== category.ALL) { // Exclude wildcard permissions from list
          allPermissions.push(permission)
        }
      })
    })

    return allPermissions
  }

  getPermissionsByCategory(): Record<string, string[]> {
    const categorized: Record<string, string[]> = {}

    Object.entries(PERMISSIONS).forEach(([categoryName, category]) => {
      const categoryPermissions = Object.values(category).filter(
        permission => permission !== category.ALL
      )
      categorized[categoryName] = categoryPermissions
    })

    return categorized
  }

  getWildcardPermissions(): string[] {
    return Object.values(PERMISSIONS).map(category => category.ALL)
  }

  // Helper method to check multiple permissions (OR logic)
  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => 
      this.hasPermission(userPermissions, permission)
    )
  }

  // Helper method to check multiple permissions (AND logic)
  hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => 
      this.hasPermission(userPermissions, permission)
    )
  }

  // Get human-readable permission description
  getPermissionDescription(permission: string): string {
    const descriptions: Record<string, string> = {
      'KNOWLEDGE_BASE:create': 'Create knowledge bases',
      'KNOWLEDGE_BASE:read': 'View knowledge bases',
      'KNOWLEDGE_BASE:update': 'Edit knowledge bases',
      'KNOWLEDGE_BASE:delete': 'Delete knowledge bases',
      'USER_MANAGEMENT:create': 'Create users',
      'USER_MANAGEMENT:read': 'View users',
      'USER_MANAGEMENT:update': 'Edit users',
      'USER_MANAGEMENT:delete': 'Delete users',
      'AGENT_MANAGEMENT:create': 'Create agents',
      'AGENT_MANAGEMENT:read': 'View agents',
      'AGENT_MANAGEMENT:update': 'Edit agents',
      'AGENT_MANAGEMENT:delete': 'Delete agents',
      'FILE_MANAGEMENT:upload': 'Upload files',
      'FILE_MANAGEMENT:download': 'Download files',
      'FILE_MANAGEMENT:delete': 'Delete files',
      'GROUP_MANAGEMENT:create': 'Create groups',
      'GROUP_MANAGEMENT:read': 'View groups',
      'GROUP_MANAGEMENT:update': 'Edit groups',
      'GROUP_MANAGEMENT:delete': 'Delete groups'
    }

    return descriptions[permission] || permission
  }
}

// Factory function for dependency injection
export const createPermissionService = (): IPermissionService => {
  return new PermissionService()
}