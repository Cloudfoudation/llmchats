#!/bin/bash

# LEGAIA Test Environment Setup Script
# This script sets up the complete testing environment for automation testing

set -e

echo "🚀 Setting up LEGAIA Test Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the webapp directory"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js version check passed: $(node --version)"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Install additional testing dependencies if not present
print_status "Installing additional testing dependencies..."
npm install --save-dev \
    @playwright/test \
    @types/jest \
    jest \
    jest-environment-jsdom \
    @testing-library/react \
    @testing-library/jest-dom \
    @testing-library/user-event \
    msw \
    cross-env \
    wait-on \
    concurrently \
    dotenv-cli

# Install Playwright browsers
print_status "Installing Playwright browsers..."
npx playwright install

# Create test directories if they don't exist
print_status "Creating test directory structure..."
mkdir -p tests/{e2e,unit,integration,fixtures,utils,setup,mocks,reports}
mkdir -p tests/e2e/{auth,chat,agents,knowledge-base,groups,admin}
mkdir -p tests/unit/{components,hooks,utils,providers}
mkdir -p tests/integration/{api,database,storage}

# Create test data directory
mkdir -p test-data/{documents,images,fixtures}

# Create test reports directory
mkdir -p test-results/{screenshots,videos,traces,reports}

# Copy environment files if they don't exist
if [ ! -f ".env.test.local" ]; then
    print_status "Creating test environment file..."
    cp .env.test .env.test.local
    print_warning "Please update .env.test.local with your actual test environment values"
fi

# Create Jest configuration
print_status "Creating Jest configuration..."
cat > jest.config.js << 'EOF'
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  moduleNameMapping: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/',
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
EOF

# Create Jest setup file
print_status "Creating Jest setup file..."
cat > tests/setup/jest.setup.js << 'EOF'
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  InvokeModelWithResponseStreamCommand: jest.fn(),
}))

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({
    send: jest.fn(),
  })),
}))

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
}))

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn(),
  },
}))

jest.mock('@aws-amplify/auth', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Setup MSW
import { server } from '../mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
EOF

# Create MSW setup for API mocking
print_status "Creating MSW setup for API mocking..."
cat > tests/mocks/server.js << 'EOF'
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup requests interception using the given handlers
export const server = setupServer(...handlers)
EOF

cat > tests/mocks/handlers.js << 'EOF'
import { rest } from 'msw'

export const handlers = [
  // Mock Bedrock API
  rest.post('https://bedrock-runtime.us-east-1.amazonaws.com/*', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        body: JSON.stringify({
          completion: 'This is a mocked AI response for testing purposes.',
          stop_reason: 'end_turn',
        }),
      })
    )
  }),

  // Mock DynamoDB API
  rest.post('https://dynamodb.us-east-1.amazonaws.com/', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        Items: [],
        Count: 0,
        ScannedCount: 0,
      })
    )
  }),

  // Mock S3 API
  rest.put('https://*.s3.us-east-1.amazonaws.com/*', (req, res, ctx) => {
    return res(ctx.status(200))
  }),

  // Mock API Gateway endpoints
  rest.get('https://*.execute-api.us-east-1.amazonaws.com/*/agents', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'test-agent-1',
          name: 'Test Agent',
          description: 'A test agent for automation testing',
          createdAt: new Date().toISOString(),
        },
      ])
    )
  }),

  rest.get('https://*.execute-api.us-east-1.amazonaws.com/*/conversations', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'test-conversation-1',
          title: 'Test Conversation',
          messages: [],
          createdAt: new Date().toISOString(),
        },
      ])
    )
  }),
]
EOF

# Create test utilities
print_status "Creating test utilities..."
cat > tests/utils/test-helpers.js << 'EOF'
import { render } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'

// Custom render function that includes providers
export function renderWithProviders(ui, options = {}) {
  const { initialProps, ...renderOptions } = options

  function Wrapper({ children }) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock data generators
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  groups: ['free'],
}

export const mockConversation = {
  id: 'test-conversation-id',
  title: 'Test Conversation',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello, this is a test message',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hello! This is a test response from the AI.',
      timestamp: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockAgent = {
  id: 'test-agent-id',
  name: 'Test Agent',
  description: 'A test agent for automation testing',
  instructions: 'You are a helpful test assistant.',
  model: 'claude-3-sonnet',
  createdAt: new Date().toISOString(),
}

// Test data cleanup utilities
export async function cleanupTestData() {
  // Add cleanup logic for test data
  console.log('Cleaning up test data...')
}

// Wait utilities for async operations
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const waitForElement = async (selector, timeout = 5000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector)
    if (element) return element
    await waitFor(100)
  }
  throw new Error(`Element ${selector} not found within ${timeout}ms`)
}
EOF

