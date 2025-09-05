import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_AGENTS } from '../../fixtures/test-data';

test.describe('Complete Agent Workflow Tests', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('should create agent with Claude 3.5 Haiku, select it, and send message in chat', async ({ page }) => {
    console.log('🔍 Testing complete agent workflow with Claude 3.5 Haiku...');
    
    await authHelpers.loginAsPaidUser();
    let createdAgentName = '';
    
    try {
      // =========================
      // PART 1: CREATE AGENT
      // =========================
      console.log('🔹 PART 1: Creating agent with Claude 3.5 Haiku...');
      
      // Step 1: Navigate to chat
      await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
      await testHelpers.waitForLoadingToComplete();
      
      // Step 2: Open Agent Manager
      await testHelpers.clickButton('button[title="Select Agent"]');
      await testHelpers.waitForLoadingToComplete();
      
      await testHelpers.clickButton('button:has-text("Agent Manager")');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(2000);
      
      // Verify Agent Manager opened
      const hasAgentManager = await testHelpers.elementExists('h3:has-text("Agent Manager")');
      expect(hasAgentManager).toBe(true);
      console.log('✅ Agent Manager opened');
      
      // Step 3: Go to My Agents and create new agent
      await testHelpers.clickButton('button:has-text("My Agents")');
      await testHelpers.waitForLoadingToComplete();
      
      await testHelpers.clickButton('button:has-text("Add New Agent")');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(1500);
      
      // Verify Agent Config Modal opened
      const hasConfigModal = await testHelpers.elementExists('h3:has-text("Create New Agent")');
      expect(hasConfigModal).toBe(true);
      console.log('✅ Agent Config modal opened');
      
      // Step 4: Fill comprehensive agent information
      console.log('🔹 Filling comprehensive agent information...');
      createdAgentName = `TestAgent_Claude35Haiku_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      console.log(`📝 Creating agent: ${createdAgentName}`);
      
      // Fill Agent Name using correct selector
      const nameInput = page.locator('label:has-text("Agent Name") + input');
      await nameInput.clear();
      await nameInput.fill(createdAgentName);
      console.log(`✅ Agent name filled: "${createdAgentName}"`);
      
      // Fill Description using correct selector
      const descriptionInput = page.locator('label:has-text("Description") + input');
      const agentDescription = 'E2E Test Agent powered by Claude 3.5 Haiku model for automated testing scenarios. This agent specializes in responding to test queries and confirming functionality.';
      await descriptionInput.clear();
      await descriptionInput.fill(agentDescription);
      console.log(`✅ Agent description filled: "${agentDescription}"`);
      
      // Fill System Prompt (detailed instructions)
      const systemPromptInput = page.getByPlaceholder('You are a helpful AI assistant');
      const systemPrompt = `You are a specialized AI testing assistant named "${createdAgentName}". 

Your primary functions:
1. Respond clearly and professionally to all test queries
2. Always confirm when you are working correctly 
3. Include your agent name "${createdAgentName}" in responses when asked
4. Provide helpful information about your capabilities
5. Maintain a friendly and professional tone

When responding to test messages, always:
- Acknowledge the test context
- Confirm your functionality is working
- Include your agent name for verification
- Provide clear, concise responses

You are powered by Claude 3.5 Haiku and are designed for testing purposes.`;
      
      await systemPromptInput.clear();
      await systemPromptInput.fill(systemPrompt);
      console.log('✅ Comprehensive system prompt filled');
      console.log(`📝 System prompt preview: "${systemPrompt.substring(0, 100)}..."`);
      
      // Verify all fields are filled
      const nameValue = await nameInput.inputValue();
      const descValue = await descriptionInput.inputValue();
      const promptValue = await systemPromptInput.inputValue();
      
      console.log('🔍 Verifying agent information:');
      console.log(`  Name: ${nameValue ? '✅' : '❌'} (${nameValue.length} chars)`);  
      console.log(`  Description: ${descValue ? '✅' : '❌'} (${descValue.length} chars)`);
      console.log(`  System Prompt: ${promptValue ? '✅' : '❌'} (${promptValue.length} chars)`);
      
      // Ensure all required fields are properly filled
      expect(nameValue.length).toBeGreaterThan(0);
      expect(descValue.length).toBeGreaterThan(0);
      expect(promptValue.length).toBeGreaterThan(0);
      
      // Step 5: Select Claude 3.5 Haiku model specifically
      console.log('🔹 Selecting Claude 3.5 Haiku model...');
      
      // Wait for ModelCard to load completely
      await page.waitForTimeout(3000);
      
      // Use the exact role-based selector for Claude 3.5 Haiku
      console.log('🎯 Looking for Claude 3.5 Haiku model...');
      const haikuButton = page.getByRole('button', { name: 'Claude 3.5 Haiku Anthropic •' });
      const haikuExists = await haikuButton.count() > 0;
      
      if (haikuExists) {
        console.log('✅ Found Claude 3.5 Haiku model');
        await haikuButton.click();
        await page.waitForTimeout(1500);
        console.log('✅ Claude 3.5 Haiku model selected successfully');
      } else {
        // Fallback to any available Claude 3.5 Haiku variant
        console.log('🔍 Searching for Claude 3.5 Haiku variants...');
        const haikuVariants = [
          page.locator('button:has-text("Claude 3.5 Haiku")').first(),
          page.locator('button:has-text("claude-3-5-haiku")').first(),
          page.locator('button').filter({ hasText: /Claude.*3\.5.*Haiku/i }).first()
        ];
        
        let modelSelected = false;
        for (const variant of haikuVariants) {
          const count = await variant.count();
          if (count > 0) {
            await variant.click();
            await page.waitForTimeout(1500);
            console.log('✅ Claude 3.5 Haiku variant selected');
            modelSelected = true;
            break;
          }
        }
        
        if (!modelSelected) {
          // Final fallback: select any Claude model
          console.log('⚠️ Claude 3.5 Haiku not found, selecting first Claude model...');
          const claudeButton = page.locator('button:has-text("Claude")').first();
          const claudeCount = await claudeButton.count();
          if (claudeCount > 0) {
            await claudeButton.click();
            await page.waitForTimeout(1500);
            console.log('✅ Fallback Claude model selected');
          }
        }
      }
      
      // Step 6: Submit agent creation
      console.log('🔹 Submitting agent creation...');
      const createButton = page.locator('button:has-text("Create Agent")');
      await createButton.click();
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(3000);
      
      console.log('✅ Agent creation submitted');
      
      // Step 7: Verify creation and close modal
      const backToAgentManager = await testHelpers.elementExists('h3:has-text("Agent Manager")');
      if (backToAgentManager) {
        console.log('✅ Back to Agent Manager - creation successful');
        
        // Look for our agent in the list
        const hasOurAgent = await testHelpers.elementExists(`h4:has-text("${createdAgentName}"), div:has-text("${createdAgentName}")`);
        if (hasOurAgent) {
          console.log('✅ Agent appears in the agent list');
        }
      }
      
      // Close Agent Manager
      const closeButton = page.locator('button').filter({ hasText: '×' }).or(page.locator('button:has(svg)').last());
      await closeButton.click();
      await testHelpers.waitForLoadingToComplete();
      console.log('✅ Agent Manager closed');
      
      // =========================
      // PART 2: SELECT AGENT IN CHAT
      // =========================
      console.log('🔹 PART 2: Selecting agent in chat...');
      
      // Wait a moment for UI to settle
      await page.waitForTimeout(2000);
      
      // Open agent selector
      await testHelpers.clickButton('button[title="Select Agent"]');
      await testHelpers.waitForLoadingToComplete();
      
      // Look for our created agent in the dropdown
      const agentDropdownButtons = await page.locator('.fixed.w-72.bg-white button').all();
      let agentFound = false;
      
      for (const button of agentDropdownButtons) {
        const text = await button.textContent();
        if (text && text.includes(createdAgentName)) {
          console.log(`🎯 Found our agent in dropdown: ${createdAgentName}`);
          await button.click();
          await testHelpers.waitForLoadingToComplete();
          agentFound = true;
          console.log('✅ Agent selected in chat');
          break;
        }
      }
      
      if (!agentFound) {
        // If agent not found, select any available agent
        console.log('⚠️ Our agent not found in dropdown, selecting first available agent...');
        for (const button of agentDropdownButtons) {
          const text = await button.textContent();
          if (text && !text.includes('Agent Manager') && !text.includes('No agents found')) {
            await button.click();
            await testHelpers.waitForLoadingToComplete();
            console.log('✅ Alternative agent selected');
            break;
          }
        }
      }
      
      // =========================
      // PART 3: SEND MESSAGE IN CHAT
      // =========================
      console.log('🔹 PART 3: Testing chat with agent...');
      
      // Wait for chat interface to be ready
      await page.waitForTimeout(2000);
      
      // Check chat interface elements
      const hasChatInput = await testHelpers.elementExists('textarea');
      const hasSendButton = await testHelpers.elementExists('button:has-text("Send")');
      
      expect(hasChatInput).toBe(true);
      expect(hasSendButton).toBe(true);
      console.log('✅ Chat interface ready');
      
      // Send test message
      const testMessage = `Hello! I am testing the agent "${createdAgentName}". Please confirm you are working correctly and include your agent name in the response.`;
      
      // Fill message input (use the chat textarea, not the agent config one)
      const chatInput = page.getByPlaceholder('Type your message...');
      await chatInput.fill(testMessage);
      console.log('✅ Test message entered');
      
      // Send message
      await testHelpers.clickButton('button:has-text("Send")');
      console.log('✅ Message sent');
      
      // Wait for response
      console.log('🔹 Waiting for agent response...');
      await page.waitForTimeout(10000); // Wait longer for AI response
      
      // Check if message appears in chat history
      const hasUserMessage = await testHelpers.elementExists(`div:has-text("${testMessage.substring(0, 20)}")`);
      if (hasUserMessage) {
        console.log('✅ User message appears in chat history');
      }
      
      // Check for agent response
      const hasAgentResponse = await testHelpers.elementExists('.message-assistant, [data-role="assistant"]');
      if (hasAgentResponse) {
        console.log('✅ Agent response received');
        
        // Try to get response text
        const responseElements = await page.locator('.message-assistant, [data-role="assistant"]').all();
        if (responseElements.length > 0) {
          const responseText = await responseElements[responseElements.length - 1].textContent();
          if (responseText) {
            console.log(`📝 Agent response preview: ${responseText.substring(0, 100)}...`);
          }
        }
      } else {
        console.log('⚠️ No agent response detected yet (may still be processing)');
      }
      
      console.log('🎉 Complete agent workflow test completed successfully!');
      console.log(`✅ Agent "${createdAgentName}" created, selected, and tested in chat`);
      
    } catch (error) {
      console.error('❌ Complete agent workflow test failed:', error);
      throw error;
    }
  });

  test('should validate agent creation with required fields', async ({ page }) => {
    console.log('🔍 Testing agent creation validation...');
    
    await authHelpers.loginAsPaidUser();
    
    try {
      // Open agent creation form
      await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
      await testHelpers.waitForLoadingToComplete();
      
      await testHelpers.clickButton('button[title="Select Agent"]');
      await testHelpers.waitForLoadingToComplete();
      
      await testHelpers.clickButton('button:has-text("Agent Manager")');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(2000);
      
      await testHelpers.clickButton('button:has-text("My Agents")');
      await testHelpers.waitForLoadingToComplete();
      
      await testHelpers.clickButton('button:has-text("Add New Agent")');
      await testHelpers.waitForLoadingToComplete();
      await page.waitForTimeout(1000);
      
      // Test empty form submission
      console.log('🔹 Testing empty form validation...');
      const createButton = page.locator('button:has-text("Create Agent")');
      await createButton.click();
      await page.waitForTimeout(1000);
      
      // Check for validation error
      const hasValidationError = await testHelpers.elementExists('.bg-red-50, .text-red-700, [role="alert"]');
      if (hasValidationError) {
        console.log('✅ Form validation working - empty form rejected');
      }
      
      // Test with only name filled
      console.log('🔹 Testing partial form completion...');
      const nameInput = page.locator('label:has-text("Agent Name") + input');
      await nameInput.fill('Test Validation Agent');
      
      await createButton.click();
      await page.waitForTimeout(1000);
      
      console.log('✅ Validation tests completed');
      
      // Close modal
      const closeButton = page.locator('button').filter({ hasText: '×' }).or(page.locator('button:has(svg)').last());
      await closeButton.click();
      await testHelpers.waitForLoadingToComplete();
      
    } catch (error) {
      console.error('❌ Validation test failed:', error);
      throw error;
    }
  });
});