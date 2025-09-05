import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';

// Helper function to test models for a specific provider
async function testModelsForProvider(page, providerName, expectedModels = []) {
    console.log(`🔍 Testing ${providerName} models...`);
    
    // Open model selector to get the list of models
    const modelSelectorButton = page.locator('button[title="Select Model"]');
    await expect(modelSelectorButton).toBeVisible();
    await modelSelectorButton.click();
    await page.waitForTimeout(1500);

    // Get all model buttons in the dropdown
    const modelButtons = page.locator('button').filter({ hasText: new RegExp(providerName, 'i') });
    const modelCount = await modelButtons.count();
    console.log(`  📊 Found ${modelCount} ${providerName} models\n`);

    // Extract model information for this provider
    const models = [];
    for (let i = 0; i < modelCount; i++) {
        const modelButton = modelButtons.nth(i);
        const modelText = await modelButton.textContent();
        const isVisible = await modelButton.isVisible();
        
        if (isVisible && modelText && modelText.toLowerCase().includes(providerName.toLowerCase())) {
            models.push({
                index: i,
                name: modelText.trim(),
                button: modelButton
            });
        }
    }

    // Close model selector
    await page.click('body', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);

    if (models.length === 0) {
        console.log(`  ⚠️ No ${providerName} models found or API keys not configured\n`);
        return { tested: 0, successful: 0, results: [] };
    }

    console.log(`  🎯 ${providerName} models to test: ${models.length}`);
    models.forEach((model, idx) => {
        console.log(`    ${idx + 1}. ${model.name}`);
    });
    console.log('');

    // Test each model
    const testResults = [];
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        console.log(`🧪 Testing ${providerName} Model ${i + 1}/${models.length}: ${model.name}\n`);
        
        const startTime = Date.now();
        let result = {
            modelName: model.name,
            provider: providerName,
            success: false,
            responsePreview: '',
            error: null,
            duration: 0
        };

        try {
            // Start new chat for each model
            const newChatButton = page.locator('button:has-text("New Chat"), button:has-text("Start New Chat"), button[title*="New"]').first();
            if (await newChatButton.count() > 0) {
                await newChatButton.click();
                await page.waitForTimeout(1000);
                console.log('  📝 Started new chat\n');
            }

            // Select the model
            console.log(`  🤖 Selecting model: ${model.name}`);
            
            // Open model selector
            const modelSelector = page.locator('button[title="Select Model"]');
            await modelSelector.click();
            await page.waitForTimeout(1000);

            // Click the specific model
            const specificModelButton = page.locator('button').filter({ hasText: model.name }).first();
            if (await specificModelButton.count() > 0) {
                await specificModelButton.click();
                console.log('  ✅ Model selected successfully\n');
            } else {
                throw new Error(`Could not select model: ${model.name}`);
            }

            await page.waitForTimeout(1000);

            // Send test message
            const testMessage = `Hello! This is a test message for ${model.name} from ${providerName}. Please respond with a brief confirmation.`;
            console.log(`  💬 Sending test message...`);
            
            const textarea = page.locator('textarea');
            await textarea.fill(testMessage);
            await page.keyboard.press('Enter');
            console.log('  🚀 Message sent\n');

            // Wait for response with timeout handling
            console.log('  ⏳ Waiting for AI response...');
            
            const responsePromise = new Promise(async (resolve) => {
                let attempts = 0;
                const maxAttempts = 25; // 25 seconds for external providers
                
                while (attempts < maxAttempts) {
                    await page.waitForTimeout(1000);
                    attempts++;
                    
                    // Check for response indicators
                    const responseSelectors = [
                        '[data-role="assistant"]',
                        '.message:not(:has(textarea))',
                        'div:has-text("Hello")',
                        'div:has-text("received")',
                        'div:has-text("test")',
                        'div:has-text("confirm")'
                    ];

                    for (const selector of responseSelectors) {
                        const elements = page.locator(selector);
                        const count = await elements.count();
                        
                        if (count > 0) {
                            const lastElement = elements.last();
                            const text = await lastElement.textContent().catch(() => '');
                            
                            if (text && !text.includes(testMessage.substring(0, 20)) && text.length > 10) {
                                resolve({ success: true, text: text.substring(0, 100) });
                                return;
                            }
                        }
                    }
                }
                
                resolve({ success: false, text: '' });
            });

            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve({ success: false, text: '', timeout: true }), 30000); // 30 second timeout
            });

            const responseResult = await Promise.race([responsePromise, timeoutPromise]);
            
            result.duration = Date.now() - startTime;

            if (responseResult.success) {
                result.success = true;
                result.responsePreview = responseResult.text;
                console.log('  ✅ Response received successfully!');
                console.log(`  💭 Response preview: "${responseResult.text}..."\n`);
            } else if (responseResult.timeout) {
                result.error = 'Response timeout (30 seconds)';
                console.log('  ⏰ Response timeout - moving to next model\n');
            } else {
                result.error = 'No response detected';
                console.log('  ⚠️ No response detected\n');
            }

        } catch (error) {
            result.duration = Date.now() - startTime;
            result.error = error.message;
            console.log(`  ❌ Error testing model: ${error.message}\n`);
        }

        testResults.push(result);
        await page.waitForTimeout(500);
    }

    const successful = testResults.filter(r => r.success).length;
    return { tested: models.length, successful, results: testResults };
}

