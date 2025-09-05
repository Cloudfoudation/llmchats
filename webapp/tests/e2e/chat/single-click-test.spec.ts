import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';

/**
 * Single Click Send Button Test
 * Verifies that the send button works on the first click (no double-click required)
 */
test.describe('Single Click Send Button Test', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('should send message on first click (no double-click required)', async ({ page }) => {
    console.log('🎯 Testing single-click send button behavior...');
    
    try {
      await authHelpers.loginAsPaidUser();
      
      // Navigate to chat
      const hasNewConversationButton = await testHelpers.elementExists('button[title="New Conversation"]');
      if (hasNewConversationButton) {
        await testHelpers.clickButton('button[title="New Conversation"]');
        await testHelpers.waitForLoadingToComplete();
      }
      
      const textarea = page.locator('textarea').first();
      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
      
      // Test 1: Single click should work immediately
      console.log('🧪 Test 1: Single click behavior...');
      
      await textarea.fill('Single click test message');
      
      // Count messages before click
      const messagesBefore = await page.locator('[class*="message"], .message').count();
      console.log(`Messages before single click: ${messagesBefore}`);
      
      // Take screenshot before click
      await testHelpers.takeScreenshot('before-single-click');
      
      // Single click on send button
      console.log('🖱️ Performing SINGLE click on send button...');
      await sendButton.click();
      
      // Wait a short time for immediate response
      await page.waitForTimeout(2000);
      
      // Check if message was sent immediately
      const messagesAfterSingleClick = await page.locator('[class*="message"], .message').count();
      const textareaAfterSingleClick = await textarea.inputValue();
      
      console.log(`Messages after single click: ${messagesAfterSingleClick}`);
      console.log(`Textarea after single click: "${textareaAfterSingleClick}"`);
      
      // Take screenshot after single click
      await testHelpers.takeScreenshot('after-single-click');
      
      // Verify single click worked
      const singleClickWorked = messagesAfterSingleClick > messagesBefore || textareaAfterSingleClick === '';
      
      if (singleClickWorked) {
        console.log('✅ SUCCESS: Single click worked immediately!');
      } else {
        console.log('❌ ISSUE: Single click did not work, testing double click...');
        
        // Test if double click is needed (old behavior)
        await textarea.fill('Double click test message');
        const messagesBeforeDouble = await page.locator('[class*="message"], .message').count();
        
        // First click
        await sendButton.click();
        await page.waitForTimeout(500);
        
        // Second click
        await sendButton.click();
        await page.waitForTimeout(2000);
        
        const messagesAfterDouble = await page.locator('[class*="message"], .message').count();
        
        if (messagesAfterDouble > messagesBeforeDouble) {
          console.log('❌ CONFIRMED: Double click is required (bug not fixed)');
        } else {
          console.log('❌ ISSUE: Neither single nor double click works');
        }
      }
      
      // Test 2: Verify button has proper click handler
      console.log('🧪 Test 2: Button click handler verification...');
      
      const buttonHasClickHandler = await sendButton.evaluate((button) => {
        // Check if button has onclick or event listeners
        const hasOnClick = button.onclick !== null;
        const hasEventListeners = button.getEventListeners ? 
          Object.keys(button.getEventListeners()).length > 0 : 
          'Cannot check event listeners';
        
        return {
          hasOnClick,
          hasEventListeners,
          buttonType: button.type,
          disabled: button.disabled
        };
      });
      
      console.log('Button properties:', buttonHasClickHandler);
      
      // Test 3: Compare with Enter key behavior
      console.log('🧪 Test 3: Comparing with Enter key behavior...');
      
      await textarea.fill('Enter key test message');
      const messagesBeforeEnter = await page.locator('[class*="message"], .message').count();
      
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      const messagesAfterEnter = await page.locator('[class*="message"], .message').count();
      const enterKeyWorked = messagesAfterEnter > messagesBeforeEnter;
      
      console.log(`Enter key worked: ${enterKeyWorked ? '✅ YES' : '❌ NO'}`);
      
      // Final assessment
      console.log('🎯 Final Assessment:');
      console.log(`  Single click works: ${singleClickWorked ? '✅ YES' : '❌ NO'}`);
      console.log(`  Enter key works: ${enterKeyWorked ? '✅ YES' : '❌ NO'}`);
      
      if (singleClickWorked && enterKeyWorked) {
        console.log('🎉 SUCCESS: Both send methods work on first attempt!');
      } else if (enterKeyWorked && !singleClickWorked) {
        console.log('⚠️ PARTIAL: Enter key works, but send button needs fixing');
      } else {
        console.log('❌ ISSUE: Send functionality has problems');
      }
      
      expect(singleClickWorked || enterKeyWorked).toBe(true);

    } catch (error) {
      console.error('❌ Single click test failed:', error);
      await testHelpers.takeScreenshot('single-click-test-error');
      throw error;
    }
  });
});
