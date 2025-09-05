# E2E Testing with Playwright

This directory contains comprehensive end-to-end tests for the LEGAIA webapp using Playwright.

## 🏗️ Test Structure

```
tests/
├── e2e/                          # E2E test suites
│   ├── auth/                     # Authentication tests
│   ├── knowledge-base/           # Knowledge base management tests
│   ├── agents/                   # Agent management tests
│   ├── groups/                   # Group management tests
│   ├── shared-resources/         # Resource sharing tests
│   └── user-management/          # User administration tests
├── fixtures/                     # Test data and fixtures
│   ├── test-data.ts             # Test data constants
│   └── files/                   # Test files for upload
├── utils/                        # Test utilities and helpers
│   ├── test-helpers.ts          # General test utilities
│   └── auth-helpers.ts          # Authentication utilities
├── setup/                        # Global setup and teardown
│   ├── global-setup.ts          # Global test setup
│   └── global-teardown.ts       # Global test cleanup
└── run-tests.js                 # Custom test runner
```

## 🚀 Getting Started

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Set up test environment:
```bash
cp .env.test.example .env.test
# Edit .env.test with your test credentials
```

### Running Tests

#### Using npm scripts:
```bash
# Run all tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug
```

#### Using the custom test runner:
```bash
# Run smoke tests
node tests/run-tests.js --suite smoke

# Run specific test suite
node tests/run-tests.js --suite auth --browser chromium

# Run tests with UI
node tests/run-tests.js --ui

# Run tests in debug mode
node tests/run-tests.js --debug --headed

# Run tests matching pattern
node tests/run-tests.js --grep "should login"
```

## 📋 Test Suites

### Authentication Tests (`auth/`)
- User sign in/sign out
- User registration
- Password reset
- Session management
- Protected route access
- Role-based permissions

### Knowledge Base Tests (`knowledge-base/`)
- KB CRUD operations
- File upload/download
- Data source management
- Sync operations
- Search and retrieval
- Access control

### Agent Tests (`agents/`)
- Agent CRUD operations
- Model configuration
- Knowledge base integration
- Chat functionality
- Performance testing

### Group Tests (`groups/`)
- Group CRUD operations
- Member management
- Role assignments
- Permissions
- Group settings

### Shared Resources Tests (`shared-resources/`)
- Resource sharing
- Permission management
- Access control
- Bulk operations
- Notifications

### User Management Tests (`user-management/`)
- User administration (admin only)
- User CRUD operations
- Role management
- Bulk operations
- User analytics

## 🔧 Configuration

### Environment Variables

Create `.env.test` file with:

```env
# Test User Credentials
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=AdminPass123!
TEST_PAID_EMAIL=paid@example.com
TEST_PAID_PASSWORD=PaidPass123!
TEST_FREE_EMAIL=free@example.com
TEST_FREE_PASSWORD=FreePass123!

# Application URL
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Test Configuration
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_RETRIES=2
```

### Playwright Configuration

The `playwright.config.ts` file includes:
- Multiple browser support (Chrome, Firefox, Safari)
- Mobile device testing
- Screenshot/video capture on failure
- Trace collection for debugging
- Global setup/teardown
- Custom reporters

## 🛠️ Test Utilities

### TestHelpers Class
General utilities for:
- Page navigation
- Element interaction
- Form filling
- File operations
- API mocking
- Screenshot capture

### AuthHelpers Class
Authentication-specific utilities:
- User login/logout
- Role-based authentication
- Session management
- Permission checking

## 📊 Test Data Management

### Test Data Structure
- Centralized test data in `fixtures/test-data.ts`
- Reusable test objects
- Environment-specific configuration
- File fixtures for upload testing

### Data Cleanup
- Automatic cleanup after each test
- Global teardown for persistent data
- Test isolation to prevent conflicts

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run single test in debug mode
npx playwright test auth/auth.spec.ts --debug

# Run with headed browser
npx playwright test --headed

# Run with UI mode
npx playwright test --ui
```

### Trace Viewer
```bash
# Show trace for failed test
npx playwright show-trace test-results/trace.zip
```

### Screenshots and Videos
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`
- Traces: `test-results/traces/`

## 📈 Test Reports

### HTML Report
```bash
npx playwright show-report
```

### CI/CD Integration
- JUnit XML output for CI systems
- JSON output for custom processing
- GitHub Actions integration ready

## 🔍 Best Practices

### Test Organization
- One test file per feature/page
- Descriptive test names
- Grouped related tests
- Clear test documentation

### Test Data
- Use fixtures for consistent data
- Clean up after each test
- Avoid hard-coded values
- Use environment variables

### Page Object Pattern
- Encapsulate page interactions
- Reusable component methods
- Centralized selectors
- Maintainable test code

### Error Handling
- Graceful failure handling
- Meaningful error messages
- Retry mechanisms
- Timeout configurations

## 🚨 Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout values
   - Check network conditions
   - Verify application is running

2. **Element not found**
   - Check selectors
   - Wait for elements to load
   - Verify page state

3. **Authentication failures**
   - Verify test credentials
   - Check user permissions
   - Clear browser state

4. **File upload issues**
   - Check file paths
   - Verify file permissions
   - Test file size limits

### Getting Help

1. Check Playwright documentation
2. Review test logs and traces
3. Use debug mode for investigation
4. Check application logs

## 📝 Contributing

### Adding New Tests
1. Create test file in appropriate directory
2. Follow naming conventions
3. Use existing utilities and helpers
4. Add test data to fixtures
5. Update documentation

### Test Maintenance
- Regular test review and updates
- Remove obsolete tests
- Update selectors as UI changes
- Maintain test data consistency

## 🔗 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