# Update package.json with new test scripts
print_status "Updating package.json with test scripts..."
npm pkg set scripts.test="jest"
npm pkg set scripts.test:watch="jest --watch"
npm pkg set scripts.test:coverage="jest --coverage"
npm pkg set scripts.test:unit="jest tests/unit"
npm pkg set scripts.test:integration="jest tests/integration"
npm pkg set scripts.test:all="npm run test:unit && npm run test:integration && npm run test:e2e"
npm pkg set scripts.test:ci="npm run test:coverage && npm run test:e2e"
npm pkg set scripts.dev:test="env-cmd -f .env.test.local next dev --port 3030"
npm pkg set scripts.build:test="env-cmd -f .env.test.local next build"

# Create sample test files
print_status "Creating sample test files..."

# Unit test example
cat > tests/unit/components/example.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-helpers'

// Example unit test - replace with actual component tests
describe('Example Component Tests', () => {
  it('should render without crashing', () => {
    const TestComponent = () => <div>Test Component</div>
    render(<TestComponent />)
    expect(screen.getByText('Test Component')).toBeInTheDocument()
  })
})
EOF

# Integration test example
cat > tests/integration/api/example.test.js << 'EOF'
import { mockUser, mockConversation } from '../../utils/test-helpers'

// Example integration test - replace with actual API tests
describe('API Integration Tests', () => {
  it('should handle user authentication', async () => {
    // Mock authentication flow
    const user = mockUser
    expect(user.id).toBeDefined()
    expect(user.email).toBe('test@example.com')
  })

  it('should handle conversation creation', async () => {
    // Mock conversation creation
    const conversation = mockConversation
    expect(conversation.id).toBeDefined()
    expect(conversation.messages).toHaveLength(2)
  })
})
EOF

# Create test data fixtures
print_status "Creating test data fixtures..."
cat > test-data/fixtures/users.json << 'EOF'
{
  "admin": {
    "email": "admin@test.com",
    "password": "TestPassword123!",
    "groups": ["admin"],
    "name": "Test Admin"
  },
  "paid": {
    "email": "paid@test.com",
    "password": "TestPassword123!",
    "groups": ["paid"],
    "name": "Test Paid User"
  },
  "free": {
    "email": "free@test.com",
    "password": "TestPassword123!",
    "groups": ["free"],
    "name": "Test Free User"
  }
}
EOF

cat > test-data/fixtures/conversations.json << 'EOF'
[
  {
    "id": "conv-1",
    "title": "Test Conversation 1",
    "messages": [
      {
        "role": "user",
        "content": "What is artificial intelligence?"
      },
      {
        "role": "assistant",
        "content": "Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that can perform tasks that typically require human intelligence."
      }
    ]
  },
  {
    "id": "conv-2",
    "title": "Test Conversation 2",
    "messages": [
      {
        "role": "user",
        "content": "Explain machine learning"
      },
      {
        "role": "assistant",
        "content": "Machine Learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed."
      }
    ]
  }
]
EOF

# Create GitHub Actions workflow for CI/CD
print_status "Creating GitHub Actions workflow..."
mkdir -p .github/workflows
cat > .github/workflows/test.yml << 'EOF'
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: webapp/package-lock.json
    
    - name: Install dependencies
      working-directory: ./webapp
      run: npm ci
    
    - name: Run unit tests
      working-directory: ./webapp
      run: npm run test:coverage
    
    - name: Install Playwright Browsers
      working-directory: ./webapp
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      working-directory: ./webapp
      run: npm run test:e2e
      env:
        CI: true
    
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-results-${{ matrix.node-version }}
        path: |
          webapp/test-results/
          webapp/coverage/
        retention-days: 30
EOF

# Create Docker setup for consistent testing environment
print_status "Creating Docker setup for testing..."
cat > Dockerfile.test << 'EOF'
FROM node:18-alpine

# Install dependencies for Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chromium path for Playwright
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright
RUN npx playwright install

# Copy source code
COPY . .

# Expose port
EXPOSE 3030

# Default command
CMD ["npm", "run", "dev:test"]
EOF

cat > docker-compose.test.yml << 'EOF'
version: '3.8'

