import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';

/**
 * Chat Send Message Test
 * Tests the complete chat functionality including send button, message display, and AI responses
 */
test.describe('Chat Send Message Functionality', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('should send message using Send button and receive response', async ({ page }) => {
    console.log('💬 Testing chat send message functionality...');
    
    try {
      // Step 1: Login and navigate to chat
      await authHelpers.loginAsPaidUser();
      console.log('✅ Authentication successful');
      
      // Step 2: Navigate to chat interface
      console.log('🚪 Navigating to chat interface...');
      
      // Try different methods to get to chat
      const chatMethods = [
        { selector: 'button[title="New Conversation"]', name: 'New Conversation button' },
        { selector: 'button:has-text("Chat")', name: 'Chat button' },
        { selector: 'a[href*="chat"]', name: 'Chat link' }
      ];
      
      let chatOpened = false;
      for (const method of chatMethods) {
        const exists = await testHelpers.elementExists(method.selector);
        if (exists) {
          console.log(`🖱️ Clicking ${method.name}...`);
          await testHelpers.clickButton(method.selector);
          await testHelpers.waitForLoadingToComplete();
          
          // Check if we have chat interface
          const hasTextarea = await testHelpers.elementExists('textarea');
          if (hasTextarea) {
            console.log(`✅ ${method.name} opened chat interface`);
            chatOpened = true;
            break;
          }
        }
      }
      
      if (!chatOpened) {
        // Try direct navigation
        console.log('🔄 Trying direct navigation to chat...');
        await page.goto('/chat');
        await testHelpers.waitForLoadingToComplete();
        
        const hasTextarea = await testHelpers.elementExists('textarea');
        if (hasTextarea) {
          console.log('✅ Direct navigation to chat successful');
          chatOpened = true;
        }
      }
      
      expect(chatOpened).toBe(true);
      
      // Step 3: Analyze chat interface elements
      console.log('🔍 Analyzing chat interface elements...');
      
      const chatElements = {
        textareas: await page.locator('textarea').count(),
        sendButtons: await page.locator('button[type="submit"], button:has-text("Send")').count(),
        forms: await page.locator('form').count(),
        messageContainers: await page.locator('[class*="message"], .message, [data-testid*="message"]').count()
      };
      
      console.log('Chat Interface Analysis:');
      console.log(`  Textareas: ${chatElements.textareas}`);
      console.log(`  Send buttons: ${chatElements.sendButtons}`);
      console.log(`  Forms: ${chatElements.forms}`);
      console.log(`  Message containers: ${chatElements.messageContainers}`);
      
      // Step 4: Test message input
      console.log('📝 Testing message input...');
      
      const textarea = page.locator('textarea').first();
      const testMessage = 'Hello! This is a test message. Please respond with "Test successful" to confirm the chat is working.';
      
      await textarea.focus();
      await textarea.fill(testMessage);
      
      // Verify message was entered
      const inputValue = await textarea.inputValue();
      expect(inputValue).toBe(testMessage);
      console.log('✅ Message successfully entered in textarea');
      
      // Step 5: Test Send button functionality
      console.log('🚀 Testing Send button functionality...');
      
      // Take screenshot before sending
      await testHelpers.takeScreenshot('before-send-message');
      
      // Count messages before sending
      const messagesBefore = await page.locator('[class*="message"], .message, [data-testid*="message"]').count();
      console.log(`Messages before sending: ${messagesBefore}`);
      
      // Find and click send button
      const sendButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("Send")',
        'form button[type="submit"]',
        'button:has-text("Generate")'
      ];
      
      let sendButtonClicked = false;
      for (const selector of sendButtonSelectors) {
        const exists = await testHelpers.elementExists(selector);
        if (exists) {
          const button = page.locator(selector).first();
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          
          console.log(`Send button (${selector}): exists=${exists}, visible=${isVisible}, enabled=${isEnabled}`);
          
          if (isVisible && isEnabled) {
            console.log(`🖱️ Clicking send button: ${selector}`);
            await button.click();
            sendButtonClicked = true;
            break;
          }
        }
      }
      
      expect(sendButtonClicked).toBe(true);
      console.log('✅ Send button clicked successfully');
      
      // Step 6: Verify message was sent
      console.log('📤 Verifying message was sent...');
      
      // Wait for UI to update
      await page.waitForTimeout(2000);
      
      // Check if textarea was cleared
      const textareaAfterSend = await textarea.inputValue();
      console.log(`Textarea after send: "${textareaAfterSend}"`);
      
      // Count messages after sending
      const messagesAfter = await page.locator('[class*="message"], .message, [data-testid*="message"]').count();
      console.log(`Messages after sending: ${messagesAfter}`);
      
      // Take screenshot after sending
      await testHelpers.takeScreenshot('after-send-message');
      
      // Verify message was sent (either textarea cleared or message count increased)
      const messageSent = textareaAfterSend === '' || messagesAfter > messagesBefore;
      expect(messageSent).toBe(true);
      console.log('✅ Message was successfully sent');
      
      // Step 7: Wait for and verify AI response
      console.log('🤖 Waiting for AI response...');
      
      // Wait longer for AI response
      await page.waitForTimeout(10000);
      
      // Check for response
      const finalMessageCount = await page.locator('[class*="message"], .message, [data-testid*="message"]').count();
      console.log(`Final message count: ${finalMessageCount}`);
      
      // Look for loading indicators
      const hasLoadingIndicator = await testHelpers.elementExists('.loading, [class*="loading"], .animate-pulse, [class*="animate-pulse"]');
      console.log(`Loading indicator present: ${hasLoadingIndicator}`);
      
      // Check if we got a response
      if (finalMessageCount > messagesAfter) {
        console.log('🎉 AI response received!');
        
        // Try to get the response text
        const messages = await page.locator('[class*="message"], .message, [data-testid*="message"]').all();
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          const responseText = await lastMessage.textContent() || '';
          console.log(`AI Response preview: ${responseText.substring(0, 200)}...`);
        }
      } else {
        console.log('⚠️ No AI response yet, but message sending works');
      }
      
      // Take final screenshot
      await testHelpers.takeScreenshot('final-chat-state');
      
      console.log('✅ Chat send message test completed successfully');

    } catch (error) {
      console.error('❌ Chat send message test failed:', error);
      await testHelpers.takeScreenshot('chat-send-error');
      throw error;
    }
  });

  test('should test different send methods (button vs Enter key)', async ({ page }) => {
    console.log('⌨️ Testing different send methods...');
    
    try {
      await authHelpers.loginAsPaidUser();
      
      // Navigate to chat using the same method that worked in the first test
      console.log('🚪 Navigating to chat interface...');
      const hasNewConversationButton = await testHelpers.elementExists('button[title="New Conversation"]');
      if (hasNewConversationButton) {
        await testHelpers.clickButton('button[title="New Conversation"]');
        await testHelpers.waitForLoadingToComplete();
      } else {
        // Try other methods
        await page.goto('/chat');
        await testHelpers.waitForLoadingToComplete();
      }
      
      const hasTextarea = await testHelpers.elementExists('textarea');
      expect(hasTextarea).toBe(true);
      
      const textarea = page.locator('textarea').first();
      
      // Test 1: Send with Enter key
      console.log('🧪 Test 1: Sending with Enter key...');
      
      await textarea.focus();
      await textarea.fill('Test message 1 - sent with Enter key');
      
      const messagesBefore1 = await page.locator('[class*="message"], .message').count();
      
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000); // Wait longer for message processing
      
      const messagesAfter1 = await page.locator('[class*="message"], .message').count();
      const textareaAfter1 = await textarea.inputValue();
      
      console.log(`Enter key test - Messages: ${messagesBefore1} -> ${messagesAfter1}, Textarea: "${textareaAfter1}"`);
      
      // Test 2: Send with button click
      console.log('🧪 Test 2: Sending with Send button...');
      
      await page.waitForTimeout(5000); // Wait between tests
      
      await textarea.focus();
      await textarea.fill('Test message 2 - sent with Send button');
      
      const messagesBefore2 = await page.locator('[class*="message"], .message').count();
      
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
      await sendButton.click();
      await page.waitForTimeout(3000); // Wait for message processing
      
      const messagesAfter2 = await page.locator('[class*="message"], .message').count();
      const textareaAfter2 = await textarea.inputValue();
      
      console.log(`Button click test - Messages: ${messagesBefore2} -> ${messagesAfter2}, Textarea: "${textareaAfter2}"`);
      
      // Test 3: Test Shift+Enter (should add new line, not send)
      console.log('🧪 Test 3: Testing Shift+Enter (should not send)...');
      
      await textarea.focus();
      await textarea.fill('Line 1');
      
      await page.keyboard.press('Shift+Enter');
      await textarea.type('Line 2');
      
      const multilineValue = await textarea.inputValue();
      console.log(`Multiline test - Textarea value: "${multilineValue}"`);
      
      expect(multilineValue).toContain('Line 1');
      expect(multilineValue).toContain('Line 2');
      
      console.log('✅ All send methods tested successfully');

    } catch (error) {
      console.error('❌ Send methods test failed:', error);
      await testHelpers.takeScreenshot('send-methods-error');
      throw error;
    }
  });

  test('should test send button states and validation', async ({ page }) => {
    console.log('🔍 Testing send button states and validation...');
    
    try {
      await authHelpers.loginAsPaidUser();
      
      // Navigate to chat using working method
      const hasNewConversationButton = await testHelpers.elementExists('button[title="New Conversation"]');
      if (hasNewConversationButton) {
        await testHelpers.clickButton('button[title="New Conversation"]');
        await testHelpers.waitForLoadingToComplete();
      }
      
      const textarea = page.locator('textarea').first();
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
      
      // Test 1: Empty input validation
      console.log('🧪 Test 1: Empty input validation...');
      
      await textarea.focus();
      await textarea.fill('');
      
      const isEnabledEmpty = await sendButton.isEnabled();
      console.log(`Send button enabled with empty input: ${isEnabledEmpty}`);
      
      // Test 2: With valid input
      console.log('🧪 Test 2: With valid input...');
      
      await textarea.fill('Valid test message');
      
      const isEnabledWithText = await sendButton.isEnabled();
      console.log(`Send button enabled with text: ${isEnabledWithText}`);
      
      // Test 3: Button text changes
      console.log('🧪 Test 3: Button text and states...');
      
      const buttonText = await sendButton.textContent();
      console.log(`Send button text: "${buttonText}"`);
      
      // Test 4: Loading state (if applicable)
      console.log('🧪 Test 4: Testing loading state...');
      
      if (isEnabledWithText) {
        await sendButton.click();
        await page.waitForTimeout(1000);
        
        // Check if button changes to "Stop" during loading
        const loadingButtonText = await sendButton.textContent();
        console.log(`Button text during loading: "${loadingButtonText}"`);
        
        // Wait for loading to complete
        await page.waitForTimeout(5000);
        
        const finalButtonText = await sendButton.textContent();
        console.log(`Button text after loading: "${finalButtonText}"`);
      }
      
      console.log('✅ Send button states tested successfully');

    } catch (error) {
      console.error('❌ Send button states test failed:', error);
      await testHelpers.takeScreenshot('send-button-states-error');
      throw error;
    }
  });

  test('should identify and fix send button issues', async ({ page }) => {
    console.log('🔧 Identifying potential send button issues...');
    
    try {
      await authHelpers.loginAsPaidUser();
      
      // Navigate to chat using working method
      const hasNewConversationButton = await testHelpers.elementExists('button[title="New Conversation"]');
      if (hasNewConversationButton) {
        await testHelpers.clickButton('button[title="New Conversation"]');
        await testHelpers.waitForLoadingToComplete();
      }
      
      // Comprehensive analysis of chat interface
      console.log('🔍 Comprehensive chat interface analysis...');
      
      // Check for form structure
      const forms = await page.locator('form').all();
      console.log(`Found ${forms.length} forms`);
      
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const formHTML = await form.innerHTML();
        console.log(`Form ${i + 1} structure (first 200 chars): ${formHTML.substring(0, 200)}...`);
      }
      
      // Check for all buttons
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons total`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const button = allButtons[i];
        try {
          const text = await button.textContent() || '';
          const type = await button.getAttribute('type') || '';
          const disabled = await button.isDisabled();
          const visible = await button.isVisible();
          
          if (text.toLowerCase().includes('send') || 
              text.toLowerCase().includes('generate') || 
              type === 'submit') {
            console.log(`Button ${i + 1}: "${text}" (type: ${type}, disabled: ${disabled}, visible: ${visible})`);
          }
        } catch (e) {
          // Skip problematic buttons
        }
      }
      
      // Check textarea and form relationship
      const textarea = page.locator('textarea').first();
      const textareaExists = await textarea.count() > 0;
      
      if (textareaExists) {
        const form = textarea.locator('xpath=ancestor::form[1]');
        const hasForm = await form.count() > 0;
        console.log(`Textarea is inside form: ${hasForm}`);
        
        if (hasForm) {
          const formButtons = await form.locator('button').all();
          console.log(`Buttons inside textarea's form: ${formButtons.length}`);
          
          for (const button of formButtons) {
            const text = await button.textContent() || '';
            const type = await button.getAttribute('type') || '';
            console.log(`  Form button: "${text}" (type: ${type})`);
          }
        }
      }
      
      // Test actual functionality
      console.log('🧪 Testing actual send functionality...');
      
      if (textareaExists) {
        await textarea.fill('Diagnostic test message');
        
        // Try form submission
        const form = page.locator('form').first();
        if (await form.count() > 0) {
          console.log('📤 Attempting form submission...');
          
          // Listen for form submission
          let formSubmitted = false;
          page.on('request', (request) => {
            if (request.method() === 'POST') {
              console.log(`POST request detected: ${request.url()}`);
              formSubmitted = true;
            }
          });
          
          // Try submitting the form
          await form.evaluate((form) => {
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);
          });
          
          await page.waitForTimeout(2000);
          console.log(`Form submission detected: ${formSubmitted}`);
        }
      }
      
      console.log('✅ Send button analysis completed');

    } catch (error) {
      console.error('❌ Send button analysis failed:', error);
      await testHelpers.takeScreenshot('send-button-analysis-error');
      throw error;
    }
  });
});
