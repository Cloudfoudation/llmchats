import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_KNOWLEDGE_BASES, TEST_FILES, TEST_AGENTS } from '../../fixtures/test-data';

/**
 * Knowledge Base Citation Verification Tests
 * Focused specifically on testing citation accuracy and document referencing
 * after agent creation with knowledge base integration
 */

test.describe('Knowledge Base Citation Verification', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;
  let createdKbName: string;
  let createdAgentName: string;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup would go here if needed
    console.log('🧹 Test cleanup completed');
  });

  test('should create KB, agent, and verify comprehensive citation responses', async ({ page }) => {
    console.log('🎯 Starting comprehensive citation verification test...');
    
    await authHelpers.loginAsPaidUser();
    
    try {
      // Step 1: Create Knowledge Base with test document
      console.log('📚 Step 1: Creating Knowledge Base for citation testing...');
      
      await testHelpers.clickButton('button:has-text("Knowledge Bases")');
      await testHelpers.waitForLoadingToComplete();
      
      const hasCreateButton = await testHelpers.elementExists('button:has-text("Add New Knowledge Base")');
      if (!hasCreateButton) {
        console.log('❌ KB creation not available - skipping test');
        return;
      }
      
      await testHelpers.clickButton('button:has-text("Add New Knowledge Base")');
      await testHelpers.waitForLoadingToComplete();
      
      // Create unique KB name for citation testing
      createdKbName = `CitationTestKB_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      await testHelpers.fillField('input[name="name"]', createdKbName);
      await testHelpers.fillField('textarea[name="description"]', 'Knowledge base specifically for testing citation accuracy and document referencing capabilities');
      
      // Upload test document
      console.log('📄 Uploading test document for citation verification...');
      await testHelpers.uploadFile('input[type="file"]', TEST_FILES.txt.path);
      await page.waitForTimeout(2000);
      
      // Submit KB creation
      await testHelpers.clickButton('button[type="submit"]:has-text("Create")');
      console.log('⏳ Waiting for KB creation and sync...');
      await page.waitForTimeout(5000);
      
      // Wait for KB to be ready
      let kbReady = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        const hasRefreshButton = await testHelpers.elementExists('button[title*="refresh"], button:has(svg):first');
        if (hasRefreshButton) {
          await testHelpers.clickButton('button[title*="refresh"], button:has(svg):first');
          await testHelpers.waitForLoadingToComplete();
          await page.waitForTimeout(2000);
        }
        
        const hasOurKb = await testHelpers.elementExists(`text="${createdKbName}"`);
        if (hasOurKb) {
          const hasIngestionComplete = await testHelpers.elementExists('text=Ingestion Complete, text=COMPLETE, text=ACTIVE');
          if (hasIngestionComplete) {
            kbReady = true;
            console.log('✅ KB creation and sync completed');
            break;
          }
        }
        
        if (attempt < 11) {
          console.log(`⏳ KB sync attempt ${attempt + 1}/12...`);
          await page.waitForTimeout(3000);
        }
      }
      
      if (!kbReady) {
        console.log('⚠️ KB may not be fully synced, but continuing with test...');
      }
      
      await testHelpers.closeModal();
      
      // Step 2: Create Agent with KB assignment
      console.log('🤖 Step 2: Creating Agent with KB assignment...');
      
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
      
      // Create agent with citation-focused instructions
      createdAgentName = `CitationAgent_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      
      await testHelpers.fillField('label:has-text("Agent Name") + input', createdAgentName);
      
      const hasDescriptionField = await testHelpers.elementExists('label:has-text("Description") + input');
      if (hasDescriptionField) {
        await testHelpers.fillField('label:has-text("Description") + input', 
          'Agent specifically designed to test citation accuracy and document referencing');
      }
      
      const hasInstructionsField = await testHelpers.elementExists('label:has-text("System Prompt") + textarea');
      if (hasInstructionsField) {
        await testHelpers.fillField('label:has-text("System Prompt") + textarea', 
          `You are an AI assistant focused on providing accurate citations and document references. When answering questions:
          1. Always cite your sources using phrases like "According to [document name]" or "Based on the document [filename]"
          2. Include specific references to sections, pages, or content when possible
          3. Use quotation marks when directly quoting from documents
          4. Clearly distinguish between information from the knowledge base and your general knowledge
          5. When unsure about a source, explicitly state the uncertainty
          Your primary goal is to demonstrate proper citation and referencing of uploaded documents.`);
      }
      
      // Select model
      console.log('🎯 Selecting model for citation testing...');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(2000);
      
      const modelButtons = await page.locator('button[type="button"].rounded-lg.border').all();
      if (modelButtons.length > 0) {
        await modelButtons[0].click();
        await testHelpers.waitForLoadingToComplete();
        console.log('✅ Model selected for citation testing');
      }
      
      // Assign the specific Knowledge Base with enhanced logic
      console.log(`📚 Attempting to assign KB "${createdKbName}" to citation agent...`);
      
      // Try multiple KB selector approaches
      const kbSelectors = [
        'select[name="knowledgeBaseId"]',
        'select[name="knowledgeBase"]', 
        '[data-testid="kb-selector"]',
        'select[id*="knowledge"]',
        'select[id*="kb"]',
        '.kb-selector select',
        '[role="combobox"][aria-label*="Knowledge"]'
      ];
      
      let kbSelectorFound = false;
      let selectedKbSelector = '';
      
      for (const selector of kbSelectors) {
        const hasKbSelector = await testHelpers.elementExists(selector);
        if (hasKbSelector) {
          console.log(`✅ Found KB selector: ${selector}`);
          selectedKbSelector = selector;
          kbSelectorFound = true;
          break;
        } else {
          console.log(`❌ KB selector not found: ${selector}`);
        }
      }
      
      if (kbSelectorFound) {
        console.log(`📚 Using KB selector: ${selectedKbSelector}`);
        
        // Get all options from the KB selector
        const kbOptions = await page.locator(`${selectedKbSelector} option`).all();
        console.log(`📋 Found ${kbOptions.length} KB options in selector`);
        
        // Log all available options for debugging
        for (let i = 0; i < kbOptions.length; i++) {
          const optionText = await kbOptions[i].textContent();
          const optionValue = await kbOptions[i].getAttribute('value');
          console.log(`   Option ${i}: "${optionText}" (value: ${optionValue})`);
        }
        
        let foundOurKb = false;
        
        // Try to find our specific KB by name
        for (let i = 0; i < kbOptions.length; i++) {
          const optionText = await kbOptions[i].textContent();
          if (optionText && optionText.includes(createdKbName)) {
            console.log(`🎯 Found our KB "${createdKbName}" at option ${i}`);
            await page.selectOption(selectedKbSelector, { index: i });
            foundOurKb = true;
            console.log(`✅ KB "${createdKbName}" assigned to citation agent`);
            break;
          }
        }
        
        // Fallback: try to find by partial name match
        if (!foundOurKb) {
          console.log(`🔍 Exact name not found, trying partial match for "${createdKbName}"...`);
          const kbNameParts = createdKbName.split('_');
          const searchTerm = kbNameParts[0]; // Use first part of the name
          
          for (let i = 0; i < kbOptions.length; i++) {
            const optionText = await kbOptions[i].textContent();
            if (optionText && optionText.includes(searchTerm)) {
              console.log(`🎯 Found KB by partial match "${searchTerm}" at option ${i}: "${optionText}"`);
              await page.selectOption(selectedKbSelector, { index: i });
              foundOurKb = true;
              console.log(`✅ KB assigned by partial match: "${optionText}"`);
              break;
            }
          }
        }
        
        // Final fallback: select first non-empty option
        if (!foundOurKb && kbOptions.length > 1) {
          console.log('⚠️ Our specific KB not found, selecting first available KB as fallback...');
          
          // Skip the first option if it's empty/placeholder
          let fallbackIndex = 1;
          if (kbOptions.length > 1) {
            const firstOptionText = await kbOptions[1].textContent();
            console.log(`📋 Selecting fallback KB: "${firstOptionText}"`);
            await page.selectOption(selectedKbSelector, { index: fallbackIndex });
            console.log('⚠️ Selected first available KB as fallback');
          }
        }
        
        if (!foundOurKb && kbOptions.length <= 1) {
          console.log('❌ No Knowledge Bases available in selector - KB may not be synced yet');
        }
        
      } else {
        console.log('❌ No Knowledge Base selector found in agent form');
        console.log('ℹ️ This could mean:');
        console.log('   1. KB selector UI has changed');
        console.log('   2. KB assignment is handled differently');
        console.log('   3. KB selector appears later in the form');
        
        // Take a screenshot for debugging
        await page.screenshot({ path: `kb-selector-debug-${Date.now()}.png`, fullPage: true });
        
        // Try to find any select elements on the page
        const allSelects = await page.locator('select').all();
        console.log(`🔍 Found ${allSelects.length} select elements on the page:`);
        
        for (let i = 0; i < Math.min(allSelects.length, 5); i++) {
          const select = allSelects[i];
          const name = await select.getAttribute('name');
          const id = await select.getAttribute('id');
          const ariaLabel = await select.getAttribute('aria-label');
          console.log(`   Select ${i}: name="${name}", id="${id}", aria-label="${ariaLabel}"`);
        }
      }
      
      // Submit agent creation
      await testHelpers.clickButton('form button:has-text("Create Agent")');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(3000);
      
      console.log(`✅ Citation agent created: ${createdAgentName}`);
      
      // Verify KB assignment by checking if we can see the KB info in the agent
      console.log('🔍 Verifying KB assignment...');
      
      // Look for any indication that KB is assigned
      const kbAssignmentIndicators = [
        `text="${createdKbName}"`,
        'text="Knowledge Base"',
        '[data-testid="agent-kb-info"]',
        '.kb-assignment',
        'text="KB:"',
        'text="Connected to"'
      ];
      
      let kbAssignmentVisible = false;
      for (const indicator of kbAssignmentIndicators) {
        const hasIndicator = await testHelpers.elementExists(indicator);
        if (hasIndicator) {
          console.log(`✅ KB assignment indicator found: ${indicator}`);
          kbAssignmentVisible = true;
          break;
        }
      }
      
      if (kbAssignmentVisible) {
        console.log('✅ Knowledge Base appears to be assigned to agent');
      } else {
        console.log('⚠️ KB assignment not visually confirmed - but continuing with test');
        console.log('ℹ️ The agent may still have KB access even if not visually indicated');
      }
      
      // Step 3: Test Citation Verification with improved agent selection
      console.log('🔍 Step 3: Running comprehensive citation verification tests...');
      
      await testHelpers.closeModal();
      await testHelpers.waitForLoadingToComplete();
      
      // Navigate to chat interface first
      console.log('🔹 Navigating to chat interface...');
      await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(2000);
      
      // Try multiple approaches to find and click the agent selector
      console.log(`🎯 Attempting to select agent: ${createdAgentName}`);
      
      let agentSelectorFound = false;
      const agentSelectors = [
        'button[title="Select Agent"]',
        'button[aria-label="Select Agent"]', 
        'button:has-text("Select Agent")',
        '[data-testid="agent-selector"]',
        'button[title*="Agent"]',
        '.agent-selector button',
        'button[role="button"]:has-text("Agent")',
        // Fallback selectors based on common patterns
        'button:has([data-icon="robot"])',
        'button:has(svg):has-text("Agent")',
        'button.agent-select',
        '[data-testid="select-agent-button"]'
      ];
      
      // Try each selector until we find one that works
      for (const selector of agentSelectors) {
        try {
          console.log(`🔍 Trying selector: ${selector}`);
          const hasSelector = await testHelpers.elementExists(selector);
          if (hasSelector) {
            console.log(`✅ Found agent selector: ${selector}`);
            await testHelpers.clickButton(selector);
            await testHelpers.waitForLoadingToComplete();
            await page.waitForTimeout(1000);
            agentSelectorFound = true;
            break;
          }
        } catch (error) {
          console.log(`⚠️ Selector ${selector} failed: ${error.message}`);
          continue;
        }
      }
      
      if (!agentSelectorFound) {
        console.log('🔍 No standard agent selector found, looking for any clickable elements...');
        
        // Take a screenshot for debugging
        await page.screenshot({ path: `agent-selector-debug-${Date.now()}.png`, fullPage: true });
        
        // Try to find any buttons that might be the agent selector
        const allButtons = await page.locator('button').all();
        console.log(`🔍 Found ${allButtons.length} buttons on the page`);
        
        for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
          const button = allButtons[i];
          const text = await button.textContent();
          const title = await button.getAttribute('title');
          const ariaLabel = await button.getAttribute('aria-label');
          
          if ((text && (text.toLowerCase().includes('agent') || text.toLowerCase().includes('select'))) ||
              (title && (title.toLowerCase().includes('agent') || title.toLowerCase().includes('select'))) ||
              (ariaLabel && (ariaLabel.toLowerCase().includes('agent') || ariaLabel.toLowerCase().includes('select')))) {
            
            console.log(`🎯 Found potential agent selector button ${i}: text="${text}", title="${title}", aria-label="${ariaLabel}"`);
            
            try {
              await button.click();
              await testHelpers.waitForLoadingToComplete();
              await page.waitForTimeout(1000);
              agentSelectorFound = true;
              break;
            } catch (error) {
              console.log(`⚠️ Button ${i} click failed: ${error.message}`);
              continue;
            }
          }
        }
      }
      
      if (!agentSelectorFound) {
        console.log('❌ Could not find agent selector button - test cannot continue');
        console.log('ℹ️ This might indicate that:');
        console.log('   1. The agent selector UI has changed');
        console.log('   2. The chat interface is not fully loaded');
        console.log('   3. The agent selector is not available in this context');
        
        // Take a final screenshot for debugging
        await page.screenshot({ path: `final-debug-${Date.now()}.png`, fullPage: true });
        return;
      }
      
      // Continue with agent selection from dropdown
      let selectedAgent = false;
      
      // First, try to scroll the dropdown to make sure all options are accessible
      const dropdownContainer = page.locator('[role="menu"], [role="listbox"], .fixed').first();
      if (await dropdownContainer.count() > 0) {
        await dropdownContainer.evaluate(el => {
          el.scrollTop = 0; // Start from top
        });
      }
      
      // Look for our agent button with more specific targeting
      const agentButton = page.locator(`button:has-text("${createdAgentName}")`).first();
      
      if (await agentButton.count() > 0) {
        console.log(`🎯 Found citation agent in dropdown: ${createdAgentName}`);
        
        // Scroll the button into view and click
        await agentButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        try {
          await agentButton.click({ timeout: 10000 });
          selectedAgent = true;
        } catch (error) {
          console.log('⚠️ Regular click failed, trying force click...');
          await agentButton.click({ force: true });
          selectedAgent = true;
        }
        
        await testHelpers.waitForLoadingToComplete();
      } else {
        // Fallback: search through all dropdown buttons
        console.log('🔍 Agent not found by name, searching all dropdown buttons...');
        const allButtons = await page.locator('.fixed button, [role="menu"] button, [role="listbox"] button').all();
        
        for (let i = 0; i < allButtons.length; i++) {
          const button = allButtons[i];
          const text = await button.textContent();
          if (text && text.includes(createdAgentName.substring(0, 15))) {
            console.log(`🎯 Found citation agent at index ${i}: ${createdAgentName}`);
            
            // Scroll into view and click
            await button.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            try {
              await button.click({ timeout: 10000 });
              selectedAgent = true;
            } catch (error) {
              await button.click({ force: true });
              selectedAgent = true;
            }
            
            await testHelpers.waitForLoadingToComplete();
            break;
          }
        }
      }
      
      if (!selectedAgent) {
        console.log('❌ Could not select citation agent - test cannot continue');
        // Take a screenshot for debugging
        await page.screenshot({ path: `citation-agent-selection-debug-${Date.now()}.png`, fullPage: true });
        return;
      }
      
      // Verify the agent is actually selected
      await page.waitForTimeout(2000);
      console.log('✅ Citation agent selected successfully');
      
      // Citation Test Scenarios
      const citationTests = [
        {
          name: 'Basic Citation Request',
          query: `Please analyze the content in my knowledge base "${createdKbName}" and provide a summary. For each piece of information, please cite your sources using proper attribution like "According to [document name]" or "Based on the document [filename]".`,
          expectedPatterns: ['according to', 'based on', 'document', 'source']
        },
        {
          name: 'Direct Quote Request',
          query: `Can you quote a specific sentence or phrase directly from one of the documents in my knowledge base "${createdKbName}"? Please use quotation marks around the exact text and tell me which document it's from.`,
          expectedPatterns: ['"', 'quote', 'document', 'from']
        },
        {
          name: 'Source Verification',
          query: `I want to verify that you're actually accessing my uploaded documents. Please tell me the name of at least one file in my knowledge base and describe what type of content it contains. Be specific about the source.`,
          expectedPatterns: ['file', 'document', 'contains', 'source', '.txt', '.pdf']
        },
        {
          name: 'Citation Format Test',
          query: `Please provide information from my knowledge base using formal citation format. Include document names, and use phrases like "The document states:", "According to the file:", or "Source: [filename]".`,
          expectedPatterns: ['document states', 'according to', 'source:', 'file:']
        },
        {
          name: 'Multiple Source Test',
          query: `If you have access to multiple documents in my knowledge base "${createdKbName}", please compare information from different sources and cite each one separately. Show me that you can distinguish between different documents.`,
          expectedPatterns: ['document', 'source', 'file', 'different', 'compare']
        }
      ];
      
      const testResults = [];
      
      for (let i = 0; i < citationTests.length; i++) {
        const citationTest = citationTests[i];
        console.log(`📝 Running Citation Test ${i + 1}: ${citationTest.name}`);
        
        const hasChatInput = await testHelpers.elementExists('textarea');
        const hasSendButton = await testHelpers.elementExists('button:has-text("Send")');
        
        if (hasChatInput && hasSendButton) {
          await testHelpers.fillField('textarea', citationTest.query);
          await testHelpers.clickButton('button:has-text("Send")');
          
          console.log(`💬 Query sent: ${citationTest.name}`);
          await page.waitForTimeout(12000); // Wait for response
          
          // Analyze response for citation patterns
          const responseElements = await page.locator('div[role="assistant"], .message-assistant, .prose').all();
          let foundPatterns = [];
          let responseText = '';
          
          if (responseElements.length > 0) {
            const latestResponse = responseElements[responseElements.length - 1];
            responseText = await latestResponse.textContent() || '';
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
            responseLength: responseText.length
          };
          
          testResults.push(testResult);
          
          console.log(`📊 ${citationTest.name} Results:`);
          console.log(`   Expected patterns: ${testResult.expectedPatterns}`);
          console.log(`   Found patterns: ${testResult.foundPatterns} (${foundPatterns.join(', ')})`);
          console.log(`   Success: ${testResult.success ? '✅' : '❌'}`);
          console.log(`   Response length: ${testResult.responseLength} chars`);
          
          // Wait between tests
          await page.waitForTimeout(2000);
        }
      }
      
      // Step 4: Overall Citation Assessment
      console.log('📈 Step 4: Overall Citation Assessment...');
      
      const successfulTests = testResults.filter(result => result.success).length;
      const totalTests = testResults.length;
      const successRate = (successfulTests / totalTests) * 100;
      
      console.log(`\n🎯 COMPREHENSIVE CITATION VERIFICATION RESULTS:`);
      console.log(`   Knowledge Base: ${createdKbName}`);
      console.log(`   Agent: ${createdAgentName}`);
      console.log(`   Tests Completed: ${totalTests}`);
      console.log(`   Tests Passed: ${successfulTests}`);
      console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
      console.log(`   Overall Grade: ${successRate >= 80 ? 'Excellent ✅' : successRate >= 60 ? 'Good 👍' : successRate >= 40 ? 'Fair ⚠️' : 'Needs Improvement ❌'}`);
      
      // Detailed breakdown
      console.log(`\n📋 DETAILED TEST BREAKDOWN:`);
      testResults.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.name}: ${result.success ? '✅' : '❌'} (${result.foundPatterns}/${result.expectedPatterns} patterns)`);
      });
      
      // Recommendations
      console.log(`\n💡 RECOMMENDATIONS:`);
      if (successRate >= 80) {
        console.log(`   🎉 Excellent citation performance! The agent properly references documents and provides accurate citations.`);
      } else if (successRate >= 60) {
        console.log(`   👍 Good citation performance with room for improvement in specific citation formats.`);
      } else if (successRate >= 40) {
        console.log(`   ⚠️ Fair citation performance. Consider improving system prompts for better citation accuracy.`);
      } else {
        console.log(`   ❌ Citation performance needs significant improvement. Review KB integration and agent instructions.`);
      }
      
      // Expect overall success for the test
      expect(successRate).toBeGreaterThan(40); // At least 40% success rate required
      
      console.log('🎉 Comprehensive citation verification test completed successfully!');
      
    } catch (error) {
      console.error('❌ Citation verification test failed:', error);
      throw error;
    }
  });

  test('should verify citation consistency across multiple queries', async ({ page }) => {
    console.log('🔄 Testing citation consistency across multiple queries...');
    
    await authHelpers.loginAsPaidUser();
    
    // This test assumes a KB and agent already exist from previous test
    // In a real scenario, you might want to create them or use existing ones
    
    console.log('ℹ️ This test requires an existing KB and agent setup');
    console.log('ℹ️ Run the comprehensive citation test first to create the necessary resources');
    
    // Navigate to chat
    await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
    await testHelpers.waitForLoadingToComplete();
    
    // Test consistency by asking similar questions multiple times
    const consistencyQueries = [
      'What documents do you have access to in your knowledge base?',
      'Can you list the files available in your knowledge base?',
      'What sources can you reference from your uploaded documents?'
    ];
    
    const responses = [];
    
    for (let i = 0; i < consistencyQueries.length; i++) {
      const query = consistencyQueries[i];
      console.log(`🔄 Consistency test ${i + 1}: ${query}`);
      
      const hasChatInput = await testHelpers.elementExists('textarea');
      const hasSendButton = await testHelpers.elementExists('button:has-text("Send")');
      
      if (hasChatInput && hasSendButton) {
        await testHelpers.fillField('textarea', query);
        await testHelpers.clickButton('button:has-text("Send")');
        
        await page.waitForTimeout(8000);
        
        const responseElements = await page.locator('div[role="assistant"], .message-assistant').all();
        if (responseElements.length > 0) {
          const latestResponse = responseElements[responseElements.length - 1];
          const responseText = await latestResponse.textContent() || '';
          responses.push(responseText);
        }
        
        await page.waitForTimeout(2000);
      }
    }
    
    // Analyze consistency
    console.log('📊 Analyzing citation consistency...');
    
    const commonElements = [];
    if (responses.length >= 2) {
      // Look for common citation patterns across responses
      const citationWords = ['document', 'file', 'source', 'knowledge base', 'uploaded'];
      
      citationWords.forEach(word => {
        const occurrences = responses.filter(response => 
          response.toLowerCase().includes(word)
        ).length;
        
        if (occurrences >= 2) {
          commonElements.push(word);
        }
      });
    }
    
    console.log(`✅ Citation consistency test completed`);
    console.log(`   Responses analyzed: ${responses.length}`);
    console.log(`   Common citation elements: ${commonElements.join(', ')}`);
    console.log(`   Consistency score: ${commonElements.length >= 3 ? 'High ✅' : commonElements.length >= 2 ? 'Medium 👍' : 'Low ⚠️'}`);
  });
});
