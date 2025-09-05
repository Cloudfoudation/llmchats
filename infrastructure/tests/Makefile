# Makefile for API Testing
.PHONY: help install test test-unit test-integration test-performance test-security test-smoke clean setup reports

# Default target
help:
	@echo "Available targets:"
	@echo "  install          - Install test dependencies"
	@echo "  setup           - Setup test environment"
	@echo "  test            - Run all tests"
	@echo "  test-unit       - Run unit tests only"
	@echo "  test-integration - Run integration tests only"
	@echo "  test-performance - Run performance tests only"
	@echo "  test-security   - Run security tests only"
	@echo "  test-smoke      - Run smoke tests only"
	@echo "  test-parallel   - Run tests in parallel"
	@echo "  test-legacy     - Run legacy unittest-based tests"
	@echo "  test-modern     - Run modern pytest-based tests"
	@echo "  reports         - Generate test reports"
	@echo "  clean           - Clean test artifacts"
	@echo "  coverage        - Generate coverage report"

# Install dependencies
install:
	@echo "Installing test dependencies..."
	pip install -r requirements.txt

# Setup test environment
setup:
	@echo "Setting up test environment..."
	python -c "from run_tests import setup_test_environment; setup_test_environment()"

# Run all tests
test: test-modern

# Run modern pytest-based tests
test-modern:
	@echo "Running modern pytest-based tests..."
	pytest test_modern_api.py -v --tb=short

# Run legacy unittest-based tests
test-legacy:
	@echo "Running legacy unittest-based tests..."
	python enhanced_test_runner.py

# Run tests in parallel
test-parallel:
	@echo "Running tests in parallel..."
	python enhanced_test_runner.py --workers 4

# Run unit tests only
test-unit:
	@echo "Running unit tests..."
	pytest test_modern_api.py -v -m "unit"

# Run integration tests only
test-integration:
	@echo "Running integration tests..."
	pytest test_modern_api.py -v -m "integration"

# Run performance tests only
test-performance:
	@echo "Running performance tests..."
	pytest test_modern_api.py -v -m "performance"
	python -c "import asyncio; from load_testing import run_performance_tests; asyncio.run(run_performance_tests())"

# Run security tests only
test-security:
	@echo "Running security tests..."
	pytest test_modern_api.py -v -m "security"

# Run smoke tests only
test-smoke:
	@echo "Running smoke tests..."
	pytest test_modern_api.py -v -m "smoke"

# Run tests for specific user tier
test-admin:
	@echo "Running admin-only tests..."
	pytest test_modern_api.py -v -m "admin_only"

test-paid:
	@echo "Running paid user tests..."
	pytest test_modern_api.py -v -m "paid_only"

test-free:
	@echo "Running free user tests..."
	pytest test_modern_api.py -v -m "free_only"

# Generate comprehensive test reports
reports:
	@echo "Generating test reports..."
	mkdir -p reports
	pytest test_modern_api.py --html=reports/pytest_report.html --self-contained-html --cov=. --cov-report=html:reports/coverage
	python enhanced_test_runner.py --output reports/enhanced_report.json

# Generate coverage report
coverage:
	@echo "Generating coverage report..."
	mkdir -p reports
	pytest test_modern_api.py --cov=. --cov-report=html:reports/coverage --cov-report=term

# Clean test artifacts
clean:
	@echo "Cleaning test artifacts..."
	rm -rf reports/
	rm -rf .pytest_cache/
	rm -rf __pycache__/
	rm -rf .coverage
	find . -name "*.pyc" -delete
	find . -name "*.pyo" -delete

# Run comprehensive test suite with all features
test-comprehensive:
	@echo "Running comprehensive test suite..."
	mkdir -p reports
	python enhanced_test_runner.py --performance --output reports/comprehensive_report.json
	pytest test_modern_api.py --html=reports/pytest_comprehensive.html --self-contained-html --cov=. --cov-report=html:reports/coverage_comprehensive

# Quick test run (smoke tests only)
test-quick:
	@echo "Running quick smoke tests..."
	pytest test_modern_api.py -v -m "smoke" --tb=line

# Test specific API
test-user-management:
	@echo "Testing User Management API..."
	pytest test_modern_api.py::TestUserManagement -v

test-knowledge-base:
	@echo "Testing Knowledge Base API..."
	pytest test_modern_api.py::TestKnowledgeBase -v

test-agent-management:
	@echo "Testing Agent Management API..."
	pytest test_modern_api.py::TestAgentManagement -v

test-group-management:
	@echo "Testing Group Management API..."
	pytest test_modern_api.py::TestGroupManagement -v

# Development helpers
dev-setup: install setup
	@echo "Development environment ready!"

dev-test: test-smoke
	@echo "Development tests completed!"

# CI/CD targets
ci-test:
	@echo "Running CI tests..."
	pytest test_modern_api.py -v --tb=short --maxfail=5 --html=reports/ci_report.html --self-contained-html

ci-full:
	@echo "Running full CI test suite..."
	make test-comprehensive

# Debug helpers
debug-auth:
	@echo "Testing authentication setup..."
	python -c "from auth_helper import auth; from test_config import config; print('Auth test:', auth.setup_test_users())"

debug-endpoints:
	@echo "Testing API endpoints..."
	python -c "from test_config import config; print('Endpoints:', config.api_endpoints)"

# Load testing
load-test:
	@echo "Running load tests..."
	python -c "import asyncio; from load_testing import run_performance_tests; asyncio.run(run_performance_tests())"

# Monitoring and health checks
health-check:
	@echo "Running API health checks..."
	pytest test_modern_api.py::TestSmoke::test_all_apis_accessible -v

# Documentation
docs:
	@echo "Test documentation:"
	@echo "  - Test reports: reports/"
	@echo "  - Coverage: reports/coverage/"
	@echo "  - Configuration: test_config.py"
	@echo "  - Modern tests: test_modern_api.py"
	@echo "  - Legacy tests: test_*.py"
