export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isAuthenticated, isInitialized, checkAuth } = useAuth()
  
  // Initialize auth if not done yet
  if (!isInitialized.value) {
    await checkAuth()
  }
  
  // If not authenticated and not going to login page, redirect to login
  if (!isAuthenticated.value && to.path !== '/login') {
    return navigateTo('/login')
  }
  
  // If authenticated and going to login page, redirect to home
  if (isAuthenticated.value && to.path === '/login') {
    return navigateTo('/')
  }
})