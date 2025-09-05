import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_KNOWLEDGE_BASES, TEST_FILES } from '../../fixtures/test-data';

/**
 * Knowledge Base Assignment Investigation
 * Investigates how KB assignment works in agent creation form
 */

test.describe('KB Assignment Investigation', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('should investigate KB assignment UI in agent creation form', async ({ page }) => {
    console.log('🔍 Investigating KB assignment UI in agent creation form...');
    
    await authHelpers.loginAsPaidUser();
    
    try {
      // Step 1: Create a Knowledge Base first
      console.log('📚 Step 1: Creating Knowledge Base...');
      
      await testHelpers.clickButton('button:has-text("Knowledge Bases")');
      await testHelpers.waitForLoadingToComplete();
      
      await testHelpers.clickButton('button:has-text("Add New Knowledge Base")');
      await testHelpers.waitForLoadingToComplete();
      
      const kbName = `InvestigationKB_${Date.now()}`;
      await testHelpers.fillField('input[name="name"]', kbName);
      await testHelpers.fillField('textarea[name="description"]', 'KB for investigating assignment UI');
      
      await testHelpers.uploadFile('input[type="file"]', TEST_FILES.txt.path);
      await page.waitForTimeout(2000);
      
      await testHelpers.clickButton('button[type="submit"]:has-text("Create")');
      await page.waitForTimeout(5000);
      
      console.log(`✅ KB created: ${kbName}`);
      await testHelpers.closeModal();
      
      // Step 2: Navigate to Agent Creation
      console.log('🤖 Step 2: Opening Agent Creation Form...');
      
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
      await page.waitForTimeout(2000);
      
      console.log('📋 Agent creation form opened');
      
      // Step 3: Comprehensive Form Investigation
      console.log('🔍 Step 3: Investigating form structure...');
      
      // Take a screenshot of the form
      await page.screenshot({ path: `agent-form-investigation-${Date.now()}.png`, fullPage: true });
      
      // Get all form elements
      const allInputs = await page.locator('input').all();
      const allSelects = await page.locator('select').all();
      const allTextareas = await page.locator('textarea').all();
      const allButtons = await page.locator('button').all();
      const allLabels = await page.locator('label').all();
      
      console.log(`📊 Form Elements Found:`);
      console.log(`   Inputs: ${allInputs.length}`);
      console.log(`   Selects: ${allSelects.length}`);
      console.log(`   Textareas: ${allTextareas.length}`);
      console.log(`   Buttons: ${allButtons.length}`);
      console.log(`   Labels: ${allLabels.length}`);
      
      // Investigate all input fields
      console.log(`\n📝 INPUT FIELDS:`);
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        const ariaLabel = await input.getAttribute('aria-label');
        
        console.log(`   Input ${i}: name="${name}", id="${id}", type="${type}", placeholder="${placeholder}", aria-label="${ariaLabel}"`);
      }
      
      // Investigate all select fields
      console.log(`\n📋 SELECT FIELDS:`);
      for (let i = 0; i < allSelects.length; i++) {
        const select = allSelects[i];
        const name = await select.getAttribute('name');
        const id = await select.getAttribute('id');
        const ariaLabel = await select.getAttribute('aria-label');
        const className = await select.getAttribute('class');
        
        console.log(`   Select ${i}: name="${name}", id="${id}", aria-label="${ariaLabel}", class="${className}"`);
        
        // Get options for this select
        const options = await select.locator('option').all();
        console.log(`     Options (${options.length}):`);
        for (let j = 0; j < Math.min(options.length, 5); j++) {
          const optionText = await options[j].textContent();
          const optionValue = await options[j].getAttribute('value');
          console.log(`       Option ${j}: "${optionText}" (value: ${optionValue})`);
        }
        if (options.length > 5) {
          console.log(`       ... and ${options.length - 5} more options`);
        }
      }
      
      // Investigate all labels
      console.log(`\n🏷️ LABELS:`);
      for (let i = 0; i < Math.min(allLabels.length, 10); i++) {
        const label = allLabels[i];
        const text = await label.textContent();
        const htmlFor = await label.getAttribute('for');
        
        console.log(`   Label ${i}: "${text}" (for="${htmlFor}")`);
      }
      
      // Look for any KB-related text on the page
      console.log(`\n🔍 SEARCHING FOR KB-RELATED CONTENT:`);
      const kbRelatedSelectors = [
        'text="Knowledge Base"',
        'text="knowledge base"',
        'text="KB"',
        'text="Knowledge"',
        '[data-testid*="kb"]',
        '[data-testid*="knowledge"]',
        '[id*="kb"]',
        '[id*="knowledge"]',
        '[name*="kb"]',
        '[name*="knowledge"]',
        '[class*="kb"]',
        '[class*="knowledge"]'
      ];
      
      for (const selector of kbRelatedSelectors) {
        const hasElement = await testHelpers.elementExists(selector);
        if (hasElement) {
          console.log(`   ✅ Found KB-related element: ${selector}`);
          
          // Get more details about this element
          const element = page.locator(selector).first();
          const tagName = await element.evaluate(el => el.tagName);
          const text = await element.textContent();
          const className = await element.getAttribute('class');
          
          console.log(`      Tag: ${tagName}, Text: "${text}", Class: "${className}"`);
        }
      }
      
      // Look for any dropdowns or comboboxes
      console.log(`\n🔽 DROPDOWN/COMBOBOX INVESTIGATION:`);
      const dropdownSelectors = [
        '[role="combobox"]',
        '[role="listbox"]',
        '.dropdown',
        '.select',
        '.combobox',
        'div[data-headlessui-state]',
        'button[aria-expanded]',
        'button[aria-haspopup]'
      ];
      
      for (const selector of dropdownSelectors) {
        const hasElement = await testHelpers.elementExists(selector);
        if (hasElement) {
          console.log(`   ✅ Found dropdown element: ${selector}`);
          
          const elements = await page.locator(selector).all();
          for (let i = 0; i < Math.min(elements.length, 3); i++) {
            const element = elements[i];
            const text = await element.textContent();
            const ariaLabel = await element.getAttribute('aria-label');
            const ariaExpanded = await element.getAttribute('aria-expanded');
            
            console.log(`      Element ${i}: "${text}", aria-label="${ariaLabel}", aria-expanded="${ariaExpanded}"`);
          }
        }
      }
      
      // Fill basic form fields to see if more fields appear
      console.log(`\n📝 FILLING BASIC FIELDS TO CHECK FOR DYNAMIC CONTENT:`);
      
      await testHelpers.fillField('label:has-text("Agent Name") + input', 'Investigation Agent');
      await page.waitForTimeout(1000);
      
      const hasDescriptionField = await testHelpers.elementExists('label:has-text("Description") + input');
      if (hasDescriptionField) {
        await testHelpers.fillField('label:has-text("Description") + input', 'Testing KB assignment');
        await page.waitForTimeout(1000);
      }
      
      const hasInstructionsField = await testHelpers.elementExists('label:has-text("System Prompt") + textarea');
      if (hasInstructionsField) {
        await testHelpers.fillField('label:has-text("System Prompt") + textarea', 'Test instructions');
        await page.waitForTimeout(1000);
      }
      
      // Select a model to see if KB options appear
      console.log(`📝 SELECTING MODEL TO CHECK FOR DYNAMIC KB OPTIONS:`);
      const modelButtons = await page.locator('button[type="button"].rounded-lg.border').all();
      if (modelButtons.length > 0) {
        await modelButtons[0].click();
        await testHelpers.waitForLoadingToComplete();
        await page.waitForTimeout(2000);
        
        console.log('✅ Model selected, checking for new form elements...');
        
        // Re-check for select elements after model selection
        const newSelects = await page.locator('select').all();
        console.log(`📋 SELECT FIELDS AFTER MODEL SELECTION (${newSelects.length}):`);
        
        for (let i = 0; i < newSelects.length; i++) {
          const select = newSelects[i];
          const name = await select.getAttribute('name');
          const id = await select.getAttribute('id');
          const ariaLabel = await select.getAttribute('aria-label');
          
          console.log(`   Select ${i}: name="${name}", id="${id}", aria-label="${ariaLabel}"`);
          
          // Check options
          const options = await select.locator('option').all();
          if (options.length > 0) {
            console.log(`     Options (${options.length}):`);
            for (let j = 0; j < Math.min(options.length, 3); j++) {
              const optionText = await options[j].textContent();
              console.log(`       "${optionText}"`);
            }
          }
        }
      }
      
      // Take final screenshot
      await page.screenshot({ path: `agent-form-final-${Date.now()}.png`, fullPage: true });
      
      console.log('🎉 KB Assignment Investigation Complete!');
      console.log('📸 Screenshots saved for manual review');
      
    } catch (error) {
      console.error('❌ Investigation failed:', error);
      throw error;
    }
  });
});
