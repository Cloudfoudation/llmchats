// Auth initialization plugin - runs on client side only
export default defineNuxtPlugin(async () => {
  const { checkAuth, isInitialized } = useAuth()
  
  // Initialize auth if not already done
  if (!isInitialized.value) {
    console.log('🔐 Auth Plugin: Initializing auth...')
    await checkAuth()
  }
})