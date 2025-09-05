#!/bin/bash

# Claude 3.5 Sonnet Citation Verification Test Runner
# Focused test for Claude 3.5 Sonnet model citation capabilities

echo "🎯 Claude 3.5 Sonnet Citation Verification Test"
echo "=============================================="

# Set test environment
export NODE_ENV=test
export PLAYWRIGHT_BROWSERS_PATH=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Test Target: Claude 3.5 Sonnet Model${NC}"
echo -e "${BLUE}📋 Test Focus: Citation Verification & Document Referencing${NC}"
echo -e "${BLUE}⏱️  Expected Duration: 3-5 minutes${NC}"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in webapp directory${NC}"
    echo "Please run this script from the webapp directory:"
    echo "cd /Users/trungntt/Projects/LEGAIA/webapp"
    exit 1
fi

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx not found${NC}"
    echo "Please install Node.js and npm first"
    exit 1
fi

# Function to run Claude 3.5 Sonnet test
run_claude_test() {
    echo -e "${PURPLE}🧪 Running Claude 3.5 Sonnet Citation Test...${NC}"
    echo "   Test File: claude-sonnet-citation-test.spec.ts"
    echo "   Started: $(date)"
    echo ""
    
    # Try to run the test with different configurations
    echo -e "${YELLOW}🔄 Attempting test execution...${NC}"
    
    # Method 1: Try with minimal configuration
    echo "Method 1: Minimal configuration..."
    npx playwright test tests/e2e/knowledge-base/claude-sonnet-citation-test.spec.ts \
        --timeout=180000 \
        --retries=1 \
        --reporter=list \
        --output=test-results/claude-sonnet \
        2>/dev/null
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Claude 3.5 Sonnet Test - SUCCESS${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ Method 1 failed, trying alternative approach...${NC}"
        
        # Method 2: Try with headed mode for debugging
        echo "Method 2: Headed mode for debugging..."
        npx playwright test tests/e2e/knowledge-base/claude-sonnet-citation-test.spec.ts \
            --headed \
            --timeout=180000 \
            --retries=0 \
            --reporter=list \
            2>/dev/null
        
        exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            echo -e "${GREEN}✅ Claude 3.5 Sonnet Test - SUCCESS (Headed Mode)${NC}"
            return 0
        else
            echo -e "${RED}❌ Claude 3.5 Sonnet Test - FAILED${NC}"
            return 1
        fi
    fi
}

# Function to show test information
show_test_info() {
    echo -e "${BLUE}📖 Claude 3.5 Sonnet Test Information:${NC}"
    echo ""
    echo "This test will:"
    echo "1. 📚 Create a knowledge base with test documents"
    echo "2. 🤖 Create an agent specifically configured for Claude 3.5 Sonnet"
    echo "3. 🎯 Select Claude 3.5 Sonnet model (or best available alternative)"
    echo "4. 🔍 Run 3 specialized citation verification scenarios:"
    echo "   - Advanced Citation Analysis"
    echo "   - Direct Quote Extraction"
    echo "   - Multi-Source Analysis"
    echo "5. 📊 Generate detailed performance report"
    echo ""
    echo "Expected Results:"
    echo "- Citation accuracy: 80%+ (Excellent for Claude 3.5 Sonnet)"
    echo "- Response quality: Detailed, well-structured"
    echo "- Source attribution: Proper document referencing"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking Prerequisites...${NC}"
    
    # Check if test files exist
    if [ ! -f "tests/e2e/knowledge-base/claude-sonnet-citation-test.spec.ts" ]; then
        echo -e "${RED}❌ Claude 3.5 Sonnet test file not found${NC}"
        return 1
    fi
    
    # Check if utils exist
    if [ ! -d "tests/utils" ]; then
        echo -e "${RED}❌ Test utilities not found${NC}"
        return 1
    fi
    
    # Check if fixtures exist
    if [ ! -d "tests/fixtures" ]; then
        echo -e "${RED}❌ Test fixtures not found${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    return 0
}

# Main execution
echo -e "${PURPLE}🚀 Starting Claude 3.5 Sonnet Citation Verification...${NC}"
echo ""

# Show test information
show_test_info

# Check prerequisites
if ! check_prerequisites; then
    echo -e "${RED}❌ Prerequisites check failed${NC}"
    exit 1
fi

# Ask user if they want to continue
echo -e "${YELLOW}⚠️  Note: This test requires a running application instance${NC}"
echo -e "${YELLOW}   Make sure your LEGAIA application is accessible${NC}"
echo ""
read -p "Continue with Claude 3.5 Sonnet test? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🛑 Test cancelled by user${NC}"
    exit 0
fi

# Run the Claude 3.5 Sonnet test
echo -e "${PURPLE}🎯 Executing Claude 3.5 Sonnet Citation Test...${NC}"
echo ""

run_claude_test
test_result=$?

# Summary
echo ""
echo "=============================================="
echo -e "${BLUE}📊 CLAUDE 3.5 SONNET TEST SUMMARY${NC}"
echo "=============================================="

if [ $test_result -eq 0 ]; then
    echo -e "✅ Claude 3.5 Sonnet Citation Test: ${GREEN}PASSED${NC}"
    echo ""
    echo -e "${GREEN}🎉 Claude 3.5 Sonnet demonstrates excellent citation capabilities!${NC}"
    echo -e "${GREEN}📚 The model successfully references documents and provides accurate citations${NC}"
    echo -e "${GREEN}🏆 Citation accuracy meets or exceeds expected standards${NC}"
else
    echo -e "❌ Claude 3.5 Sonnet Citation Test: ${RED}FAILED${NC}"
    echo ""
    echo -e "${RED}⚠️ Claude 3.5 Sonnet citation test encountered issues${NC}"
    echo -e "${YELLOW}💡 Possible causes:${NC}"
    echo "   - Application not running or not accessible"
    echo "   - Authentication issues"
    echo "   - Model not available in current environment"
    echo "   - Knowledge base creation/sync issues"
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
if [ $test_result -eq 0 ]; then
    echo "1. Review detailed test results in console output above"
    echo "2. Check citation accuracy scores and recommendations"
    echo "3. Use results to optimize Claude 3.5 Sonnet integration"
    echo "4. Run additional model tests for comparison"
else
    echo "1. Check application accessibility and authentication"
    echo "2. Verify Claude 3.5 Sonnet model availability"
    echo "3. Review test logs for specific error details"
    echo "4. Try running test in headed mode for visual debugging"
fi

echo ""
echo -e "${BLUE}🔧 Debug Commands:${NC}"
echo "# Run with visual debugging:"
echo "npx playwright test tests/e2e/knowledge-base/claude-sonnet-citation-test.spec.ts --headed"
echo ""
echo "# Generate detailed traces:"
echo "npx playwright test tests/e2e/knowledge-base/claude-sonnet-citation-test.spec.ts --trace=on"
echo ""

# Exit with appropriate code
exit $test_result
