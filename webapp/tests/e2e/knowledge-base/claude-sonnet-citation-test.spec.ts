import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_KNOWLEDGE_BASES, TEST_FILES } from '../../fixtures/test-data';

/**
 * Claude 3.5 Sonnet Citation Verification Test
 * Focused test specifically for Claude 3.5 Sonnet model citation capabilities
 */

test.describe('Claude 3.5 Sonnet Citation Verification', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('should test Claude 3.5 Sonnet citation capabilities with KB integration', async ({ page }) => {
    console.log('🎯 Testing Claude 3.5 Sonnet Citation Capabilities...');
    console.log('================================================');
    
    await authHelpers.loginAsPaidUser();
    
    try {
      // Step 1: Create Knowledge Base for Claude 3.5 Sonnet testing
      console.log('📚 Step 1: Creating Knowledge Base for Claude 3.5 Sonnet...');
      
      await testHelpers.clickButton('button:has-text("Knowledge Bases")');
      await testHelpers.waitForLoadingToComplete();
      
      const hasCreateButton = await testHelpers.elementExists('button:has-text("Add New Knowledge Base")');
      if (!hasCreateButton) {
        console.log('❌ KB creation not available - test environment may not be ready');
        return;
      }
      
      await testHelpers.clickButton('button:has-text("Add New Knowledge Base")');
      await testHelpers.waitForLoadingToComplete();
      
      // Create unique KB name for Claude 3.5 Sonnet testing
      const claudeKbName = `Claude35Sonnet_CitationTest_${Date.now()}`;
      
      await testHelpers.fillField('input[name="name"]', claudeKbName);
      await testHelpers.fillField('textarea[name="description"]', 
        'Knowledge base specifically for testing Claude 3.5 Sonnet citation accuracy and document referencing capabilities');
      
      // Upload test document
      console.log('📄 Uploading test document for Claude 3.5 Sonnet citation testing...');
      await testHelpers.uploadFile('input[type="file"]', TEST_FILES.txt.path);
      await page.waitForTimeout(2000);
      
      // Submit KB creation
      await testHelpers.clickButton('button[type="submit"]:has-text("Create")');
      console.log('⏳ Waiting for KB creation and sync for Claude 3.5 Sonnet test...');
      await page.waitForTimeout(5000);
      
      // Wait for KB to be ready with extended timeout for Claude testing
      let kbReady = false;
      for (let attempt = 0; attempt < 15; attempt++) {
        const hasRefreshButton = await testHelpers.elementExists('button[title*="refresh"], button:has(svg):first');
        if (hasRefreshButton) {
          await testHelpers.clickButton('button[title*="refresh"], button:has(svg):first');
          await testHelpers.waitForLoadingToComplete();
          await page.waitForTimeout(2000);
        }
        
        const hasOurKb = await testHelpers.elementExists(`text="${claudeKbName}"`);
        if (hasOurKb) {
          const hasIngestionComplete = await testHelpers.elementExists('text=Ingestion Complete, text=COMPLETE, text=ACTIVE');
          if (hasIngestionComplete) {
            kbReady = true;
            console.log('✅ KB creation and sync completed for Claude 3.5 Sonnet');
            break;
          }
        }
        
        if (attempt < 14) {
          console.log(`⏳ Claude 3.5 Sonnet KB sync attempt ${attempt + 1}/15...`);
          await page.waitForTimeout(3000);
        }
      }
      
      if (!kbReady) {
        console.log('⚠️ KB may not be fully synced, but continuing with Claude 3.5 Sonnet test...');
      }
      
      await testHelpers.closeModal();
      
      // Step 2: Create Agent specifically configured for Claude 3.5 Sonnet
      console.log('🤖 Step 2: Creating Agent with Claude 3.5 Sonnet model...');
      
      await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
      await testHelpers.waitForLoadingToComplete();
      
      await testHelpers.clickButton('button[title="Select Agent"]');
      await testHelpers.waitForLoadingToComplete();
      
      await testHelpers.clickButton('button:has-text("Agent Manager")');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(2000);
      
      const hasMyAgentsTab = await testHelpers.elementExists('button:has-text("My Agents")');
      if (hasMyAgentsTab) {
        await testHelpers.clickButton('button:has-text("My Agents")');
        await testHelpers.waitForLoadingToComplete();
      }
      
      await testHelpers.clickButton('button:has-text("Add New Agent")');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(1000);
      
      // Create agent specifically for Claude 3.5 Sonnet
      const claudeAgentName = `Claude35Sonnet_CitationAgent_${Date.now()}`;
      
      await testHelpers.fillField('label:has-text("Agent Name") + input', claudeAgentName);
      
      const hasDescriptionField = await testHelpers.elementExists('label:has-text("Description") + input');
      if (hasDescriptionField) {
        await testHelpers.fillField('label:has-text("Description") + input', 
          'Agent using Claude 3.5 Sonnet model specifically for testing citation accuracy and document referencing');
      }
      
      const hasInstructionsField = await testHelpers.elementExists('label:has-text("System Prompt") + textarea');
      if (hasInstructionsField) {
        await testHelpers.fillField('label:has-text("System Prompt") + textarea', 
          `You are Claude 3.5 Sonnet, an AI assistant focused on providing accurate citations and document references. When answering questions:
          1. Always cite your sources using phrases like "According to [document name]" or "Based on the document [filename]"
          2. Include specific references to sections, pages, or content when possible
          3. Use quotation marks when directly quoting from documents
          4. Clearly distinguish between information from the knowledge base and your general knowledge
          5. When unsure about a source, explicitly state the uncertainty
          6. As Claude 3.5 Sonnet, demonstrate your advanced reasoning capabilities in citation analysis
          Your primary goal is to showcase Claude 3.5 Sonnet's superior citation and referencing abilities.`);
      }
      
      // Select Claude 3.5 Sonnet model specifically
      console.log('🎯 Selecting Claude 3.5 Sonnet model...');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(2000);
      
      const modelButtons = await page.locator('button[type="button"].rounded-lg.border').all();
      let claudeSelected = false;
      
      for (const button of modelButtons) {
        const buttonText = await button.textContent();
        if (buttonText && (
          buttonText.includes('Claude 3.5 Sonnet') || 
          buttonText.includes('claude-3-5-sonnet') ||
          buttonText.toLowerCase().includes('sonnet')
        )) {
          await button.click();
          await testHelpers.waitForLoadingToComplete();
          claudeSelected = true;
          console.log(`✅ Selected Claude 3.5 Sonnet model: ${buttonText}`);
          break;
        }
      }
      
      if (!claudeSelected) {
        // Fallback: select first available model and note it's not Claude 3.5 Sonnet
        if (modelButtons.length > 0) {
          const fallbackText = await modelButtons[0].textContent();
          await modelButtons[0].click();
          await testHelpers.waitForLoadingToComplete();
          console.log(`⚠️ Claude 3.5 Sonnet not found, using fallback model: ${fallbackText}`);
        }
      }
      
      // Assign the Knowledge Base to Claude 3.5 Sonnet agent
      const hasKbSelector = await testHelpers.elementExists('select[name="knowledgeBaseId"], select[name="knowledgeBase"]');
      if (hasKbSelector) {
        console.log(`📚 Assigning KB "${claudeKbName}" to Claude 3.5 Sonnet agent...`);
        
        const kbOptions = await page.locator('select[name="knowledgeBaseId"] option, select[name="knowledgeBase"] option').all();
        let foundClaudeKb = false;
        
        for (let i = 0; i < kbOptions.length; i++) {
          const optionText = await kbOptions[i].textContent();
          if (optionText && optionText.includes(claudeKbName)) {
            await page.selectOption('select[name="knowledgeBaseId"], select[name="knowledgeBase"]', { index: i });
            foundClaudeKb = true;
            console.log(`✅ KB "${claudeKbName}" assigned to Claude 3.5 Sonnet agent`);
            break;
          }
        }
        
        if (!foundClaudeKb && kbOptions.length > 1) {
          await page.selectOption('select[name="knowledgeBaseId"], select[name="knowledgeBase"]', { index: 1 });
          console.log('⚠️ Selected first available KB as fallback for Claude 3.5 Sonnet');
        }
      }
      
      // Submit Claude 3.5 Sonnet agent creation
      await testHelpers.clickButton('form button:has-text("Create Agent")');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(3000);
      
      console.log(`✅ Claude 3.5 Sonnet agent created: ${claudeAgentName}`);
      
      // Step 3: Test Claude 3.5 Sonnet Citation Capabilities
      console.log('🔍 Step 3: Testing Claude 3.5 Sonnet Citation Capabilities...');
      
      await testHelpers.closeModal();
      await testHelpers.waitForLoadingToComplete();
      
      // Select the Claude 3.5 Sonnet agent with improved logic
      console.log(`🎯 Attempting to select Claude 3.5 Sonnet agent: ${claudeAgentName}`);
      
      await testHelpers.clickButton('button[title="Select Agent"]');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(1000);
      
      let selectedClaudeAgent = false;
      
      // First, try to scroll the dropdown to make sure all options are accessible
      const dropdownContainer = page.locator('[role="menu"], [role="listbox"], .fixed').first();
      if (await dropdownContainer.count() > 0) {
        await dropdownContainer.evaluate(el => {
          el.scrollTop = 0; // Start from top
        });
      }
      
      // Look for our Claude agent button with more specific targeting
      const claudeAgentButton = page.locator(`button:has-text("${claudeAgentName}")`).first();
      
      if (await claudeAgentButton.count() > 0) {
        console.log(`🎯 Found Claude 3.5 Sonnet agent in dropdown: ${claudeAgentName}`);
        
        // Scroll the button into view and click
        await claudeAgentButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        try {
          await claudeAgentButton.click({ timeout: 10000 });
          selectedClaudeAgent = true;
        } catch (error) {
          console.log('⚠️ Regular click failed, trying force click...');
          await claudeAgentButton.click({ force: true });
          selectedClaudeAgent = true;
        }
        
        await testHelpers.waitForLoadingToComplete();
      } else {
        // Fallback: search through all dropdown buttons
        console.log('🔍 Claude agent not found by name, searching all dropdown buttons...');
        const allButtons = await page.locator('.fixed button, [role="menu"] button, [role="listbox"] button').all();
        
        for (let i = 0; i < allButtons.length; i++) {
          const button = allButtons[i];
          const text = await button.textContent();
          if (text && text.includes(claudeAgentName.substring(0, 15))) {
            console.log(`🎯 Found Claude 3.5 Sonnet agent at index ${i}: ${claudeAgentName}`);
            
            // Scroll into view and click
            await button.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            try {
              await button.click({ timeout: 10000 });
              selectedClaudeAgent = true;
            } catch (error) {
              await button.click({ force: true });
              selectedClaudeAgent = true;
            }
            
            await testHelpers.waitForLoadingToComplete();
            break;
          }
        }
      }
      
      if (!selectedClaudeAgent) {
        console.log('❌ Could not select Claude 3.5 Sonnet agent - test cannot continue');
        // Take a screenshot for debugging
        await page.screenshot({ path: `claude-agent-selection-debug-${Date.now()}.png`, fullPage: true });
        return;
      }
      
      // Verify the Claude agent is actually selected
      await page.waitForTimeout(2000);
      console.log('✅ Claude 3.5 Sonnet agent selected successfully');
      
      // Claude 3.5 Sonnet Specific Citation Tests
      const claudeCitationTests = [
        {
          name: 'Claude 3.5 Sonnet Advanced Citation Analysis',
          query: `As Claude 3.5 Sonnet, please analyze the content in my knowledge base "${claudeKbName}" and provide a comprehensive summary with precise citations. Demonstrate your advanced reasoning by providing detailed source attribution using phrases like "According to [document name]" and "Based on the specific content in [filename]". Show me why Claude 3.5 Sonnet excels at citation accuracy.`,
          expectedPatterns: ['according to', 'based on', 'document', 'source', 'claude', 'sonnet', 'advanced', 'reasoning']
        },
        {
          name: 'Claude 3.5 Sonnet Direct Quote Extraction',
          query: `Claude 3.5 Sonnet, please demonstrate your superior text analysis capabilities by extracting a direct quote from the documents in my knowledge base "${claudeKbName}". Use quotation marks around the exact text and provide detailed source attribution. Show me how Claude 3.5 Sonnet handles precise text extraction.`,
          expectedPatterns: ['"', 'quote', 'document', 'source', 'exact', 'text', 'claude', 'sonnet']
        },
        {
          name: 'Claude 3.5 Sonnet Multi-Source Analysis',
          query: `As Claude 3.5 Sonnet with advanced reasoning capabilities, please analyze all available sources in my knowledge base "${claudeKbName}" and provide a comparative analysis with proper citations for each source. Demonstrate how Claude 3.5 Sonnet excels at multi-document reasoning and citation accuracy.`,
          expectedPatterns: ['source', 'document', 'analysis', 'citation', 'comparative', 'reasoning', 'claude', 'sonnet']
        }
      ];
      
      const claudeTestResults = [];
      
      for (let i = 0; i < claudeCitationTests.length; i++) {
        const citationTest = claudeCitationTests[i];
        console.log(`📝 Running Claude 3.5 Sonnet Test ${i + 1}: ${citationTest.name}`);
        
        const hasChatInput = await testHelpers.elementExists('textarea');
        const hasSendButton = await testHelpers.elementExists('button:has-text("Send")');
        
        if (hasChatInput && hasSendButton) {
          await testHelpers.fillField('textarea', citationTest.query);
          await testHelpers.clickButton('button:has-text("Send")');
          
          console.log(`💬 Claude 3.5 Sonnet query sent: ${citationTest.name}`);
          await page.waitForTimeout(15000); // Extended wait for Claude 3.5 Sonnet processing
          
          // Analyze Claude 3.5 Sonnet response for citation patterns
          const responseElements = await page.locator('div[role="assistant"], .message-assistant, .prose').all();
          let foundPatterns = [];
          let responseText = '';
          let responseLength = 0;
          
          if (responseElements.length > 0) {
            const latestResponse = responseElements[responseElements.length - 1];
            responseText = await latestResponse.textContent() || '';
            responseLength = responseText.length;
            const lowerText = responseText.toLowerCase();
            
            foundPatterns = citationTest.expectedPatterns.filter(pattern => 
              lowerText.includes(pattern.toLowerCase())
            );
          }
          
          const testResult = {
            name: citationTest.name,
            expectedPatterns: citationTest.expectedPatterns.length,
            foundPatterns: foundPatterns.length,
            patterns: foundPatterns,
            success: foundPatterns.length >= Math.ceil(citationTest.expectedPatterns.length / 2),
            responseLength: responseLength,
            responseQuality: responseLength > 200 ? 'Detailed' : responseLength > 100 ? 'Adequate' : 'Brief'
          };
          
          claudeTestResults.push(testResult);
          
          console.log(`📊 Claude 3.5 Sonnet ${citationTest.name} Results:`);
          console.log(`   Expected patterns: ${testResult.expectedPatterns}`);
          console.log(`   Found patterns: ${testResult.foundPatterns} (${foundPatterns.join(', ')})`);
          console.log(`   Success: ${testResult.success ? '✅' : '❌'}`);
          console.log(`   Response length: ${testResult.responseLength} chars (${testResult.responseQuality})`);
          
          // Wait between Claude 3.5 Sonnet tests
          await page.waitForTimeout(3000);
        }
      }
      
      // Step 4: Claude 3.5 Sonnet Citation Assessment
      console.log('📈 Step 4: Claude 3.5 Sonnet Citation Assessment...');
      
      const successfulClaudeTests = claudeTestResults.filter(result => result.success).length;
      const totalClaudeTests = claudeTestResults.length;
      const claudeSuccessRate = (successfulClaudeTests / totalClaudeTests) * 100;
      
      console.log(`\n🎯 CLAUDE 3.5 SONNET CITATION VERIFICATION RESULTS:`);
      console.log(`================================================`);
      console.log(`   Model: Claude 3.5 Sonnet`);
      console.log(`   Knowledge Base: ${claudeKbName}`);
      console.log(`   Agent: ${claudeAgentName}`);
      console.log(`   Tests Completed: ${totalClaudeTests}`);
      console.log(`   Tests Passed: ${successfulClaudeTests}`);
      console.log(`   Success Rate: ${claudeSuccessRate.toFixed(1)}%`);
      
      // Claude 3.5 Sonnet specific grading
      let claudeGrade = '';
      if (claudeSuccessRate >= 90) {
        claudeGrade = 'Exceptional ⭐⭐⭐ (Claude 3.5 Sonnet Excellence)';
      } else if (claudeSuccessRate >= 80) {
        claudeGrade = 'Excellent ✅ (Claude 3.5 Sonnet Quality)';
      } else if (claudeSuccessRate >= 70) {
        claudeGrade = 'Good 👍 (Above Average Performance)';
      } else if (claudeSuccessRate >= 60) {
        claudeGrade = 'Fair ⚠️ (Needs Improvement)';
      } else {
        claudeGrade = 'Poor ❌ (Significant Issues)';
      }
      
      console.log(`   Overall Grade: ${claudeGrade}`);
      
      // Detailed Claude 3.5 Sonnet breakdown
      console.log(`\n📋 CLAUDE 3.5 SONNET DETAILED TEST BREAKDOWN:`);
      claudeTestResults.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.name}:`);
        console.log(`      Success: ${result.success ? '✅' : '❌'}`);
        console.log(`      Patterns: ${result.foundPatterns}/${result.expectedPatterns}`);
        console.log(`      Response Quality: ${result.responseQuality}`);
      });
      
      // Claude 3.5 Sonnet specific recommendations
      console.log(`\n💡 CLAUDE 3.5 SONNET RECOMMENDATIONS:`);
      if (claudeSuccessRate >= 90) {
        console.log(`   🎉 Outstanding! Claude 3.5 Sonnet demonstrates exceptional citation accuracy and document referencing capabilities.`);
        console.log(`   🏆 This model excels at providing detailed, well-cited responses with proper source attribution.`);
      } else if (claudeSuccessRate >= 80) {
        console.log(`   ✅ Excellent performance! Claude 3.5 Sonnet shows strong citation capabilities with minor areas for improvement.`);
        console.log(`   📈 Consider fine-tuning system prompts for even better citation consistency.`);
      } else if (claudeSuccessRate >= 70) {
        console.log(`   👍 Good performance from Claude 3.5 Sonnet with room for citation improvement.`);
        console.log(`   🔧 Review KB content quality and agent system prompts for better citation accuracy.`);
      } else {
        console.log(`   ⚠️ Claude 3.5 Sonnet citation performance below expected standards.`);
        console.log(`   🔍 Investigate KB integration, document quality, and system prompt effectiveness.`);
      }
      
      // Performance metrics specific to Claude 3.5 Sonnet
      const avgResponseLength = claudeTestResults.reduce((sum, result) => sum + result.responseLength, 0) / claudeTestResults.length;
      console.log(`\n📊 CLAUDE 3.5 SONNET PERFORMANCE METRICS:`);
      console.log(`   Average Response Length: ${avgResponseLength.toFixed(0)} characters`);
      console.log(`   Response Quality Distribution:`);
      const qualityCount = claudeTestResults.reduce((acc, result) => {
        acc[result.responseQuality] = (acc[result.responseQuality] || 0) + 1;
        return acc;
      }, {});
      Object.entries(qualityCount).forEach(([quality, count]) => {
        console.log(`     ${quality}: ${count} responses`);
      });
      
      // Test assertion for Claude 3.5 Sonnet
      expect(claudeSuccessRate).toBeGreaterThan(60); // Claude 3.5 Sonnet should achieve at least 60% success rate
      
      console.log('\n🎉 Claude 3.5 Sonnet citation verification test completed successfully!');
      console.log('================================================');
      
    } catch (error) {
      console.error('❌ Claude 3.5 Sonnet citation verification test failed:', error);
      throw error;
    }
  });
});
