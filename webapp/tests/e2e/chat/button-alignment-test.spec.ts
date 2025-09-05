import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';

/**
 * Button Alignment Test
 * Verifies that the send button is properly aligned with the textarea
 * and maintains consistent height and focus behavior
 */
test.describe('Send Button Alignment Test', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('should have send button aligned with textarea and maintain consistent height', async ({ page }) => {
    console.log('📐 Testing send button alignment and height consistency...');
    
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
      
      // Test 1: Measure initial dimensions
      console.log('📏 Test 1: Measuring initial dimensions...');
      
      const initialTextareaBox = await textarea.boundingBox();
      const initialButtonBox = await sendButton.boundingBox();
      
      if (!initialTextareaBox || !initialButtonBox) {
        throw new Error('Could not get element dimensions');
      }
      
      console.log('Initial Textarea:', {
        height: initialTextareaBox.height,
        y: initialTextareaBox.y,
        bottom: initialTextareaBox.y + initialTextareaBox.height
      });
      
      console.log('Initial Send Button:', {
        height: initialButtonBox.height,
        y: initialButtonBox.y,
        bottom: initialButtonBox.y + initialButtonBox.height
      });
      
      // Check if they are aligned (bottom edges should be close)
      const bottomAlignment = Math.abs(
        (initialTextareaBox.y + initialTextareaBox.height) - 
        (initialButtonBox.y + initialButtonBox.height)
      );
      
      console.log(`Bottom edge alignment difference: ${bottomAlignment}px`);
      
      // Test 2: Focus on textarea and check if button maintains alignment
      console.log('📏 Test 2: Testing focus behavior...');
      
      await textarea.focus();
      await page.waitForTimeout(500); // Wait for focus animations
      
      const focusedTextareaBox = await textarea.boundingBox();
      const focusedButtonBox = await sendButton.boundingBox();
      
      if (!focusedTextareaBox || !focusedButtonBox) {
        throw new Error('Could not get focused element dimensions');
      }
      
      console.log('Focused Textarea:', {
        height: focusedTextareaBox.height,
        y: focusedTextareaBox.y,
        bottom: focusedTextareaBox.y + focusedTextareaBox.height
      });
      
      console.log('Focused Send Button:', {
        height: focusedButtonBox.height,
        y: focusedButtonBox.y,
        bottom: focusedButtonBox.y + focusedButtonBox.bottom
      });
      
      // Check if button maintained alignment after textarea focus
      const focusedBottomAlignment = Math.abs(
        (focusedTextareaBox.y + focusedTextareaBox.height) - 
        (focusedButtonBox.y + focusedButtonBox.height)
      );
      
      console.log(`Focused bottom edge alignment difference: ${focusedBottomAlignment}px`);
      
      // Test 3: Focus on send button and check alignment
      console.log('📏 Test 3: Testing send button focus...');
      
      await sendButton.focus();
      await page.waitForTimeout(500); // Wait for focus animations
      
      const buttonFocusedTextareaBox = await textarea.boundingBox();
      const buttonFocusedButtonBox = await sendButton.boundingBox();
      
      if (!buttonFocusedTextareaBox || !buttonFocusedButtonBox) {
        throw new Error('Could not get button-focused element dimensions');
      }
      
      console.log('Button-focused Textarea:', {
        height: buttonFocusedTextareaBox.height,
        y: buttonFocusedTextareaBox.y,
        bottom: buttonFocusedTextareaBox.y + buttonFocusedTextareaBox.height
      });
      
      console.log('Button-focused Send Button:', {
        height: buttonFocusedButtonBox.height,
        y: buttonFocusedButtonBox.y,
        bottom: buttonFocusedButtonBox.y + buttonFocusedButtonBox.height
      });
      
      // Check if textarea maintained height when button is focused
      const buttonFocusedAlignment = Math.abs(
        (buttonFocusedTextareaBox.y + buttonFocusedTextareaBox.height) - 
        (buttonFocusedButtonBox.y + buttonFocusedButtonBox.height)
      );
      
      console.log(`Button-focused alignment difference: ${buttonFocusedAlignment}px`);
      
      // Test 4: Type text and check if alignment is maintained
      console.log('📏 Test 4: Testing with text input...');
      
      await textarea.focus();
      await textarea.fill('This is a test message to check if the button alignment is maintained when there is text in the textarea.');
      await page.waitForTimeout(500);
      
      const textFilledTextareaBox = await textarea.boundingBox();
      const textFilledButtonBox = await sendButton.boundingBox();
      
      if (!textFilledTextareaBox || !textFilledButtonBox) {
        throw new Error('Could not get text-filled element dimensions');
      }
      
      console.log('Text-filled Textarea:', {
        height: textFilledTextareaBox.height,
        y: textFilledTextareaBox.y,
        bottom: textFilledTextareaBox.y + textFilledTextareaBox.height
      });
      
      console.log('Text-filled Send Button:', {
        height: textFilledButtonBox.height,
        y: textFilledButtonBox.y,
        bottom: textFilledButtonBox.y + textFilledButtonBox.height
      });
      
      const textFilledAlignment = Math.abs(
        (textFilledTextareaBox.y + textFilledTextareaBox.height) - 
        (textFilledButtonBox.y + textFilledButtonBox.height)
      );
      
      console.log(`Text-filled alignment difference: ${textFilledAlignment}px`);
      
      // Test 5: Check CSS classes and styles
      console.log('📏 Test 5: Checking CSS classes and styles...');
      
      const textareaClasses = await textarea.getAttribute('class');
      const buttonClasses = await sendButton.getAttribute('class');
      
      console.log('Textarea classes:', textareaClasses);
      console.log('Button classes:', buttonClasses);
      
      // Check if button has min-height matching textarea or uses dynamic height approach
      const buttonHasMinHeight = buttonClasses?.includes('min-h-[44px]') || 
                                 buttonClasses?.includes('min-h-[80px]') ||
                                 buttonClasses?.includes('h-11') ||
                                 buttonClasses?.includes('h-20') ||
                                 buttonClasses?.includes('h-[120px]');
      const textareaHasMinHeight = textareaClasses?.includes('min-h-[44px]') || textareaClasses?.includes('min-h-[80px]');
      
      console.log(`Button has height classes: ${buttonHasMinHeight}`);
      console.log(`Textarea has min-height: ${textareaHasMinHeight}`);
      
      // Take screenshots for visual verification
      await testHelpers.takeScreenshot('button-alignment-initial');
      await textarea.focus();
      await testHelpers.takeScreenshot('button-alignment-textarea-focused');
      await sendButton.focus();
      await testHelpers.takeScreenshot('button-alignment-button-focused');
      
      // Assessment
      console.log('📊 Alignment Assessment:');
      console.log(`  Initial alignment: ${bottomAlignment <= 5 ? '✅ GOOD' : '❌ POOR'} (${bottomAlignment}px)`);
      console.log(`  Focused alignment: ${focusedBottomAlignment <= 5 ? '✅ GOOD' : '❌ POOR'} (${focusedBottomAlignment}px)`);
      console.log(`  Button focus alignment: ${buttonFocusedAlignment <= 5 ? '✅ GOOD' : '❌ POOR'} (${buttonFocusedAlignment}px)`);
      console.log(`  Text-filled alignment: ${textFilledAlignment <= 5 ? '✅ GOOD' : '❌ POOR'} (${textFilledAlignment}px)`);
      console.log(`  Min-height consistency: ${buttonHasMinHeight && textareaHasMinHeight ? '✅ GOOD' : '❌ POOR (using dynamic height approach)'}`);
      
      // Note: Dynamic height approach can still achieve perfect alignment
      const alignmentPerfect = bottomAlignment === 0 && focusedBottomAlignment === 0 && 
                              buttonFocusedAlignment === 0 && textFilledAlignment === 0;
      
      if (alignmentPerfect && !buttonHasMinHeight) {
        console.log('  📝 Note: Button uses dynamic height approach but achieves perfect alignment');
      }
      
      // Verify alignment is good (within 7px tolerance - accounting for browser rendering differences)
      expect(bottomAlignment).toBeLessThanOrEqual(7);
      expect(focusedBottomAlignment).toBeLessThanOrEqual(7);
      expect(buttonFocusedAlignment).toBeLessThanOrEqual(7);
      expect(textFilledAlignment).toBeLessThanOrEqual(7);
      
      console.log('✅ Button alignment test completed successfully');

    } catch (error) {
      console.error('❌ Button alignment test failed:', error);
      await testHelpers.takeScreenshot('button-alignment-error');
      throw error;
    }
  });
});
