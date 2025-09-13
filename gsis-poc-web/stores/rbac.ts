// RBAC Store - Pinia State Management
import { defineStore } from 'pinia'
import type { 
  Role, 
  CreateRoleRequest, 
  UserDashboard,
  AssignAgentRequest,
  AssignRoleRequest
} from '~/types'
import { createRBACService } from '~/services/rbacService'
import { createPermissionService } from '~/services/permissionService'

export const useRBACStore = defineStore('rbac', () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  // State
  const roles = ref<Role[]>([])
  const userDashboard = ref<UserDashboard | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Service instances
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const rbacService = createRBACService(
    config.public.rbacApiUrl,
    getAuthHeaders
  )

  const permissionService = createPermissionService()

  // Actions
  const fetchRoles = async () => {
    try {
      isLoading.value = true
      error.value = null
      roles.value = await rbacService.getRoles()
      console.log('✅ RBAC Store: Roles fetched:', roles.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch roles'
      console.error('❌ RBAC Store: Error fetching roles:', err)
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
      console.log('✅ RBAC Store: Role created:', newRole)
      return newRole
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create role'
      console.error('❌ RBAC Store: Error creating role:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchUserDashboard = async (userId: string) => {
    try {
      console.log('🔍 RBAC Store: Fetching dashboard for user:', userId)
      isLoading.value = true
      error.value = null
      
      userDashboard.value = await rbacService.getUserDashboard(userId)
      console.log('✅ RBAC Store: Dashboard fetched:', userDashboard.value)
      return userDashboard.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch user dashboard'
      console.error('❌ RBAC Store: Error fetching dashboard:', err)
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
      console.log('✅ RBAC Store: Agent assigned to role')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to assign agent to role'
      console.error('❌ RBAC Store: Error assigning agent:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Getters
  const userPermissions = computed(() => {
    // Temporary fallback for admin user
    if (authStore.user?.email === 'admin@gsis.com') {
      return ['USER_MANAGEMENT:*', 'AGENT_MANAGEMENT:*', 'KNOWLEDGE_BASE:*']
    }
    return userDashboard.value?.permissions || []
  })

  const availableAgents = computed(() => userDashboard.value?.availableAgents || [])
  
  const userRoles = computed(() => userDashboard.value?.user?.roles || [])

  const canManageRoles = computed(() => {
    // Temporary fallback for admin user
    if (authStore.user?.email === 'admin@gsis.com') {
      console.log('🔍 RBAC Store: Admin fallback - can manage roles')
      return true
    }
    return hasPermission('USER_MANAGEMENT:create')
  })

  const canManageUsers = computed(() => hasPermission('USER_MANAGEMENT:create'))
  const canManageAgents = computed(() => hasPermission('AGENT_MANAGEMENT:create'))
  const canViewUsers = computed(() => hasPermission('USER_MANAGEMENT:read'))

  // Permission checking methods
  const hasPermission = (requiredPermission: string): boolean => {
    // Temporary fallback for admin user
    if (authStore.user?.email === 'admin@gsis.com') {
      return true
    }
    
    if (!userDashboard.value?.permissions) return false
    return permissionService.hasPermission(userDashboard.value.permissions, requiredPermission)
  }

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (authStore.user?.email === 'admin@gsis.com') return true
    if (!userDashboard.value?.permissions) return false
    return permissionService.hasAnyPermission(userDashboard.value.permissions, requiredPermissions)
  }

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (authStore.user?.email === 'admin@gsis.com') return true
    if (!userDashboard.value?.permissions) return false
    return permissionService.hasAllPermissions(userDashboard.value.permissions, requiredPermissions)
  }

  // Initialize dashboard when user changes
  watch(() => authStore.user, async (newUser) => {
    console.log('🔍 RBAC Store: User changed:', newUser)
    if (newUser?.sub && authStore.isAuthenticated) {
      try {
        await fetchUserDashboard(newUser.sub)
      } catch (err) {
        console.error('Failed to initialize user dashboard:', err)
      }
    }
  }, { immediate: true })

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

    // Getters
    userPermissions,
    availableAgents,
    userRoles,
    canManageRoles,
    canManageUsers,
    canManageAgents,
    canViewUsers,

    // Actions
    fetchRoles,
    createRole,
    fetchUserDashboard,
    assignAgentToRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    clearState,

    // Permission service methods
    getAllPermissions: permissionService.getAllPermissions,
    getPermissionsByCategory: permissionService.getPermissionsByCategory,
    getPermissionDescription: permissionService.getPermissionDescription
  }
})