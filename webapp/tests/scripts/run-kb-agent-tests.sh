#!/bin/bash

# KB + Agent Model Integration Test Runner
# Executes comprehensive tests for all models with knowledge base integration

set -e

echo "🚀 Starting KB + Agent Model Integration Test Suite"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
PLAYWRIGHT_CONFIG="playwright.config.simple.ts"
REPORTER="line"
TIMEOUT="300000" # 5 minutes per test
MAX_FAILURES="5"

# Test directories
KB_TEST_DIR="tests/e2e/knowledge-base"
RESULTS_DIR="test-results/kb-agent-tests"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}📋 Test Configuration:${NC}"
echo "   Config: $PLAYWRIGHT_CONFIG"
echo "   Reporter: $REPORTER"
echo "   Timeout: $TIMEOUT ms"
echo "   Max Failures: $MAX_FAILURES"
echo "   Results Dir: $RESULTS_DIR"
echo ""

# Function to run a test file
run_test() {
    local test_file=$1
    local test_name=$2
    local start_time=$(date +%s)
    
    echo -e "${YELLOW}🧪 Running: $test_name${NC}"
    echo "   File: $test_file"
    
    if npx playwright test "$test_file" \
        --config="$PLAYWRIGHT_CONFIG" \
        --reporter="$REPORTER" \
        --timeout="$TIMEOUT" \
        --max-failures="$MAX_FAILURES" \
        --output="$RESULTS_DIR/$test_name"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✅ PASSED: $test_name (${duration}s)${NC}"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}❌ FAILED: $test_name (${duration}s)${NC}"
        return 1
    fi
}

# Function to generate summary report
generate_summary() {
    local total_tests=$1
    local passed_tests=$2
    local failed_tests=$3
    local total_time=$4
    
    echo ""
    echo "=================================================="
    echo -e "${BLUE}📊 KB + Agent Model Integration Test Summary${NC}"
    echo "=================================================="
    echo "   Total Test Suites: $total_tests"
    echo -e "   Passed: ${GREEN}$passed_tests${NC}"
    echo -e "   Failed: ${RED}$failed_tests${NC}"
    echo "   Success Rate: $(( passed_tests * 100 / total_tests ))%"
    echo "   Total Time: ${total_time}s"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 All KB + Agent integration tests passed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Some tests failed. Check individual test results for details.${NC}"
    fi
    
    echo ""
    echo "📁 Detailed results available in: $RESULTS_DIR"
    echo "📸 Screenshots and traces available in test-results/"
}

# Main test execution
main() {
    local start_time=$(date +%s)
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    echo -e "${BLUE}🔍 Discovering KB + Agent test files...${NC}"
    
    # Test 1: Basic KB + Agent Model Integration Tests
    if [ -f "$KB_TEST_DIR/kb-agent-model-tests.spec.ts" ]; then
        total_tests=$((total_tests + 1))
        if run_test "$KB_TEST_DIR/kb-agent-model-tests.spec.ts" "basic-model-integration"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    fi
    
    # Test 2: Multimodal KB + Agent Tests
    if [ -f "$KB_TEST_DIR/kb-agent-multimodal-tests.spec.ts" ]; then
        total_tests=$((total_tests + 1))
        if run_test "$KB_TEST_DIR/kb-agent-multimodal-tests.spec.ts" "multimodal-integration"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    fi
    
    # Test 3: Comprehensive Test Runner
    if [ -f "$KB_TEST_DIR/kb-agent-comprehensive-runner.spec.ts" ]; then
        total_tests=$((total_tests + 1))
        if run_test "$KB_TEST_DIR/kb-agent-comprehensive-runner.spec.ts" "comprehensive-runner"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    fi
    
    # Test 4: Original KB Tests (for baseline)
    if [ -f "$KB_TEST_DIR/knowledge-base.spec.ts" ]; then
        total_tests=$((total_tests + 1))
        if run_test "$KB_TEST_DIR/knowledge-base.spec.ts" "baseline-kb-tests"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    fi
    
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    
    # Generate summary
    generate_summary $total_tests $passed_tests $failed_tests $total_time
    
    # Exit with appropriate code
    if [ $failed_tests -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "KB + Agent Model Integration Test Runner"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --quick             Run only priority model tests"
        echo "  --multimodal        Run only multimodal tests"
        echo "  --comprehensive     Run comprehensive test suite"
        echo "  --baseline          Run baseline KB tests only"
        echo ""
        echo "Examples:"
        echo "  $0                  # Run all KB + Agent tests"
        echo "  $0 --quick          # Run priority models only"
        echo "  $0 --multimodal     # Run multimodal tests only"
        exit 0
        ;;
    --quick)
        echo -e "${YELLOW}🏃 Running Quick Test Suite (Priority Models Only)${NC}"
        if [ -f "$KB_TEST_DIR/kb-agent-model-tests.spec.ts" ]; then
            run_test "$KB_TEST_DIR/kb-agent-model-tests.spec.ts" "priority-models-quick"
        fi
        ;;
    --multimodal)
        echo -e "${YELLOW}🖼️  Running Multimodal Test Suite Only${NC}"
        if [ -f "$KB_TEST_DIR/kb-agent-multimodal-tests.spec.ts" ]; then
            run_test "$KB_TEST_DIR/kb-agent-multimodal-tests.spec.ts" "multimodal-only"
        fi
        ;;
    --comprehensive)
        echo -e "${YELLOW}🎯 Running Comprehensive Test Suite Only${NC}"
        if [ -f "$KB_TEST_DIR/kb-agent-comprehensive-runner.spec.ts" ]; then
            run_test "$KB_TEST_DIR/kb-agent-comprehensive-runner.spec.ts" "comprehensive-only"
        fi
        ;;
    --baseline)
        echo -e "${YELLOW}📋 Running Baseline KB Tests Only${NC}"
        if [ -f "$KB_TEST_DIR/knowledge-base.spec.ts" ]; then
            run_test "$KB_TEST_DIR/knowledge-base.spec.ts" "baseline-only"
        fi
        ;;
    *)
        # Run all tests
        main
        ;;
esac
