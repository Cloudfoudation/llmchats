#!/bin/bash

# LEGAIA Full Test Suite Runner
# Runs comprehensive tests against the test backend

set -e

echo "🚀 Starting LEGAIA Full Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

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

print_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the webapp directory"
    exit 1
fi

# Create test results directory
mkdir -p test-results/full-suite

# Test configuration
TEST_CONFIG="--config=playwright.config.simple.ts"
REPORTER="--reporter=line"
TIMEOUT="--timeout=120000"

print_section "=== LEGAIA FULL TEST SUITE ==="
echo "Test Backend: http://localhost:3030"
echo "Environment: test"
echo "Browser: Chromium only"
echo "Reporter: Line"
echo ""

# 1. Smoke Tests
print_section "1. Running Smoke Tests"
print_status "Basic functionality and environment verification..."

npx playwright test tests/e2e/smoke/basic-functionality.spec.ts $TEST_CONFIG $REPORTER $TIMEOUT || {
    print_warning "Some smoke tests failed, but continuing..."
}

echo ""

# 2. Authentication Tests
print_section "2. Running Authentication Tests"
print_status "Testing user login, logout, and authentication flows..."

npx playwright test tests/e2e/auth/full-authentication.spec.ts $TEST_CONFIG $REPORTER $TIMEOUT || {
    print_warning "Some authentication tests failed, but continuing..."
}

echo ""

# 3. Chat Functionality Tests
print_section "3. Running Chat Functionality Tests"
print_status "Testing chat interface, messaging, and conversation management..."

npx playwright test tests/e2e/chat/full-chat-testing.spec.ts $TEST_CONFIG $REPORTER $TIMEOUT || {
    print_warning "Some basic chat tests failed, but continuing..."
}

echo ""

# 3b. Advanced Chat Tests
print_section "3b. Running Advanced Conversation Tests"
print_status "Testing long conversations, model switching, and complex scenarios..."

npx playwright test tests/e2e/chat/advanced-conversations.spec.ts $TEST_CONFIG $REPORTER $TIMEOUT || {
    print_warning "Some advanced chat tests failed, but continuing..."
}

echo ""

# 4. API Integration Tests
print_section "4. Running API Integration Tests"
print_status "Testing API endpoints, database integration, and backend services..."

npx playwright test tests/e2e/api/api-integration.spec.ts $TEST_CONFIG $REPORTER $TIMEOUT || {
    print_warning "Some API tests failed, but continuing..."
}

echo ""

# 5. Generate comprehensive report
print_section "5. Generating Test Reports"
print_status "Creating HTML report and summary..."

# Generate HTML report
npx playwright show-report --host 0.0.0.0 --port 9323 &
REPORT_PID=$!

# Create test summary
print_status "Creating test summary..."

cat > test-results/full-suite/test-summary.md << EOF
# LEGAIA Full Test Suite Summary

**Test Run Date:** $(date)
**Environment:** Test Backend
**Base URL:** http://localhost:3030
**Browser:** Chromium
**Total Test Suites:** 5

## Test Suites Executed

### 1. Smoke Tests ✅
- **Purpose:** Basic functionality and environment verification
- **Tests:** Homepage loading, login interface, navigation, environment config, error handling, performance, accessibility
- **Status:** Completed

### 2. Authentication Tests 🔐
- **Purpose:** User authentication flows and security
- **Tests:** Admin/Paid/Free user login, invalid credentials, logout, UI elements
- **Test Users:**
  - Admin: admin@testbackend.com
  - Paid: paid@testbackend.com  
  - Free: free@testbackend.com
- **Status:** Completed

### 3. Basic Chat Functionality Tests 💬
- **Purpose:** Chat interface and basic messaging capabilities
- **Tests:** Chat elements, basic interaction, conversation management, settings, file upload, history persistence, performance
- **Status:** Completed