services:
  webapp-test:
    build:
      context: .
      dockerfile: Dockerfile.test
    ports:
      - "3030:3030"
    environment:
      - NODE_ENV=test
    env_file:
      - .env.test.local
    volumes:
      - ./test-results:/app/test-results
      - ./coverage:/app/coverage
    command: npm run dev:test

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      - webapp-test
    environment:
      - PLAYWRIGHT_BASE_URL=http://webapp-test:3030
    env_file:
      - .env.test.local
    volumes:
      - ./test-results:/app/test-results
    command: npm run test:e2e
EOF

# Create test documentation
print_status "Creating test documentation..."
cat > TESTING.md << 'EOF'
# LEGAIA Testing Guide

## Overview

This document provides comprehensive guidance for testing the LEGAIA Bedrock Chat application.

## Test Environment Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (optional, for containerized testing)

### Quick Setup
```bash
# Run the setup script
./scripts/setup-test-env.sh

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Copy and configure test environment
cp .env.test .env.test.local
# Edit .env.test.local with your test environment values
```

## Test Types

### 1. Unit Tests
- **Location**: `tests/unit/`
- **Purpose**: Test individual components and functions
- **Command**: `npm run test:unit`

### 2. Integration Tests
- **Location**: `tests/integration/`
- **Purpose**: Test API integrations and data flow
- **Command**: `npm run test:integration`

### 3. End-to-End Tests
- **Location**: `tests/e2e/`
- **Purpose**: Test complete user workflows
- **Command**: `npm run test:e2e`

## Running Tests

### Development
```bash
# Run all tests
npm run test:all

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### CI/CD
```bash
# Run CI test suite
npm run test:ci
```

### Docker
```bash
# Build and run test environment
docker-compose -f docker-compose.test.yml up --build

# Run tests in container
docker-compose -f docker-compose.test.yml run test-runner
```

## Test Configuration

### Environment Variables
- `.env.test.local` - Local test configuration
- Test user credentials should be set as environment variables
- API endpoints should point to test environment

### Test Data
- **Fixtures**: `test-data/fixtures/`
- **Mock Data**: `tests/mocks/`
- **Test Users**: Configured in test environment

## Best Practices

### Writing Tests
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Mock external dependencies
4. Clean up test data after tests
5. Use page object model for E2E tests

### Test Data Management
1. Use fixtures for consistent test data
2. Clean up after each test
3. Use unique identifiers for test data
4. Avoid dependencies between tests

### Performance
1. Run tests in parallel when possible
2. Use appropriate timeouts for AI responses
3. Mock slow operations in unit tests
4. Use test-specific database/storage

## Troubleshooting

### Common Issues
1. **Timeout errors**: Increase timeout for AI responses
2. **Authentication failures**: Check test user credentials
3. **Network errors**: Verify test environment connectivity
4. **Browser issues**: Update Playwright browsers

### Debug Mode
```bash
# Run with debug output
DEBUG=pw:api npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/auth/login.spec.ts --debug
```

## Continuous Integration

The project includes GitHub Actions workflow for automated testing:
- Runs on push to main/develop branches
- Tests multiple Node.js versions
- Uploads test results and coverage reports
- Runs both unit and E2E tests

## Reporting

Test results are generated in multiple formats:
- **HTML Report**: `test-results/html-report/`
- **JSON Report**: `test-results/results.json`
- **JUnit XML**: `test-results/results.xml`
- **Coverage Report**: `coverage/`

## Security Testing

The test suite includes security-focused tests:
- XSS protection validation
- CSRF protection testing
- Authentication flow security
- Input validation testing
EOF

print_success "Test environment setup completed!"

echo ""
echo "📋 Next Steps:"
echo "1. Update .env.test.local with your actual test environment values"
echo "2. Configure test user credentials as environment variables"
echo "3. Run 'npm run test:unit' to verify unit tests"
echo "4. Run 'npm run test:e2e' to verify E2E tests"
echo "5. Review TESTING.md for detailed testing guidelines"
echo ""
echo "🔧 Available Commands:"
echo "  npm run test              - Run unit tests"
echo "  npm run test:watch        - Run tests in watch mode"
echo "  npm run test:coverage     - Run tests with coverage"
echo "  npm run test:e2e          - Run E2E tests"
echo "  npm run test:e2e:ui       - Run E2E tests with UI"
echo "  npm run test:all          - Run all test suites"
echo "  npm run dev:test          - Start dev server for testing"
echo ""
echo "✅ Test environment is ready for automation testing!"
