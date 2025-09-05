import { Page, expect } from '@playwright/test';
import { TestHelpers } from './test-helpers';

export class AuthHelpers extends TestHelpers {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    console.log(`🔐 Attempting login with email: ${email}`);
    
    await this.navigateTo('/auth/login');
    
    // Wait for login form
    await this.waitForElement('input[type="email"]', 10000);
    
    // Fill credentials
    console.log('📝 Filling email field...');
    await this.fillField('input[type="email"]', email);
    
    console.log('📝 Filling password field...');
    await this.fillField('input[type="password"]', password);
    
    // Take screenshot before submitting
    await this.takeStepScreenshot('Before login submit');
    
    console.log('🖱️ Clicking submit button...');
    // Submit form
    await this.clickButton('button[type="submit"]');
    
    // Wait a moment for form submission
    await this.page.waitForTimeout(2000);
    
    // Take screenshot after submit
    await this.takeStepScreenshot('After login submit');
    
    console.log('⏳ Waiting for login to complete...');
    
    // Try to wait for redirect with multiple attempts
    let loginSuccessful = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!loginSuccessful && attempts < maxAttempts) {
      attempts++;
      await this.page.waitForTimeout(1000);
      
      const currentUrl = this.page.url();
      console.log(`📍 Attempt ${attempts}: Current URL: ${currentUrl}`);
      
      // Check if we're no longer on auth page
      if (!currentUrl.includes('/auth')) {
        loginSuccessful = true;
        console.log('✅ Login successful - redirected away from auth');
        break;
      }
      
      // Check for authentication indicators
      const isAuth = await this.isAuthenticated();
      if (isAuth) {
        loginSuccessful = true;
        console.log('✅ Login successful - authentication detected');
        break;
      }
      
      // Check for error messages
      const errorMessages = await this.page.locator('.error, [data-testid="error"], .alert-error').count();
      if (errorMessages > 0) {
        const errorText = await this.page.locator('.error, [data-testid="error"], .alert-error').first().textContent();
        console.log(`❌ Login error detected: ${errorText}`);
        throw new Error(`Login failed: ${errorText}`);
      }
    }
    
    if (!loginSuccessful) {
      await this.takeStepScreenshot('Login failed - timeout');
      throw new Error(`Login failed after ${maxAttempts} attempts. Still on URL: ${this.page.url()}`);
    }
    
    await this.waitForPageLoad();
    await this.takeStepScreenshot('Login completed successfully');
    console.log('🎉 Login process completed successfully');
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    await this.login(
      process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      process.env.TEST_ADMIN_PASSWORD || 'AdminPass123!'
    );
  }

  /**
   * Login as paid user
   */
  async loginAsPaidUser() {
    const email = process.env.TEST_PAID_EMAIL || 'paid@example.com';
    const password = process.env.TEST_PAID_PASSWORD || 'PaidPass123!';
    
    console.log(`🔐 Logging in as paid user with email: ${email}`);
    await this.login(email, password);
  }

  /**
   * Login as free user
   */
  async loginAsFreeUser() {
    await this.login(
      process.env.TEST_FREE_EMAIL || 'free@example.com',
      process.env.TEST_FREE_PASSWORD || 'FreePass123!'
    );
  }

  /**
   * Logout user
   */
  async logout() {
    // Try different logout methods
    const logoutSelectors = [
      '[data-testid="logout-button"]',
      '[data-testid="user-menu"] button',
      'button:has-text("Logout")',
      'button:has-text("Sign out")'
    ];

    for (const selector of logoutSelectors) {
      try {
        if (await this.elementExists(selector)) {
          await this.clickButton(selector);
          break;
        }
      } catch {
        continue;
      }
    }

    // If dropdown menu, look for logout option
    try {
      await this.clickButton('button:has-text("Logout"), button:has-text("Sign out")');
    } catch {
      // Ignore if not found
    }

    // Wait for redirect to login
    await this.page.waitForURL(/\/auth/, { timeout: 10000 });
    await this.waitForPageLoad();
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, confirmPassword?: string) {
    await this.navigateTo('/auth/signup');
    
    // Wait for sign-up form
    await this.waitForElement('[data-testid="signup-form"], form');
    
    // Fill form
    await this.fillField('input[type="email"], input[name="email"]', email);
    await this.fillField('input[type="password"], input[name="password"]', password);
    
    if (confirmPassword) {
      await this.fillField('input[name="confirmPassword"], input[name="confirm-password"]', confirmPassword);
    }
    
    // Submit form
    await this.clickButton('button[type="submit"], [data-testid="signup-button"]');
    
    // Wait for success or verification page
    await this.page.waitForTimeout(2000);
  }

  /**
   * Reset password
   */
  async resetPassword(email: string) {
    await this.navigateTo('/auth/forgot-password');
    
    await this.waitForElement('input[type="email"]');
    await this.fillField('input[type="email"]', email);
    await this.clickButton('button[type="submit"]');
    
    // Wait for success message
    await this.waitForToast('Password reset email sent');
  }

  /**
   * Verify email with code
   */
  async verifyEmail(email: string, code: string) {
    await this.navigateTo('/auth/verify');
    
    await this.fillField('input[name="email"]', email);
    await this.fillField('input[name="code"]', code);
    await this.clickButton('button[type="submit"]');
    
    await this.waitForToast('Email verified successfully');
  }

  /**
   * Check authentication state
   */
  async checkAuthState(): Promise<'authenticated' | 'unauthenticated' | 'loading'> {
    // Check for loading state
    if (await this.elementExists('[data-testid="auth-loading"]')) {
      return 'loading';
    }

    // Check for authenticated state
    if (await this.isAuthenticated()) {
      return 'authenticated';
    }

    return 'unauthenticated';
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuth(timeout = 15000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const state = await this.checkAuthState();
      
      if (state === 'authenticated') {
        return true;
      }
      
      if (state === 'unauthenticated') {
        return false;
      }
      
      // Still loading, wait a bit
      await this.page.waitForTimeout(500);
    }
    
    throw new Error('Authentication timeout');
  }

  /**
   * Setup authenticated session (bypass login UI)
   */
  async setupAuthenticatedSession(userType: 'admin' | 'paid' | 'free' = 'paid') {
    // This would typically set auth tokens directly in localStorage/cookies
    // For now, we'll use the login flow
    switch (userType) {
      case 'admin':
        await this.loginAsAdmin();
        break;
      case 'paid':
        await this.loginAsPaidUser();
        break;
      case 'free':
        await this.loginAsFreeUser();
        break;
    }
  }

  /**
   * Get current user info from UI
   */
  async getCurrentUserInfo() {
    const userMenuSelector = '[data-testid="user-menu"], .user-info';
    
    if (await this.elementExists(userMenuSelector)) {
      await this.clickButton(userMenuSelector);
      
      // Extract user info from dropdown/menu
      const userInfo = {
        email: await this.getTextContent('[data-testid="user-email"]').catch(() => ''),
        name: await this.getTextContent('[data-testid="user-name"]').catch(() => ''),
        role: await this.getTextContent('[data-testid="user-role"]').catch(() => '')
      };
      
      // Close menu
      await this.page.keyboard.press('Escape');
      
      return userInfo;
    }
    
    return null;
  }
}
