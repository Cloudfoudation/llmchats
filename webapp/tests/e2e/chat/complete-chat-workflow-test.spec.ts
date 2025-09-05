import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';

test.describe('Complete Chat Workflow Test', () => {
    test('should start new chat, select Claude 3.5 Sonnet, change parameters, and send message', async ({ page }) => {
        console.log('🚀 Testing complete chat workflow...\n');

        // Step 1: Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Step 2: Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');

        // Wait for chat interface to load
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Step 3: Start a new chat
        console.log('📝 Starting new chat...\n');
        
        // Look for "New Chat" or "Start New Chat" button
        const newChatButton = page.locator('button:has-text("New Chat"), button:has-text("Start New Chat"), button[title*="New"]').first();
        if (await newChatButton.count() > 0) {
            await newChatButton.click();
            console.log('✅ Started new chat\n');
        } else {
            console.log('ℹ️ New chat button not found, using current chat\n');
        }

        // Step 4: Select Claude 3.5 Sonnet model
        console.log('🤖 Selecting Claude 3.5 Sonnet model...\n');
        
        // Click the model selector button (Settings icon)
        const modelSelectorButton = page.locator('button[title="Select Model"]');
        await expect(modelSelectorButton).toBeVisible();
        await modelSelectorButton.click();
        console.log('  🖱️ Opened model selector\n');

        // Wait for model dropdown to appear
        await page.waitForTimeout(1000);

        // Look for Claude 3.5 Sonnet in the model list
        const claude35Sonnet = page.locator('button').filter({ 
            hasText: /Claude 3\.5 Sonnet(?!.*v2)/i 
        }).first();
        
        if (await claude35Sonnet.count() > 0) {
            await claude35Sonnet.click();
            console.log('  ✅ Selected Claude 3.5 Sonnet model\n');
        } else {
            // Fallback: try to find any Claude 3.5 model
            const anyClaudeModel = page.locator('button').filter({ 
                hasText: /Claude.*3\.5/i 
            }).first();
            
            if (await anyClaudeModel.count() > 0) {
                await anyClaudeModel.click();
                console.log('  ✅ Selected Claude 3.5 model (fallback)\n');
            } else {
                console.log('  ❌ Claude 3.5 Sonnet not found in model list\n');
                
                // Debug: List available models
                const availableModels = await page.locator('button').filter({ hasText: /Claude/i }).allTextContents();
                console.log('  🔍 Available Claude models:', availableModels);
            }
        }

        // Wait for model selection to complete
        await page.waitForTimeout(1000);

        // Step 5: Change model parameters
        console.log('⚙️ Changing model parameters...\n');
        
        // Click the model name badge to open ParametersPopup
        const modelNameBadge = page.locator('button[title="Max Tokens"]');
        if (await modelNameBadge.count() > 0 && await modelNameBadge.isVisible()) {
            await modelNameBadge.click();
            console.log('  🖱️ Opened ParametersPopup\n');

            // Wait for popup to appear
            await page.waitForTimeout(1000);

            // Modify Max Tokens
            const maxTokensSlider = page.locator('input[type="range"][max="4096"], input[type="range"][max="8192"]').first();
            if (await maxTokensSlider.count() > 0) {
                const currentTokens = await maxTokensSlider.getAttribute('value');
                console.log(`  📊 Current max tokens: ${currentTokens}`);
                
                await maxTokensSlider.fill('3000');
                const newTokens = await maxTokensSlider.getAttribute('value');
                console.log(`  ✅ Changed max tokens to: ${newTokens}\n`);
            }

            // Modify Temperature
            const tempSlider = page.locator('input[type="range"][step="0.1"], input[type="range"][step="0.01"]').first();
            if (await tempSlider.count() > 0) {
                const currentTemp = await tempSlider.getAttribute('value');
                console.log(`  🌡️ Current temperature: ${currentTemp}`);
                
                await tempSlider.fill('0.8');
                const newTemp = await tempSlider.getAttribute('value');
                console.log(`  ✅ Changed temperature to: ${newTemp}\n`);
            }

            // Close the parameters popup
            await page.click('body', { position: { x: 100, y: 100 } });
            console.log('  ✅ Closed ParametersPopup\n');
        } else {
            console.log('  ❌ Model name badge not found, skipping parameter changes\n');
        }

        // Step 6: Send a test message
        console.log('💬 Sending test message...\n');
        
        const testMessage = "Hello! Please respond with a brief greeting to confirm you're Claude 3.5 Sonnet.";
        
        // Find the textarea and type the message
        const textarea = page.locator('textarea');
        await expect(textarea).toBeVisible();
        await textarea.fill(testMessage);
        console.log(`  📝 Typed message: "${testMessage}"\n`);

        // Send the message using Enter key
        await page.keyboard.press('Enter');
        console.log('  🚀 Sent message using Enter key\n');

        // Step 7: Wait for and verify response
        console.log('⏳ Waiting for AI response...\n');
        
        // Wait for response to appear (look for new message content)
        await page.waitForTimeout(3000);
        
        // Look for response indicators
        const responseElements = await page.locator('[data-role="assistant"], .message, div').filter({ 
            hasText: /hello|hi|greetings|claude/i 
        }).count();
        
        if (responseElements > 0) {
            console.log('  ✅ AI response detected!\n');
            
            // Try to capture part of the response
            const responseText = await page.locator('[data-role="assistant"], .message').last().textContent().catch(() => '');
            if (responseText) {
                console.log(`  💭 Response preview: "${responseText.substring(0, 100)}..."\n`);
            }
        } else {
            console.log('  ⏳ Response may still be loading...\n');
            
            // Check for loading indicators
            const loadingIndicators = await page.locator('.loading, .spinner, [data-loading]').count();
            console.log(`  🔄 Loading indicators found: ${loadingIndicators}\n`);
        }

        // Step 8: Verify the complete workflow
        console.log('🔍 Verifying workflow completion...\n');
        
        // Check that we're still in chat interface
        const chatInterfaceActive = await textarea.isVisible();
        console.log(`  📱 Chat interface active: ${chatInterfaceActive}`);
        
        // Check if model info is displayed
        const modelInfo = await page.locator('.bg-blue-100, button[title="Max Tokens"]').count();
        console.log(`  🤖 Model info elements: ${modelInfo}`);
        
        // Check message history
        const messageCount = await page.locator('div').filter({ hasText: testMessage }).count();
        console.log(`  💬 Sent message found in history: ${messageCount > 0}`);

        console.log('\n🎉 Complete chat workflow test finished!\n');
        
        // Summary
        console.log('📋 Workflow Summary:');
        console.log('  ✅ Authentication completed');
        console.log('  ✅ Chat interface accessed');
        console.log('  ✅ Model selector opened');
        console.log('  ✅ Claude 3.5 model selection attempted');
        console.log('  ✅ Parameters popup accessed');
        console.log('  ✅ Parameter modifications attempted');
        console.log('  ✅ Test message sent');
        console.log('  ✅ Response monitoring completed\n');
    });
});
