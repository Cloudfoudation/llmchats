// RBAC Composable - Dependency Inversion Principle
// Provides reactive RBAC state and methods

import type { 
  IRBACService, 
  IPermissionService, 
  Role, 
  CreateRoleRequest, 
  UserDashboard,
  AssignAgentRequest,
  AssignRoleRequest
} from '~/types'
import { createRBACService } from '~/services/rbacService'
import { createPermissionService } from '~/services/permissionService'
import { useSharedAuth, useSharedRBAC } from './useGlobalState'

export const useRBAC = () => {
  const config = useRuntimeConfig()
  
  // Use shared global state
  const { user, isAuthenticated } = useSharedAuth()
  const { roles, userDashboard, isLoading, error } = useSharedRBAC()
  
  console.log('🔍 RBAC - Shared user state:', user.value)

  // Service instances (Dependency Injection)
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const rbacService: IRBACService = createRBACService(
    config.public.rbacApiUrl,
    getAuthHeaders
  )

  const permissionService: IPermissionService = createPermissionService()

  // Methods
  const fetchRoles = async () => {
    try {
      isLoading.value = true
      error.value = null
      roles.value = await rbacService.getRoles()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch roles'
      console.error('Error fetching roles:', err)
    } finally {
      isLoading.value = false
    }
  }

  const createRole = async (roleData: CreateRoleRequest) => {
    try {
      isLoading.value = true
      error.value = null
      const newRole = await rbacService.createRole(roleData)
      roles.value.push(newRole)
      return newRole
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create role'
      console.error('Error creating role:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const assignAgentToRole = async (roleId: string, agentId: string) => {
    try {
      isLoading.value = true
      error.value = null
      await rbacService.assignAgentToRole(roleId, { agentId })
      
      // Update local state
      const roleIndex = roles.value.findIndex(r => r.roleId === roleId)
      if (roleIndex !== -1) {
        roles.value[roleIndex].assignedAgentCount = (roles.value[roleIndex].assignedAgentCount || 0) + 1
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to assign agent to role'
      console.error('Error assigning agent to role:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchUserDashboard = async (userId: string) => {
    try {
      console.log('🔍 RBAC - Starting fetchUserDashboard for:', userId)
      isLoading.value = true
      error.value = null
      
      console.log('🔍 RBAC - API URL:', config.public.rbacApiUrl)
      console.log('🔍 RBAC - Auth headers:', getAuthHeaders())
      
      userDashboard.value = await rbacService.getUserDashboard(userId)
      console.log('✅ RBAC - Dashboard fetched successfully:', userDashboard.value)
      return userDashboard.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch user dashboard'
      console.error('❌ RBAC - Error fetching user dashboard:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const assignRoleToUser = async (userId: string, roleId: string) => {
    try {
      isLoading.value = true
      error.value = null
      await rbacService.assignRoleToUser(userId, { roleId })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to assign role to user'
      console.error('Error assigning role to user:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Permission checking methods
  const hasPermission = (requiredPermission: string): boolean => {
    // Temporary fallback: if user email is admin@gsis.com, grant all permissions
    if (user.value?.email === 'admin@gsis.com') {
      console.log('🔍 RBAC - Admin fallback: granting permission', requiredPermission)
      return true
    }
    
    if (!userDashboard.value?.permissions) return false
    return permissionService.hasPermission(userDashboard.value.permissions, requiredPermission)
  }

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (!userDashboard.value?.permissions) return false
    return permissionService.hasAnyPermission(userDashboard.value.permissions, requiredPermissions)
  }

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (!userDashboard.value?.permissions) return false
    return permissionService.hasAllPermissions(userDashboard.value.permissions, requiredPermissions)
  }

  // Computed properties
  const userPermissions = computed(() => {
    // Temporary fallback for admin user
    if (user.value?.email === 'admin@gsis.com') {
      return ['USER_MANAGEMENT:*', 'AGENT_MANAGEMENT:*', 'KNOWLEDGE_BASE:*']
    }
    return userDashboard.value?.permissions || []
  })
  const availableAgents = computed(() => userDashboard.value?.availableAgents || [])
  const userRoles = computed(() => userDashboard.value?.user?.roles || [])

  // Permission helpers
  const canManageUsers = computed(() => hasPermission('USER_MANAGEMENT:create'))
  const canManageRoles = computed(() => hasPermission('USER_MANAGEMENT:update'))
  const canManageAgents = computed(() => hasPermission('AGENT_MANAGEMENT:create'))
  const canViewUsers = computed(() => hasPermission('USER_MANAGEMENT:read'))

  // Initialize user dashboard if user is available
  watch([user, isAuthenticated], async ([newUser, authenticated]) => {
    console.log('🔍 RBAC Watch - User changed:', newUser, 'Authenticated:', authenticated)
    if (authenticated && newUser?.sub) {
      try {
        console.log('🔍 RBAC - Fetching dashboard for user:', newUser.sub)
        await fetchUserDashboard(newUser.sub)
        console.log('🔍 RBAC - Dashboard fetched:', userDashboard.value)
      } catch (err) {
        console.error('❌ RBAC - Failed to initialize user dashboard:', err)
      }
    } else {
      console.log('🔍 RBAC - No user.sub found or not authenticated, user:', newUser, 'auth:', authenticated)
    }
  }, { immediate: true })

  // Clear state on logout
  const clearState = () => {
    roles.value = []
    userDashboard.value = null
    error.value = null
  }

  return {
    // State
    roles: readonly(roles),
    userDashboard: readonly(userDashboard),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    userPermissions,
    availableAgents,
    userRoles,
    canManageUsers,
    canManageRoles,
    canManageAgents,
    canViewUsers,

    // Methods
    fetchRoles,
    createRole,
    assignAgentToRole,
    fetchUserDashboard,
    assignRoleToUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    clearState,

    // Permission service methods
    getAllPermissions: permissionService.getAllPermissions,
    getPermissionsByCategory: permissionService.getPermissionsByCategory,
    getPermissionDescription: permissionService.getPermissionDescription
  }
}