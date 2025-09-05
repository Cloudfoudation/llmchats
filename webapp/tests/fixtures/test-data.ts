export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || (() => {
      throw new Error('TEST_ADMIN_EMAIL environment variable is required for testing');
    })(),
    password: process.env.TEST_ADMIN_PASSWORD || (() => {
      throw new Error('TEST_ADMIN_PASSWORD environment variable is required for testing');
    })(),
    role: 'admin'
  },
  paid: {
    email: process.env.TEST_PAID_EMAIL || (() => {
      throw new Error('TEST_PAID_EMAIL environment variable is required for testing');
    })(),
    password: process.env.TEST_PAID_PASSWORD || (() => {
      throw new Error('TEST_PAID_PASSWORD environment variable is required for testing');
    })(),
    role: 'paid'
  },
  free: {
    email: process.env.TEST_FREE_EMAIL || (() => {
      throw new Error('TEST_FREE_EMAIL environment variable is required for testing');
    })(),
    password: process.env.TEST_FREE_PASSWORD || (() => {
      throw new Error('TEST_FREE_PASSWORD environment variable is required for testing');
    })(),
    role: 'free'
  }
};

export const TEST_KNOWLEDGE_BASES = {
  valid: {
    name: () => `TestKB_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    description: 'A test knowledge base for E2E testing',
    embeddingModel: 'amazon.titan-embed-text-v1'
  },
  invalid: {
    name: '', // Invalid - empty name
    description: 'Invalid KB with empty name'
  },
  longName: {
    name: 'A'.repeat(256), // Too long
    description: 'KB with very long name'
  }
};

export const TEST_AGENTS = {
  valid: {
    name: () => `TestAgent_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    description: 'A test agent for E2E testing',
    instructions: 'You are a helpful AI assistant for testing purposes.',
    model: 'anthropic.claude-3-sonnet-20240229-v1:0'
  },
  withKnowledgeBase: {
    name: () => `AgentKB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    description: 'Agent connected to knowledge base',
    instructions: 'Use the knowledge base to answer questions.',
    model: 'anthropic.claude-3-sonnet-20240229-v1:0'
  },
  invalid: {
    name: '', // Invalid - empty name
    description: 'Invalid agent'
  },
  longInstructions: {
    name: 'LongInstructionsAgent',
    description: 'Agent with very long instructions',
    instructions: 'A'.repeat(5000), // Very long instructions
    model: 'anthropic.claude-3-sonnet-20240229-v1:0'
  }
};

export const TEST_GROUPS = {
  valid: {
    name: 'TestGroup',
    description: 'A test group for E2E testing'
  },
  invalid: {
    name: '', // Invalid - empty name
    description: 'Invalid group with empty name'
  }
};

export const TEST_FILES = {
  pdf: {
    name: 'test-document.pdf',
    path: 'tests/fixtures/files/test-document.pdf',
    type: 'application/pdf'
  },
  txt: {
    name: 'test-document.txt',
    path: 'tests/fixtures/files/test-document.txt',
    type: 'text/plain'
  },
  image: {
    name: 'test-image.png',
    path: 'tests/fixtures/files/test-image.png',
    type: 'image/png'
  },
  large: {
    name: 'large-file.pdf',
    path: 'tests/fixtures/files/large-file.pdf',
    type: 'application/pdf'
  }
};

export const TEST_CONVERSATIONS = {
  simple: {
    message: 'Hello, how are you?',
    expectedResponse: 'Hello! I\'m doing well, thank you for asking.'
  },
  complex: {
    message: 'Can you explain quantum computing in simple terms?',
    expectedResponse: 'Quantum computing'
  },
  withAttachment: {
    message: 'Please analyze this document',
    file: TEST_FILES.pdf
  }
};

export const TEST_SHARING = {
  knowledgeBase: {
    permissions: ['canView', 'canEdit'],
    targetUser: TEST_USERS.free.email
  },
  agent: {
    permissions: ['canView'],
    targetUser: TEST_USERS.free.email
  }
};

export const API_ENDPOINTS = {
  knowledgeBase: '/api/knowledge-bases',
  agents: '/api/agents',
  groups: '/api/groups',
  users: '/api/users',
  sharedResources: '/api/shared-resources',
  conversations: '/api/conversations'
};

export const SELECTORS = {
  // Navigation
  nav: {
    knowledgeBase: '[data-testid="nav-knowledge-base"], a[href*="knowledge"]',
    agents: '[data-testid="nav-agents"], a[href*="agents"]',
    groups: '[data-testid="nav-groups"], a[href*="groups"]',
    settings: '[data-testid="nav-settings"], a[href*="settings"]',
    chat: '[data-testid="nav-chat"], a[href*="chat"]'
  },
  
  // Forms
  forms: {
    knowledgeBase: '[data-testid="kb-form"], form[data-form="knowledge-base"]',
    agent: '[data-testid="agent-form"], form[data-form="agent"]',
    group: '[data-testid="group-form"], form[data-form="group"]'
  },
  
  // Buttons
  buttons: {
    create: '[data-testid="create-button"], button:has-text("Create")',
    save: '[data-testid="save-button"], button:has-text("Save")',
    delete: '[data-testid="delete-button"], button:has-text("Delete")',
    edit: '[data-testid="edit-button"], button:has-text("Edit")',
    share: '[data-testid="share-button"], button:has-text("Share")',
    upload: '[data-testid="upload-button"], button:has-text("Upload")'
  },
  
  // Lists
  lists: {
    knowledgeBases: '[data-testid="kb-list"], .knowledge-base-list',
    agents: '[data-testid="agent-list"], .agent-list',
    groups: '[data-testid="group-list"], .group-list',
    files: '[data-testid="file-list"], .file-list'
  },
  
  // Modals
  modals: {
    confirm: '[data-testid="confirm-modal"], .confirm-dialog',
    share: '[data-testid="share-modal"], .share-dialog',
    upload: '[data-testid="upload-modal"], .upload-dialog'
  },
  
  // Chat
  chat: {
    input: 'textarea',
    send: 'button:has-text("Send"), button:has-text("Generate")',
    messages: '[data-testid="chat-messages"], .chat-messages',
    message: '.message',
    messageAssistant: '.message-assistant',
    messageUser: '.message-user',
    modelSelector: 'button[title="Select Model"]'
  }
};

export const TIMEOUTS = {
  short: 5000,
  medium: 10000,
  long: 30000,
  upload: 60000,
  api: 15000,
  aiResponse: 15000 // Dedicated timeout for AI responses
};

export const TEST_MODELS = [
  {
    name: "Claude 3.5 Haiku",
    selectors: [
      'button:has-text("Claude 3.5 Haiku")',
      'button:has-text("Haiku")',
      '.w-full.p-3:has-text("Haiku")',
      '[class*="hover:bg-gray-50"]:has-text("Haiku")'
    ],
    expectation: "Fast, concise response"
  },
  {
    name: "Claude 3.5 Sonnet",
    selectors: [
      'button:has-text("Claude 3.5 Sonnet")',
      'button:has-text("Sonnet")',
      '.w-full.p-3:has-text("Sonnet")',
      '[class*="hover:bg-gray-50"]:has-text("Sonnet")'
    ],
    expectation: "Balanced, detailed response"
  },
  {
    name: "Claude 3 Opus",
    selectors: [
      'button:has-text("Claude 3 Opus")',
      'button:has-text("Opus")',
      '.w-full.p-3:has-text("Opus")',
      '[class*="hover:bg-gray-50"]:has-text("Opus")'
    ],
    expectation: "Comprehensive response"
  }
];

export const TEST_PROMPTS = {
  simple: "Hello! Please respond with 'Test successful'.",
  creative: "Write a creative short story about a time traveler who accidentally changes history. Make it exactly 150 words.",
  technical: "Explain the concept of machine learning in exactly 100 words, using simple language that a beginner could understand.",
  comparison: "Can you compare your two responses about machine learning? Which explanation do you think is clearer?"
};
