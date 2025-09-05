# Enhanced API Test Suite

A comprehensive testing framework for the Bedrock Chat Application backend APIs with modern testing practices, performance validation, and detailed reporting.

## Overview

This enhanced test suite provides:

- **Modern Testing Framework**: Pytest-based tests with fixtures and parametrization
- **Legacy Support**: Existing unittest-based tests maintained for compatibility
- **Performance Testing**: Load testing and response time validation
- **Security Testing**: Authentication and authorization validation
- **Comprehensive Reporting**: HTML reports, coverage analysis, and JSON exports
- **Parallel Execution**: Faster test runs with concurrent execution
- **CI/CD Integration**: Ready for continuous integration pipelines

## Quick Start

### 1. Install Dependencies

```bash
make install
# or
pip install -r requirements.txt
```

### 2. Setup Test Environment

```bash
make setup
# or manually configure your test environment
```

### 3. Run Tests

```bash
# Run all tests (modern pytest-based)
make test

# Run quick smoke tests
make test-quick

# Run comprehensive test suite
make test-comprehensive
```

## Test Categories

### Functional Tests

- **User Management**: Admin user operations, access control
- **Knowledge Base**: CRUD operations, file management, sync workflows
- **Agent Management**: Agent lifecycle, configuration
- **Group Management**: Group operations, member management
- **Shared Resources**: Resource sharing workflows

### Non-Functional Tests

- **Security Tests**: Authentication, authorization, input validation
- **Performance Tests**: Response times, load testing, throughput
- **Integration Tests**: End-to-end workflows
- **Smoke Tests**: Basic functionality validation

## Test Execution Options

### By Test Type

```bash
make test-unit           # Unit tests
make test-integration    # Integration tests
make test-performance    # Performance tests
make test-security       # Security tests
make test-smoke          # Smoke tests
```

### By User Tier

```bash
make test-admin          # Admin-only functionality
make test-paid           # Paid user functionality
make test-free           # Free user functionality
```

### By API

```bash
make test-user-management
make test-knowledge-base
make test-agent-management
make test-group-management
```

### Execution Modes

```bash
make test-parallel       # Parallel execution (faster)
make test-legacy         # Legacy unittest-based tests
make test-modern         # Modern pytest-based tests
```

## Configuration

### Test Configuration (`test_config.py`)

```python
class TestConfig:
    stack_name = "llmchats-dev"
    region = "ap-southeast-1"
    environment = "dev"
    
    test_users = {
        "admin": {"email": "admin@example.com", "group": "admin"},
        "paid": {"email": "paid@example.com", "group": "paid"},
        "free": {"email": "free@example.com", "group": "free"}
    }
```

### Environment Variables

```bash
export AWS_PROFILE=your-profile
export AWS_REGION=ap-southeast-1
```

## Test Structure

### Modern Pytest Tests (`test_modern_api.py`)

```python
class TestUserManagement:
    @pytest.mark.admin_only
    def test_admin_can_list_users(self, user_emails):
        status_code, response = client.list_users(user_emails['admin'])
        assert status_code == 200
    
    @pytest.mark.parametrize("user_tier", ["paid", "free"])
    def test_non_admin_cannot_list_users(self, user_emails, user_tier):
        status_code, response = client.list_users(user_emails[user_tier])
        assert status_code == 403
```

### Enhanced Framework (`test_framework.py`)

- **BaseAPITest**: Common test utilities and assertions
- **PerformanceTestMixin**: Response time measurement
- **SecurityTestMixin**: Security validation helpers
- **DataTestMixin**: Data consistency validation
- **IntegrationTestMixin**: Workflow testing

## Performance Testing

### Load Testing

```bash
make load-test
# or
python -c "import asyncio; from load_testing import run_performance_tests; asyncio.run(run_performance_tests())"
```

### Performance Scenarios

- **Concurrent Users**: 5-10 users per endpoint
- **Request Volume**: 5-10 requests per user
- **Response Time Limits**: 2-5 seconds depending on operation
- **Throughput Targets**: 10+ requests/second for read operations

## Reporting

### Generate Reports

```bash
make reports          # Generate all reports
make coverage         # Coverage report only
```

### Report Types

1. **HTML Test Report**: `reports/pytest_report.html`
2. **Coverage Report**: `reports/coverage/index.html`
3. **JSON Report**: `reports/enhanced_report.json`
4. **Performance Report**: Console output with metrics

### Sample Report Structure

```json
{
  "timestamp": "2024-01-15T10:30:00",
  "summary": {
    "total_tests": 45,
    "passed": 42,
    "failed": 2,
    "errors": 1,
    "success_rate": 93.3
  },
  "test_suites": [...]
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run API Tests
  run: |
    cd infrastructure/tests
    make install
    make setup
    make ci-test
```

### Test Commands for CI

```bash
make ci-test          # Basic CI tests
make ci-full          # Comprehensive CI tests
make health-check     # API health validation
```

## Development Workflow

### Setup Development Environment

```bash
make dev-setup        # Install deps + setup environment
make dev-test         # Quick development tests
```

### Debug Helpers

```bash
make debug-auth       # Test authentication setup
make debug-endpoints  # Verify API endpoints
make health-check     # API health status
```

## Best Practices

### Test Organization

1. **Use Fixtures**: Leverage pytest fixtures for setup/teardown
2. **Parametrize Tests**: Test multiple scenarios with `@pytest.mark.parametrize`
3. **Mark Tests**: Use markers for test categorization
4. **Resource Cleanup**: Always clean up created resources

### Performance Considerations

1. **Parallel Execution**: Use `make test-parallel` for faster runs
2. **Selective Testing**: Run only relevant test categories
3. **Resource Limits**: Monitor AWS service limits during load testing

### Security Testing

1. **Authentication**: Verify all endpoints require authentication
2. **Authorization**: Test user tier restrictions
3. **Input Validation**: Test with invalid/malicious inputs
4. **Data Isolation**: Ensure users can only access their data

## Troubleshooting

### Common Issues

1. **Environment Setup Fails**
   ```bash
   # Check AWS credentials
   aws sts get-caller-identity
   
   # Verify stack exists
   aws cloudformation describe-stacks --stack-name llmchats-dev
   ```

2. **Authentication Errors**
   ```bash
   # Debug authentication
   make debug-auth
   ```

3. **API Endpoint Issues**
   ```bash
   # Check endpoints
   make debug-endpoints
   ```

### Test Failures

1. **Check Test Reports**: Review HTML reports for detailed failure information
2. **Run Individual Tests**: Isolate failing tests for debugging
3. **Verify Environment**: Ensure test environment is properly configured

## Advanced Features

### Custom Test Scenarios

Create custom test scenarios by extending the base classes:

```python
class CustomTestSuite(BaseAPITest, PerformanceTestMixin):
    def test_custom_workflow(self):
        # Your custom test logic
        pass
```

### Load Testing Configuration

Customize load testing scenarios in `load_testing.py`:

```python
scenarios = [
    {
        'endpoint': 'your-endpoint',
        'concurrent_users': 10,
        'requests_per_user': 5,
        'user_email': 'test@example.com'
    }
]
```

## Contributing

1. **Add New Tests**: Follow the existing patterns and use appropriate markers
2. **Update Documentation**: Keep this README updated with new features
3. **Performance Baselines**: Update performance thresholds as needed
4. **Test Coverage**: Maintain high test coverage (>80%)

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review test reports for detailed error information
3. Verify environment configuration
4. Check AWS service limits and permissions
