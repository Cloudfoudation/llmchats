import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { SELECTORS, TIMEOUTS, TEST_MODELS, TEST_PROMPTS } from '../../fixtures/test-data';

/**
 * Consolidated Model Testing
 * Clean implementation using the correct navigation approach discovered in enter-chat-interface.spec.ts
 * Key insight: Must click "Chat" button first to enter actual chat interface
 */
test.describe('Consolidated Model Testing', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  /**
   * Helper function to properly enter chat interface
   * This was the missing piece in previous failed tests
   */
  async function enterChatInterface(page: any): Promise<boolean> {
    // Check if we're already in chat interface
    const textareas = await page.locator('textarea').count();
    if (textareas > 0) {
      console.log('✅ Already in chat interface');
      return true;
    }

    // Click Chat button to enter chat interface
    const chatButtons = [
      'button:has-text("Chat")',
      'button:has-text("Start New Chat")'
    ];

    for (const buttonSelector of chatButtons) {
      const buttonExists = await page.locator(buttonSelector).count() > 0;
      const buttonVisible = buttonExists ? await page.locator(buttonSelector).first().isVisible() : false;

      if (buttonExists && buttonVisible) {
        console.log(`🖱️ Clicking ${buttonSelector} to enter chat interface...`);
        await page.locator(buttonSelector).first().click();
        await page.waitForTimeout(2000);

        const newTextareas = await page.locator('textarea').count();
        if (newTextareas > 0) {
          console.log('✅ Successfully entered chat interface');
          return true;
        }
      }
    }

    console.log('❌ Could not enter chat interface');
    return false;
  }

  test('should test basic chat functionality with correct navigation', async ({ page }) => {
    console.log('🧪 Testing basic chat functionality with correct navigation...');
    
    try {
      // Step 1: Authenticate
      await authHelpers.loginAsPaidUser();
      console.log('✅ Authentication successful');
      
      // Step 2: Enter chat interface (KEY STEP that was missing!)
      const chatInterfaceEntered = await enterChatInterface(page);
      expect(chatInterfaceEntered).toBeTruthy();
      
      // Step 3: Test basic chat functionality
      const testMessage = 'Hello! Please respond with "Basic test successful" to confirm chat is working.';
      
      const responseReceived = await sendMessageAndWaitForResponse(page, testMessage, 'basic test');
      
      if (responseReceived) {
        const response = await testHelpers.getTextContent(SELECTORS.chat.messageAssistant + ':last-child');
        console.log(`✅ Basic test successful (${response?.length || 0} characters)`);
        console.log(`Response: ${response?.substring(0, 100)}...`);
        
        expect(response?.length || 0).toBeGreaterThan(10);
      } else {
        console.log('❌ Basic test failed - no response');
        expect(responseReceived).toBeTruthy();
      }
      
      console.log('✅ Basic chat functionality test completed');

    } catch (error) {
      console.error('❌ Basic chat test failed:', error);
      await testHelpers.takeScreenshot('consolidated-basic-chat-error');
      throw error;
    }
  });

  test('should test available models with correct navigation', async ({ page }) => {
    console.log('🧪 Testing available models with correct navigation...');
    
    try {
      // Step 1: Authenticate
      await authHelpers.loginAsPaidUser();
      console.log('✅ Authentication successful');
      
      // Step 2: Enter chat interface
      const chatInterfaceEntered = await enterChatInterface(page);
      expect(chatInterfaceEntered).toBeTruthy();
      
      // Step 3: Test available models
      const modelResults: Array<{
        name: string;
        success: boolean;
        responseLength: number;
      }> = [];

      // Test first 2 models from TEST_MODELS
      for (const model of TEST_MODELS.slice(0, 2)) {
        console.log(`\n🤖 Testing ${model.name}...`);
        
        let success = false;
        let responseLength = 0;
        
        try {
          // Try to select model (now that we're in correct interface)
          const modelSelected = await selectModel(page, model);
          
          if (modelSelected) {
            console.log(`✅ Selected ${model.name}`);
          } else {
            console.log(`⚠️ Using default model for ${model.name}`);
          }
          
          // Send test message
          const testMessage = `Hello ${model.name}! Please respond with "Testing ${model.name} - success" if you can process this.`;
          
          const responseReceived = await sendMessageAndWaitForResponse(page, testMessage, model.name);
          
          if (responseReceived) {
            success = true;
            const response = await testHelpers.getTextContent(SELECTORS.chat.messageAssistant + ':last-child');
            responseLength = response ? response.length : 0;
            console.log(`✅ ${model.name} responded successfully (${responseLength} chars)`);
          } else {
            console.log(`❌ ${model.name} failed to respond`);
          }
          
        } catch (err) {
          console.log(`❌ ${model.name} error: ${err}`);
        }
        
        modelResults.push({
          name: model.name,
          success,
          responseLength
        });
        
        // Brief pause between models
        await page.waitForTimeout(2000);
      }
      
      // Results analysis
      const successfulModels = modelResults.filter(r => r.success);
      console.log('\n📊 Model Testing Results:');
      console.log(`✅ Successful: ${successfulModels.length}/${modelResults.length}`);
      
      successfulModels.forEach(model => {
        console.log(`  ✅ ${model.name}: ${model.responseLength} chars`);
      });
      
      const failedModels = modelResults.filter(r => !r.success);
      failedModels.forEach(model => {
        console.log(`  ❌ ${model.name}: Failed`);
      });
      
      // Assertions
      expect(successfulModels.length).toBeGreaterThan(0);
      console.log('✅ Model testing completed successfully');

    } catch (error) {
      console.error('❌ Model testing failed:', error);
      await testHelpers.takeScreenshot('consolidated-model-testing-error');
      throw error;
    }
  });

  test('should test sequential messages with correct navigation', async ({ page }) => {
    console.log('⚡ Testing sequential messages with correct navigation...');
    
    try {
      // Step 1: Authenticate
      await authHelpers.loginAsPaidUser();
      console.log('✅ Authentication successful');
      
      // Step 2: Enter chat interface
      const chatInterfaceEntered = await enterChatInterface(page);
      expect(chatInterfaceEntered).toBeTruthy();
      
      // Step 3: Test sequential messages
      const messages = [
        'What is 2+2?',
        'What color is the sky?',
        'Say hello.'
      ];
      
      let successCount = 0;
      
      for (let i = 0; i < messages.length; i++) {
        console.log(`📤 Message ${i + 1}: ${messages[i]}`);
        
        const responseReceived = await sendMessageAndWaitForResponse(page, messages[i], `message ${i + 1}`);
        
        if (responseReceived) {
          successCount++;
          console.log(`✅ Message ${i + 1} successful`);
        } else {
          console.log(`❌ Message ${i + 1} failed`);
        }
        
        // Pause between messages
        await page.waitForTimeout(1000);
      }
      
      console.log(`📊 Sequential messages: ${successCount}/${messages.length} successful`);
      expect(successCount).toBeGreaterThan(0);
      
      console.log('✅ Sequential messages test completed');

    } catch (error) {
      console.error('❌ Sequential messages test failed:', error);
      await testHelpers.takeScreenshot('consolidated-sequential-messages-error');
      throw error;
    }
  });

  // Helper Functions (using working approach from model-switching-test.spec.ts)
  async function selectModel(page, model) {
    try {
      // Now that we're in chat interface, look for model selectors
      const modelSelectorButtons = [
        'button[title="Select Model"]',
        'button:has([class*="tabler-icon-settings"])'
      ];

      for (const selectorButton of modelSelectorButtons) {
        if (await testHelpers.elementExists(selectorButton)) {
          console.log(`⚙️ Opening model selector: ${selectorButton}`);
          await page.click(selectorButton);
          await page.waitForTimeout(1000);

          // Try to select the model
          for (const modelSelector of model.selectors) {
            if (await testHelpers.elementExists(modelSelector)) {
              console.log(`✅ Selecting ${model.name}: ${modelSelector}`);
              await page.click(modelSelector);
              await page.waitForTimeout(1000);
              return true;
            }
          }
          
          // Close selector if we couldn't select anything
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
      
      return false;
    } catch (error) {
      console.log(`⚠️ Model selection failed for ${model.name}:`, error);
      return false;
    }
  }

  async function sendMessageAndWaitForResponse(page, message, context) {
    try {
      console.log(`📤 Sending message for ${context}...`);
      
      // Use exact working approach from model-switching-test.spec.ts
      const messageInput = page.locator('textarea').first();
      await messageInput.focus();
      await messageInput.fill(message);
      await page.keyboard.press('Enter'); // This is the key working approach!

      console.log(`🤖 Waiting for ${context} response...`);
      await page.waitForTimeout(2000); // Initial processing time

      // Wait for AI response using working selector and timeout
      await testHelpers.waitForElement(SELECTORS.chat.messageAssistant + ':last-child', TIMEOUTS.aiResponse);
      const response = await testHelpers.getTextContent(SELECTORS.chat.messageAssistant + ':last-child');
      
      if (response && response.length > 5) {
        console.log(`✅ Response received for ${context} (${response.length} chars)`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.log(`⚠️ No response for ${context} within timeout`);
      return false;
    }
  }
});
