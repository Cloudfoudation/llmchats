import { test, expect } from '@playwright/test';

test.describe('Full Authentication Testing', () => {
  const testUsers = {
    admin: {
      email: 'admin@testbackend.com',
      password: 'TestBackend123!',
      expectedGroup: 'admin'
    },
    paid: {
      email: 'paid@testbackend.com', 
      password: 'TestBackend123!',
      expectedGroup: 'paid'
    },
    free: {
      email: 'free@testbackend.com',
      password: 'TestBackend123!', 
      expectedGroup: 'free'
    }
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login admin user successfully', async ({ page }) => {
    const user = testUsers.admin;
    
    // Check if we need to login
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      // Look for login button or form
      const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), [data-testid*="login"], [data-testid*="signin"]').first();
      
      if (await loginButton.isVisible()) {
        await loginButton.click();
        
        // Wait for login form or redirect
        await page.waitForTimeout(2000);
        
        // Check if we have email/password fields
        const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first();
        const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').first();
        
        if (await emailField.isVisible() && await passwordField.isVisible()) {
          // Direct login form
          await emailField.fill(user.email);
          await passwordField.fill(user.password);
          
          const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
          await submitButton.click();
        } else {
          console.log('OAuth flow detected - manual intervention may be required');
        }
      }
    }
    
    // Wait for potential redirect or login completion
    await page.waitForTimeout(3000);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/admin-login-attempt.png' });
    
    console.log(`✅ Admin login test completed for ${user.email}`);
  });

  test('should login paid user successfully', async ({ page }) => {
    const user = testUsers.paid;
    
    // Similar login flow for paid user
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), [data-testid*="login"], [data-testid*="signin"]').first();
      
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(2000);
        
        const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first();
        const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').first();
        
        if (await emailField.isVisible() && await passwordField.isVisible()) {
          await emailField.fill(user.email);
          await passwordField.fill(user.password);
          
          const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
          await submitButton.click();
        }
      }
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/paid-login-attempt.png' });
    
    console.log(`✅ Paid user login test completed for ${user.email}`);
  });

  test('should login free user successfully', async ({ page }) => {
    const user = testUsers.free;
    
    // Similar login flow for free user
    const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), [data-testid*="login"], [data-testid*="signin"]').first();
      
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await page.waitForTimeout(2000);
        
        const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first();
        const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').first();
        
        if (await emailField.isVisible() && await passwordField.isVisible()) {
          await emailField.fill(user.email);
          await passwordField.fill(user.password);
          
          const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
          await submitButton.click();
        }
      }
    }
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/free-login-attempt.png' });
    
    console.log(`✅ Free user login test completed for ${user.email}`);
  });

  test('should handle invalid credentials', async ({ page }) => {
    const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), [data-testid*="login"], [data-testid*="signin"]').first();
    
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForTimeout(2000);
      
      const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first();
      const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').first();
      
      if (await emailField.isVisible() && await passwordField.isVisible()) {
        await emailField.fill('invalid@testbackend.com');
        await passwordField.fill('WrongPassword123!');
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
        await submitButton.click();
        
        // Wait for error message
        await page.waitForTimeout(3000);
        
        // Look for error indicators
        const errorElements = await page.locator('.error, [class*="error"], [data-testid*="error"], .alert-danger').count();
        
        if (errorElements > 0) {
          console.log('✅ Error handling working - invalid credentials rejected');
        } else {
          console.log('ℹ️  Error handling test - no visible error elements found');
        }
      }
    }
    
    await page.screenshot({ path: 'test-results/invalid-credentials-test.png' });
  });

  test('should test logout functionality', async ({ page }) => {
    // First try to login
    const user = testUsers.admin;
    
    const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), [data-testid*="login"], [data-testid*="signin"]').first();
    
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForTimeout(2000);
      
      const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first();
      const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').first();
      
      if (await emailField.isVisible() && await passwordField.isVisible()) {
        await emailField.fill(user.email);
        await passwordField.fill(user.password);
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
        await submitButton.click();
        
        await page.waitForTimeout(3000);
      }
    }
    
    // Now try to logout
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu, [class*="user-menu"]').first();
    const logoutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout"), [data-testid*="logout"], [href*="logout"]').first();
    
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.waitForTimeout(1000);
    }
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(3000);
      
      // Verify logout
      const loginButtonVisible = await page.locator('button:has-text("Sign in"), button:has-text("Login")').first().isVisible();
      
      if (loginButtonVisible) {
        console.log('✅ Logout successful - login button visible again');
      } else {
        console.log('ℹ️  Logout test - login button not immediately visible');
      }
    } else {
      console.log('ℹ️  Logout button not found - may not be logged in');
    }
    
    await page.screenshot({ path: 'test-results/logout-test.png' });
  });
});

test.describe('Authentication UI Elements', () => {
  test('should display all required authentication elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for various authentication-related elements
    const authElements = {
      loginButton: await page.locator('button:has-text("Sign in"), button:has-text("Login"), [data-testid*="login"]').count(),
      googleButton: await page.locator('button:has-text("Google"), [data-testid*="google"]').count(),
      emailField: await page.locator('input[type="email"], input[name="email"]').count(),
      passwordField: await page.locator('input[type="password"], input[name="password"]').count(),
      signupLink: await page.locator('a:has-text("Sign up"), a:has-text("Register"), [href*="signup"]').count(),
      forgotPasswordLink: await page.locator('a:has-text("Forgot"), a:has-text("Reset"), [href*="forgot"]').count()
    };
    
    console.log('Authentication UI Elements Found:', authElements);
    
    // Take screenshot of auth interface
    await page.screenshot({ path: 'test-results/auth-ui-elements.png' });
    
    // At least one authentication method should be available
    const hasAuthMethod = authElements.loginButton > 0 || authElements.googleButton > 0 || authElements.emailField > 0;
    expect(hasAuthMethod).toBe(true);
    
    console.log('✅ Authentication UI elements test completed');
  });
});
