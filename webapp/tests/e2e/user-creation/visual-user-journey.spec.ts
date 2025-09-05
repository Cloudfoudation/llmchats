import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';

test.describe('Visual New User Journey with Screenshots', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;
  let newUserEmail: string;
  const newUserPassword = 'VisualTest123!';

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    newUserEmail = `visualtest-${Date.now()}@example.com`;
    
    // Initialize test with name for organized screenshots
    testHelpers.initializeTest('visual-user-journey');
    
    // Take initial screenshot
    await testHelpers.takeStepScreenshotWithInfo('Test initialization', 'Starting visual user journey test');
    
    // Navigate to homepage first to establish context for session clearing
    await testHelpers.navigateToWithStep('/', 'Navigate to homepage');
    
    // Now safely clear session
    try {
      await authHelpers.clearSession();
      await testHelpers.takeStepScreenshot('Session cleared');
    } catch (error) {
      console.log('⚠️ Could not clear session (likely already clean):', error.message);
      await testHelpers.takeStepScreenshot('Session clear attempt');
    }
  });

  test('Complete visual user journey with step-by-step screenshots', async ({ page }) => {
    console.log('🚀 Starting visual user journey test with comprehensive screenshots...');
    
    try {
      // ========================================
      // PHASE 1: HOMEPAGE ANONYMOUS USER
      // ========================================
      console.log('🏠 PHASE 1: Starting as anonymous user on homepage...');
      
      await testHelpers.navigateToWithStep('/', 'Load homepage as anonymous user');
      
      // Verify authentication state
      const isAuthenticated = await authHelpers.isAuthenticated();
      await testHelpers.takeStepScreenshotWithInfo(
        'Check authentication state', 
        `Authentication status: ${isAuthenticated ? 'Logged in' : 'Anonymous'}`
      );
      expect(isAuthenticated).toBe(false);
      
      // Check current URL and page state
      const currentUrl = page.url();
      await testHelpers.takeStepScreenshotWithInfo(
        'Homepage loaded',
        `Current URL: ${currentUrl}`
      );

      // ========================================
      // PHASE 2: NAVIGATE TO SIGNUP
      // ========================================
      console.log('📝 PHASE 2: Navigating to signup page...');
      
      await testHelpers.navigateToWithStep('/auth/signup', 'Navigate to signup page');
      
      // Verify we're on signup page
      expect(page.url()).toContain('/auth/signup');
      await testHelpers.takeStepScreenshotWithInfo('Signup page verification', 'Confirmed on signup page');
      
      // Wait for signup form to be ready
      await testHelpers.waitForElement('form', 10000);
      await testHelpers.takeStepScreenshot('Signup form loaded and ready');

      // ========================================
      // PHASE 3: FILL REGISTRATION FORM
      // ========================================
      console.log('📧 PHASE 3: Filling registration form...');
      
      // Fill email field
      await testHelpers.fillFieldWithStep(
        'input[type="email"], input[name="email"]', 
        newUserEmail, 
        'Email'
      );
      
      // Fill password field
      await testHelpers.fillFieldWithStep(
        'input[name="password"]', 
        newUserPassword, 
        'Password'
      );
      
      // Handle confirm password field if it exists
      const confirmPasswordExists = await testHelpers.elementExists('input[name="confirmPassword"], input[name="confirm-password"]');
      if (confirmPasswordExists) {
        await testHelpers.fillFieldWithStep(
          'input[name="confirmPassword"], input[name="confirm-password"]', 
          newUserPassword, 
          'Confirm Password'
        );
      }
      
      await testHelpers.takeStepScreenshotWithInfo(
        'Registration form completed',
        `All fields filled for user: ${newUserEmail}`
      );

      // ========================================
      // PHASE 4: SUBMIT REGISTRATION
      // ========================================
      console.log('🔄 PHASE 4: Submitting registration...');
      
      await testHelpers.clickButtonWithStep(
        'button[type="submit"]', 
        'Submit Registration'
      );
      
      // Wait for registration processing
      await testHelpers.page.waitForTimeout(3000);
      await testHelpers.takeStepScreenshotWithInfo(
        'Registration processing complete',
        'Waiting for registration response'
      );
      
      // Check where we ended up after registration
      const postRegistrationUrl = page.url();
      await testHelpers.takeStepScreenshotWithInfo(
        'Post-registration state',
        `URL after registration: ${postRegistrationUrl}`
      );

      // ========================================
      // PHASE 5: HANDLE DEV ENVIRONMENT FLOW
      // ========================================
      console.log('⚡ PHASE 5: Handling dev environment flow...');
      
      if (postRegistrationUrl.includes('/auth/login')) {
        await testHelpers.takeStepScreenshot('Auto-redirected to login page (dev mode)');
        console.log('✅ Successfully redirected to login page (dev environment bypass working)');
      } else if (postRegistrationUrl.includes('verify') || postRegistrationUrl.includes('check-email')) {
        await testHelpers.takeStepScreenshot('Verification page shown (production mode)');
        console.log('📧 Email verification step detected');
      } else {
        await testHelpers.takeStepScreenshotWithInfo(
          'Unexpected page after registration',
          `Unexpected URL: ${postRegistrationUrl}`
        );
      }

      // ========================================
      // PHASE 6: LOGIN PROCESS
      // ========================================
      console.log('🔐 PHASE 6: Starting login process...');
      
      // Navigate to login page if not already there
      if (!page.url().includes('/auth/login')) {
        await testHelpers.navigateToWithStep('/auth/login', 'Navigate to login page');
      }
      
      // Wait for login form
      await testHelpers.waitForElement('form', 10000);
      await testHelpers.takeStepScreenshot('Login form loaded');
      
      // Fill login credentials
      await testHelpers.fillFieldWithStep(
        'input[type="email"], input[name="email"]', 
        newUserEmail, 
        'Login Email'
      );
      
      await testHelpers.fillFieldWithStep(
        'input[name="password"]', 
        newUserPassword, 
        'Login Password'
      );
      
      await testHelpers.takeStepScreenshotWithInfo(
        'Login form completed',
        `Ready to login with: ${newUserEmail}`
      );
      
      // Submit login
      await testHelpers.clickButtonWithStep(
        'button[type="submit"]', 
        'Submit Login'
      );
      
      // Wait for login processing
      await testHelpers.page.waitForTimeout(3000);
      await testHelpers.takeStepScreenshot('Login processing complete');

      // ========================================
      // PHASE 7: VERIFY SUCCESSFUL LOGIN
      // ========================================
      console.log('✅ PHASE 7: Verifying successful login...');
      
      const afterLoginUrl = page.url();
      await testHelpers.takeStepScreenshotWithInfo(
        'Post-login state',
        `URL after login: ${afterLoginUrl}`
      );
      
      // Check if successfully redirected away from auth pages
      const isOnAuthPage = afterLoginUrl.includes('/auth');
      if (!isOnAuthPage) {
        await testHelpers.takeStepScreenshot('Successfully logged in - on main app');
        console.log('✅ Successfully logged in and redirected to main application');
      } else {
        await testHelpers.takeStepScreenshot('Still on auth page - investigating');
        console.log('⚠️ Still on auth page - checking for errors or additional steps needed');
      }
      
      // Verify authentication state
      const finalAuthState = await authHelpers.isAuthenticated();
      await testHelpers.takeStepScreenshotWithInfo(
        'Final authentication verification',
        `Final auth state: ${finalAuthState ? 'Authenticated' : 'Not authenticated'}`
      );

      // ========================================
      // PHASE 8: EXPLORE AUTHENTICATED STATE
      // ========================================
      console.log('🎯 PHASE 8: Exploring authenticated application...');
      
      if (finalAuthState) {
        // Take screenshot of main authenticated page
        await testHelpers.takeStepScreenshot('Main application page - authenticated');
        
        // Look for user-specific elements
        const userIndicators = [
          '[data-testid="user-menu"]',
          '.user-avatar',
          'button[aria-label*="user"]',
          '[data-testid="logout-button"]'
        ];
        
        for (const selector of userIndicators) {
          if (await testHelpers.elementExists(selector)) {
            await testHelpers.takeStepScreenshotWithInfo(
              'User indicator found',
              `Found user indicator: ${selector}`
            );
            break;
          }
        }
        
        // Try to navigate to different sections if they exist
        const navigationSections = [
          { name: 'Dashboard', path: '/' },
          { name: 'Settings', path: '/settings' },
          { name: 'Profile', path: '/profile' }
        ];
        
        for (const section of navigationSections) {
          try {
            await testHelpers.navigateToWithStep(section.path, `Navigate to ${section.name}`);
            
            // Verify still authenticated
            const stillAuth = await authHelpers.isAuthenticated();
            await testHelpers.takeStepScreenshotWithInfo(
              `${section.name} page access`,
              `Still authenticated: ${stillAuth}`
            );
            
            if (!stillAuth) break;
          } catch (error) {
            console.log(`⚠️ Could not access ${section.name}:`, error.message);
            await testHelpers.takeStepScreenshot(`${section.name} access failed`);
          }
        }
      }

      // ========================================
      // PHASE 9: TEST COMPLETION
      // ========================================
      console.log('🏁 PHASE 9: Test completion summary...');
      
      await testHelpers.takeStepScreenshotWithInfo(
        'Test completion summary',
        `Final URL: ${page.url()}, Authenticated: ${finalAuthState}`
      );
      
      // Final verification
      expect(finalAuthState).toBe(true);
      console.log('🎉 Visual user journey test completed successfully!');
      
    } catch (error) {
      console.error('❌ Visual user journey test failed:', error);
      await testHelpers.takeStepScreenshotWithInfo(
        'Test failure state',
        `Error: ${error.message}`
      );
      
      // Take additional debugging screenshots
      await testHelpers.takeStepScreenshot('Current page state on error');
      
      throw error;
    }
  });

  test('Visual navigation test with step screenshots', async ({ page }) => {
    console.log('🔍 Starting visual navigation test...');
    
    testHelpers.initializeTest('visual-navigation');
    
    try {
      // Test signup page
      await testHelpers.navigateToWithStep('/auth/signup', 'Navigate to signup page');
      expect(page.url()).toMatch(/signup/);
      
      await testHelpers.waitForElement('form', 10000);
      await testHelpers.takeStepScreenshot('Signup form verification');
      
      // Test login page
      await testHelpers.navigateToWithStep('/auth/login', 'Navigate to login page');
      expect(page.url()).toMatch(/login/);
      
      await testHelpers.waitForElement('form', 10000);
      await testHelpers.takeStepScreenshot('Login form verification');
      
      // Verify forms are accessible
      const signupFormCount = await page.locator('form').count();
      expect(signupFormCount).toBeGreaterThan(0);
      
      await testHelpers.takeStepScreenshotWithInfo(
        'Navigation test completed',
        `Forms found: ${signupFormCount}`
      );
      
      console.log('✅ Visual navigation test completed successfully');
      
    } catch (error) {
      console.error('❌ Visual navigation test failed:', error);
      await testHelpers.takeStepScreenshotWithInfo(
        'Navigation test failure',
        `Error: ${error.message}`
      );
      throw error;
    }
  });
});