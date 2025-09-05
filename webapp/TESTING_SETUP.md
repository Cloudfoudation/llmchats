# LEGAIA Testing Environment Setup

## Overview

This document provides a comprehensive guide for setting up and running automated tests for the LEGAIA Bedrock Chat application. The testing environment supports unit tests, integration tests, end-to-end tests, performance tests, security tests, and accessibility tests.

## Quick Start

### 1. Automated Setup
```bash
# Run the automated setup script
npm run test:setup

# Or manually run the setup script
./scripts/setup-test-env.sh
```

### 2. Manual Setup
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Copy and configure test environment
cp .env.test .env.test.local
# Edit .env.test.local with your actual test environment values
```

### 3. Run Tests
```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Environment Configuration

### Test Environment Files

| File | Purpose |
|------|---------|
| `.env.test` | Template for test environment variables |
| `.env.test.local` | Local test configuration (not committed) |
| `.env.development.local` | Development environment |
| `.env.production` | Production environment reference |

### Required Environment Variables

```bash
# AWS Configuration
NEXT_PUBLIC_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=your-test-user-pool-id
NEXT_PUBLIC_USER_POOL_CLIENT_ID=your-test-client-id
NEXT_PUBLIC_IDENTITY_POOL_ID=your-test-identity-pool-id

# Test User Credentials (set as environment variables)
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=SecurePassword123!
TEST_PAID_EMAIL=paid@test.com
TEST_PAID_PASSWORD=SecurePassword123!
TEST_FREE_EMAIL=free@test.com
TEST_FREE_PASSWORD=SecurePassword123!

# Test Configuration
PLAYWRIGHT_BASE_URL=http://localhost:3030
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=60000
```

## Test Types and Structure

### 1. Unit Tests (`tests/unit/`)
- **Purpose**: Test individual components and functions in isolation
- **Framework**: Jest + React Testing Library
- **Location**: `tests/unit/`
- **Command**: `npm run test:unit`

```
tests/unit/
├── components/          # Component tests
├── hooks/              # Custom hook tests
├── utils/              # Utility function tests
└── providers/          # Context provider tests
```

### 2. Integration Tests (`tests/integration/`)
- **Purpose**: Test API integrations and data flow
- **Framework**: Jest + MSW (Mock Service Worker)
- **Location**: `tests/integration/`
- **Command**: `npm run test:integration`

```
tests/integration/
├── api/                # API integration tests
├── database/           # Database interaction tests
└── storage/            # Storage integration tests
```

### 3. End-to-End Tests (`tests/e2e/`)
- **Purpose**: Test complete user workflows
- **Framework**: Playwright
- **Location**: `tests/e2e/`
- **Command**: `npm run test:e2e`

```
tests/e2e/
├── auth/               # Authentication flow tests
├── chat/               # Chat functionality tests
├── agents/             # Agent management tests
├── knowledge-base/     # Knowledge base tests
├── groups/             # Group management tests
└── admin/              # Admin functionality tests
```

### 4. Specialized Tests
- **Performance**: `npm run test:performance`
- **Security**: `npm run test:security`
- **Accessibility**: `npm run test:accessibility`
- **API**: `npm run test:api`

## Test Utilities

### Authentication Utils (`AuthUtils`)
```typescript
const authUtils = new AuthUtils(page);
await authUtils.loginWithGoogle(email, password);
await authUtils.logout();
const isLoggedIn = await authUtils.isLoggedIn();
```

### Chat Utils (`ChatUtils`)
```typescript
const chatUtils = new ChatUtils(page);
await chatUtils.sendMessage('Hello, AI!');
const response = await chatUtils.getLastMessage();
await chatUtils.createNewConversation('Test Chat');
```

### Agent Utils (`AgentUtils`)
```typescript
const agentUtils = new AgentUtils(page);
await agentUtils.createAgent({
  name: 'Test Agent',
  description: 'A test agent',
  instructions: 'Be helpful',
  model: 'claude-3-sonnet'
});
```

### Performance Utils (`PerformanceUtils`)
```typescript
const perfUtils = new PerformanceUtils(page);
const responseTime = await perfUtils.measureAIResponseTime('Test message');
const loadTime = await perfUtils.measurePageLoadTime();
```

## Test Data Management

### Fixtures
- **Location**: `test-data/fixtures/`
- **Users**: `test-data/fixtures/users.json`
- **Conversations**: `test-data/fixtures/conversations.json`
- **Documents**: `test-data/documents/`

