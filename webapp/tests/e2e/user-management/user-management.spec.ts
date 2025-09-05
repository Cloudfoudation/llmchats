import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_USERS, SELECTORS, TIMEOUTS } from '../../fixtures/test-data';

test.describe('User Management', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test.describe('Access Control', () => {
    test('should allow admin users to access user management', async () => {
      await authHelpers.loginAsAdmin();
      await testHelpers.navigateTo('/admin/users');
      
      await expect(testHelpers.page.locator('[data-testid="users-list"]')).toBeVisible();
    });

    test('should deny non-admin users access', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/admin/users');
      
      await expect(testHelpers.page.locator('text=Access denied')).toBeVisible();
    });
  });

  test.describe('User CRUD Operations', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsAdmin();
      await testHelpers.navigateTo('/admin/users');
    });

    test('should list users', async () => {
      await testHelpers.waitForElement('[data-testid="users-list"]');
      await expect(testHelpers.page.locator('[data-testid="users-list"]')).toBeVisible();
    });

    test('should create user', async () => {
      await testHelpers.clickButton(SELECTORS.buttons.create);
      
      const newUserEmail = `test-${Date.now()}@example.com`;
      await testHelpers.fillField('input[name="email"]', newUserEmail);
      await testHelpers.fillField('input[name="password"]', 'TempPass123!');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      await testHelpers.waitForToast('User created successfully');
    });

    test('should update user', async () => {
      await testHelpers.clickButton(`text=${TEST_USERS.admin.email}`);
      await testHelpers.clickButton(SELECTORS.buttons.edit);
      
      await testHelpers.fillField('input[name="firstName"]', 'Updated');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      await testHelpers.waitForToast('User updated successfully');
    });

    test('should delete user', async () => {
      // Create user first
      await testHelpers.clickButton(SELECTORS.buttons.create);
      const deleteEmail = `delete-${Date.now()}@example.com`;
      await testHelpers.fillField('input[name="email"]', deleteEmail);
      await testHelpers.fillField('input[name="password"]', 'TempPass123!');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('User created');
      
      // Delete user
      await testHelpers.clickButton(`[data-testid="delete-${deleteEmail}"]`);
      await testHelpers.clickButton('[data-testid="confirm-delete"]');
      
      await testHelpers.waitForToast('User deleted successfully');
    });
  });

  test.describe('Validation', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsAdmin();
      await testHelpers.navigateTo('/admin/users');
    });

    test('should validate required fields', async () => {
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      await expect(testHelpers.page.locator('input[name="email"]:invalid')).toBeVisible();
    });

    test('should validate email format', async () => {
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="email"]', 'invalid-email');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      await expect(testHelpers.page.locator('input[name="email"]:invalid')).toBeVisible();
    });
  });
});
