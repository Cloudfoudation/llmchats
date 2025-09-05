#!/bin/bash

# Knowledge Base Citation Verification Test Runner
# Runs comprehensive citation tests for KB + Agent integration

echo "🎯 Starting Knowledge Base Citation Verification Tests..."
echo "=================================================="

# Set test environment
export NODE_ENV=test
export PLAYWRIGHT_BROWSERS_PATH=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Test Configuration:${NC}"
echo "   - Target: Knowledge Base Citation Verification"
echo "   - Browser: Chromium (headless)"
echo "   - Timeout: 60 seconds per test"
echo "   - Retries: 2 attempts per test"
echo ""

# Function to run a specific test file
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${YELLOW}🧪 Running: ${test_name}${NC}"
    echo "   File: ${test_file}"
    echo "   Started: $(date)"
    echo ""
    
    # Run the test with specific configuration for citation verification
    npx playwright test "${test_file}" \
        --config=playwright.config.ts \
        --project=chromium \
        --timeout=60000 \
        --retries=2 \
        --reporter=list \
        --output=test-results/citation-verification
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ ${test_name} - PASSED${NC}"
    else
        echo -e "${RED}❌ ${test_name} - FAILED (Exit code: ${exit_code})${NC}"
    fi
    
    echo "   Completed: $(date)"
    echo ""
    
    return $exit_code
}

# Main citation verification test
echo -e "${BLUE}🔍 Running Citation Verification Tests...${NC}"
echo ""

# Test 1: Comprehensive Citation Verification
run_test "tests/e2e/knowledge-base/kb-citation-verification.spec.ts" "Citation Verification Suite"
citation_result=$?

# Test 2: Enhanced Model Tests (includes citation verification)
echo -e "${BLUE}🤖 Running Enhanced Model Citation Tests...${NC}"
run_test "tests/e2e/knowledge-base/kb-agent-model-tests.spec.ts" "Model Citation Integration"
model_result=$?

# Summary
echo "=================================================="
echo -e "${BLUE}📊 CITATION VERIFICATION TEST SUMMARY${NC}"
echo "=================================================="

total_tests=2
passed_tests=0

if [ $citation_result -eq 0 ]; then
    echo -e "✅ Citation Verification Suite: ${GREEN}PASSED${NC}"
    ((passed_tests++))
else
    echo -e "❌ Citation Verification Suite: ${RED}FAILED${NC}"
fi

if [ $model_result -eq 0 ]; then
    echo -e "✅ Model Citation Integration: ${GREEN}PASSED${NC}"
    ((passed_tests++))
else
    echo -e "❌ Model Citation Integration: ${RED}FAILED${NC}"
fi

echo ""
echo "Results: ${passed_tests}/${total_tests} test suites passed"

# Calculate success rate
success_rate=$((passed_tests * 100 / total_tests))
echo "Success Rate: ${success_rate}%"

if [ $success_rate -eq 100 ]; then
    echo -e "${GREEN}🎉 All citation verification tests passed!${NC}"
    echo -e "${GREEN}📚 Knowledge base citation functionality is working correctly${NC}"
elif [ $success_rate -ge 50 ]; then
    echo -e "${YELLOW}⚠️ Some citation tests failed - review results above${NC}"
    echo -e "${YELLOW}💡 Citation functionality may need improvements${NC}"
else
    echo -e "${RED}❌ Most citation tests failed - significant issues detected${NC}"
    echo -e "${RED}🔧 Citation functionality requires immediate attention${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Review test results in test-results/citation-verification/"
echo "2. Check browser screenshots for any UI issues"
echo "3. Verify knowledge base sync and agent creation"
echo "4. Test citation patterns manually if needed"
echo ""

# Exit with appropriate code
if [ $passed_tests -eq $total_tests ]; then
    exit 0
else
    exit 1
fi
