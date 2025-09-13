// Admin Middleware - Single Responsibility Principle
// Ensures only users with admin permissions can access admin pages

export default defineNuxtRouteMiddleware((to, from) => {
  // Skip on server-side rendering
  if (process.server) return

  const authStore = useAuthStore()
  const rbacStore = useRBACStore()

  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  // Check if user has admin permissions
  const hasAdminPermissions = authStore.isAdmin || rbacStore.canManageRoles

  if (!hasAdminPermissions) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Admin permissions required.'
    })
  }
})