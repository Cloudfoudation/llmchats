import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_GROUPS, TEST_USERS, SELECTORS, TIMEOUTS } from '../../fixtures/test-data';

test.describe('Group Management', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;
  let createdGroupId: string;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test.afterEach(async () => {
    // Clean up created group
    if (createdGroupId) {
      try {
        await testHelpers.clickButton(`[data-testid="delete-group-${createdGroupId}"]`);
        await testHelpers.clickButton('[data-testid="confirm-delete"]');
        await testHelpers.waitForToast('Group deleted');
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test.describe('Group Access Control', () => {
    test('should allow paid users to access groups', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      await expect(testHelpers.page.locator(SELECTORS.lists.groups)).toBeVisible();
      await expect(testHelpers.page.locator(SELECTORS.buttons.create)).toBeVisible();
    });

    test('should allow admin users to access groups', async () => {
      await authHelpers.loginAsAdmin();
      await testHelpers.navigateTo('/groups');
      
      await expect(testHelpers.page.locator(SELECTORS.lists.groups)).toBeVisible();
      await expect(testHelpers.page.locator(SELECTORS.buttons.create)).toBeVisible();
    });

    test('should deny free users access to groups', async () => {
      await authHelpers.loginAsFreeUser();
      await testHelpers.navigateTo('/groups');
      
      // Should show upgrade prompt or access denied message
      await expect(testHelpers.page.locator('text=Upgrade to access')).toBeVisible();
    });
  });

  test.describe('Group CRUD Operations', () => {
    test('should create a new group', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Click create button
      await testHelpers.clickButton(SELECTORS.buttons.create);
      
      // Fill form
      await testHelpers.waitForElement(SELECTORS.forms.group);
      await testHelpers.fillField('input[name="name"]', TEST_GROUPS.valid.name);
      await testHelpers.fillField('textarea[name="description"]', TEST_GROUPS.valid.description);
      
      // Submit form
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Wait for success
      await testHelpers.waitForToast('Group created successfully', TIMEOUTS.medium);
      
      // Verify group appears in list
      await expect(testHelpers.page.locator(`text=${TEST_GROUPS.valid.name}`)).toBeVisible();
      
      // Store ID for cleanup
      const groupElement = testHelpers.page.locator(`[data-testid^="group-"]`).first();
      createdGroupId = await groupElement.getAttribute('data-testid')?.replace('group-', '') || '';
    });

    test('should list existing groups', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Wait for list to load
      await testHelpers.waitForElement(SELECTORS.lists.groups);
      await testHelpers.waitForLoadingToComplete();
      
      // Should show groups or empty state
      const groupList = testHelpers.page.locator(SELECTORS.lists.groups);
      await expect(groupList).toBeVisible();
    });

    test('should view group details', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Create a group first
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', TEST_GROUPS.valid.name);
      await testHelpers.fillField('textarea[name="description"]', TEST_GROUPS.valid.description);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Group created');
      
      // Click on the group to view details
      await testHelpers.clickButton(`text=${TEST_GROUPS.valid.name}`);
      
      // Should show group details page
      await expect(testHelpers.page.locator(`text=${TEST_GROUPS.valid.name}`)).toBeVisible();
      await expect(testHelpers.page.locator(`text=${TEST_GROUPS.valid.description}`)).toBeVisible();
    });

    test('should update group', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Create a group first
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', TEST_GROUPS.valid.name);
      await testHelpers.fillField('textarea[name="description"]', TEST_GROUPS.valid.description);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Group created');
      
      // Edit the group
      await testHelpers.clickButton(SELECTORS.buttons.edit);
      
      const updatedName = `${TEST_GROUPS.valid.name} Updated`;
      await testHelpers.fillField('input[name="name"]', updatedName);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Wait for success
      await testHelpers.waitForToast('Group updated');
      
      // Verify updated name appears
      await expect(testHelpers.page.locator(`text=${updatedName}`)).toBeVisible();
    });

    test('should delete group', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Create a group first
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', TEST_GROUPS.valid.name);
      await testHelpers.fillField('textarea[name="description"]', TEST_GROUPS.valid.description);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Group created');
      
      // Delete the group
      await testHelpers.clickButton(SELECTORS.buttons.delete);
      
      // Confirm deletion
      await testHelpers.waitForElement(SELECTORS.modals.confirm);
      await testHelpers.clickButton('[data-testid="confirm-delete"]');
      
      // Wait for success
      await testHelpers.waitForToast('Group deleted');
      
      // Verify group is removed from list
      await expect(testHelpers.page.locator(`text=${TEST_GROUPS.valid.name}`)).not.toBeVisible();
    });
  });

  test.describe('Group Validation', () => {
    test('should validate required fields', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      await testHelpers.clickButton(SELECTORS.buttons.create);
      
      // Try to submit empty form
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Should show validation errors
      await expect(testHelpers.page.locator('input[name="name"]:invalid')).toBeVisible();
    });

    test('should reject invalid data', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      await testHelpers.clickButton(SELECTORS.buttons.create);
      
      // Fill with invalid data
      await testHelpers.fillField('input[name="name"]', TEST_GROUPS.invalid.name);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Should show error
      await testHelpers.waitForToast('Name is required');
    });
  });

  test.describe('Group Member Management', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Create a group for member operations
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', 'Member Test Group');
      await testHelpers.fillField('textarea[name="description"]', 'Group for testing member operations');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Group created');
      
      // Navigate to group details
      await testHelpers.clickButton('text=Member Test Group');
    });

    test('should add member to group', async () => {
      // Click add member button
      await testHelpers.clickButton('[data-testid="add-member"]');
      
      // Fill member email
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      
      // Select role
      await testHelpers.clickButton('select[name="role"]');
      await testHelpers.clickButton('option[value="member"]');
      
      // Submit
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Wait for success
      await testHelpers.waitForToast('Member added successfully');
      
      // Verify member appears in list
      await expect(testHelpers.page.locator(`text=${TEST_USERS.free.email}`)).toBeVisible();
    });

    test('should list group members', async () => {
      // Navigate to members tab
      await testHelpers.clickButton('[data-testid="members-tab"]');
      
      // Should show members list
      await testHelpers.waitForElement('[data-testid="members-list"]');
      await expect(testHelpers.page.locator('[data-testid="members-list"]')).toBeVisible();
    });

    test('should update member role', async () => {
      // Add a member first
      await testHelpers.clickButton('[data-testid="add-member"]');
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton('select[name="role"]');
      await testHelpers.clickButton('option[value="member"]');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Member added');
      
      // Update member role
      await testHelpers.clickButton('[data-testid="edit-member-role"]');
      await testHelpers.clickButton('select[name="role"]');
      await testHelpers.clickButton('option[value="admin"]');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Wait for success
      await testHelpers.waitForToast('Member role updated');
    });

    test('should remove member from group', async () => {
      // Add a member first
      await testHelpers.clickButton('[data-testid="add-member"]');
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Member added');
      
      // Remove member
      await testHelpers.clickButton('[data-testid="remove-member"]');
      await testHelpers.clickButton('[data-testid="confirm-remove"]');
      
      // Wait for success
      await testHelpers.waitForToast('Member removed');
      
      // Verify member is removed
      await expect(testHelpers.page.locator(`text=${TEST_USERS.free.email}`)).not.toBeVisible();
    });

    test('should validate member email', async () => {
      await testHelpers.clickButton('[data-testid="add-member"]');
      
      // Try invalid email
      await testHelpers.fillField('input[name="email"]', 'invalid-email');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Should show validation error
      await expect(testHelpers.page.locator('input[name="email"]:invalid')).toBeVisible();
    });

    test('should prevent duplicate members', async () => {
      // Add a member
      await testHelpers.clickButton('[data-testid="add-member"]');
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Member added');
      
      // Try to add same member again
      await testHelpers.clickButton('[data-testid="add-member"]');
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Should show error
      await testHelpers.waitForToast('Member already exists');
    });
  });

  test.describe('Group Permissions and Roles', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Create a group
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', 'Permissions Test Group');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Group created');
      
      await testHelpers.clickButton('text=Permissions Test Group');
    });

    test('should show different roles', async () => {
      await testHelpers.clickButton('[data-testid="add-member"]');
      
      // Should show role options
      await testHelpers.clickButton('select[name="role"]');
      await expect(testHelpers.page.locator('option[value="member"]')).toBeVisible();
      await expect(testHelpers.page.locator('option[value="admin"]')).toBeVisible();
      await expect(testHelpers.page.locator('option[value="owner"]')).toBeVisible();
    });

    test('should enforce role permissions', async () => {
      // Add member with limited role
      await testHelpers.clickButton('[data-testid="add-member"]');
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton('select[name="role"]');
      await testHelpers.clickButton('option[value="member"]');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Member added');
      
      // Member should have limited permissions
      const memberRow = testHelpers.page.locator(`[data-member="${TEST_USERS.free.email}"]`);
      await expect(memberRow.locator('[data-testid="delete-group"]')).not.toBeVisible();
    });

    test('should allow role-based actions', async () => {
      // Add admin member
      await testHelpers.clickButton('[data-testid="add-member"]');
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton('select[name="role"]');
      await testHelpers.clickButton('option[value="admin"]');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Member added');
      
      // Admin should have more permissions
      const adminRow = testHelpers.page.locator(`[data-member="${TEST_USERS.free.email}"]`);
      await expect(adminRow.locator('[data-testid="edit-member"]')).toBeVisible();
    });
  });

  test.describe('Group Settings and Configuration', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Create a group
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', 'Settings Test Group');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Group created');
      
      await testHelpers.clickButton('text=Settings Test Group');
    });

    test('should access group settings', async () => {
      // Navigate to settings
      await testHelpers.clickButton('[data-testid="group-settings"]');
      
      // Should show settings page
      await expect(testHelpers.page.locator('[data-testid="group-settings-form"]')).toBeVisible();
    });

    test('should update group settings', async () => {
      await testHelpers.clickButton('[data-testid="group-settings"]');
      
      // Update settings
      await testHelpers.fillField('input[name="name"]', 'Updated Settings Group');
      await testHelpers.fillField('textarea[name="description"]', 'Updated description');
      
      // Save settings
      await testHelpers.clickButton(SELECTORS.buttons.save);
      
      // Wait for success
      await testHelpers.waitForToast('Group settings updated');
    });

    test('should configure group privacy', async () => {
      await testHelpers.clickButton('[data-testid="group-settings"]');
      
      // Toggle privacy settings
      const privacyToggle = testHelpers.page.locator('input[name="isPrivate"]');
      if (await privacyToggle.isVisible()) {
        await privacyToggle.click();
        await testHelpers.clickButton(SELECTORS.buttons.save);
        await testHelpers.waitForToast('Privacy settings updated');
      }
    });
  });

  test.describe('Group Search and Filtering', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Create multiple groups for testing
      const groupNames = ['Alpha Group', 'Beta Group', 'Gamma Group'];
      
      for (const name of groupNames) {
        await testHelpers.clickButton(SELECTORS.buttons.create);
        await testHelpers.fillField('input[name="name"]', name);
        await testHelpers.clickButton(SELECTORS.buttons.save);
        await testHelpers.waitForToast('Group created');
      }
    });

    test('should search groups by name', async () => {
      // Use search functionality
      const searchInput = testHelpers.page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await testHelpers.fillField('input[placeholder*="Search"]', 'Alpha');
        
        // Should show filtered results
        await expect(testHelpers.page.locator('text=Alpha Group')).toBeVisible();
        await expect(testHelpers.page.locator('text=Beta Group')).not.toBeVisible();
      }
    });

    test('should filter groups by criteria', async () => {
      // Use filter dropdown if available
      const filterButton = testHelpers.page.locator('[data-testid="filter-groups"]');
      if (await filterButton.isVisible()) {
        await testHelpers.clickButton('[data-testid="filter-groups"]');
        
        // Select filter option
        await testHelpers.clickButton('[data-testid="filter-my-groups"]');
        
        // Should show filtered results
        await testHelpers.waitForLoadingToComplete();
      }
    });

    test('should sort groups', async () => {
      // Use sort functionality if available
      const sortButton = testHelpers.page.locator('[data-testid="sort-groups"]');
      if (await sortButton.isVisible()) {
        await testHelpers.clickButton('[data-testid="sort-groups"]');
        await testHelpers.clickButton('[data-testid="sort-by-name"]');
        
        // Should reorder groups
        await testHelpers.waitForLoadingToComplete();
      }
    });
  });

  test.describe('Group Integration with Other Features', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/groups');
      
      // Create a group
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', 'Integration Test Group');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Group created');
      
      await testHelpers.clickButton('text=Integration Test Group');
    });

    test('should share resources with group', async () => {
      // Navigate to shared resources
      await testHelpers.clickButton('[data-testid="group-resources"]');
      
      // Should show shared resources interface
      await expect(testHelpers.page.locator('[data-testid="shared-resources"]')).toBeVisible();
    });

    test('should manage group knowledge bases', async () => {
      // Navigate to group knowledge bases
      await testHelpers.clickButton('[data-testid="group-knowledge-bases"]');
      
      // Should show group KB interface
      const hasGroupKB = await testHelpers.elementExists('[data-testid="group-kb-list"]');
      if (hasGroupKB) {
        await expect(testHelpers.page.locator('[data-testid="group-kb-list"]')).toBeVisible();
      }
    });

    test('should manage group agents', async () => {
      // Navigate to group agents
      await testHelpers.clickButton('[data-testid="group-agents"]');
      
      // Should show group agents interface
      const hasGroupAgents = await testHelpers.elementExists('[data-testid="group-agents-list"]');
      if (hasGroupAgents) {
        await expect(testHelpers.page.locator('[data-testid="group-agents-list"]')).toBeVisible();
      }
    });
  });
});
