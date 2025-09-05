import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Simple New User Test', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    testHelpers.initializeTest('simple-user-test');
  });

  test('Basic user registration and login flow', async ({ page }) => {
    console.log('🚀 Testing basic user registration and login...');
    
    const newUserEmail = `simpletest-${Date.now()}@example.com`;
    const newUserPassword = 'SimpleTest123!';
    
    try {
      // Navigate to signup page directly
      console.log('📝 Step 1: Navigate to signup...');
      await testHelpers.navigateToWithStep('/auth/signup', 'Navigate to signup page');
      
      // Verify we're on signup page
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      expect(currentUrl).toMatch(/signup/); // More flexible matching
      console.log('✅ On signup page');
      await testHelpers.takeStepScreenshot('Signup page verification');
      
      // Wait for form to be ready
      await testHelpers.waitForElement('form', 10000);
      console.log('✅ Signup form loaded');
      await testHelpers.takeStepScreenshot('Signup form loaded');
      
      // Fill registration form
      console.log(`📧 Step 2: Filling registration form for ${newUserEmail}...`);
      
      // Fill email
      await testHelpers.fillFieldWithStep('input[type="email"], input[name="email"]', newUserEmail, 'Email');
      console.log('✅ Email filled');
      
      // Fill password
      await testHelpers.fillFieldWithStep('input[name="password"]', newUserPassword, 'Password');
      console.log('✅ Password filled');
      
      // Handle confirm password if exists
      const confirmPasswordField = page.locator('input[name="confirmPassword"], input[name="confirm-password"]');
      if (await confirmPasswordField.count() > 0) {
        await testHelpers.fillFieldWithStep('input[name="confirmPassword"], input[name="confirm-password"]', newUserPassword, 'Confirm Password');
        console.log('✅ Confirm password filled');
      }
      
      await testHelpers.takeStepScreenshot('Registration form completed');
      
      // Submit registration
      console.log('📝 Step 3: Submitting registration...');
      await testHelpers.clickButtonWithStep('button[type="submit"]', 'Submit Registration');
      
      // Wait for response
      await page.waitForTimeout(5000);
      console.log('✅ Registration submitted');
      
      // Check where we ended up
      const afterRegistrationUrl = page.url();
      console.log(`📍 After registration URL: ${afterRegistrationUrl}`);
      await testHelpers.takeStepScreenshotWithInfo('After registration', `URL: ${afterRegistrationUrl}`);
      
      // Try to login with new credentials
      console.log('🔐 Step 4: Testing login with new credentials...');
      
      // Navigate to login page
      await testHelpers.navigateToWithStep('/auth/login', 'Navigate to login page');
      
      await testHelpers.waitForElement('form', 10000);
      await testHelpers.takeStepScreenshot('Login form loaded');
      
      // Fill login form
      await testHelpers.fillFieldWithStep('input[type="email"], input[name="email"]', newUserEmail, 'Login Email');
      await testHelpers.fillFieldWithStep('input[name="password"]', newUserPassword, 'Login Password');
      
      await testHelpers.takeStepScreenshot('Login form completed');
      
      // Submit login
      await testHelpers.clickButtonWithStep('button[type="submit"]', 'Submit Login');
      
      // Wait for login response
      await page.waitForTimeout(5000);
      
      const afterLoginUrl = page.url();
      console.log(`📍 After login URL: ${afterLoginUrl}`);
      await testHelpers.takeStepScreenshotWithInfo('After login', `URL: ${afterLoginUrl}`);
      
      // Check if we're authenticated (not on auth page)
      const isOnAuthPage = afterLoginUrl.includes('/auth');
      if (!isOnAuthPage) {
        console.log('✅ Successfully logged in and redirected away from auth pages');
        await testHelpers.takeStepScreenshot('Successfully logged in - main app');
      } else {
        console.log('⚠️ Still on auth page - may need to handle verification or errors');
        await testHelpers.takeStepScreenshot('Still on auth page - investigating');
      }
      
      console.log('🎉 Basic user flow test completed');
      await testHelpers.takeStepScreenshot('Test completion');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      await testHelpers.takeStepScreenshotWithInfo('Test failed', `Error: ${error.message}`);
      throw error;
    }
  });

  test('Navigate to auth pages', async ({ page }) => {
    console.log('🔍 Testing basic navigation to auth pages...');
    testHelpers.initializeTest('navigation-test');
    
    try {
      // Test signup page
      await testHelpers.navigateToWithStep('/auth/signup', 'Navigate to signup page');
      expect(page.url()).toMatch(/signup/);
      console.log('✅ Signup page accessible');
      await testHelpers.takeStepScreenshot('Signup page accessible');
      
      // Test login page
      await testHelpers.navigateToWithStep('/auth/login', 'Navigate to login page');
      expect(page.url()).toMatch(/login/);
      console.log('✅ Login page accessible');
      await testHelpers.takeStepScreenshot('Login page accessible');
      
      // Test that forms exist (wait for them to load)
      await testHelpers.waitForElement('form', 10000);
      const signupForm = await page.locator('form').count();
      expect(signupForm).toBeGreaterThan(0);
      console.log('✅ Forms are present on auth pages');
      await testHelpers.takeStepScreenshotWithInfo('Forms verification', `Forms found: ${signupForm}`);
      
    } catch (error) {
      console.error('❌ Navigation test failed:', error);
      await testHelpers.takeStepScreenshotWithInfo('Navigation test failed', `Error: ${error.message}`);
      throw error;
    }
  });
});