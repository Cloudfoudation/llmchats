// Global State - Shared across all composables
// This ensures all composables use the same reactive state

// Global auth state
export const globalAuthState = {
  user: ref(null),
  isAuthenticated: ref(false),
  isLoading: ref(false),
  isInitialized: ref(false)
}

// Global RBAC state  
export const globalRBACState = {
  roles: ref([]),
  userDashboard: ref(null),
  isLoading: ref(false),
  error: ref(null)
}

// Helper to get shared auth state
export const useSharedAuth = () => {
  return globalAuthState
}

// Helper to get shared RBAC state
export const useSharedRBAC = () => {
  return globalRBACState
}