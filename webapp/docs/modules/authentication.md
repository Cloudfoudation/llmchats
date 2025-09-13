# Authentication Module

## Purpose
Handles user authentication, authorization, and session management using AWS Cognito with Google OAuth integration.

## API Integration

### AWS Cognito Services
- **User Pool**: `us-east-1_f8w4Bbn1W`
- **Identity Pool**: `us-east-1:1515bfa1-27a6-486b-b6f1-4821c2c58631`
- **Domain**: `gsis-poc.auth.us-east-1.amazoncognito.com`

### OAuth Flow
```typescript
// Redirect URLs
SIGNIN: https://d1a9b1vuy7kvzf.cloudfront.net/auth/callback
SIGNOUT: https://d1a9b1vuy7kvzf.cloudfront.net/auth/logout
```

## Key Components

### 1. AuthProvider (`src/providers/AuthProvider.tsx`)
```typescript
// Manages authentication state
- User session management
- Token refresh handling
- Authentication status
```

### 2. Login Component (`src/components/auth/Login.tsx`)
```typescript
// Google OAuth login
- Redirects to Cognito hosted UI
- Handles OAuth callback
- Error handling
```

### 3. Signup Component (`src/components/auth/Signup.tsx`)
```typescript
// User registration
- Email verification
- Password requirements
- Account activation
```

## Implementation

### Authentication Hook (`src/hooks/useAuth.ts`)
```typescript
export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Login with Google OAuth
  const loginWithGoogle = async () => {
    await signInWithRedirect({ provider: 'Google' });
  };

  // Get current session
  const getCurrentUser = async () => {
    const user = await getCurrentUser();
    setUser(user);
  };

  // Logout
  const logout = async () => {
    await signOut();
    setUser(null);
  };
};
```

### Token Management
```typescript
// Get authentication headers for API calls
const getHeaders = async () => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};
```

## User Flow

### 1. Login Process
1. User clicks "Sign in with Google"
2. Redirects to Cognito hosted UI
3. Google OAuth authentication
4. Callback to `/auth/callback`
5. Token exchange and session creation
6. Redirect to main application

### 2. Session Management
- ID Token: 1 hour expiry
- Refresh Token: 30 days expiry
- Automatic token refresh
- Session persistence in localStorage

### 3. Authorization Levels
```typescript
// User groups from Cognito
- admin: Full system access
- paid: Premium features
- free: Basic features
```

## Security Features

### 1. Token Validation
- JWT signature verification
- Token expiry checking
- Automatic refresh handling

### 2. Route Protection
```typescript
// Middleware protection
export default withAuth(Component);

// Route-level protection
middleware: ['auth.ts']
```

### 3. API Security
- Bearer token authentication
- Request signing with AWS credentials
- CORS protection

## Configuration

### Environment Variables
```bash
NEXT_PUBLIC_USER_POOL_ID=us-east-1_f8w4Bbn1W
NEXT_PUBLIC_USER_POOL_CLIENT_ID=3sp01a7qfqvhc4dagt1483ur76
NEXT_PUBLIC_IDENTITY_POOL_ID=us-east-1:1515bfa1-27a6-486b-b6f1-4821c2c58631
NEXT_PUBLIC_COGNITO_DOMAIN=gsis-poc.auth.us-east-1.amazoncognito.com
```

### Amplify Configuration (`src/utils/amplify-config.ts`)
```typescript
export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
      identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN!],
          redirectSignOut: [process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT!],
          responseType: 'code'
        }
      }
    }
  }
};
```

## Error Handling

### Common Errors
- `NotAuthorizedException`: Invalid credentials
- `UserNotConfirmedException`: Email not verified
- `TokenExpiredException`: Session expired
- `NetworkError`: Connection issues

### Error Recovery
```typescript
// Automatic retry logic
const retryWithAuth = async (apiCall: () => Promise<any>) => {
  try {
    return await apiCall();
  } catch (error) {
    if (error.code === 'TokenExpired') {
      await refreshSession();
      return await apiCall();
    }
    throw error;
  }
};
```

## Usage Examples

### Protected Component
```typescript
import { withAuth } from '@/hocs/withAuth';

const ProtectedComponent = () => {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <p>Welcome, {user?.username}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default withAuth(ProtectedComponent);
```

### API Call with Auth
```typescript
const apiCall = async () => {
  const headers = await getHeaders();
  const response = await fetch('/api/data', { headers });
  return response.json();
};
```