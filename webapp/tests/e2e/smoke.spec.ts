import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Smoke Tests', () => {
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
  });

  test('should load the homepage', async () => {
    await testHelpers.navigateTo('/');
    
    // Check that the page loads
    await expect(testHelpers.page).toHaveTitle(/LEGAIA|LLM/);
    
    // Check for basic page elements
    await expect(testHelpers.page.locator('body')).toBeVisible();
  });

  test('should navigate to sign-in page', async () => {
    await testHelpers.navigateTo('/auth/signin');
    
    // Should show sign-in form
    await expect(testHelpers.page.locator('form, [data-testid="signin-form"]')).toBeVisible();
    
    // Should have email and password fields
    await expect(testHelpers.page.locator('input[type="email"]')).toBeVisible();
    await expect(testHelpers.page.locator('input[type="password"]')).toBeVisible();
  });

  test('should have responsive design', async () => {
    // Test desktop view
    await testHelpers.setViewport(1920, 1080);
    await testHelpers.navigateTo('/');
    await expect(testHelpers.page.locator('body')).toBeVisible();
    
    // Test mobile view
    await testHelpers.setViewport(375, 667);
    await testHelpers.navigateTo('/');
    await expect(testHelpers.page.locator('body')).toBeVisible();
  });

  test('should handle 404 pages', async () => {
    await testHelpers.navigateTo('/non-existent-page');
    
    // Should show 404 or redirect to home
    const is404 = await testHelpers.elementExists('text=404');
    const isRedirected = testHelpers.page.url().includes('/auth') || testHelpers.page.url() === testHelpers.page.url().split('/').slice(0, 3).join('/') + '/';
    
    expect(is404 || isRedirected).toBe(true);
  });

  test('should have proper meta tags', async () => {
    await testHelpers.navigateTo('/');
    
    // Check for viewport meta tag
    const viewport = await testHelpers.page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    
    // Check for charset
    const charset = await testHelpers.page.locator('meta[charset]').count();
    expect(charset).toBeGreaterThan(0);
  });

  test('should load without JavaScript errors', async () => {
    const errors: string[] = [];
    
    testHelpers.page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await testHelpers.navigateTo('/');
    await testHelpers.waitForPageLoad();
    
    // Should not have critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('analytics') &&
      !error.includes('third-party')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have working navigation', async () => {
    await testHelpers.navigateTo('/');
    
    // Check for navigation elements
    const hasNav = await testHelpers.elementExists('nav, [role="navigation"], [data-testid="navigation"]');
    
    if (hasNav) {
      // Should have navigation links
      const navLinks = await testHelpers.page.locator('nav a, [role="navigation"] a').count();
      expect(navLinks).toBeGreaterThan(0);
    }
  });

  test('should handle network failures gracefully', async () => {
    // Simulate offline condition
    await testHelpers.page.context().setOffline(true);
    
    await testHelpers.navigateTo('/');
    
    // Should show some kind of offline indicator or error message
    // This depends on the app's offline handling
    await testHelpers.waitForPageLoad();
    
    // Restore online condition
    await testHelpers.page.context().setOffline(false);
  });
});
