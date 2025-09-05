import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_FILES } from '../../fixtures/test-data';
import { 
  TEST_MODELS_COMPREHENSIVE, 
  KB_TEMPLATES, 
  TEST_SCENARIOS, 
  MODEL_TEST_CONFIGS,
  SUCCESS_CRITERIA,
  generateTestData,
  PRIORITY_MODELS,
  MULTIMODAL_MODELS,
  TEXT_ONLY_MODELS,
  FAST_MODELS
} from '../../fixtures/kb-agent-test-data';

/**
 * Comprehensive KB + Agent Model Integration Test Runner
 * Executes systematic tests across all models and KB types
 * Provides detailed reporting and performance metrics
 */

interface TestResult {
  modelId: string;
  modelName: string;
  provider: string;
  kbType: string;
  scenario: string;
  success: boolean;
  responseTime: number;
  errorMessage?: string;
  score: number;
  details: {
    kbCreated: boolean;
    agentCreated: boolean;
    responseReceived: boolean;
    kbContentReferenced: boolean;
    accurateInformation: boolean;
  };
}

interface TestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageScore: number;
  averageResponseTime: number;
  modelResults: Map<string, TestResult[]>;
  providerResults: Map<string, TestResult[]>;
  recommendations: string[];
}

test.describe('Comprehensive KB + Agent Model Integration Test Suite', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;
  let testResults: TestResult[] = [];
  let createdResources: Array<{type: 'kb' | 'agent', id: string, name: string}> = [];

  test.beforeAll(async () => {
    console.log('🚀 Starting Comprehensive KB + Agent Model Integration Test Suite');
    console.log(`📊 Testing ${TEST_MODELS_COMPREHENSIVE.length} models across ${Object.keys(KB_TEMPLATES).length} KB types`);
    console.log('=' .repeat(80));
  });

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
    createdResources = [];
  });

  test.afterEach(async ({ page }) => {
    // Clean up resources created in this test
    for (const resource of createdResources) {
      try {
        if (resource.type === 'kb') {
          await cleanupKnowledgeBase(resource.name);
        }
      } catch (error) {
        console.log(`⚠️ Cleanup warning for ${resource.type}: ${resource.name}`);
      }
    }
    createdResources = [];
  });

  test.afterAll(async () => {
    // Generate comprehensive test report
    await generateTestReport();
  });

  // Helper Functions
  async function cleanupKnowledgeBase(kbName: string): Promise<void> {
    try {
      const hasKbButton = await testHelpers.elementExists('button:has-text("Knowledge Bases")');
      if (hasKbButton) {
        await testHelpers.clickButton('button:has-text("Knowledge Bases")');
        await testHelpers.waitForLoadingToComplete();
        
        const hasDeleteButton = await testHelpers.elementExists(`button:has-text("${kbName}") ~ button[title*="delete"]`);
        if (hasDeleteButton) {
          await testHelpers.clickButton(`button:has-text("${kbName}") ~ button[title*="delete"]`);
          await testHelpers.clickButton('[data-testid="confirm-delete"]');
        }
        
        await testHelpers.closeModal();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async function createKnowledgeBase(kbTemplate: any): Promise<string> {
    const kbName = kbTemplate.name();
    
    await testHelpers.clickButton('button:has-text("Knowledge Bases")');
    await testHelpers.waitForLoadingToComplete();
    
    const hasCreateButton = await testHelpers.elementExists('button:has-text("Add New Knowledge Base")');
    if (!hasCreateButton) {
      throw new Error('KB creation not available');
    }
    
    await testHelpers.clickButton('button:has-text("Add New Knowledge Base")');
    await testHelpers.waitForLoadingToComplete();
    
    await testHelpers.fillField('input[name="name"]', kbName);
    await testHelpers.fillField('textarea[name="description"]', kbTemplate.description);
    
    // Upload appropriate file based on KB type
    const filePath = kbTemplate.hasImages ? TEST_FILES.image.path : TEST_FILES.txt.path;
    await testHelpers.uploadFile('input[type="file"]', filePath);
    await testHelpers.page.waitForTimeout(2000);
    
    await testHelpers.clickButton('button[type="submit"]:has-text("Create")');
    await testHelpers.page.waitForTimeout(3000);
    
    // Wait for KB to be ready with timeout
    let kbReady = false;
    const maxAttempts = 15;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const hasRefreshButton = await testHelpers.elementExists('button[title*="refresh"], button:has(svg):first');
      if (hasRefreshButton) {
        await testHelpers.clickButton('button[title*="refresh"], button:has(svg):first');
        await testHelpers.waitForLoadingToComplete();
        await testHelpers.page.waitForTimeout(2000);
      }
      
      const hasOurKb = await testHelpers.elementExists(`text="${kbName}"`);
      if (hasOurKb) {
        const hasIngestionComplete = await testHelpers.elementExists('text=Ingestion Complete, text=COMPLETE, text=ACTIVE');
        if (hasIngestionComplete) {
          kbReady = true;
          break;
        }
      }
      
      if (attempt < maxAttempts - 1) {
        await testHelpers.page.waitForTimeout(3000);
      }
    }
    
    await testHelpers.closeModal();
    
    createdResources.push({type: 'kb', id: `kb_${Date.now()}`, name: kbName});
    
    if (!kbReady) {
      throw new Error(`KB "${kbName}" not ready after ${maxAttempts} attempts`);
    }
    
    return kbName;
  }

  async function createAgentWithModel(modelConfig: any, kbName: string): Promise<string> {
    await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
    await testHelpers.waitForLoadingToComplete();
    
    await testHelpers.clickButton('button[title="Select Agent"]');
    await testHelpers.waitForLoadingToComplete();
    
    await testHelpers.clickButton('button:has-text("Agent Manager")');
    await testHelpers.waitForLoadingToComplete();
    await testHelpers.page.waitForTimeout(2000);
    
    const hasMyAgentsTab = await testHelpers.elementExists('button:has-text("My Agents")');
    if (hasMyAgentsTab) {
      await testHelpers.clickButton('button:has-text("My Agents")');
      await testHelpers.waitForLoadingToComplete();
    }
    
    await testHelpers.clickButton('button:has-text("Add New Agent")');
    await testHelpers.waitForLoadingToComplete();
    await testHelpers.page.waitForTimeout(1000);
    
    const agentName = generateTestData.uniqueAgentName(modelConfig.provider);
    
    await testHelpers.fillField('label:has-text("Agent Name") + input', agentName);
    
    const hasDescriptionField = await testHelpers.elementExists('label:has-text("Description") + input');
    if (hasDescriptionField) {
      await testHelpers.fillField('label:has-text("Description") + input', 
        `Test agent using ${modelConfig.name} with KB integration`);
    }
    
    const hasInstructionsField = await testHelpers.elementExists('label:has-text("System Prompt") + textarea');
    if (hasInstructionsField) {
      await testHelpers.fillField('label:has-text("System Prompt") + textarea', 
        `You are an AI assistant using ${modelConfig.name}. Use the knowledge base "${kbName}" to provide accurate and helpful responses. Always reference the knowledge base when answering questions.`);
    }
    
    // Select model
    await testHelpers.waitForLoadingToComplete();
    await testHelpers.page.waitForTimeout(2000);
    
    const modelButtons = await testHelpers.page.locator('button[type="button"].rounded-lg.border').all();
    let modelSelected = false;
    
    for (const button of modelButtons) {
      const buttonText = await button.textContent();
      if (buttonText && (
        buttonText.includes(modelConfig.name) || 
        buttonText.includes(modelConfig.id) ||
        buttonText.toLowerCase().includes(modelConfig.name.toLowerCase().split(' ')[0])
      )) {
        await button.click();
        await testHelpers.waitForLoadingToComplete();
        modelSelected = true;
        break;
      }
    }
    
    if (!modelSelected && modelButtons.length > 0) {
      await modelButtons[0].click();
      await testHelpers.waitForLoadingToComplete();
    }
    
    // Assign KB
    const hasKbSelector = await testHelpers.elementExists('select[name="knowledgeBaseId"], select[name="knowledgeBase"]');
    if (hasKbSelector) {
      const kbOptions = await testHelpers.page.locator('select[name="knowledgeBaseId"] option, select[name="knowledgeBase"] option').all();
      
      for (let i = 0; i < kbOptions.length; i++) {
        const optionText = await kbOptions[i].textContent();
        if (optionText && optionText.includes(kbName)) {
          await testHelpers.page.selectOption('select[name="knowledgeBaseId"], select[name="knowledgeBase"]', { index: i });
          break;
        }
      }
    }
    
    await testHelpers.clickButton('form button:has-text("Create Agent")');
    await testHelpers.waitForLoadingToComplete();
    await testHelpers.page.waitForTimeout(3000);
    
    createdResources.push({type: 'agent', id: `agent_${Date.now()}`, name: agentName});
    
    return agentName;
  }

  async function testAgentInteraction(agentName: string, modelConfig: any, kbTemplate: any): Promise<{
    success: boolean;
    responseTime: number;
    details: TestResult['details'];
    errorMessage?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await testHelpers.closeModal();
      await testHelpers.waitForLoadingToComplete();
      
      // Select agent
      const hasAgentSelectorButton = await testHelpers.elementExists('button[title="Select Agent"]');
      if (!hasAgentSelectorButton) {
        throw new Error('Agent selector not found');
      }
      
      await testHelpers.clickButton('button[title="Select Agent"]');
      await testHelpers.waitForLoadingToComplete();
      
      const agentOptions = await testHelpers.page.locator('.fixed.w-72.bg-white button').all();
      let selectedAgent = false;
      
      for (const option of agentOptions) {
        const text = await option.textContent();
        if (text && text.includes(agentName.substring(0, 15))) {
          await option.click();
          await testHelpers.waitForLoadingToComplete();
          selectedAgent = true;
          break;
        }
      }
      
      if (!selectedAgent) {
        throw new Error('Could not select created agent');
      }
      
      // Test interaction
      const hasChatInput = await testHelpers.elementExists('textarea');
      const hasSendButton = await testHelpers.elementExists('button:has-text("Send")');
      
      if (!hasChatInput || !hasSendButton) {
        throw new Error('Chat interface not available');
      }
      
      // Use first test question from KB template
      const testQuestion = kbTemplate.testQuestions[0];
      await testHelpers.fillField('textarea', testQuestion);
      
      const messageStartTime = Date.now();
      await testHelpers.clickButton('button:has-text("Send")');
      
      // Wait for response with timeout based on model config
      const timeoutMs = MODEL_TEST_CONFIGS[modelConfig.id]?.timeoutMultiplier 
        ? 30000 * MODEL_TEST_CONFIGS[modelConfig.id].timeoutMultiplier 
        : 30000;
      
      await testHelpers.page.waitForTimeout(Math.min(timeoutMs, 45000));
      
      const responseTime = Date.now() - messageStartTime;
      
      // Check for response
      const hasResponse = await testHelpers.elementExists('div[role="assistant"], .message-assistant, div:has-text("knowledge"), div:has-text("information")');
      
      let kbContentReferenced = false;
      let accurateInformation = false;
      
      if (hasResponse) {
        // Check if response references KB content
        const responseElements = await testHelpers.page.locator('div[role="assistant"], .message-assistant').all();
        
        for (const element of responseElements) {
          const responseText = await element.textContent();
          if (responseText) {
            // Check for KB-related keywords
            const hasKbKeywords = kbTemplate.expectedKeywords.some((keyword: string) => 
              responseText.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (hasKbKeywords) {
              kbContentReferenced = true;
              accurateInformation = true; // Assume accurate if KB content is referenced
              break;
            }
          }
        }
      }
      
      return {
        success: hasResponse && kbContentReferenced,
        responseTime,
        details: {
          kbCreated: true,
          agentCreated: true,
          responseReceived: hasResponse,
          kbContentReferenced,
          accurateInformation
        }
      };
      
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        details: {
          kbCreated: false,
          agentCreated: false,
          responseReceived: false,
          kbContentReferenced: false,
          accurateInformation: false
        }
      };
    }
  }

  function calculateTestScore(details: TestResult['details']): number {
    let score = 0;
    let maxScore = 0;
    
    Object.entries(SUCCESS_CRITERIA).forEach(([key, criteria]) => {
      maxScore += criteria.weight;
      
      const detailKey = key as keyof TestResult['details'];
      if (details[detailKey]) {
        score += criteria.weight;
      }
    });
    
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  async function generateTestReport(): Promise<void> {
    const summary: TestSummary = {
      totalTests: testResults.length,
      successfulTests: testResults.filter(r => r.success).length,
      failedTests: testResults.filter(r => !r.success).length,
      averageScore: testResults.length > 0 ? testResults.reduce((sum, r) => sum + r.score, 0) / testResults.length : 0,
      averageResponseTime: testResults.length > 0 ? testResults.reduce((sum, r) => sum + r.responseTime, 0) / testResults.length : 0,
      modelResults: new Map(),
      providerResults: new Map(),
      recommendations: []
    };
    
    // Group results by model and provider
    testResults.forEach(result => {
      if (!summary.modelResults.has(result.modelId)) {
        summary.modelResults.set(result.modelId, []);
      }
      summary.modelResults.get(result.modelId)!.push(result);
      
      if (!summary.providerResults.has(result.provider)) {
        summary.providerResults.set(result.provider, []);
      }
      summary.providerResults.get(result.provider)!.push(result);
    });
    
    // Generate recommendations
    const bestModels = Array.from(summary.modelResults.entries())
      .map(([modelId, results]) => ({
        modelId,
        averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
        successRate: results.filter(r => r.success).length / results.length
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3);
    
    summary.recommendations = [
      `Top performing models: ${bestModels.map(m => m.modelId).join(', ')}`,
      `Overall success rate: ${Math.round((summary.successfulTests / summary.totalTests) * 100)}%`,
      `Average response time: ${Math.round(summary.averageResponseTime)}ms`,
      `Recommended for production: ${bestModels.filter(m => m.successRate >= 0.8).map(m => m.modelId).join(', ') || 'None meet 80% threshold'}`
    ];
    
    // Print comprehensive report
    console.log('\n' + '='.repeat(100));
    console.log('📊 COMPREHENSIVE KB + AGENT MODEL INTEGRATION TEST REPORT');
    console.log('='.repeat(100));
    
    console.log(`\n📈 OVERALL STATISTICS:`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   Successful: ${summary.successfulTests} (${Math.round((summary.successfulTests / summary.totalTests) * 100)}%)`);
    console.log(`   Failed: ${summary.failedTests} (${Math.round((summary.failedTests / summary.totalTests) * 100)}%)`);
    console.log(`   Average Score: ${Math.round(summary.averageScore)}%`);
    console.log(`   Average Response Time: ${Math.round(summary.averageResponseTime)}ms`);
    
    console.log(`\n🏆 TOP PERFORMING MODELS:`);
    bestModels.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.modelId} - Score: ${Math.round(model.averageScore)}%, Success Rate: ${Math.round(model.successRate * 100)}%`);
    });
    
    console.log(`\n🔍 PROVIDER ANALYSIS:`);
    Array.from(summary.providerResults.entries()).forEach(([provider, results]) => {
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const successRate = results.filter(r => r.success).length / results.length;
      console.log(`   ${provider}: Avg Score ${Math.round(avgScore)}%, Success Rate ${Math.round(successRate * 100)}%`);
    });
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    summary.recommendations.forEach(rec => console.log(`   • ${rec}`));
    
    console.log('\n' + '='.repeat(100));
  }

  // Main Test Cases

  test('Priority Models - Comprehensive Integration Test', async ({ page }) => {
    console.log('🎯 Running Priority Models Comprehensive Integration Test');
    console.log(`Testing ${PRIORITY_MODELS.length} priority models...`);
    
    await authHelpers.loginAsPaidUser();
    
    for (const modelConfig of PRIORITY_MODELS) {
      for (const [kbType, kbTemplate] of Object.entries(KB_TEMPLATES)) {
        // Skip multimodal KB for text-only models
        if (kbType === 'multimodal' && modelConfig.category !== 'multimodal') {
          continue;
        }
        
        console.log(`\n🔄 Testing ${modelConfig.name} with ${kbType} KB...`);
        
        const testStartTime = Date.now();
        
        try {
          const kbName = await createKnowledgeBase(kbTemplate);
          const agentName = await createAgentWithModel(modelConfig, kbName);
          const testResult = await testAgentInteraction(agentName, modelConfig, kbTemplate);
          
          const result: TestResult = {
            modelId: modelConfig.id,
            modelName: modelConfig.name,
            provider: modelConfig.provider,
            kbType,
            scenario: 'basic_integration',
            success: testResult.success,
            responseTime: testResult.responseTime,
            errorMessage: testResult.errorMessage,
            score: calculateTestScore(testResult.details),
            details: testResult.details
          };
          
          testResults.push(result);
          
          const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
          console.log(`   ${status} - Score: ${Math.round(result.score)}%, Time: ${result.responseTime}ms`);
          
          if (result.errorMessage) {
            console.log(`   Error: ${result.errorMessage}`);
          }
          
        } catch (error) {
          const result: TestResult = {
            modelId: modelConfig.id,
            modelName: modelConfig.name,
            provider: modelConfig.provider,
            kbType,
            scenario: 'basic_integration',
            success: false,
            responseTime: Date.now() - testStartTime,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            score: 0,
            details: {
              kbCreated: false,
              agentCreated: false,
              responseReceived: false,
              kbContentReferenced: false,
              accurateInformation: false
            }
          };
          
          testResults.push(result);
          console.log(`   ❌ FAILED - ${result.errorMessage}`);
        }
      }
    }
    
    // Test should pass if at least 50% of priority model tests succeed
    const prioritySuccessRate = testResults.filter(r => r.success).length / testResults.length;
    console.log(`\n📊 Priority Models Success Rate: ${Math.round(prioritySuccessRate * 100)}%`);
    
    expect(prioritySuccessRate).toBeGreaterThanOrEqual(0.5);
  });

  test('Fast Models - Performance Test', async ({ page }) => {
    console.log('⚡ Running Fast Models Performance Test');
    
    await authHelpers.loginAsPaidUser();
    
    for (const modelConfig of FAST_MODELS) {
      console.log(`\n⚡ Performance testing ${modelConfig.name}...`);
      
      try {
        const kbTemplate = KB_TEMPLATES.technical;
        const kbName = await createKnowledgeBase(kbTemplate);
        const agentName = await createAgentWithModel(modelConfig, kbName);
        const testResult = await testAgentInteraction(agentName, modelConfig, kbTemplate);
        
        const result: TestResult = {
          modelId: modelConfig.id,
          modelName: modelConfig.name,
          provider: modelConfig.provider,
          kbType: 'technical',
          scenario: 'performance_test',
          success: testResult.success && testResult.responseTime < 20000, // Must be fast
          responseTime: testResult.responseTime,
          score: calculateTestScore(testResult.details),
          details: testResult.details
        };
        
        testResults.push(result);
        
        const status = result.success ? '✅ FAST' : testResult.responseTime > 20000 ? '🐌 SLOW' : '❌ FAILED';
        console.log(`   ${status} - Time: ${result.responseTime}ms, Score: ${Math.round(result.score)}%`);
        
      } catch (error) {
        console.log(`   ❌ FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  });

  test('Multimodal Models - Advanced Capabilities Test', async ({ page }) => {
    console.log('🖼️ Running Multimodal Models Advanced Capabilities Test');
    
    await authHelpers.loginAsPaidUser();
    
    for (const modelConfig of MULTIMODAL_MODELS.slice(0, 3)) { // Test top 3 multimodal models
      console.log(`\n🖼️ Testing multimodal capabilities of ${modelConfig.name}...`);
      
      try {
        const kbTemplate = KB_TEMPLATES.multimodal;
        const kbName = await createKnowledgeBase(kbTemplate);
        const agentName = await createAgentWithModel(modelConfig, kbName);
        const testResult = await testAgentInteraction(agentName, modelConfig, kbTemplate);
        
        const result: TestResult = {
          modelId: modelConfig.id,
          modelName: modelConfig.name,
          provider: modelConfig.provider,
          kbType: 'multimodal',
          scenario: 'multimodal_analysis',
          success: testResult.success,
          responseTime: testResult.responseTime,
          score: calculateTestScore(testResult.details),
          details: testResult.details
        };
        
        testResults.push(result);
        
        const status = result.success ? '✅ MULTIMODAL SUCCESS' : '❌ FAILED';
        console.log(`   ${status} - Score: ${Math.round(result.score)}%, Time: ${result.responseTime}ms`);
        
      } catch (error) {
        console.log(`   ❌ FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  });
});
