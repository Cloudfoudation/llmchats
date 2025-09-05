import { test, expect } from '@playwright/test';
import { AuthUtils, DataUtils } from '../../utils/test-utils';

test.describe('Authentication Flow', () => {
  let authUtils: AuthUtils;
  let testUsers: Record<string, any>;

  test.beforeEach(async ({ page }) => {
    authUtils = new AuthUtils(page);
    testUsers = DataUtils.loadTestUsers();
  });

  test('should display login page on initial visit', async ({ page }) => {
    await page.goto('/');
    
    // Verify login elements are present
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('LEGAIA Bedrock Chat');
    await expect(page.locator('[data-testid="app-description"]')).toBeVisible();
  });

  test('should successfully login with Google OAuth', async ({ page }) => {
    const testUser = testUsers.paid;
    
    await authUtils.loginWithGoogle(testUser.email, testUser.password);
    
    // Verify successful login
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Verify user information is displayed
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('[data-testid="user-email"]')).toContainText(testUser.email);
  });

  test('should handle login failure gracefully', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="google-signin-button"]');
    
    // Try to login with invalid credentials
    await page.waitForURL('**/auth.us-east-1.amazoncognito.com/**');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should successfully logout', async ({ page }) => {
    const testUser = testUsers.free;
    
    // Login first
    await authUtils.loginWithGoogle(testUser.email, testUser.password);
    
    // Logout
    await authUtils.logout();
    
    // Verify logout success
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    const testUser = testUsers.admin;
    
    // Login
    await authUtils.loginWithGoogle(testUser.email, testUser.password);
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Clear any existing authentication
    await page.context().clearCookies();
    
    // Try to access protected route
    await page.goto('/agents');
    
    // Should redirect to login
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();
  });

  test('should handle session expiration', async ({ page }) => {
    const testUser = testUsers.paid;
    
    // Login
    await authUtils.loginWithGoogle(testUser.email, testUser.password);
    
    // Simulate session expiration by clearing tokens
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to access protected functionality
    await page.goto('/conversations');
    
    // Should redirect to login
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();
  });

  test('should display correct user tier information', async ({ page }) => {
    const adminUser = testUsers.admin;
    
    await authUtils.loginWithGoogle(adminUser.email, adminUser.password);
    
    // Check user menu for admin privileges
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('[data-testid="user-tier"]')).toContainText('Admin');
    await expect(page.locator('[data-testid="admin-panel-link"]')).toBeVisible();
  });

  test('should enforce tier-based access restrictions', async ({ page }) => {
    const freeUser = testUsers.free;
    
    await authUtils.loginWithGoogle(freeUser.email, freeUser.password);
    
    // Free users should not see admin features
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('[data-testid="admin-panel-link"]')).not.toBeVisible();
    
    // Free users should have limited model access
    await page.goto('/');
    await expect(page.locator('[data-testid="model-selector"]')).toContainText('Llama');
  });
});

test.describe('Authentication Security', () => {
  test('should protect against CSRF attacks', async ({ page }) => {
    // Attempt to make authenticated request without proper CSRF token
    const response = await page.request.post('/api/auth/logout', {
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Should be rejected
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should use secure authentication headers', async ({ page }) => {
    await page.goto('/');
    
    // Check for security headers
    const response = await page.waitForResponse('**');
    const headers = response.headers();
    
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  test('should handle concurrent login attempts', async ({ page, context }) => {
    const testUser = DataUtils.loadTestUsers().paid;
    
    // Create multiple pages for concurrent login
    const page2 = await context.newPage();
    
    const authUtils1 = new AuthUtils(page);
    const authUtils2 = new AuthUtils(page2);
    
    // Attempt concurrent logins
    await Promise.all([
      authUtils1.loginWithGoogle(testUser.email, testUser.password),
      authUtils2.loginWithGoogle(testUser.email, testUser.password)
    ]);
    
    // Both should be successful
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible();
    
    await page2.close();
  });
});
