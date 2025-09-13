# Settings Module

## Purpose
User preferences, profile management, and API key configuration for external services integration.

## API Integration

### Profile API
- **Base URL**: `https://eznw72pbh3.execute-api.us-east-1.amazonaws.com/dev/`
- **Authentication**: Bearer token (Cognito ID token)

### API Endpoints
```typescript
GET    /profile                        // Get user profile
PUT    /profile                        // Update user profile
GET    /profile/api-keys               // List user's API keys
POST   /profile/api-keys               // Create new API key
PUT    /profile/api-keys/{keyId}       // Update API key
DELETE /profile/api-keys/{keyId}       // Delete API key
GET    /profile/preferences            // Get user preferences
PUT    /profile/preferences            // Update user preferences
```

## Key Components

### 1. Settings Layout (`src/components/settings/SettingsLayout.tsx`)
```typescript
// Main settings interface
- Navigation sidebar
- Profile settings
- API keys management
- External API keys
- Preferences configuration
```

### 2. Profile Page (`src/components/settings/ProfilePage.tsx`)
```typescript
// User profile management
- Personal information
- Contact details
- Account settings
- Password change
```

### 3. API Keys Page (`src/components/settings/ApiKeysPage.tsx`)
```typescript
// Internal API key management
- Generate new API keys
- View existing keys
- Revoke keys
- Usage statistics
```

### 4. External API Keys Page (`src/components/settings/ExternalApiKeysPage.tsx`)
```typescript
// External service integration
- OpenAI API key
- Anthropic API key
- Other service keys
- Key validation
```

## Implementation

### Settings Hook (`src/hooks/useSettings.ts`)
```typescript
export const useSettings = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user profile
  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await profileService.getProfile();
      if (response.success) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      const response = await profileService.updateProfile(profileData);
      if (response.success) {
        setProfile(response.data.profile);
        return response.data.profile;
      }
      throw new Error(response.error?.message || 'Failed to update profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // Load user preferences
  const loadPreferences = async () => {
    try {
      const response = await profileService.getPreferences();
      if (response.success) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  // Update user preferences
  const updatePreferences = async (preferencesData: Partial<UserPreferences>) => {
    try {
      const response = await profileService.updatePreferences(preferencesData);
      if (response.success) {
        setPreferences(response.data.preferences);
        return response.data.preferences;
      }
      throw new Error(response.error?.message || 'Failed to update preferences');
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  // Load API keys
  const loadApiKeys = async () => {
    try {
      const response = await profileService.getApiKeys();
      if (response.success) {
        setApiKeys(response.data.apiKeys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  // Create new API key
  const createApiKey = async (keyData: CreateApiKeyRequest) => {
    try {
      const response = await profileService.createApiKey(keyData);
      if (response.success) {
        await loadApiKeys(); // Refresh list
        return response.data.apiKey;
      }
      throw new Error(response.error?.message || 'Failed to create API key');
    } catch (error) {
      console.error('Error creating API key:', error);
      throw error;
    }
  };

  // Delete API key
  const deleteApiKey = async (keyId: string) => {
    try {
      const response = await profileService.deleteApiKey(keyId);
      if (response.success) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete API key');
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  };

  return {
    profile,
    preferences,
    apiKeys,
    loading,
    loadProfile,
    updateProfile,
    loadPreferences,
    updatePreferences,
    loadApiKeys,
    createApiKey,
    deleteApiKey
  };
};
```

