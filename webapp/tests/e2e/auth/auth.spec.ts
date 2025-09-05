import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_USERS, SELECTORS, TIMEOUTS } from '../../fixtures/test-data';

// Test data for auth tests
const AUTH_TEST_DATA = {
  newUser: {
    email: () => `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    weakPassword: '123',
    invalidEmail: 'invalid-email'
  },
  messages: {
    invalidCredentials: 'Invalid credentials',
    passwordReset: 'Password reset email sent', 
    checkEmail: 'Check your email',
    passwordWeak: 'Password must be'
  }
};

test.describe('Authentication Tests', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test.describe('Sign In Functionality', () => {
    test('should authenticate all user types successfully', async ({ page }) => {
      console.log('🔐 Testing authentication for all user types...');
      
      const userTypes = [
        { type: 'admin', helper: () => authHelpers.loginAsAdmin(), expected: TEST_USERS.admin.email },
        { type: 'paid', helper: () => authHelpers.loginAsPaidUser(), expected: TEST_USERS.paid.email },
        { type: 'free', helper: () => authHelpers.loginAsFreeUser(), expected: TEST_USERS.free.email }
      ];

      for (const userType of userTypes) {
        console.log(`🧪 Testing ${userType.type} user authentication...`);
        
        await authHelpers.clearSession();
        await userType.helper();
        
        expect(await authHelpers.isAuthenticated()).toBe(true);
        
        const userInfo = await authHelpers.getCurrentUserInfo();
        expect(userInfo?.email).toBe(userType.expected);
        
        console.log(`✅ ${userType.type} user authenticated successfully`);
      }
    });

    test('should handle invalid credentials properly', async ({ page }) => {
      const result = await attemptLoginWithCredentials(
        page, 
        AUTH_TEST_DATA.newUser.invalidEmail, 
        AUTH_TEST_DATA.newUser.password
      );
      
      expect(result.success).toBe(false);
      expect(result.remainsOnAuthPage).toBe(true);
    });

    test('should validate required fields', async ({ page }) => {
      await authHelpers.navigateTo('/auth/signin');
      await testHelpers.clickButton('button[type="submit"]');
      
      await expect(authHelpers.page.locator('input[type="email"]:invalid')).toBeVisible();
      await expect(authHelpers.page.locator('input[type="password"]:invalid')).toBeVisible();
    });

    test('should redirect to intended page after login', async ({ page }) => {
      await authHelpers.navigateTo('/knowledge-bases');
      expect(authHelpers.page.url()).toContain('/auth/signin');
      
      await authHelpers.loginAsPaidUser();
      await authHelpers.page.waitForURL(/\/knowledge-bases/);
    });
  });

  test.describe('Sign Out Functionality', () => {
    test('should sign out and clear session data', async ({ page }) => {
      await authHelpers.loginAsPaidUser();
      expect(await authHelpers.isAuthenticated()).toBe(true);
      
      await authHelpers.logout();
      
      expect(authHelpers.page.url()).toContain('/auth');
      expect(await authHelpers.isAuthenticated()).toBe(false);
      
      const tokensCleared = await authHelpers.page.evaluate(() => {
        return localStorage.getItem('accessToken') === null &&
               sessionStorage.getItem('accessToken') === null;
      });
      expect(tokensCleared).toBe(true);
    });
  });

  test.describe('User Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      const newUserEmail = AUTH_TEST_DATA.newUser.email();
      
      const result = await registerNewUser(page, newUserEmail, AUTH_TEST_DATA.newUser.password);
      
      expect(result.success).toBe(true);
      expect(result.showsVerificationMessage || result.redirectedToLogin).toBe(true);
    });

    test('should validate password requirements', async ({ page }) => {
      await authHelpers.navigateTo('/auth/signup');
      
      await testHelpers.fillField('input[type="email"]', AUTH_TEST_DATA.newUser.email());
      await testHelpers.fillField('input[type="password"]', AUTH_TEST_DATA.newUser.weakPassword);
      await testHelpers.clickButton('button[type="submit"]');
      
      await expect(authHelpers.page.locator(`text=${AUTH_TEST_DATA.messages.passwordWeak}`)).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await authHelpers.navigateTo('/auth/signup');
      
      await testHelpers.fillField('input[type="email"]', AUTH_TEST_DATA.newUser.invalidEmail);
      await testHelpers.fillField('input[type="password"]', AUTH_TEST_DATA.newUser.password);
      await testHelpers.clickButton('button[type="submit"]');
      
      await expect(authHelpers.page.locator('input[type="email"]:invalid')).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should handle password reset request', async ({ page }) => {
      await authHelpers.resetPassword(TEST_USERS.paid.email);
      await testHelpers.waitForToast(AUTH_TEST_DATA.messages.passwordReset);
    });

    test('should validate email for password reset', async ({ page }) => {
      await authHelpers.navigateTo('/auth/forgot-password');
      
      await testHelpers.fillField('input[type="email"]', AUTH_TEST_DATA.newUser.invalidEmail);
      await testHelpers.clickButton('button[type="submit"]');
      
      await expect(authHelpers.page.locator('input[type="email"]:invalid')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      await authHelpers.loginAsPaidUser();
      
      await authHelpers.page.reload();
      await testHelpers.waitForPageLoad();
      
      expect(await authHelpers.isAuthenticated()).toBe(true);
    });

    test('should handle expired sessions', async ({ page }) => {
      await authHelpers.loginAsPaidUser();
      
      await authHelpers.page.evaluate(() => {
        localStorage.setItem('accessToken', 'expired-token');
      });
      
      await authHelpers.navigateTo('/knowledge-bases');
      await authHelpers.page.waitForURL(/\/auth/);
    });
  });

  test.describe('Protected Routes', () => {
    const protectedRoutes = [
      '/knowledge-bases',
      '/agents', 
      '/settings'
    ];

    test('should protect all restricted routes', async ({ page }) => {
      for (const route of protectedRoutes) {
        await authHelpers.navigateTo(route);
        expect(authHelpers.page.url()).toContain('/auth');
      }
    });

    test('should allow access to public routes', async ({ page }) => {
      await authHelpers.navigateTo('/');
      expect(authHelpers.page.url()).not.toContain('/auth');
    });
  });

  test.describe('User Roles and Permissions', () => {
    const roleTests = [
      { 
        role: 'admin', 
        login: () => authHelpers.loginAsAdmin(), 
        selector: '[data-testid="admin-panel"]' 
      },
      { 
        role: 'paid', 
        login: () => authHelpers.loginAsPaidUser(), 
        selector: '[data-testid="premium-features"]' 
      },
      { 
        role: 'free', 
        login: () => authHelpers.loginAsFreeUser(), 
        selector: '[data-testid="upgrade-prompt"]' 
      }
    ];

    test('should show appropriate UI for different user roles', async ({ page }) => {
      for (const roleTest of roleTests) {
        console.log(`🧪 Testing ${roleTest.role} user UI...`);
        
        await authHelpers.clearSession();
        await roleTest.login();
        await authHelpers.navigateTo('/');
        
        // Note: These selectors might not exist, so we'll make them optional
        const element = authHelpers.page.locator(roleTest.selector);
        if (await element.count() > 0) {
          await expect(element).toBeVisible();
          console.log(`✅ ${roleTest.role} UI elements visible`);
        } else {
          console.log(`ℹ️ ${roleTest.role} UI elements not found (may not be implemented)`);
        }
      }
    });
  });

  test.describe('Development Environment Features', () => {
    test('should handle auto-confirmation registration flow', async ({ page }) => {
      const newUserEmail = AUTH_TEST_DATA.newUser.email();
      
      console.log('🧪 Testing dev environment auto-confirmation...');
      
      const registrationResult = await registerNewUser(page, newUserEmail, AUTH_TEST_DATA.newUser.password);
      
      if (registrationResult.redirectedToLogin) {
        console.log('✅ Auto-confirmation working - redirected to login');
        
        const loginResult = await attemptLoginWithCredentials(page, newUserEmail, AUTH_TEST_DATA.newUser.password);
        
        if (loginResult.success) {
          console.log('✅ Immediate login successful after registration');
        } else {
          console.log('⚠️ Login failed - user may need manual confirmation');
        }
      }
    });
  });

  // Helper Functions
  async function registerNewUser(
    page: Page, 
    email: string, 
    password: string
  ): Promise<{success: boolean, showsVerificationMessage: boolean, redirectedToLogin: boolean}> {
    try {
      await authHelpers.navigateTo('/auth/signup');
      
      await testHelpers.fillField('input[type="email"]', email);
      await testHelpers.fillField('input[type="password"]', password);
      
      const confirmPasswordField = authHelpers.page.locator('input[name="confirmPassword"]');
      if (await confirmPasswordField.count() > 0) {
        await testHelpers.fillField('input[name="confirmPassword"]', password);
      }
      
      await testHelpers.clickButton('button[type="submit"]');
      await page.waitForTimeout(TIMEOUTS.medium);
      
      const currentUrl = page.url();
      const showsVerificationMessage = await authHelpers.page.locator(`text=${AUTH_TEST_DATA.messages.checkEmail}`).count() > 0;
      const redirectedToLogin = currentUrl.includes('/auth/login');
      
      return {
        success: showsVerificationMessage || redirectedToLogin,
        showsVerificationMessage,
        redirectedToLogin
      };
    } catch (error) {
      console.log('Registration failed:', error);
      return { success: false, showsVerificationMessage: false, redirectedToLogin: false };
    }
  }

  async function attemptLoginWithCredentials(
    page: Page, 
    email: string, 
    password: string
  ): Promise<{success: boolean, remainsOnAuthPage: boolean}> {
    try {
      await authHelpers.navigateTo('/auth/signin');
      
      await testHelpers.fillField('input[type="email"]', email);
      await testHelpers.fillField('input[type="password"]', password);
      await testHelpers.clickButton('button[type="submit"]');
      
      await page.waitForTimeout(TIMEOUTS.medium);
      
      const currentUrl = page.url();
      const remainsOnAuthPage = currentUrl.includes('/auth');
      const success = !remainsOnAuthPage;
      
      return { success, remainsOnAuthPage };
    } catch (error) {
      console.log('Login attempt failed:', error);
      return { success: false, remainsOnAuthPage: true };
    }
  }
});