### Test Data Utilities
```typescript
// Load test users
const testUsers = DataUtils.loadTestUsers();

// Generate unique IDs
const uniqueId = DataUtils.generateUniqueId();

// Clean up test data
await DataUtils.cleanupTestData(page);
```

## Running Tests

### Development
```bash
# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/auth/authentication.spec.ts
```

### CI/CD
```bash
# Run full CI test suite
npm run test:ci

# Run tests in headless mode
npm run test:e2e
```

### Docker
```bash
# Build and run test environment
npm run test:docker

# Run tests in container
npm run test:docker:run
```

## Test Configuration Files

### Jest Configuration (`jest.config.js`)
- Unit and integration test configuration
- Coverage thresholds
- Module mapping
- Setup files

### Playwright Configuration (`playwright.config.ts`)
- E2E test configuration
- Browser settings
- Timeouts and retries
- Reporting options

### Enhanced Playwright Config (`playwright.config.test.ts`)
- Test-specific configuration
- Multiple browser support
- Performance and security testing
- Specialized test projects

## Continuous Integration

### GitHub Actions (`.github/workflows/test.yml`)
- Automated testing on push/PR
- Multiple Node.js versions
- Test result artifacts
- Coverage reporting

### Test Reports
- **HTML Report**: `test-results/html-report/`
- **JSON Report**: `test-results/results.json`
- **JUnit XML**: `test-results/results.xml`
- **Coverage**: `coverage/`
- **Allure Report**: `test-results/allure-results/`

## Best Practices

### Writing Tests
1. **Use descriptive test names** that explain what is being tested
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies** to ensure test isolation
4. **Clean up test data** after each test
5. **Use page object model** for E2E tests
6. **Test both happy path and error scenarios**

### Test Data
1. **Use fixtures** for consistent test data
2. **Generate unique identifiers** to avoid conflicts
3. **Clean up after tests** to prevent data pollution
4. **Use environment-specific test data**

### Performance
1. **Run tests in parallel** when possible
2. **Use appropriate timeouts** for AI responses
3. **Mock slow operations** in unit tests
4. **Monitor test execution time**

### Security
1. **Never commit real credentials** to version control
2. **Use environment variables** for sensitive data
3. **Test authentication and authorization**
4. **Validate input sanitization**

## Troubleshooting

### Common Issues

#### Timeout Errors
```bash
# Increase timeout for AI responses
PLAYWRIGHT_TIMEOUT=120000 npm run test:e2e
```

#### Authentication Failures
- Verify test user credentials in environment variables
- Check Cognito configuration
- Ensure OAuth redirect URLs are correct

#### Network Errors
- Verify test environment connectivity
- Check API endpoint configurations
- Ensure AWS credentials are valid

#### Browser Issues
```bash
# Update Playwright browsers
npx playwright install

# Clear browser cache
npx playwright test --headed --debug
```

### Debug Mode
```bash
# Run with debug output
DEBUG=pw:api npm run test:e2e

# Run specific test with debugging
npx playwright test tests/e2e/auth/login.spec.ts --debug --headed

# Generate trace for failed tests
npx playwright show-trace test-results/trace.zip
```

### Logging
- Enable verbose logging with `VERBOSE_LOGGING=true`
- Check browser console logs in debug mode
- Review test artifacts in `test-results/`

## Test Coverage

### Coverage Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Contributing

### Adding New Tests
1. Create test files in appropriate directories
2. Follow existing naming conventions
3. Use provided test utilities
4. Add test data fixtures if needed
5. Update documentation

### Test Naming Conventions
- **Unit tests**: `*.test.ts` or `*.test.tsx`
- **Integration tests**: `*.integration.test.ts`
- **E2E tests**: `*.spec.ts`
- **Performance tests**: `*.perf.spec.ts`
- **Security tests**: `*.security.spec.ts`

## Support

### Documentation
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Getting Help
- Check existing test examples
- Review test utilities documentation
- Consult troubleshooting section
- Create GitHub issues for bugs

## Maintenance

### Regular Tasks
1. **Update test dependencies** regularly
2. **Review and update test data** as needed
3. **Monitor test execution times**
4. **Clean up obsolete tests**
5. **Update documentation** when adding features

### Performance Monitoring
- Monitor test execution times
- Optimize slow tests
- Review resource usage
- Update timeout configurations

This comprehensive testing setup ensures reliable, maintainable, and scalable automated testing for the LEGAIA Bedrock Chat application.