### Settings Provider (`src/providers/SettingsProvider.tsx`)
```typescript
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'en' | 'vi'>('en');
  const [modelDefaults, setModelDefaults] = useState<ModelDefaults>(DEFAULT_MODEL_CONFIG);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const savedLanguage = localStorage.getItem('language') as 'en' | 'vi' | null;
    const savedModelDefaults = localStorage.getItem('modelDefaults');

    if (savedTheme) setTheme(savedTheme);
    if (savedLanguage) setLanguage(savedLanguage);
    if (savedModelDefaults) {
      try {
        setModelDefaults(JSON.parse(savedModelDefaults));
      } catch (error) {
        console.error('Error parsing saved model defaults:', error);
      }
    }
  }, []);

  // Save settings to localStorage when changed
  const updateTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const updateLanguage = (newLanguage: 'en' | 'vi') => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const updateModelDefaults = (newDefaults: Partial<ModelDefaults>) => {
    const updated = { ...modelDefaults, ...newDefaults };
    setModelDefaults(updated);
    localStorage.setItem('modelDefaults', JSON.stringify(updated));
  };

  return (
    <SettingsContext.Provider value={{
      theme,
      language,
      modelDefaults,
      updateTheme,
      updateLanguage,
      updateModelDefaults
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
```

## Data Structures

### User Profile
```typescript
interface UserProfile {
  userId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  timezone?: string;
  locale?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'vi';
  notifications: {
    email: boolean;
    browser: boolean;
    shareNotifications: boolean;
    systemUpdates: boolean;
  };
  chat: {
    defaultModel?: string;
    streamingEnabled: boolean;
    showTimestamps: boolean;
    compactMode: boolean;
  };
  privacy: {
    shareUsageData: boolean;
    allowAnalytics: boolean;
  };
}
```

### API Keys
```typescript
interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string; // First 8 characters for identification
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  usageCount: number;
}

interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expiresIn?: number; // Days until expiration
}

interface ExternalApiKey {
  service: 'openai' | 'anthropic' | 'groq' | 'sambanova';
  keyId: string;
  isValid: boolean;
  lastValidated?: string;
  errorMessage?: string;
}
```

### Model Defaults
```typescript
interface ModelDefaults {
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
}
```

## User Flow

### 1. Access Settings
1. User clicks profile menu
2. Selects "Settings" option
3. Settings page loads with navigation
4. User can navigate between sections

### 2. Update Profile
1. Navigate to "Profile" section
2. Edit personal information
3. Upload avatar image (optional)
4. Save changes
5. Profile updates across application

### 3. Manage API Keys
1. Navigate to "API Keys" section
2. View existing keys with usage stats
3. Create new API key:
   - Enter descriptive name
   - Select permissions
   - Set expiration (optional)
4. Copy generated key (shown once)
5. Use key for API access

### 4. Configure External APIs
1. Navigate to "External APIs" section
2. Add API keys for external services
3. System validates keys automatically
4. Keys used for model access when available

### 5. Set Preferences
1. Navigate to "Preferences" section
2. Configure application settings:
   - Theme (light/dark/system)
   - Language preference
   - Notification settings
   - Chat preferences
   - Privacy settings
3. Changes apply immediately

## Features

### 1. Theme Management
```typescript
// Theme switching with system preference detection
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      if (theme === 'system') {
        document.documentElement.classList.toggle('dark', mediaQuery.matches);
      } else {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  return { theme, setTheme };
};
```

### 2. API Key Management
```typescript
// API key generation with secure storage
const generateApiKey = (): string => {
  const prefix = 'gsis_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return prefix + key;
};

// API key validation
const validateApiKey = async (keyId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/validate-key', {
      headers: { 'X-API-Key': keyId }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};
```

### 3. External API Integration
```typescript
// External API key validation
const validateExternalApiKey = async (service: string, apiKey: string): Promise<boolean> => {
  try {
    switch (service) {
      case 'openai':
        const openaiResponse = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return openaiResponse.ok;
        
      case 'anthropic':
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        return anthropicResponse.status !== 401;
        
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
};
```

### 4. Preferences Sync
```typescript
// Sync preferences across devices
const syncPreferences = async (preferences: UserPreferences) => {
  try {
    await profileService.updatePreferences(preferences);
    
    // Apply preferences locally
    if (preferences.theme !== 'system') {
      document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
    }
    
    // Update language
    if (preferences.language) {
      document.documentElement.lang = preferences.language;
    }
    
  } catch (error) {
    console.error('Failed to sync preferences:', error);
  }
};
```

