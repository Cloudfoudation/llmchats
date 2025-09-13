export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auth check on server side
  if (process.server) {
    return
  }
  
  const authStore = useAuthStore()
  
  // Wait for auth initialization
  if (!authStore.isInitialized) {
    await authStore.checkAuth()
  }
  
  // If not authenticated and not going to login page, redirect to login
  if (!authStore.isAuthenticated && to.path !== '/login') {
    return navigateTo('/login')
  }
  
  // If authenticated and going to login page, redirect to home
  if (authStore.isAuthenticated && to.path === '/login') {
    return navigateTo('/')
  }
})