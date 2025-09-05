# Knowledge Base + Agent Model Integration Test Suite

This comprehensive test suite validates the integration between Knowledge Bases (KB) and AI Agents across all available models in the system. Each model is tested with different KB types to ensure proper functionality and performance.

## 📋 Test Overview

### Test Coverage
- **11+ AI Models** across 4 providers (Anthropic, Amazon, Meta, Cohere)
- **5 Knowledge Base Types** (Technical, Business, Product, Legal, Multimodal)
- **5 Test Scenarios** (Basic Integration, Complex Reasoning, Multimodal Analysis, Performance, Stress Testing)
- **Comprehensive Reporting** with performance metrics and recommendations

### Models Tested

#### Anthropic Models
- **Claude 3.5 Sonnet v2** - Latest multimodal model with advanced reasoning
- **Claude 3.5 Sonnet** - High-performance multimodal model
- **Claude 3 Sonnet** - Balanced performance and speed
- **Claude 3 Haiku** - Fast and efficient text model
- **Claude 3 Opus** - Most capable multimodal Claude model

#### Amazon Titan Models
- **Titan Text Premier** - Amazon's premier text model
- **Titan Text Express** - Fast Amazon text model
- **Titan Text Lite** - Lightweight text model

#### Meta Llama Models
- **Llama 3.2 90B** - Large model with extensive capabilities
- **Llama 3.2 11B** - Multimodal Llama model
- **Llama 3.2 3B** - Compact multimodal model
- **Llama 3.2 1B** - Lightweight text model

#### Cohere Models
- **Command R+** - Advanced model with RAG capabilities
- **Command R** - Model optimized for RAG

## 🎯 Enhanced Citation Verification Features

### **NEW: Dedicated Citation Testing** 🆕

We've added comprehensive citation verification capabilities to ensure AI agents properly reference and cite uploaded documents:

#### **New Test Files**
- **`kb-citation-verification.spec.ts`** - Dedicated citation verification test suite
- **`run-citation-tests.sh`** - Specialized citation test runner

#### **Citation Test Scenarios**
1. **Basic Citation Request** - General source attribution testing
2. **Direct Quote Request** - Exact text extraction with quotation marks  
3. **Source Verification** - Document name and file identification
4. **Citation Format Test** - Formal citation structure validation
5. **Multiple Source Test** - Cross-document reference comparison
6. **Consistency Testing** - Citation accuracy across multiple queries

#### **Enhanced Citation Patterns Detected**
**Basic Patterns:**
- Direct attribution: "According to [document]"
- Source references: "Based on the document"
- Formal citations: "Source: [filename]"
- Document structure: "Page X states"
- Knowledge base references: "From your uploaded file"

**Enhanced Patterns:**
- Document name references: "filename.txt", "document.pdf"
- Structural references: "line", "excerpt", "passage", "section"
- Attribution phrases: "from your knowledge base", "in your uploaded document"
- Quote indicators: quotation marks, "states:", "excerpt"
- Source material references: "original document", "uploaded file"

#### **Citation Scoring System**
```
Citation Score = (Found Patterns / Expected Patterns) × 100%

Grading Scale:
- Excellent (80-100%): ✅ Comprehensive citation accuracy
- Good (60-79%): 👍 Adequate citation with minor improvements needed
- Fair (40-59%): ⚠️ Basic citation functionality, needs enhancement
- Poor (0-39%): ❌ Significant citation issues, requires attention
```

### **Running Citation Tests**

#### **Quick Citation Testing**
```bash
# Run comprehensive citation verification
./run-citation-tests.sh

# Run specific citation test file
npx playwright test kb-citation-verification.spec.ts

# Run enhanced model tests with citation focus
npx playwright test kb-agent-model-tests.spec.ts -g "citation"
```

#### **Citation Debug Commands**
```bash
# Run citation tests with verbose logging
DEBUG=pw:api npx playwright test kb-citation-verification.spec.ts

# Generate citation test traces
npx playwright test kb-citation-verification.spec.ts --trace=on

# Run citation tests in headed mode for visual debugging
npx playwright test kb-citation-verification.spec.ts --headed

# Take screenshots of citation responses
npx playwright test kb-citation-verification.spec.ts --screenshot=only-on-failure
```

### **Citation Performance Benchmarks**
- **Citation Response Time**: 8-15 seconds for document-specific queries
- **Quote Extraction Time**: 10-20 seconds for direct quote requests
- **Multi-source Analysis**: 15-30 seconds for cross-document queries
- **Expected Citation Accuracy**: 70%+ for basic models, 80%+ for premium models

### **Citation Test Workflow**
1. **KB Creation**: Upload test documents with known content
2. **Agent Creation**: Configure with citation-focused system prompts
3. **Citation Testing**: Run 5 specialized citation test scenarios
4. **Pattern Analysis**: Detect citation indicators in responses
5. **Scoring**: Calculate citation accuracy scores
6. **Reporting**: Generate comprehensive citation assessment