test.describe('All Models Messaging Test (Improved)', () => {
    
    test('should test Anthropic/AWS Bedrock models', async ({ page }) => {
        console.log('🚀 Testing Anthropic/AWS Bedrock models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test Anthropic models
        const anthropicResult = await testModelsForProvider(page, 'Claude');
        
        // Generate report for Anthropic models
        console.log('📊 ANTHROPIC/AWS BEDROCK TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = anthropicResult;
        console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
        results.filter(r => r.success).forEach((result, idx) => {
            console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
        });

        if (successful < tested) {
            const failed = results.filter(r => !r.success);
            console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
            failed.forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
            });
        }

        console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
        
        // Assertions
        expect(tested).toBeGreaterThan(0);
        expect(successful/tested).toBeGreaterThanOrEqual(0.7); // 70% success rate for Anthropic models
        
        console.log('\n🎉 Anthropic/AWS Bedrock models test completed!\n');
    });

    test('should test OpenAI models (if API key configured)', async ({ page }) => {
        console.log('🚀 Testing OpenAI models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test OpenAI models
        const openaiResult = await testModelsForProvider(page, 'OpenAI');
        
        // Generate report for OpenAI models
        console.log('📊 OPENAI TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = openaiResult;
        
        if (tested === 0) {
            console.log('ℹ️ No OpenAI models found - API key may not be configured');
            console.log('   To test OpenAI models, configure the OpenAI API key in settings\n');
            // Pass the test if no models are configured
            expect(tested).toBeGreaterThanOrEqual(0);
        } else {
            console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
            results.filter(r => r.success).forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
            });

            if (successful < tested) {
                const failed = results.filter(r => !r.success);
                console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
                failed.forEach((result, idx) => {
                    console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
                });
            }

            console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
            
            // More lenient assertion for external providers
            expect(tested).toBeGreaterThan(0);
            expect(successful/tested).toBeGreaterThanOrEqual(0.5); // 50% success rate for external providers
        }
        
        console.log('\n🎉 OpenAI models test completed!\n');
    });

    test('should test Groq models (if API key configured)', async ({ page }) => {
        console.log('🚀 Testing Groq models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test Groq models
        const groqResult = await testModelsForProvider(page, 'Groq');
        
        // Generate report for Groq models
        console.log('📊 GROQ TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = groqResult;
        
        if (tested === 0) {
            console.log('ℹ️ No Groq models found - API key may not be configured');
            console.log('   To test Groq models, configure the Groq API key in settings\n');
            expect(tested).toBeGreaterThanOrEqual(0);
        } else {
            console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
            results.filter(r => r.success).forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
            });

            if (successful < tested) {
                const failed = results.filter(r => !r.success);
                console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
                failed.forEach((result, idx) => {
                    console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
                });
            }

            console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
            
            expect(tested).toBeGreaterThan(0);
            expect(successful/tested).toBeGreaterThanOrEqual(0.5);
        }
        
        console.log('\n🎉 Groq models test completed!\n');
    });

    test('should test Sambanova models (if API key configured)', async ({ page }) => {
        console.log('🚀 Testing Sambanova models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test Sambanova models
        const sambanovaResult = await testModelsForProvider(page, 'Sambanova');
        
        // Generate report for Sambanova models
        console.log('📊 SAMBANOVA TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = sambanovaResult;
        
        if (tested === 0) {
            console.log('ℹ️ No Sambanova models found - API key may not be configured');
            console.log('   To test Sambanova models, configure the Sambanova API key in settings\n');
            expect(tested).toBeGreaterThanOrEqual(0);
        } else {
            console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
            results.filter(r => r.success).forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
            });

            if (successful < tested) {
                const failed = results.filter(r => !r.success);
                console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
                failed.forEach((result, idx) => {
                    console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
                });
            }

            console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
            
            expect(tested).toBeGreaterThan(0);
            expect(successful/tested).toBeGreaterThanOrEqual(0.5);
        }
        
        console.log('\n🎉 Sambanova models test completed!\n');
    });

    test('should test Amazon/Titan models (if available)', async ({ page }) => {
        console.log('🚀 Testing Amazon/Titan models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test Amazon models
        const amazonResult = await testModelsForProvider(page, 'Amazon');
        
        // Generate report for Amazon models
        console.log('📊 AMAZON/TITAN TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = amazonResult;
        
        if (tested === 0) {
            console.log('ℹ️ No Amazon/Titan models found - may not be enabled in current region');
            expect(tested).toBeGreaterThanOrEqual(0);
        } else {
            console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
            results.filter(r => r.success).forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
            });

            if (successful < tested) {
                const failed = results.filter(r => !r.success);
                console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
                failed.forEach((result, idx) => {
                    console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
                });
            }

            console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
            
            expect(tested).toBeGreaterThan(0);
            expect(successful/tested).toBeGreaterThanOrEqual(0.5);
        }
        
        console.log('\n🎉 Amazon/Titan models test completed!\n');
    });

    test('should test Meta/Llama models (if available)', async ({ page }) => {
        console.log('🚀 Testing Meta/Llama models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test Meta models
        const metaResult = await testModelsForProvider(page, 'Llama');
        
        // Generate report for Meta models
        console.log('📊 META/LLAMA TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = metaResult;
        
        if (tested === 0) {
            console.log('ℹ️ No Meta/Llama models found - may not be enabled in current region');
            expect(tested).toBeGreaterThanOrEqual(0);
        } else {
            console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
            results.filter(r => r.success).forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
            });

            if (successful < tested) {
                const failed = results.filter(r => !r.success);
                console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
                failed.forEach((result, idx) => {
                    console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
                });
            }

            console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
            
            expect(tested).toBeGreaterThan(0);
            expect(successful/tested).toBeGreaterThanOrEqual(0.5);
        }
        
        console.log('\n🎉 Meta/Llama models test completed!\n');
    });

    test('should test DeepSeek models (if available)', async ({ page }) => {
        console.log('🚀 Testing DeepSeek models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test DeepSeek models
        const deepseekResult = await testModelsForProvider(page, 'DeepSeek');
        
        // Generate report for DeepSeek models
        console.log('📊 DEEPSEEK TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = deepseekResult;
        
        if (tested === 0) {
            console.log('ℹ️ No DeepSeek models found - may not be enabled in current region');
            expect(tested).toBeGreaterThanOrEqual(0);
        } else {
            console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
            results.filter(r => r.success).forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
            });

            if (successful < tested) {
                const failed = results.filter(r => !r.success);
                console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
                failed.forEach((result, idx) => {
                    console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
                });
            }

            console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
            
            expect(tested).toBeGreaterThan(0);
            expect(successful/tested).toBeGreaterThanOrEqual(0.5);
        }
        
        console.log('\n🎉 DeepSeek models test completed!\n');
    });

    test('should test StabilityAI models (if available)', async ({ page }) => {
        console.log('🚀 Testing StabilityAI models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test StabilityAI models
        const stabilityResult = await testModelsForProvider(page, 'Stability');
        
        // Generate report for StabilityAI models
        console.log('📊 STABILITYAI TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = stabilityResult;
        
        if (tested === 0) {
            console.log('ℹ️ No StabilityAI models found - may not be enabled in current region');
            expect(tested).toBeGreaterThanOrEqual(0);
        } else {
            console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
            results.filter(r => r.success).forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
            });

            if (successful < tested) {
                const failed = results.filter(r => !r.success);
                console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
                failed.forEach((result, idx) => {
                    console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
                });
            }

            console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
            
            expect(tested).toBeGreaterThan(0);
            expect(successful/tested).toBeGreaterThanOrEqual(0.5);
        }
        
        console.log('\n🎉 StabilityAI models test completed!\n');
    });

    test('should test Mistral models (if API key configured)', async ({ page }) => {
        console.log('🚀 Testing Mistral models...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test Mistral models
        const mistralResult = await testModelsForProvider(page, 'Mistral');
        
        // Generate report for Mistral models
        console.log('📊 MISTRAL TEST RESULTS\n');
        console.log('=' .repeat(60));
        
        const { tested, successful, results } = mistralResult;
        
        if (tested === 0) {
            console.log('ℹ️ No Mistral models found - may not be enabled or API key not configured');
            expect(tested).toBeGreaterThanOrEqual(0);
        } else {
            console.log(`\n✅ SUCCESSFUL MODELS (${successful}/${tested}):`);
            results.filter(r => r.success).forEach((result, idx) => {
                console.log(`  ${idx + 1}. ${result.modelName} (${Math.round(result.duration/1000)}s)`);
            });

            if (successful < tested) {
                const failed = results.filter(r => !r.success);
                console.log(`\n❌ FAILED MODELS (${failed.length}/${tested}):`);
                failed.forEach((result, idx) => {
                    console.log(`  ${idx + 1}. ${result.modelName} - ${result.error}`);
                });
            }

            console.log(`\n📈 SUCCESS RATE: ${successful}/${tested} (${Math.round(successful/tested*100)}%)`);
            
            expect(tested).toBeGreaterThan(0);
            expect(successful/tested).toBeGreaterThanOrEqual(0.5);
        }
        
        console.log('\n🎉 Mistral models test completed!\n');
    });
    
    test('should test all available models across all providers (comprehensive)', async ({ page }) => {
        console.log('🚀 Testing ALL available models across ALL providers...\n');

        // Login as paid user
        const authHelpers = new AuthHelpers(page);
        await authHelpers.loginAsPaidUser();
        console.log('✅ Authentication successful\n');

        // Navigate to chat interface
        await page.click('button:has-text("Chat")');
        console.log('✅ Successfully entered chat interface\n');
        await page.waitForSelector('textarea', { timeout: 10000 });

        // Test all providers based on available generators
        const allResults = {
            // Always available providers (built-in AWS Bedrock)
            anthropic: await testModelsForProvider(page, 'Claude'),
            amazon: await testModelsForProvider(page, 'Amazon'),
            stabilityai: await testModelsForProvider(page, 'Stability'),
            meta: await testModelsForProvider(page, 'Llama'),
            deepseek: await testModelsForProvider(page, 'DeepSeek'),
            
            // External providers (require API keys)
            openai: await testModelsForProvider(page, 'OpenAI'),
            groq: await testModelsForProvider(page, 'Groq'),
            sambanova: await testModelsForProvider(page, 'Sambanova'),
            mistral: await testModelsForProvider(page, 'Mistral')
        };

        // Generate comprehensive report
        console.log('📊 COMPREHENSIVE ALL-PROVIDERS TEST RESULTS\n');
        console.log('=' .repeat(80));
        
        let totalTested = 0;
        let totalSuccessful = 0;
        
        Object.entries(allResults).forEach(([provider, result]) => {
            const { tested, successful } = result;
            totalTested += tested;
            totalSuccessful += successful;
            
            if (tested > 0) {
                console.log(`\n🏢 ${provider.toUpperCase()} PROVIDER:`);
                console.log(`   Models tested: ${tested}`);
                console.log(`   Successful: ${successful}`);
                console.log(`   Success rate: ${Math.round(successful/tested*100)}%`);
            } else {
                console.log(`\n🏢 ${provider.toUpperCase()} PROVIDER: No models found (may not be enabled or API key not configured)`);
            }
        });

        console.log('\n' + '=' .repeat(80));
        console.log(`📈 OVERALL STATISTICS:`);
        console.log(`   Total models tested: ${totalTested}`);
        console.log(`   Total successful: ${totalSuccessful}`);
        console.log(`   Overall success rate: ${totalTested > 0 ? Math.round(totalSuccessful/totalTested*100) : 0}%`);

        // Provider breakdown
        console.log(`\n📋 PROVIDER BREAKDOWN:`);
        Object.entries(allResults).forEach(([provider, result]) => {
            const { tested, successful } = result;
            if (tested > 0) {
                const rate = Math.round(successful/tested*100);
                const status = rate >= 70 ? '✅' : rate >= 50 ? '⚠️' : '❌';
                console.log(`   ${status} ${provider.padEnd(12)}: ${successful}/${tested} (${rate}%)`);
            } else {
                console.log(`   ℹ️ ${provider.padEnd(12)}: Not available/configured`);
            }
        });

        // Detailed model results
        console.log(`\n📝 DETAILED RESULTS BY PROVIDER:`);
        Object.entries(allResults).forEach(([provider, result]) => {
            const { tested, results } = result;
            if (tested > 0) {
                console.log(`\n   ${provider.toUpperCase()} MODELS:`);
                results.forEach((model, idx) => {
                    const status = model.success ? '✅' : '❌';
                    const duration = `${Math.round(model.duration/1000)}s`;
                    console.log(`     ${status} ${model.modelName} (${duration})`);
                    if (!model.success && model.error) {
                        console.log(`        Error: ${model.error}`);
                    }
                });
            }
        });

        // Assertions
        console.log('\n🔍 Validating comprehensive test results...\n');
        
        // At least one provider should have models
        expect(totalTested).toBeGreaterThan(0);
        console.log(`✅ Total models tested: ${totalTested}`);
        
        // Overall success rate should be reasonable
        if (totalTested > 0) {
            const overallRate = totalSuccessful / totalTested;
            expect(overallRate).toBeGreaterThanOrEqual(0.5); // 50% overall success rate
            console.log(`✅ Overall success rate (${Math.round(overallRate*100)}%) meets minimum threshold (50%)`);
        }

        console.log('\n🎉 Comprehensive all-providers test completed!\n');
    });
});
