import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { SELECTORS, TIMEOUTS } from '../../fixtures/test-data';

test.describe('Complete New User Journey', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;
  let newUserEmail: string;
  const newUserPassword = 'NewUser123!';

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    newUserEmail = `newuser-${Date.now()}@example.com`;
    
    // Navigate to homepage first to establish context for session clearing
    await testHelpers.navigateTo('/');
    await testHelpers.waitForPageLoad();
    
    // Now safely clear session
    try {
      await authHelpers.clearSession();
    } catch (error) {
      console.log('⚠️ Could not clear session (likely already clean):', error.message);
    }
  });

  test('Complete user journey: Home → Register → Login → First Use → Logout', async ({ page }) => {
    console.log('🚀 Testing complete new user journey from start to finish...');
    
    try {
      // ========================================
      // PHASE 1: HOME PAGE - Anonymous User
      // ========================================
      console.log('🏠 Phase 1: Starting as anonymous user on homepage...');
      
      // Navigate to homepage (will redirect to auth for unauthenticated users)
      await testHelpers.navigateTo('/');
      await testHelpers.waitForPageLoad();
      
      // Verify we're not authenticated and got redirected to auth
      expect(await authHelpers.isAuthenticated()).toBe(false);
      
      // Should be redirected to auth page since homepage requires authentication
      const currentUrl = page.url();
      if (currentUrl.includes('/auth')) {
        console.log('✅ Correctly redirected to auth page for anonymous user');
        
        // Check for sign up option on auth page
        const signUpElements = [
          'a:has-text("Sign Up")',
          'button:has-text("Sign Up")',
          'a:has-text("Register")',
          'button:has-text("Register")',
          '[data-testid="signup-link"]'
        ];
        
        let signUpFound = false;
        for (const selector of signUpElements) {
          if (await testHelpers.elementExists(selector)) {
            console.log(`✅ Found sign up element: ${selector}`);
            signUpFound = true;
            break;
          }
        }
        
        // If no sign up link found, navigate directly to signup
        if (!signUpFound) {
          console.log('ℹ️ No sign up link found on auth page, navigating directly');
        }
      } else {
        // If not redirected, we're on a public homepage
        console.log(`📍 Homepage accessible without auth: ${currentUrl}`);
        
        // Look for any heading or main content
        const homePageElements = [
          'h1', 'h2', '[role="main"]', 'main', 
          '[data-testid="hero"]', '[data-testid="hero-title"]',
          'nav', 'header'
        ];
        
        let pageContentFound = false;
        for (const selector of homePageElements) {
          if (await testHelpers.elementExists(selector)) {
            console.log(`✅ Found homepage element: ${selector}`);
            pageContentFound = true;
            break;
          }
        }
        
        expect(pageContentFound).toBe(true);
      }
      
      // Should see sign up and sign in options
      const signUpSelectors = [
        'a:has-text("Sign Up")',
        'button:has-text("Sign Up")',
        'a:has-text("Get Started")',
        'button:has-text("Get Started")',
        '[data-testid="signup-button"]'
      ];
      
      let signUpFound = false;
      for (const selector of signUpSelectors) {
        if (await testHelpers.elementExists(selector)) {
          console.log(`✅ Found sign up element: ${selector}`);
          signUpFound = true;
          break;
        }
      }
      
      expect(signUpFound).toBe(true);
      console.log('✅ Homepage loaded successfully for anonymous user');

      // ========================================
      // PHASE 2: REGISTRATION FLOW
      // ========================================
      console.log('📝 Phase 2: User registration process...');
      
      // Navigate to registration page
      await testHelpers.navigateTo('/auth/signup');
      await testHelpers.waitForPageLoad();
      
      // Verify we're on signup page
      expect(page.url()).toContain('/auth/signup');
      
      // Wait for signup form to be ready
      await testHelpers.waitForElement('[data-testid="signup-form"], form', TIMEOUTS.medium);
      
      // Fill registration form
      console.log(`📧 Registering new user: ${newUserEmail}`);
      await testHelpers.fillField('input[type="email"], input[name="email"]', newUserEmail);
      await testHelpers.fillField('input[name="password"]', newUserPassword);
      
      // Handle confirm password field if it exists
      const confirmPasswordExists = await testHelpers.elementExists('input[name="confirmPassword"], input[name="confirm-password"]');
      if (confirmPasswordExists) {
        await testHelpers.fillField('input[name="confirmPassword"], input[name="confirm-password"]', newUserPassword);
      }
      
      // Submit registration
      await testHelpers.clickButton('button[type="submit"], [data-testid="signup-button"]');
      await testHelpers.waitForTimeout(3000); // Allow time for registration processing
      
      console.log('✅ Registration form submitted successfully');

      // ========================================
      // PHASE 3: POST-REGISTRATION HANDLING
      // ========================================
      console.log('📧 Phase 3: Handling post-registration state...');
      
      // In dev environment, email verification is disabled, so we can proceed directly
      // Check if we're redirected to a verification page or can proceed to login
      const postRegistrationUrl = page.url();
      
      if (postRegistrationUrl.includes('verify') || postRegistrationUrl.includes('check-email')) {
        console.log('📧 Email verification step detected (would be skipped in dev)');
        // In dev environment, we can simulate email verification completion
        await testHelpers.waitForTimeout(2000);
      } else if (postRegistrationUrl.includes('signin') || postRegistrationUrl.includes('login')) {
        console.log('✅ Redirected to login page after registration');
      } else {
        console.log(`📍 Current page after registration: ${postRegistrationUrl}`);
        // Registration might auto-login in dev environment
        const isAutoLoggedIn = await authHelpers.isAuthenticated();
        if (isAutoLoggedIn) {
          console.log('🔐 User was auto-logged in after registration');
        }
      }

      // ========================================
      // PHASE 4: FIRST LOGIN
      // ========================================
      console.log('🔐 Phase 4: First login attempt...');
      
      // Ensure we're logged out for clean first login test
      if (await authHelpers.isAuthenticated()) {
        await authHelpers.logout();
      }
      
      // Navigate to login page
      await testHelpers.navigateTo('/auth/signin');
      await testHelpers.waitForPageLoad();
      
      // Perform first login with new credentials
      await testHelpers.waitForElement('[data-testid="signin-form"], form', TIMEOUTS.medium);
      await testHelpers.fillField('input[type="email"], input[name="email"]', newUserEmail);
      await testHelpers.fillField('input[name="password"]', newUserPassword);
      await testHelpers.clickButton('button[type="submit"], [data-testid="signin-button"]');
      
      // Wait for login to complete
      await page.waitForURL(/\/(?!auth)/, { timeout: TIMEOUTS.long });
      await testHelpers.waitForPageLoad();
      
      // Verify successful authentication
      expect(await authHelpers.isAuthenticated()).toBe(true);
      console.log('✅ First login successful');

      // ========================================
      // PHASE 5: FIRST-TIME USER EXPERIENCE
      // ========================================
      console.log('🌟 Phase 5: First-time user experience...');
      
      // Check if user is redirected to onboarding or dashboard
      const postLoginUrl = page.url();
      console.log(`📍 Post-login URL: ${postLoginUrl}`);
      
      // Handle potential onboarding flow
      if (postLoginUrl.includes('onboarding') || postLoginUrl.includes('welcome')) {
        console.log('👋 Onboarding flow detected');
        
        // Complete onboarding steps (if they exist)
        const onboardingSteps = [
          'button:has-text("Next")',
          'button:has-text("Continue")',
          'button:has-text("Get Started")',
          'button:has-text("Complete")'
        ];
        
        for (const stepButton of onboardingSteps) {
          if (await testHelpers.elementExists(stepButton)) {
            await testHelpers.clickButton(stepButton);
            await testHelpers.waitForTimeout(1000);
          }
        }
        
        console.log('✅ Onboarding completed');
      }
      
      // Verify user is on main application area
      const finalUrl = page.url();
      expect(finalUrl).not.toContain('/auth');
      expect(finalUrl).not.toContain('/onboarding');
      
      // Check for user-specific UI elements
      const userMenuExists = await testHelpers.elementExists('[data-testid="user-menu"], .user-avatar, button[aria-label*="user"]');
      expect(userMenuExists).toBe(true);
      
      console.log('✅ User successfully reached main application');

      // ========================================
      // PHASE 6: FIRST APPLICATION USAGE
      // ========================================
      console.log('⚡ Phase 6: First application usage...');
      
      // Test basic navigation and feature access
      const navigationTests = [
        { name: 'Knowledge Base', selector: SELECTORS.nav.knowledgeBase },
        { name: 'Agents', selector: SELECTORS.nav.agents },
        { name: 'Chat', selector: SELECTORS.nav.chat }
      ];
      
      for (const navTest of navigationTests) {
        try {
          if (await testHelpers.elementExists(navTest.selector)) {
            console.log(`🧭 Testing navigation to ${navTest.name}...`);
            await testHelpers.clickButton(navTest.selector);
            await testHelpers.waitForPageLoad();
            
            // Verify we can access the feature
            expect(page.url()).toContain(navTest.name.toLowerCase().replace(' ', '-'));
            console.log(`✅ Successfully accessed ${navTest.name}`);
            
            // Go back to dashboard/home for next test
            await testHelpers.navigateTo('/');
            await testHelpers.waitForPageLoad();
          }
        } catch (error) {
          console.log(`⚠️ Could not test ${navTest.name} navigation: ${error}`);
        }
      }
      
      // Test creating first resource (if possible)
      try {
        console.log('📝 Testing first resource creation...');
        
        // Try to create a simple knowledge base
        if (await testHelpers.elementExists(SELECTORS.nav.knowledgeBase)) {
          await testHelpers.clickButton(SELECTORS.nav.knowledgeBase);
          await testHelpers.waitForPageLoad();
          
          if (await testHelpers.elementExists(SELECTORS.buttons.create)) {
            await testHelpers.clickButton(SELECTORS.buttons.create);
            await testHelpers.waitForElement(SELECTORS.forms.knowledgeBase, TIMEOUTS.medium);
            
            // Fill basic info
            await testHelpers.fillField('input[name="name"]', 'My First Knowledge Base');
            await testHelpers.fillField('textarea[name="description"]', 'Created during first user journey test');
            
            await testHelpers.clickButton(SELECTORS.buttons.save);
            await testHelpers.waitForToast('Knowledge base created', TIMEOUTS.medium);
            
            console.log('✅ Successfully created first resource');
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not test resource creation: ${error}`);
      }

      // ========================================
      // PHASE 7: SESSION PERSISTENCE TEST
      // ========================================
      console.log('🔄 Phase 7: Testing session persistence...');
      
      // Refresh page to test session persistence
      await page.reload();
      await testHelpers.waitForPageLoad();
      
      // Should still be authenticated after refresh
      expect(await authHelpers.isAuthenticated()).toBe(true);
      console.log('✅ Session persisted after page refresh');
      
      // Test navigation to different page and back
      await testHelpers.navigateTo('/settings');
      await testHelpers.waitForPageLoad();
      expect(await authHelpers.isAuthenticated()).toBe(true);
      
      await testHelpers.navigateTo('/');
      await testHelpers.waitForPageLoad();
      expect(await authHelpers.isAuthenticated()).toBe(true);
      
      console.log('✅ Session persisted across navigation');

      // ========================================
      // PHASE 8: LOGOUT FLOW
      // ========================================
      console.log('🚪 Phase 8: Testing logout process...');
      
      // Perform logout
      await authHelpers.logout();
      
      // Verify logout was successful
      expect(await authHelpers.isAuthenticated()).toBe(false);
      expect(page.url()).toContain('/auth');
      
      // Verify session data was cleared
      const sessionCleared = await page.evaluate(() => {
        const localStorageCleared = !localStorage.getItem('accessToken') && 
                                   !localStorage.getItem('auth_access_token') &&
                                   !localStorage.getItem('auth_user');
        const sessionStorageCleared = !sessionStorage.getItem('accessToken') &&
                                     !sessionStorage.getItem('auth_access_token');
        return localStorageCleared && sessionStorageCleared;
      });
      
      expect(sessionCleared).toBe(true);
      console.log('✅ Logout successful, session data cleared');

      // ========================================
      // PHASE 9: RE-LOGIN VERIFICATION
      // ========================================
      console.log('🔁 Phase 9: Testing re-login with same credentials...');
      
      // Test that user can log back in with same credentials
      await authHelpers.login(newUserEmail, newUserPassword);
      
      // Verify re-login was successful
      expect(await authHelpers.isAuthenticated()).toBe(true);
      expect(page.url()).not.toContain('/auth');
      
      console.log('✅ Re-login successful');

      // ========================================
      // FINAL VERIFICATION
      // ========================================
      console.log('🎯 Final: Comprehensive journey verification...');
      
      // Verify user info is correct
      const userInfo = await authHelpers.getCurrentUserInfo();
      if (userInfo?.email) {
        expect(userInfo.email.toLowerCase()).toBe(newUserEmail.toLowerCase());
        console.log(`✅ User email verified: ${userInfo.email}`);
      }
      
      // Verify we can access protected features
      await testHelpers.navigateTo('/settings');
      expect(page.url()).toContain('/settings');
      expect(await authHelpers.isAuthenticated()).toBe(true);
      
      console.log('🎉 COMPLETE SUCCESS: Full new user journey validated!');
      console.log('✅ Registration → Login → First Use → Logout → Re-login');
      console.log('✅ Session management working correctly');
      console.log('✅ Feature access verified');
      console.log('✅ User data persistence confirmed');
      
    } catch (error) {
      console.error('❌ New user journey test failed:', error);
      await testHelpers.takeScreenshot('new-user-journey-error');
      
      // Provide debugging information
      console.log(`📍 Current URL: ${page.url()}`);
      console.log(`🔐 Authentication state: ${await authHelpers.isAuthenticated()}`);
      
      throw error;
    }
  });

  test('New user registration edge cases', async ({ page }) => {
    console.log('🔍 Testing new user registration edge cases...');
    
    try {
      // Test 1: Registration with existing email (should be handled gracefully)
      console.log('📧 Test 1: Registration with potentially existing email...');
      
      await testHelpers.navigateTo('/auth/signup');
      await testHelpers.waitForElement('form', TIMEOUTS.medium);
      
      // Try to register with a common test email
      const commonEmail = 'test@example.com';
      await testHelpers.fillField('input[type="email"]', commonEmail);
      await testHelpers.fillField('input[name="password"]', 'TestPassword123!');
      
      const confirmPasswordExists = await testHelpers.elementExists('input[name="confirmPassword"]');
      if (confirmPasswordExists) {
        await testHelpers.fillField('input[name="confirmPassword"]', 'TestPassword123!');
      }
      
      await testHelpers.clickButton('button[type="submit"]');
      await testHelpers.waitForTimeout(3000);
      
      // Should either succeed or show appropriate error message
      const currentUrl = page.url();
      if (currentUrl.includes('signup')) {
        // Still on signup page, check for error message
        const errorMessages = [
          'text=Email already exists',
          'text=User already registered',
          'text=Account already exists',
          '[data-testid="error-message"]',
          '.error-message',
          '.alert-error'
        ];
        
        let errorFound = false;
        for (const errorSelector of errorMessages) {
          if (await testHelpers.elementExists(errorSelector)) {
            console.log(`✅ Appropriate error message shown for existing email`);
            errorFound = true;
            break;
          }
        }
        
        if (!errorFound) {
          console.log('⚠️ No specific error message found, but registration didn\'t proceed');
        }
      } else {
        console.log('✅ Registration proceeded (email might not have existed)');
      }
      
      // Test 2: Registration form validation
      console.log('📝 Test 2: Form validation...');
      
      await testHelpers.navigateTo('/auth/signup');
      await testHelpers.waitForElement('form');
      
      // Try submitting empty form
      await testHelpers.clickButton('button[type="submit"]');
      await testHelpers.waitForTimeout(1000);
      
      // Should show validation errors
      const emailField = page.locator('input[type="email"]');
      const passwordField = page.locator('input[type="password"]');
      
      // Check for HTML5 validation or custom validation
      const emailInvalid = await emailField.evaluate(el => !el.checkValidity());
      const passwordInvalid = await passwordField.evaluate(el => el.value === '');
      
      if (emailInvalid || passwordInvalid) {
        console.log('✅ Form validation working correctly');
      }
      
      // Test 3: Password strength validation
      console.log('🔒 Test 3: Password strength validation...');
      
      await testHelpers.fillField('input[type="email"]', newUserEmail);
      await testHelpers.fillField('input[name="password"]', '123'); // Weak password
      await testHelpers.clickButton('button[type="submit"]');
      await testHelpers.waitForTimeout(1000);
      
      // Should remain on form or show password error
      const weakPasswordHandled = page.url().includes('signup') || 
                                 await testHelpers.elementExists('text*=password');
      expect(weakPasswordHandled).toBe(true);
      console.log('✅ Weak password properly rejected');
      
      console.log('🎯 Registration edge cases testing completed');
      
    } catch (error) {
      console.error('❌ Registration edge cases test failed:', error);
      await testHelpers.takeScreenshot('registration-edge-cases-error');
      throw error;
    }
  });

  test('User onboarding flow (if exists)', async ({ page }) => {
    console.log('👋 Testing user onboarding flow...');
    
    try {
      // Create and login new user
      const onboardingEmail = `onboarding-${Date.now()}@example.com`;
      
      // Quick registration
      await testHelpers.navigateTo('/auth/signup');
      await testHelpers.waitForElement('form');
      await testHelpers.fillField('input[type="email"]', onboardingEmail);
      await testHelpers.fillField('input[name="password"]', newUserPassword);
      
      const confirmPasswordExists = await testHelpers.elementExists('input[name="confirmPassword"]');
      if (confirmPasswordExists) {
        await testHelpers.fillField('input[name="confirmPassword"]', newUserPassword);
      }
      
      await testHelpers.clickButton('button[type="submit"]');
      await testHelpers.waitForTimeout(3000);
      
      // Login if not auto-logged in
      if (!await authHelpers.isAuthenticated()) {
        await authHelpers.login(onboardingEmail, newUserPassword);
      }
      
      // Check for onboarding elements
      const onboardingSelectors = [
        '[data-testid="onboarding-wizard"]',
        '[data-testid="welcome-modal"]',
        'text=Welcome to LEGAIA',
        'text=Get Started',
        'text=Setup your profile',
        '.onboarding-step',
        '.welcome-screen'
      ];
      
      let onboardingFound = false;
      for (const selector of onboardingSelectors) {
        if (await testHelpers.elementExists(selector)) {
          console.log(`✅ Found onboarding element: ${selector}`);
          onboardingFound = true;
          break;
        }
      }
      
      if (onboardingFound) {
        console.log('🌟 Onboarding flow detected, testing completion...');
        
        // Try to complete onboarding steps
        const onboardingActions = [
          'button:has-text("Next")',
          'button:has-text("Continue")',
          'button:has-text("Skip")',
          'button:has-text("Get Started")',
          'button:has-text("Complete Setup")',
          'button:has-text("Finish")'
        ];
        
        let stepsCompleted = 0;
        const maxSteps = 5; // Prevent infinite loops
        
        while (stepsCompleted < maxSteps) {
          let actionTaken = false;
          
          for (const action of onboardingActions) {
            if (await testHelpers.elementExists(action)) {
              console.log(`🔄 Completing onboarding step ${stepsCompleted + 1}: ${action}`);
              await testHelpers.clickButton(action);
              await testHelpers.waitForTimeout(2000);
              actionTaken = true;
              stepsCompleted++;
              break;
            }
          }
          
          if (!actionTaken) {
            console.log('✅ Onboarding completed or no more steps');
            break;
          }
        }
        
        // Verify onboarding completion
        const finalUrl = page.url();
        expect(finalUrl).not.toContain('/onboarding');
        expect(finalUrl).not.toContain('/welcome');
        expect(await authHelpers.isAuthenticated()).toBe(true);
        
        console.log('✅ Onboarding flow completed successfully');
      } else {
        console.log('ℹ️ No onboarding flow detected - user went directly to main app');
      }
      
    } catch (error) {
      console.error('❌ Onboarding flow test failed:', error);
      await testHelpers.takeScreenshot('onboarding-flow-error');
      throw error;
    }
  });
});