### **System Prompt for Citation Testing**
```
You are an AI assistant focused on providing accurate citations and document references. When answering questions:
1. Always cite your sources using phrases like "According to [document name]" or "Based on the document [filename]"
2. Include specific references to sections, pages, or content when possible
3. Use quotation marks when directly quoting from documents
4. Clearly distinguish between information from the knowledge base and your general knowledge
5. When unsure about a source, explicitly state the uncertainty
```

tests/scripts/
└── run-kb-agent-tests.sh                      # Test execution script
```

## 🧪 Test Types

### 1. Basic Model Integration Tests (`kb-agent-model-tests.spec.ts`)
Tests each model with different KB types to verify:
- ✅ KB creation and synchronization
- ✅ Agent creation with specific model selection
- ✅ KB assignment to agent
- ✅ Agent response using KB information
- ✅ Response accuracy and relevance

**Example Test Flow:**
```typescript
// For each model (Claude 3.5 Sonnet, Llama 3.2, etc.)
1. Create Knowledge Base with technical documentation
2. Create Agent using specific model (e.g., Claude 3.5 Sonnet)
3. Assign KB to Agent
4. Test Agent with KB-related questions
5. Verify Agent uses KB information in responses
6. Measure response time and accuracy
```

### 2. Multimodal Integration Tests (`kb-agent-multimodal-tests.spec.ts`)
Specialized tests for models with image/vision capabilities:
- 🖼️ Image analysis with KB context
- 📄 Document processing with visual elements
- 🔄 Mixed text and visual content handling
- 🎯 Multimodal reasoning capabilities

**Multimodal Models Tested:**
- Claude 3.5 Sonnet v2 (Advanced vision)
- Claude 3.5 Sonnet (High-performance multimodal)
- Claude 3 Opus (Most capable multimodal)
- Llama 3.2 11B (Multimodal Llama)
- Llama 3.2 3B (Compact multimodal)

### 3. Comprehensive Test Runner (`kb-agent-comprehensive-runner.spec.ts`)
Systematic testing across all models with detailed reporting:
- 📊 Performance metrics collection
- 🏆 Model ranking and comparison
- 💡 Recommendations for production use
- 📈 Success rate analysis by provider
- ⚡ Response time benchmarking

## 🚀 Running the Tests

### Quick Start
```bash
# Run all KB + Agent integration tests
cd webapp
npm run test:e2e -- tests/e2e/knowledge-base/kb-agent-model-tests.spec.ts --config=playwright.config.simple.ts --reporter=line

# Run multimodal tests only
npm run test:e2e -- tests/e2e/knowledge-base/kb-agent-multimodal-tests.spec.ts --config=playwright.config.simple.ts --reporter=line

# Run comprehensive test suite
npm run test:e2e -- tests/e2e/knowledge-base/kb-agent-comprehensive-runner.spec.ts --config=playwright.config.simple.ts --reporter=line
```

### Using the Test Runner Script
```bash
# Run all tests with comprehensive reporting
./tests/scripts/run-kb-agent-tests.sh

# Quick test (priority models only)
./tests/scripts/run-kb-agent-tests.sh --quick

# Multimodal tests only
./tests/scripts/run-kb-agent-tests.sh --multimodal

# Comprehensive analysis
./tests/scripts/run-kb-agent-tests.sh --comprehensive

