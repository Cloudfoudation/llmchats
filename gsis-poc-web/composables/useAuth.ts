import { CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider'
import { useSharedAuth } from './useGlobalState'

export const useAuth = () => {
  const config = useRuntimeConfig()
  
  // Use shared global state
  const { user, isAuthenticated, isLoading, isInitialized } = useSharedAuth()
  
  // Initialize Cognito client
  const cognitoClient = new CognitoIdentityProviderClient({
    region: config.public.region
  })

  // AWS Cognito login
  const login = async (email: string, password: string) => {
    console.log('Auth: Starting Cognito login process')
    isLoading.value = true
    
    try {
      // Initiate authentication with Cognito
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
      
      // Store tokens in localStorage for persistence
      if (process.client) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('idToken', idToken)
        localStorage.setItem('refreshToken', refreshToken)
      }
      
      // Get user details
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken
      })
      
      const userResponse = await cognitoClient.send(getUserCommand)
      
      // Extract user attributes
      const attributes = userResponse.UserAttributes || []
      const userEmail = attributes.find(attr => attr.Name === 'email')?.Value || email
      const groups = attributes.find(attr => attr.Name === 'custom:groups')?.Value?.split(',') || ['free']
      
      // Extract sub from UserAttributes
      const subAttribute = attributes.find(attr => attr.Name === 'sub')?.Value
      
      const cognitoUser = {
        sub: subAttribute || userResponse.Username, // Use sub from attributes
        email: userEmail,
        username: userResponse.Username || email.split('@')[0],
        groups,
        accessToken,
        idToken,
        refreshToken
      }
      
      console.log('🔍 Auth - Cognito user created:', cognitoUser)
      

      
      // Store user info and tokens
      localStorage.setItem('auth_user', JSON.stringify(cognitoUser))
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('id_token', idToken || '')
      localStorage.setItem('refresh_token', refreshToken || '')
      
      user.value = cognitoUser
      isAuthenticated.value = true
      
      return cognitoUser
    } catch (error) {
      console.error('Cognito login error:', error)
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

  // Get current user and validate token
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
      
      console.log('🔍 Auth - Restored user:', parsedUser)
      
      // Token is valid, restore user
      user.value = parsedUser
      isAuthenticated.value = true
      return user.value
    } catch (error) {
      console.error('Get user error:', error)
      // Token might be expired, try to refresh or logout
      logout()
      throw error
    }
  }

  // Logout
  const logout = () => {

    localStorage.removeItem('auth_user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('id_token')
    localStorage.removeItem('refresh_token')
    user.value = null
    isAuthenticated.value = false
    navigateTo('/login')
  }

  // Check if user is authenticated on app load
  const checkAuth = async () => {
    if (process.client) {
      try {
        const storedUser = localStorage.getItem('auth_user')
        if (storedUser) {
          await getCurrentUser()
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        logout()
      } finally {
        isInitialized.value = true
      }
    }
  }

  // Get auth headers for API calls
  const getAuthHeaders = (): Record<string, string> => {
    const accessToken = process.client ? localStorage.getItem('access_token') : null
    return accessToken ? {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    }
  }

  return {
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),
    login,
    logout,
    getCurrentUser,
    checkAuth,
    getAuthHeaders
  }
}