## Security Features

### 1. API Key Security
```typescript
// Secure API key storage (never store full keys)
interface StoredApiKey {
  id: string;
  name: string;
  prefix: string; // Only first 8 characters
  hashedKey: string; // Hashed version for validation
  permissions: string[];
  createdAt: string;
  expiresAt?: string;
}

// API key hashing
const hashApiKey = async (key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
```

### 2. Permission Validation
```typescript
// API key permission checking
const hasPermission = (apiKey: ApiKey, requiredPermission: string): boolean => {
  return apiKey.permissions.includes(requiredPermission) || apiKey.permissions.includes('*');
};

// Available permissions
export const API_PERMISSIONS = {
  'chat:read': 'Read chat messages',
  'chat:write': 'Send chat messages',
  'agents:read': 'Read agents',
  'agents:write': 'Create and modify agents',
  'kb:read': 'Read knowledge bases',
  'kb:write': 'Create and modify knowledge bases',
  'admin:users': 'Manage users (admin only)',
  'admin:system': 'System administration (admin only)'
};
```

### 3. Data Encryption
```typescript
// Encrypt sensitive settings data
const encryptSensitiveData = async (data: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
};
```

## Error Handling

### Common Errors
- `ProfileNotFound`: User profile doesn't exist
- `InvalidApiKey`: API key format invalid
- `KeyExpired`: API key has expired
- `InsufficientPermissions`: API key lacks required permissions
- `ValidationFailed`: External API key validation failed

### Validation Rules
```typescript
const validateProfileUpdate = (profile: Partial<UserProfile>): string[] => {
  const errors: string[] = [];
  
  if (profile.email && !isValidEmail(profile.email)) {
    errors.push('Invalid email format');
  }
  
  if (profile.firstName && profile.firstName.length > 50) {
    errors.push('First name must be less than 50 characters');
  }
  
  if (profile.lastName && profile.lastName.length > 50) {
    errors.push('Last name must be less than 50 characters');
  }
  
  return errors;
};

const validateApiKeyCreation = (keyData: CreateApiKeyRequest): string[] => {
  const errors: string[] = [];
  
  if (!keyData.name || keyData.name.trim().length === 0) {
    errors.push('API key name is required');
  }
  
  if (keyData.name && keyData.name.length > 100) {
    errors.push('API key name must be less than 100 characters');
  }
  
  if (!keyData.permissions || keyData.permissions.length === 0) {
    errors.push('At least one permission must be selected');
  }
  
  return errors;
};
```

## Usage Examples

### Update Profile
```typescript
const { updateProfile } = useSettings();

const handleProfileUpdate = async (profileData: Partial<UserProfile>) => {
  try {
    await updateProfile({
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John D.',
      timezone: 'America/New_York'
    });
    
    console.log('Profile updated successfully');
  } catch (error) {
    console.error('Failed to update profile:', error);
  }
};
```

### Create API Key
```typescript
const { createApiKey } = useSettings();

const handleCreateApiKey = async () => {
  try {
    const apiKey = await createApiKey({
      name: 'Mobile App Access',
      permissions: ['chat:read', 'chat:write', 'agents:read'],
      expiresIn: 90 // 90 days
    });
    
    // Show the key to user (only time it's displayed)
    alert(`Your API key: ${apiKey.key}\nSave this key securely - it won't be shown again.`);
  } catch (error) {
    console.error('Failed to create API key:', error);
  }
};
```

### Update Preferences
```typescript
const { updatePreferences } = useSettings();

const handlePreferencesUpdate = async () => {
  try {
    await updatePreferences({
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        browser: false,
        shareNotifications: true,
        systemUpdates: false
      },
      chat: {
        streamingEnabled: true,
        showTimestamps: true,
        compactMode: false
      }
    });
    
    console.log('Preferences updated successfully');
  } catch (error) {
    console.error('Failed to update preferences:', error);
  }
};
```