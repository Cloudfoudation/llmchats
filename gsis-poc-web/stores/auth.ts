// Auth Store - Pinia State Management
import { defineStore } from 'pinia'
import { CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider'

interface User {
  sub: string
  email: string
  username: string
  groups: string[]
  accessToken: string
  idToken?: string
  refreshToken?: string
}

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  
  // State
  const user = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const isInitialized = ref(false)

  // Initialize Cognito client
  const cognitoClient = new CognitoIdentityProviderClient({
    region: config.public.region
  })

  // Actions
  const login = async (email: string, password: string) => {
    console.log('🔐 Auth Store: Starting login')
    isLoading.value = true
    
    try {
      const authCommand = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: config.public.userPoolClientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      })

      const authResponse = await cognitoClient.send(authCommand)
      
      if (!authResponse.AuthenticationResult?.AccessToken) {
        throw new Error('Authentication failed - no access token received')
      }
      
      const accessToken = authResponse.AuthenticationResult.AccessToken
      const idToken = authResponse.AuthenticationResult.IdToken
      const refreshToken = authResponse.AuthenticationResult.RefreshToken
      
      // Get user details
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken
      })
      
      const userResponse = await cognitoClient.send(getUserCommand)
      
      // Extract user attributes
      const attributes = userResponse.UserAttributes || []
      const userEmail = attributes.find(attr => attr.Name === 'email')?.Value || email
      const subAttribute = attributes.find(attr => attr.Name === 'sub')?.Value
      const groups = attributes.find(attr => attr.Name === 'custom:groups')?.Value?.split(',') || ['free']
      
      const cognitoUser: User = {
        sub: subAttribute || userResponse.Username!,
        email: userEmail,
        username: userResponse.Username || email.split('@')[0],
        groups,
        accessToken,
        idToken,
        refreshToken
      }
      
      console.log('✅ Auth Store: User created:', cognitoUser)
      
      // Store user info and tokens
      localStorage.setItem('auth_user', JSON.stringify(cognitoUser))
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('id_token', idToken || '')
      localStorage.setItem('refresh_token', refreshToken || '')
      
      // Update store state
      user.value = cognitoUser
      isAuthenticated.value = true
      
      return cognitoUser
    } catch (error) {
      console.error('❌ Auth Store: Login error:', error)
      let errorMessage = 'Login failed. Please try again.'
      
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Invalid email or password.'
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please verify your email address first.'
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'User not found. Please check your email address.'
      }
      
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  const getCurrentUser = async () => {
    try {
      const storedUser = localStorage.getItem('auth_user')
      const accessToken = localStorage.getItem('access_token')
      
      if (!storedUser || !accessToken) {
        throw new Error('No user or token found')
      }
      
      // Validate token by getting user info from Cognito
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken
      })
      
      const userResponse = await cognitoClient.send(getUserCommand)
      
      // Parse stored user and ensure sub is present
      const parsedUser = JSON.parse(storedUser)
      
      // If sub is missing, get it from Cognito response
      if (!parsedUser.sub && userResponse.UserAttributes) {
        const subAttribute = userResponse.UserAttributes.find(attr => attr.Name === 'sub')?.Value
        parsedUser.sub = subAttribute || userResponse.Username
      }
      
      console.log('✅ Auth Store: User restored:', parsedUser)
      
      // Update store state
      user.value = parsedUser
      isAuthenticated.value = true
      return parsedUser
    } catch (error) {
      console.error('❌ Auth Store: Get user error:', error)
      logout()
      throw error
    }
  }

  const logout = () => {
    console.log('🚪 Auth Store: Logging out')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('id_token')
    localStorage.removeItem('refresh_token')
    
    user.value = null
    isAuthenticated.value = false
    
    navigateTo('/login')
  }

  const checkAuth = async () => {
    if (process.client) {
      try {
        const storedUser = localStorage.getItem('auth_user')
        const accessToken = localStorage.getItem('access_token')
        
        console.log('🔍 Auth Store: Checking auth - stored user:', !!storedUser, 'token:', !!accessToken)
        
        if (storedUser && accessToken) {
          // Try to restore user without API call first
          const parsedUser = JSON.parse(storedUser)
          user.value = parsedUser
          isAuthenticated.value = true
          console.log('✅ Auth Store: User restored from localStorage:', parsedUser.email)
          
          // Validate token in background
          try {
            await getCurrentUser()
          } catch (error) {
            console.warn('Token validation failed, but keeping user logged in for now')
          }
        } else {
          console.log('🔍 Auth Store: No stored auth found')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        logout()
      } finally {
        isInitialized.value = true
      }
    } else {
      isInitialized.value = true
    }
  }

  // Getters
  const isAdmin = computed(() => {
    return user.value?.email === 'admin@gsis.com' || user.value?.groups?.includes('admin')
  })

  // Auto-initialize auth on store creation
  if (process.client && !isInitialized.value) {
    checkAuth()
  }

  return {
    // State
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),
    
    // Getters
    isAdmin,
    
    // Actions
    login,
    logout,
    getCurrentUser,
    checkAuth
  }
})