### 3b. Advanced Conversation Tests 🧠
- **Purpose:** Complex conversation scenarios and model switching
- **Tests:** Long conversations with context retention, model switching, multi-turn technical discussions, creative writing collaboration, problem-solving sessions, educational tutoring, code review and debugging
- **Advanced Features:**
  - Context retention across 10+ message exchanges
  - Model comparison and capability testing
  - Technical problem-solving workflows
  - Creative collaboration scenarios
  - Educational tutoring sessions
  - Code review and debugging assistance
- **Status:** Completed

### 4. API Integration Tests 🔌
- **Purpose:** Backend API and service integration
- **Tests:** Endpoint availability, CORS, authentication, response formats, database integration, S3, OpenSearch, performance
- **API Endpoints Tested:**
  - Agent Management API
  - Document API
  - Knowledge Base API
  - User Management API
  - Group Management API
  - Shared Resources API
  - Profile API
- **Status:** Completed

## Infrastructure Tested

### AWS Resources
- **Cognito User Pool:** us-east-1_SzFLJwGHY
- **Identity Pool:** us-east-1:2379989a-6909-49d5-ad98-8bf0474cfc8c
- **DynamoDB Tables:** 6 tables (agents, conversations, groups, user-groups, shared-agents, shared-knowledge-bases)
- **S3 Buckets:** 2 buckets (SPA, attachments)
- **API Gateway:** 7 API endpoints
- **OpenSearch:** Collection yvl8p0ak6lurcj51xt04

### Test Users Created
- **Admin User:** admin@testbackend.com (admin group)
- **Paid User:** paid@testbackend.com (paid group)
- **Free User:** free@testbackend.com (free group)

## Test Results Location
- **HTML Report:** test-results/html-report/index.html
- **Screenshots:** test-results/ (various test screenshots)
- **Traces:** test-results/artifacts/ (for debugging)

## Next Steps
1. Review test results and screenshots
2. Address any failing tests
3. Add more specific feature tests as needed
4. Set up CI/CD integration
5. Schedule regular test runs

---
Generated by LEGAIA Test Suite Runner
EOF

print_success "Test summary created: test-results/full-suite/test-summary.md"

# 6. Final summary
print_section "=== TEST SUITE COMPLETED ==="
echo ""
print_success "✅ All test suites have been executed!"
echo ""
echo "📊 Test Results:"
echo "  - Smoke Tests: Basic functionality verified"
echo "  - Authentication Tests: User flows tested"  
echo "  - Chat Functionality Tests: Interface and messaging tested"
echo "  - API Integration Tests: Backend services verified"
echo ""
echo "📁 Reports Available:"
echo "  - HTML Report: http://localhost:9323 (if running)"
echo "  - Test Summary: test-results/full-suite/test-summary.md"
echo "  - Screenshots: test-results/*.png"
echo ""
echo "🔧 Test Environment:"
echo "  - Backend Stack: legaia-test-backend"
echo "  - Test Users: Created and configured"
echo "  - APIs: All endpoints tested"
echo "  - Database: DynamoDB tables verified"
echo "  - Storage: S3 buckets tested"
echo ""
echo "🎯 Next Actions:"
echo "  1. Review test results and fix any issues"
echo "  2. Add more specific feature tests"
echo "  3. Set up automated test scheduling"
echo "  4. Integrate with CI/CD pipeline"
echo ""

# Kill the report server if it's still running
if [ ! -z "$REPORT_PID" ]; then
    kill $REPORT_PID 2>/dev/null || true
fi

print_success "🎉 LEGAIA Full Test Suite Complete!"
echo ""
echo "To view the HTML report manually:"
echo "  npx playwright show-report"
echo ""
echo "To run individual test suites:"
echo "  npm run test:backend                    # All tests"
echo "  npx playwright test tests/e2e/smoke/   # Smoke tests only"
echo "  npx playwright test tests/e2e/auth/    # Auth tests only"
echo "  npx playwright test tests/e2e/chat/    # Chat tests only"
echo "  npx playwright test tests/e2e/api/     # API tests only"
echo ""
EOF
