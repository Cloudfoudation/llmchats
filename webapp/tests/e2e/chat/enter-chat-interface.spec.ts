import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';

/**
 * Enter Chat Interface Test
 * Properly navigate to the actual chat interface where textarea and model selector exist
 */
test.describe('Enter Chat Interface', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('should properly enter chat interface and find chat elements', async ({ page }) => {
    console.log('🚪 Testing proper entry to chat interface...');
    
    try {
      await authHelpers.loginAsPaidUser();
      console.log('✅ Authentication successful');
      
      // Step 1: We're on the main navigation page
      console.log('\n📍 Step 1: Analyzing current page...');
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      // Check what we have on this page
      const textareas = await page.locator('textarea').count();
      console.log(`Textareas on main page: ${textareas}`);
      
      if (textareas === 0) {
        console.log('✅ Confirmed: We are on navigation page, not chat interface');
        
        // Step 2: Look for buttons to enter chat interface
        console.log('\n🚪 Step 2: Looking for chat entry buttons...');
        
        const chatEntryButtons = [
          { selector: 'button:has-text("Chat")', name: 'Chat button' },
          { selector: 'button:has-text("Start New Chat")', name: 'Start New Chat button' },
          { selector: 'button[title="New Conversation"]', name: 'New Conversation button' },
          { selector: 'button[aria-label="New Conversation"]', name: 'New Conversation (aria) button' }
        ];
        
        let chatInterfaceEntered = false;
        
        for (const buttonInfo of chatEntryButtons) {
          const buttonExists = await page.locator(buttonInfo.selector).count() > 0;
          const buttonVisible = buttonExists ? await page.locator(buttonInfo.selector).first().isVisible() : false;
          
          console.log(`${buttonInfo.name}: Exists=${buttonExists}, Visible=${buttonVisible}`);
          
          if (buttonExists && buttonVisible) {
            console.log(`🖱️ Clicking ${buttonInfo.name}...`);
            
            await page.locator(buttonInfo.selector).first().click();
            await page.waitForTimeout(2000);
            
            // Check if we entered chat interface
            const newUrl = page.url();
            const newTextareas = await page.locator('textarea').count();
            
            console.log(`After clicking ${buttonInfo.name}:`);
            console.log(`  URL: ${newUrl}`);
            console.log(`  Textareas: ${newTextareas}`);
            
            if (newTextareas > 0) {
              console.log(`🎉 SUCCESS! ${buttonInfo.name} brought us to chat interface!`);
              chatInterfaceEntered = true;
              break;
            } else {
              console.log(`⚠️ ${buttonInfo.name} didn't bring us to chat interface`);
            }
          }
        }
        
        if (chatInterfaceEntered) {
          // Step 3: Analyze the actual chat interface
          console.log('\n🔍 Step 3: Analyzing actual chat interface...');
          
          const chatElements = {
            textareas: await page.locator('textarea').count(),
            sendButtons: await page.locator('button:has-text("Send"), button[type="submit"]').count(),
            messages: await page.locator('[class*="message"], .message').count(),
            modelSelectors: await page.locator('button[title*="Select"], button[title*="Model"], button:has-text("Claude"), button:has-text("Sonnet"), button:has-text("Haiku")').count()
          };
          
          console.log('Chat Interface Elements:');
          console.log(`  Textareas: ${chatElements.textareas}`);
          console.log(`  Send buttons: ${chatElements.sendButtons}`);
          console.log(`  Messages: ${chatElements.messages}`);
          console.log(`  Model selectors: ${chatElements.modelSelectors}`);
          
          // Step 4: Test basic chat functionality
          if (chatElements.textareas > 0) {
            console.log('\n💬 Step 4: Testing basic chat functionality...');
            
            const textarea = page.locator('textarea').first();
            const testMessage = 'Hello! This is a test message. Please respond with "Chat interface working correctly".';
            
            await textarea.focus();
            await textarea.fill(testMessage);
            
            console.log('📤 Sending message with Enter key...');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
            
            // Check for messages
            const messagesAfterSend = await page.locator('[class*="message"], .message').count();
            console.log(`Messages after sending: ${messagesAfterSend}`);
            
            if (messagesAfterSend > chatElements.messages) {
              console.log('🎉 SUCCESS! Message was sent and chat is working!');
              
              // Wait for AI response
              console.log('🤖 Waiting for AI response...');
              await page.waitForTimeout(10000);
              
              const finalMessages = await page.locator('[class*="message"], .message').count();
              console.log(`Final message count: ${finalMessages}`);
              
              if (finalMessages > messagesAfterSend) {
                console.log('🎉 SUCCESS! AI responded! Chat is fully functional!');
                
                // Get the response
                const lastMessage = page.locator('[class*="message"], .message').last();
                const responseText = await lastMessage.textContent() || '';
                console.log(`AI Response: ${responseText.substring(0, 200)}...`);
                
              } else {
                console.log('⚠️ No AI response yet, but message sending works');
              }
            } else {
              console.log('❌ Message was not sent');
            }
          }
          
          // Step 5: Look for model selector in actual chat interface
          console.log('\n🔍 Step 5: Looking for model selector in chat interface...');
          
          const allButtons = await page.locator('button').all();
          console.log(`Found ${allButtons.length} buttons in chat interface`);
          
          for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            const button = allButtons[i];
            
            try {
              const text = await button.textContent() || '';
              const title = await button.getAttribute('title') || '';
              const ariaLabel = await button.getAttribute('aria-label') || '';
              
              // Look for model-related buttons
              if (text.toLowerCase().includes('model') || 
                  text.toLowerCase().includes('claude') ||
                  text.toLowerCase().includes('sonnet') ||
                  text.toLowerCase().includes('haiku') ||
                  title.toLowerCase().includes('model') ||
                  title.toLowerCase().includes('select') ||
                  ariaLabel.toLowerCase().includes('model')) {
                
                console.log(`🎯 Potential model selector found:`);
                console.log(`   Text: "${text}"`);
                console.log(`   Title: "${title}"`);
                console.log(`   Aria-label: "${ariaLabel}"`);
              }
              
            } catch (buttonError) {
              // Skip problematic buttons
            }
          }
          
        } else {
          console.log('❌ Could not enter chat interface');
        }
        
      } else {
        console.log('✅ Already on chat interface!');
      }
      
      console.log('\n✅ Chat interface entry test completed');

    } catch (error) {
      console.error('❌ Chat interface entry test failed:', error);
      await testHelpers.takeScreenshot('chat-interface-entry-error');
      throw error;
    }
  });

  test('should test all possible ways to start a chat', async ({ page }) => {
    console.log('🚪 Testing all possible ways to start a chat...');
    
    try {
      await authHelpers.loginAsPaidUser();
      console.log('✅ Authentication successful');
      
      // Try different methods to start a chat
      const chatStartMethods = [
        { 
          name: 'Chat button (title: New Conversation)',
          selector: 'button[title="New Conversation"]'
        },
        { 
          name: 'Start New Chat button',
          selector: 'button:has-text("Start New Chat")'
        },
        { 
          name: 'Chat text button',
          selector: 'button:has-text("Chat")'
        },
        { 
          name: 'New Conversation aria-label',
          selector: 'button[aria-label="New Conversation"]'
        }
      ];
      
      for (const method of chatStartMethods) {
        console.log(`\n🧪 Testing method: ${method.name}`);
        
        // Reset to main page
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const buttonExists = await page.locator(method.selector).count() > 0;
        const buttonVisible = buttonExists ? await page.locator(method.selector).first().isVisible() : false;
        
        console.log(`  Button exists: ${buttonExists}, visible: ${buttonVisible}`);
        
        if (buttonExists && buttonVisible) {
          // Click the button
          await page.locator(method.selector).first().click();
          await page.waitForTimeout(2000);
          
          // Check if chat interface appeared
          const textareas = await page.locator('textarea').count();
          const url = page.url();
          
          console.log(`  After click - URL: ${url}, Textareas: ${textareas}`);
          
          if (textareas > 0) {
            console.log(`  🎉 SUCCESS! ${method.name} works!`);
            
            // Test sending a quick message
            const textarea = page.locator('textarea').first();
            await textarea.fill('Quick test');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            
            const messages = await page.locator('[class*="message"], .message').count();
            console.log(`  Messages after quick test: ${messages}`);
            
          } else {
            console.log(`  ❌ ${method.name} didn't open chat interface`);
          }
        } else {
          console.log(`  ❌ ${method.name} button not available`);
        }
      }
      
      console.log('\n✅ All chat start methods tested');

    } catch (error) {
      console.error('❌ Chat start methods test failed:', error);
      await testHelpers.takeScreenshot('chat-start-methods-error');
      throw error;
    }
  });
});