# Show help
./tests/scripts/run-kb-agent-tests.sh --help
```

## 📊 Test Data and Scenarios

### Knowledge Base Templates

#### Technical KB
```typescript
{
  name: "TechKB_[timestamp]_[random]",
  description: "Technical documentation and API references",
  content: "API documentation, development best practices, architecture patterns...",
  testQuestions: [
    "What API documentation do you have access to?",
    "Can you help me with software development best practices?"
  ]
}
```

#### Business KB
```typescript
{
  name: "BusinessKB_[timestamp]_[random]",
  description: "Business processes, policies, and procedures",
  content: "Company policies, business processes, financial procedures...",
  testQuestions: [
    "What company policies can you help me understand?",
    "Can you explain our business processes?"
  ]
}
```

#### Multimodal KB
```typescript
{
  name: "MultiKB_[timestamp]_[random]",
  description: "Mixed content with text, images, and documents",
  content: "Visual content analysis, image recognition, document processing...",
  testQuestions: [
    "Can you analyze images and visual content?",
    "How do you handle documents with both text and images?"
  ],
  hasImages: true
}
```

### Success Criteria

Tests are evaluated based on multiple criteria with weighted scoring:

| Criteria | Weight | Required | Description |
|----------|--------|----------|-------------|
| Response Received | 1 | ✅ | Agent provides any response |
| KB Content Referenced | 3 | ✅ | Response references KB content |
| Accurate Information | 4 | ✅ | Response contains accurate information |
| Contextual Understanding | 3 | ❌ | Response shows context understanding |
| Reasoning Demonstrated | 2 | ❌ | Response shows logical reasoning |
| Multimodal Capability | 2 | ❌ | Handles text and visual content |
| Performance Acceptable | 1 | ❌ | Response time within limits |

## 📈 Expected Results

### Model Performance Expectations

#### Tier 1 (Premium Models)
- **Claude 3.5 Sonnet v2**: 95%+ success rate, advanced reasoning
- **Claude 3 Opus**: 90%+ success rate, multimodal excellence
- **Llama 3.2 90B**: 85%+ success rate, large context handling

#### Tier 2 (Standard Models)
- **Claude 3.5 Sonnet**: 85%+ success rate, balanced performance
- **Claude 3 Sonnet**: 80%+ success rate, good multimodal
- **Llama 3.2 11B**: 75%+ success rate, decent multimodal

#### Tier 3 (Basic Models)
- **Claude 3 Haiku**: 70%+ success rate, fast responses
- **Titan Text Express**: 65%+ success rate, basic integration
- **Llama 3.2 1B**: 60%+ success rate, lightweight

### Performance Benchmarks

| Model Category | Expected Response Time | Success Rate Target |
|----------------|----------------------|-------------------|
| Fast Models | < 10 seconds | 70%+ |
| Standard Models | < 20 seconds | 80%+ |
| Premium Models | < 30 seconds | 90%+ |
| Multimodal Models | < 45 seconds | 85%+ |

## 🔧 Test Configuration

### Environment Requirements
- **Authentication**: Paid user account (required for KB access)
- **Browser**: Chromium (configured in playwright.config.simple.ts)
- **Timeout**: 5 minutes per test (configurable)
- **Retries**: 1 retry on failure
- **Parallel Execution**: Disabled for stability

### Test Data Files
- **Text Files**: `tests/fixtures/files/test-document.txt`
- **Image Files**: `tests/fixtures/files/test-image.png`
- **PDF Files**: `tests/fixtures/files/test-document.pdf`

## 📋 Test Reports

### Automated Reporting
Each test run generates:
- **HTML Report**: Detailed test results with screenshots
- **JSON Report**: Machine-readable results for CI/CD
- **Line Report**: Console output with real-time progress
- **Screenshots**: Captured on failure for debugging
- **Traces**: Full interaction traces for analysis

### Sample Report Output
```
📊 COMPREHENSIVE KB + AGENT MODEL INTEGRATION TEST REPORT
================================================================

📈 OVERALL STATISTICS:
   Total Tests: 45
   Successful: 38 (84%)
   Failed: 7 (16%)
   Average Score: 87%
   Average Response Time: 18,500ms

🏆 TOP PERFORMING MODELS:
   1. anthropic.claude-3-5-sonnet-20241022-v2:0 - Score: 95%, Success Rate: 100%
   2. anthropic.claude-3-opus-20240229-v1:0 - Score: 92%, Success Rate: 95%
   3. meta.llama3-2-90b-instruct-v1:0 - Score: 88%, Success Rate: 90%

🔍 PROVIDER ANALYSIS:
   Anthropic: Avg Score 89%, Success Rate 92%
   Meta: Avg Score 82%, Success Rate 85%
   Amazon: Avg Score 75%, Success Rate 78%
   Cohere: Avg Score 80%, Success Rate 82%

💡 RECOMMENDATIONS:
   • Top performing models: Claude 3.5 Sonnet v2, Claude 3 Opus, Llama 3.2 90B
   • Overall success rate: 84%
   • Average response time: 18,500ms
   • Recommended for production: Claude 3.5 Sonnet v2, Claude 3 Opus
```

## 🐛 Troubleshooting

### Common Issues

#### KB Creation Failures
```bash
# Symptoms: KB not appearing in manager after creation
# Solution: Increase wait time for KB ingestion
await page.waitForTimeout(5000); // Increase timeout
```

#### Agent Selection Issues
```bash
# Symptoms: Created agent not found in dropdown
# Solution: Check agent name truncation in selector
const agentName = agentName.substring(0, 15); // Truncate for matching
```

#### Model Selection Problems
```bash
# Symptoms: Specific model not selected
# Solution: Use fallback model selection
if (!modelSelected && modelButtons.length > 0) {
  await modelButtons[0].click(); // Fallback to first available
}
```

### Debug Mode
```bash
# Run tests with debug output
DEBUG=1 ./tests/scripts/run-kb-agent-tests.sh

# Run single test with trace
npx playwright test tests/e2e/knowledge-base/kb-agent-model-tests.spec.ts --debug --trace=on
```

## 🎯 Future Enhancements

### Planned Improvements
1. **Additional Models**: Integration of new models as they become available
2. **Performance Optimization**: Parallel test execution for faster runs
3. **Advanced Scenarios**: Complex multi-turn conversations with KB
4. **Real-time Monitoring**: Live performance dashboards
5. **A/B Testing**: Model comparison with statistical significance
6. **Load Testing**: Concurrent user simulation with KB access

### Contributing
To add new models or test scenarios:
1. Update `kb-agent-test-data.ts` with new model configurations
2. Add model-specific test cases in appropriate test files
3. Update documentation with new model expectations
4. Run full test suite to validate integration

---

This comprehensive test suite ensures that all AI models work correctly with Knowledge Base integration, providing confidence in the system's reliability and performance across different use cases and model capabilities.
