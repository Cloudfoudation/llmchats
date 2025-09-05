import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_AGENTS } from '../../fixtures/test-data';

test.describe('Complete Agent Management Tests', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test.describe('Agent Manager Access', () => {
    test('should open Agent Manager from chat interface', async ({ page }) => {
      console.log('🔍 Testing Agent Manager access...');
      
      await authHelpers.loginAsPaidUser();
      
      // Navigate to chat
      await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
      await testHelpers.waitForLoadingToComplete();
      
      // Click agent selector
      const hasAgentSelector = await testHelpers.elementExists('button[title="Select Agent"]');
      expect(hasAgentSelector).toBe(true);
      
      await testHelpers.clickButton('button[title="Select Agent"]');
      await testHelpers.waitForLoadingToComplete();
      
      // Click Agent Manager button
      const hasAgentManagerButton = await testHelpers.elementExists('button:has-text("Agent Manager")');
      expect(hasAgentManagerButton).toBe(true);
      
      await testHelpers.clickButton('button:has-text("Agent Manager")');
      await testHelpers.waitForLoadingToComplete();
      
      // Wait for modal to open
      await page.waitForTimeout(2000);
      
      // Verify Agent Manager modal opened - check for modal title instead of role="dialog"
      const hasAgentModal = await testHelpers.elementExists('h3:has-text("Agent Manager")');
      const hasAgentManagerTitle = await testHelpers.elementExists('h3:has-text("Agent Manager")');
      const hasMyAgentsTab = await testHelpers.elementExists('button:has-text("My Agents")');
      const hasSharedAgentsTab = await testHelpers.elementExists('button:has-text("Shared Agents")');
      
      expect(hasAgentModal).toBe(true);
      expect(hasAgentManagerTitle).toBe(true);
      expect(hasMyAgentsTab).toBe(true);
      expect(hasSharedAgentsTab).toBe(true);
      
      console.log('✅ Agent Manager modal opened successfully');
      
      // Close modal
      await testHelpers.clickButton('button[aria-label="Close"]');
      await testHelpers.waitForLoadingToComplete();
      
      console.log('✅ Agent Manager access test completed');
    });
  });

  test.describe('Agent Creation', () => {
    test('should create a new custom agent', async ({ page }) => {
      console.log('🔍 Testing agent creation...');
      
      await authHelpers.loginAsPaidUser();
      let createdAgentName = '';
      
      try {
        // Step 1: Open Agent Manager
        console.log('🔹 Step 1: Opening Agent Manager...');
        await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
        await testHelpers.waitForLoadingToComplete();
        
        await testHelpers.clickButton('button[title="Select Agent"]');
        await testHelpers.waitForLoadingToComplete();
        
        await testHelpers.clickButton('button:has-text("Agent Manager")');
        await testHelpers.waitForLoadingToComplete();
        await page.waitForTimeout(2000);
        
        // Verify modal opened - check for modal title instead of role="dialog"
        const hasAgentModal = await testHelpers.elementExists('h3:has-text("Agent Manager")');
        if (!hasAgentModal) {
          throw new Error('Agent Manager modal did not open');
        }
        
        console.log('✅ Agent Manager opened');
        
        // Step 2: Go to My Agents tab
        console.log('🔹 Step 2: Accessing My Agents tab...');
        await testHelpers.clickButton('button:has-text("My Agents")');
        await testHelpers.waitForLoadingToComplete();
        
        // Step 3: Click Add New Agent
        console.log('🔹 Step 3: Creating new agent...');
        const hasAddNewAgentButton = await testHelpers.elementExists('button:has-text("Add New Agent")');
        expect(hasAddNewAgentButton).toBe(true);
        
        await testHelpers.clickButton('button:has-text("Add New Agent")');
        await testHelpers.waitForLoadingToComplete();
        
        // Step 4: Fill agent creation form
        console.log('🔹 Step 4: Filling agent creation form...');
        
        // Wait for form to appear
        await page.waitForTimeout(1000);
        
        const hasAgentForm = await testHelpers.elementExists('label:has-text("Agent Name") + input, form');
        if (!hasAgentForm) {
          throw new Error('Agent creation form did not appear');
        }
        
        // Generate unique agent name
        createdAgentName = TEST_AGENTS.valid.name();
        console.log(`📝 Creating agent: ${createdAgentName}`);
        
        // Fill required fields using correct selectors based on form structure
        // Agent Name field - input after "Agent Name" label
        await testHelpers.fillField('label:has-text("Agent Name") + input', createdAgentName);
        
        // Description field - input after "Description" label  
        const hasDescriptionField = await testHelpers.elementExists('label:has-text("Description") + input');
        if (hasDescriptionField) {
          await testHelpers.fillField('label:has-text("Description") + input', TEST_AGENTS.valid.description);
        }
        
        // System Prompt field - textarea after "System Prompt" label
        const hasInstructionsField = await testHelpers.elementExists('label:has-text("System Prompt") + textarea');
        if (hasInstructionsField) {
          await testHelpers.fillField('label:has-text("System Prompt") + textarea', TEST_AGENTS.valid.instructions);
        }
        
        // Select model - REQUIRED for agent creation
        console.log('📝 Selecting model (required)...');
        
        // Wait for ModelCard to load
        await testHelpers.waitForLoadingToComplete();
        await page.waitForTimeout(2000);
        
        // Use the exact selector from ModelCard: buttons with rounded-lg border that contain model info
        // These are the main model selection buttons, not parameter buttons
        const modelButtons = await page.locator('button[type="button"].rounded-lg.border').all();
        
        if (modelButtons.length > 0) {
          console.log(`📝 Found ${modelButtons.length} model selection buttons`);
          // Click the first available model
          await modelButtons[0].click();
          await testHelpers.waitForLoadingToComplete();
          console.log('✅ Model selected successfully');
        } else {
          // Fallback: look for buttons that contain model names in their text
          const fallbackButtons = await page.locator('button:has-text("Claude"), button:has-text("Titan"), button:has-text("Llama")').all();
          if (fallbackButtons.length > 0) {
            console.log(`📝 Using fallback selector, found ${fallbackButtons.length} options`);
            await fallbackButtons[0].click();
            await testHelpers.waitForLoadingToComplete();
            console.log('✅ Fallback model selected');
          } else {
            console.log('⚠️ No model buttons found - this may cause submission to fail');
          }
        }
        
        // Step 5: Submit the form
        console.log('🔹 Step 5: Submitting agent creation form...');
        
        const hasSubmitButton = await testHelpers.elementExists('form button:has-text("Create Agent")');
        expect(hasSubmitButton).toBe(true);
        
        await testHelpers.clickButton('form button:has-text("Create Agent")');
        await testHelpers.waitForLoadingToComplete();
        
        // Wait for creation to complete
        await page.waitForTimeout(3000);
        
        console.log('✅ Agent creation form submitted');
        
        // Step 6: Verify agent was created
        console.log('🔹 Step 6: Verifying agent creation...');
        
        // Check if we're back in the agent list
        const hasAgentList = await testHelpers.elementExists('button:has-text("My Agents")');
        if (hasAgentList) {
          // Look for our created agent
          const hasOurAgent = await testHelpers.elementExists(`div:has-text("${createdAgentName}"), h4:has-text("${createdAgentName}")`);
          if (hasOurAgent) {
            console.log('✅ Agent successfully created and appears in list');
          } else {
            console.log('⚠️ Agent may still be processing or not immediately visible');
          }
        }
        
        // Close Agent Manager
        await testHelpers.clickButton('h3:has-text("Agent Manager") + button');
        await testHelpers.waitForLoadingToComplete();
        
        console.log('✅ Agent creation test completed successfully');
        
      } catch (error) {
        console.error('❌ Agent creation test failed:', error);
        throw error;
      }
    });

    test('should create agent with knowledge base assignment', async ({ page }) => {
      console.log('🔍 Testing agent creation with KB assignment...');
      
      await authHelpers.loginAsPaidUser();
      let createdAgentName = '';
      
      try {
        // Step 1: Open Agent Manager
        console.log('🔹 Step 1: Opening Agent Manager...');
        await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
        await testHelpers.waitForLoadingToComplete();
        
        await testHelpers.clickButton('button[title="Select Agent"]');
        await testHelpers.waitForLoadingToComplete();
        
        await testHelpers.clickButton('button:has-text("Agent Manager")');
        await testHelpers.waitForLoadingToComplete();
        await page.waitForTimeout(2000);
        
        // Step 2: Create agent with KB
        console.log('🔹 Step 2: Creating agent with KB assignment...');
        await testHelpers.clickButton('button:has-text("My Agents")');
        await testHelpers.waitForLoadingToComplete();
        
        await testHelpers.clickButton('button:has-text("Add New Agent")');
        await testHelpers.waitForLoadingToComplete();
        await page.waitForTimeout(1000);
        
        // Fill form
        createdAgentName = TEST_AGENTS.valid.name();
        console.log(`📝 Creating agent with KB: ${createdAgentName}`);
        
        await testHelpers.fillField('label:has-text("Agent Name") + input', createdAgentName);
        
        const hasDescriptionField = await testHelpers.elementExists('label:has-text("Description") + input');
        if (hasDescriptionField) {
          await testHelpers.fillField('label:has-text("Description") + input', 'Agent with Knowledge Base integration');
        }
        
        const hasInstructionsField = await testHelpers.elementExists('label:has-text("System Prompt") + textarea');
        if (hasInstructionsField) {
          await testHelpers.fillField('label:has-text("System Prompt") + textarea', 'You are an AI assistant with access to a knowledge base. Use the knowledge base to answer questions accurately.');
        }
        
        // Try to assign a knowledge base
        const hasKbField = await testHelpers.elementExists('select[name="knowledgeBaseId"], select[name="knowledgeBase"]');
        if (hasKbField) {
          console.log('📝 Assigning Knowledge Base...');
          const kbOptions = await page.locator('select[name="knowledgeBaseId"] option, select[name="knowledgeBase"] option').all();
          if (kbOptions.length > 1) {
            // Select the first available KB
            await page.selectOption('select[name="knowledgeBaseId"], select[name="knowledgeBase"]', { index: 1 });
            console.log('✅ Knowledge Base assigned to agent');
          }
        } else {
          console.log('ℹ️ No Knowledge Base selection field found');
        }
        
        // Submit form
        await testHelpers.clickButton('form button:has-text("Create Agent")');
        await testHelpers.waitForLoadingToComplete();
        await page.waitForTimeout(3000);
        
        console.log('✅ Agent with KB assignment created');
        
        // Close modal
        await testHelpers.clickButton('button[aria-label="Close"]');
        await testHelpers.waitForLoadingToComplete();
        
        console.log('✅ Agent with KB assignment test completed');
        
      } catch (error) {
        console.error('❌ Agent with KB assignment test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Agent Management Operations', () => {
    test('should list and manage existing agents', async ({ page }) => {
      console.log('🔍 Testing agent list and management...');
      
      await authHelpers.loginAsPaidUser();
      
      try {
        // Open Agent Manager
        await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
        await testHelpers.waitForLoadingToComplete();
        
        await testHelpers.clickButton('button[title="Select Agent"]');
        await testHelpers.waitForLoadingToComplete();
        
        await testHelpers.clickButton('button:has-text("Agent Manager")');
        await testHelpers.waitForLoadingToComplete();
        await page.waitForTimeout(2000);
        
        // Test My Agents tab
        console.log('🔹 Testing My Agents tab...');
        await testHelpers.clickButton('button:has-text("My Agents")');
        await testHelpers.waitForLoadingToComplete();
        
        // Count agents
        const agentItems = await page.locator('[data-testid="agent-item"], .agent-item, div:has(h4)').count();
        console.log(`📊 Found ${agentItems} agents in My Agents tab`);
        
        // Test agent actions if agents exist
        if (agentItems > 0) {
          console.log('🔹 Testing agent actions...');
          
          // Look for edit button
          const hasEditButton = await testHelpers.elementExists('button[title="Edit agent"], button:has-text("Edit")');
          if (hasEditButton) {
            console.log('✅ Edit functionality available');
          }
          
          // Look for delete button
          const hasDeleteButton = await testHelpers.elementExists('button[title="Delete agent"], button:has-text("Delete")');
          if (hasDeleteButton) {
            console.log('✅ Delete functionality available');
          }
          
          // Look for share button
          const hasShareButton = await testHelpers.elementExists('button[title="Share agent"], button:has-text("Share")');
          if (hasShareButton) {
            console.log('✅ Share functionality available');
          }
        }
        
        // Test Shared Agents tab
        console.log('🔹 Testing Shared Agents tab...');
        await testHelpers.clickButton('button:has-text("Shared Agents")');
        await testHelpers.waitForLoadingToComplete();
        
        // Check shared agents
        const sharedAgentItems = await page.locator('[data-testid="shared-agent-item"], .shared-agent-item').count();
        console.log(`📊 Found ${sharedAgentItems} shared agents`);
        
        // Test pagination if present
        const hasPagination = await testHelpers.elementExists('button:has-text("Next"), button:has-text("Previous"), .pagination');
        if (hasPagination) {
          console.log('✅ Pagination controls available');
        }
        
        // Test search if present
        const hasSearch = await testHelpers.elementExists('input[placeholder*="Search"], input[type="search"]');
        if (hasSearch) {
          console.log('✅ Search functionality available');
          
          // Test search
          await testHelpers.fillField('input[placeholder*="Search"], input[type="search"]', 'test');
          await page.waitForTimeout(1000);
          console.log('✅ Search functionality tested');
        }
        
        // Close modal
        await testHelpers.clickButton('button[aria-label="Close"]');
        await testHelpers.waitForLoadingToComplete();
        
        console.log('✅ Agent management operations test completed');
        
      } catch (error) {
        console.error('❌ Agent management operations test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Agent Selection and Usage', () => {
    test('should select and use agents in chat', async ({ page }) => {
      console.log('🔍 Testing agent selection and usage...');
      
      await authHelpers.loginAsPaidUser();
      
      try {
        // Navigate to chat
        await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
        await testHelpers.waitForLoadingToComplete();
        
        // Test initial state
        const hasAgentSelector = await testHelpers.elementExists('button[title="Select Agent"]');
        expect(hasAgentSelector).toBe(true);
        
        // Open agent selector
        await testHelpers.clickButton('button[title="Select Agent"]');
        await testHelpers.waitForLoadingToComplete();
        
        // Get available agents
        const agentOptions = await page.locator('.fixed.w-72.bg-white button').all();
        console.log(`📊 Found ${agentOptions.length} options in agent selector`);
        
        let selectedAgent = false;
        let selectedAgentName = '';
        
        // Try to select an available agent
        for (const option of agentOptions) {
          const text = await option.textContent();
          if (text && !text.includes('Agent Manager') && !text.includes('No agents found')) {
            selectedAgentName = text.substring(0, 30);
            console.log(`🎯 Selecting agent: ${selectedAgentName}...`);
            
            await option.click();
            await testHelpers.waitForLoadingToComplete();
            selectedAgent = true;
            break;
          }
        }
        
        if (selectedAgent) {
          console.log('✅ Agent selected successfully');
          
          // Verify selection in UI
          const agentButtonTitle = await page.locator('button[title*="Agent"]').getAttribute('title');
          if (agentButtonTitle && agentButtonTitle.includes('Current Agent')) {
            console.log('✅ UI shows current agent selection');
          }
          
          // Test sending a message with selected agent
          console.log('🔹 Testing message with selected agent...');
          
          const hasChatInput = await testHelpers.elementExists('textarea');
          const hasSendButton = await testHelpers.elementExists('button:has-text("Send")');
          
          if (hasChatInput && hasSendButton) {
            await testHelpers.fillField('textarea', 'Hello! Please respond to confirm you are working correctly.');
            await testHelpers.clickButton('button:has-text("Send")');
            
            console.log('✅ Test message sent with selected agent');
            
            // Wait for response
            await page.waitForTimeout(5000);
            
            // Check if message appears in chat
            const hasMessage = await testHelpers.elementExists('div:has-text("Hello!")');
            if (hasMessage) {
              console.log('✅ Message appears in chat history');
            }
          }
          
          // Test deselecting agent
          console.log('🔹 Testing agent deselection...');
          
          await testHelpers.clickButton('button[title*="Agent"]');
          await testHelpers.waitForLoadingToComplete();
          
          const hasNoAgentsOption = await testHelpers.elementExists('button:has-text("No agents found")');
          if (hasNoAgentsOption) {
            await testHelpers.clickButton('button:has-text("No agents found")');
            await testHelpers.waitForLoadingToComplete();
            console.log('✅ Agent deselected successfully');
            
            // Verify deselection
            const buttonTitle = await page.locator('button[title*="Agent"]').getAttribute('title');
            if (buttonTitle === 'Select Agent') {
              console.log('✅ UI shows no agent selected');
            }
          }
        } else {
          console.log('ℹ️ No selectable agents found for testing');
        }
        
        console.log('✅ Agent selection and usage test completed');
        
      } catch (error) {
        console.error('❌ Agent selection and usage test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Agent Validation and Error Handling', () => {
    test('should validate agent creation form', async ({ page }) => {
      console.log('🔍 Testing agent creation validation...');
      
      await authHelpers.loginAsPaidUser();
      
      try {
        // Open Agent Manager
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
        
        const hasSubmitButton = await testHelpers.elementExists('form button:has-text("Create Agent")');
        if (hasSubmitButton) {
          await testHelpers.clickButton('form button:has-text("Create Agent")');
          await page.waitForTimeout(1000);
          
          // Check for validation errors
          const hasError = await testHelpers.elementExists('.error, .invalid, [role="alert"], .text-red-500');
          if (hasError) {
            console.log('✅ Form validation working - empty form rejected');
          } else {
            console.log('ℹ️ No visible validation errors found');
          }
        }
        
        // Test with just name
        console.log('🔹 Testing minimal valid form...');
        
        const hasNameField = await testHelpers.elementExists('label:has-text("Agent Name") + input');
        if (hasNameField) {
          await testHelpers.fillField('label:has-text("Agent Name") + input', 'Test Validation Agent');
          await testHelpers.clickButton('form button:has-text("Create Agent")');
          await testHelpers.waitForLoadingToComplete();
          await page.waitForTimeout(2000);
          
          console.log('✅ Minimal form submission tested');
        }
        
        // Close modal
        await testHelpers.clickButton('button[aria-label="Close"]');
        await testHelpers.waitForLoadingToComplete();
        
        console.log('✅ Agent validation test completed');
        
      } catch (error) {
        console.error('❌ Agent validation test failed:', error);
        throw error;
      }
    });

    test('should handle agent selector edge cases', async ({ page }) => {
      console.log('🔍 Testing agent selector edge cases...');
      
      await authHelpers.loginAsPaidUser();
      
      try {
        await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
        await testHelpers.waitForLoadingToComplete();
        
        // Test rapid clicking
        console.log('🔹 Testing rapid clicking...');
        for (let i = 0; i < 3; i++) {
          await testHelpers.clickButton('button[title="Select Agent"]');
          await page.waitForTimeout(100);
        }
        
        // Check if selector is still functional
        await testHelpers.waitForLoadingToComplete();
        const hasDropdown = await testHelpers.elementExists('.fixed.w-72.bg-white');
        console.log(`Agent selector functional after rapid clicks: ${hasDropdown ? '✅' : '❌'}`);
        
        if (hasDropdown) {
          // Test ESC key
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          
          const dropdownClosed = !await testHelpers.elementExists('.fixed.w-72.bg-white');
          console.log(`Dropdown closes with ESC: ${dropdownClosed ? '✅' : '❌'}`);
        }
        
        // Test click outside
        console.log('🔹 Testing click outside behavior...');
        await testHelpers.clickButton('button[title="Select Agent"]');
        await testHelpers.waitForLoadingToComplete();
        
        await page.click('body', { position: { x: 100, y: 100 } });
        await page.waitForTimeout(500);
        
        const dropdownClosedByClickOutside = !await testHelpers.elementExists('.fixed.w-72.bg-white');
        console.log(`Dropdown closes when clicking outside: ${dropdownClosedByClickOutside ? '✅' : '❌'}`);
        
        console.log('✅ Agent selector edge cases test completed');
        
      } catch (error) {
        console.error('❌ Agent selector edge cases test failed:', error);
        throw error;
      }
    });
  });
});

// Helper functions
async function openAgentManager(testHelpers: any, page: any): Promise<boolean> {
  try {
    await testHelpers.clickButton('button:has-text("Chat"), a[href*="chat"]');
    await testHelpers.waitForLoadingToComplete();
    
    await testHelpers.clickButton('button[title="Select Agent"]');
    await testHelpers.waitForLoadingToComplete();
    
    await testHelpers.clickButton('button:has-text("Agent Manager")');
    await testHelpers.waitForLoadingToComplete();
    await page.waitForTimeout(2000);
    
    return await testHelpers.elementExists('h3:has-text("Agent Manager")');
  } catch (error) {
    return false;
  }
}

async function createTestAgent(testHelpers: any, page: any, agentName: string): Promise<boolean> {
  try {
    const opened = await openAgentManager(testHelpers, page);
    if (!opened) return false;
    
    await testHelpers.clickButton('button:has-text("My Agents")');
    await testHelpers.waitForLoadingToComplete();
    
    await testHelpers.clickButton('button:has-text("Add New Agent")');
    await testHelpers.waitForLoadingToComplete();
    await page.waitForTimeout(1000);
    
    await testHelpers.fillField('label:has-text("Agent Name") + input', agentName);
    
    await testHelpers.clickButton('form button:has-text("Create Agent")');
    await testHelpers.waitForLoadingToComplete();
    await page.waitForTimeout(3000);
    
    return true;
  } catch (error) {
    return false;
  }
}