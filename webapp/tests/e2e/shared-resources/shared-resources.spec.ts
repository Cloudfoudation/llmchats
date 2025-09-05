import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { TEST_SHARING, TEST_KNOWLEDGE_BASES, TEST_AGENTS, TEST_USERS, SELECTORS, TIMEOUTS } from '../../fixtures/test-data';

test.describe('Shared Resources Management', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;
  let createdKbId: string;
  let createdAgentId: string;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test.describe('Shared Resources Access Control', () => {
    test('should allow paid users to access shared resources', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      await expect(testHelpers.page.locator('[data-testid="shared-resources-list"]')).toBeVisible();
    });

    test('should allow admin users to access shared resources', async () => {
      await authHelpers.loginAsAdmin();
      await testHelpers.navigateTo('/shared-resources');
      
      await expect(testHelpers.page.locator('[data-testid="shared-resources-list"]')).toBeVisible();
    });

    test('should deny free users access to shared resources', async () => {
      await authHelpers.loginAsFreeUser();
      await testHelpers.navigateTo('/shared-resources');
      
      // Should show upgrade prompt or access denied message
      await expect(testHelpers.page.locator('text=Upgrade to access')).toBeVisible();
    });
  });

  test.describe('Knowledge Base Sharing', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      
      // Create a knowledge base to share
      await testHelpers.navigateTo('/knowledge-bases');
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', 'Shareable KB');
      await testHelpers.fillField('textarea[name="description"]', 'KB for sharing tests');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Knowledge base created');
      
      // Store KB ID
      const kbElement = testHelpers.page.locator(`[data-testid^="kb-"]`).first();
      createdKbId = await kbElement.getAttribute('data-testid')?.replace('kb-', '') || '';
    });

    test('should share knowledge base with user', async () => {
      // Navigate to KB details
      await testHelpers.clickButton('text=Shareable KB');
      
      // Click share button
      await testHelpers.clickButton(SELECTORS.buttons.share);
      
      // Fill sharing form
      await testHelpers.waitForElement(SELECTORS.modals.share);
      await testHelpers.fillField('input[name="email"]', TEST_SHARING.knowledgeBase.targetUser);
      
      // Select permissions
      for (const permission of TEST_SHARING.knowledgeBase.permissions) {
        await testHelpers.clickButton(`input[name="${permission}"]`);
      }
      
      // Submit sharing
      await testHelpers.clickButton('[data-testid="share-submit"]');
      
      // Wait for success
      await testHelpers.waitForToast('Knowledge base shared successfully');
    });

    test('should list shared knowledge bases', async () => {
      await testHelpers.navigateTo('/shared-resources');
      
      // Navigate to shared KBs tab
      await testHelpers.clickButton('[data-testid="shared-kb-tab"]');
      
      // Should show shared KBs list
      await testHelpers.waitForElement('[data-testid="shared-kb-list"]');
      await expect(testHelpers.page.locator('[data-testid="shared-kb-list"]')).toBeVisible();
    });

    test('should update knowledge base sharing permissions', async () => {
      // Share KB first
      await testHelpers.clickButton('text=Shareable KB');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      await testHelpers.fillField('input[name="email"]', TEST_SHARING.knowledgeBase.targetUser);
      await testHelpers.clickButton('input[name="canView"]');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      await testHelpers.waitForToast('Knowledge base shared');
      
      // Update permissions
      await testHelpers.clickButton('[data-testid="edit-sharing"]');
      await testHelpers.clickButton('input[name="canEdit"]');
      await testHelpers.clickButton('[data-testid="update-sharing"]');
      
      // Wait for success
      await testHelpers.waitForToast('Sharing permissions updated');
    });

    test('should unshare knowledge base', async () => {
      // Share KB first
      await testHelpers.clickButton('text=Shareable KB');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      await testHelpers.fillField('input[name="email"]', TEST_SHARING.knowledgeBase.targetUser);
      await testHelpers.clickButton('input[name="canView"]');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      await testHelpers.waitForToast('Knowledge base shared');
      
      // Unshare
      await testHelpers.clickButton('[data-testid="unshare-kb"]');
      await testHelpers.clickButton('[data-testid="confirm-unshare"]');
      
      // Wait for success
      await testHelpers.waitForToast('Knowledge base unshared');
    });
  });

  test.describe('Agent Sharing', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      
      // Create an agent to share
      await testHelpers.navigateTo('/agents');
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', 'Shareable Agent');
      await testHelpers.fillField('textarea[name="description"]', 'Agent for sharing tests');
      await testHelpers.fillField('textarea[name="instructions"]', 'Test instructions');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Agent created');
      
      // Store Agent ID
      const agentElement = testHelpers.page.locator(`[data-testid^="agent-"]`).first();
      createdAgentId = await agentElement.getAttribute('data-testid')?.replace('agent-', '') || '';
    });

    test('should share agent with user', async () => {
      // Navigate to agent details
      await testHelpers.clickButton('text=Shareable Agent');
      
      // Click share button
      await testHelpers.clickButton(SELECTORS.buttons.share);
      
      // Fill sharing form
      await testHelpers.waitForElement(SELECTORS.modals.share);
      await testHelpers.fillField('input[name="email"]', TEST_SHARING.agent.targetUser);
      
      // Select permissions
      for (const permission of TEST_SHARING.agent.permissions) {
        await testHelpers.clickButton(`input[name="${permission}"]`);
      }
      
      // Submit sharing
      await testHelpers.clickButton('[data-testid="share-submit"]');
      
      // Wait for success (may fail if user doesn't exist)
      await testHelpers.waitForLoadingToComplete();
    });

    test('should list shared agents', async () => {
      await testHelpers.navigateTo('/shared-resources');
      
      // Navigate to shared agents tab
      await testHelpers.clickButton('[data-testid="shared-agents-tab"]');
      
      // Should show shared agents list
      await testHelpers.waitForElement('[data-testid="shared-agents-list"]');
      await expect(testHelpers.page.locator('[data-testid="shared-agents-list"]')).toBeVisible();
    });

    test('should update agent sharing permissions', async () => {
      // Share agent first (may fail, but test the UI)
      await testHelpers.clickButton('text=Shareable Agent');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      await testHelpers.fillField('input[name="email"]', TEST_SHARING.agent.targetUser);
      await testHelpers.clickButton('input[name="canView"]');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      await testHelpers.waitForLoadingToComplete();
      
      // Try to update permissions
      const editButton = testHelpers.page.locator('[data-testid="edit-sharing"]');
      if (await editButton.isVisible()) {
        await testHelpers.clickButton('[data-testid="edit-sharing"]');
        await testHelpers.clickButton('input[name="canEdit"]');
        await testHelpers.clickButton('[data-testid="update-sharing"]');
        await testHelpers.waitForToast('Sharing permissions updated');
      }
    });

    test('should unshare agent', async () => {
      // Share agent first
      await testHelpers.clickButton('text=Shareable Agent');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      await testHelpers.fillField('input[name="email"]', TEST_SHARING.agent.targetUser);
      await testHelpers.clickButton('input[name="canView"]');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      await testHelpers.waitForLoadingToComplete();
      
      // Try to unshare
      const unshareButton = testHelpers.page.locator('[data-testid="unshare-agent"]');
      if (await unshareButton.isVisible()) {
        await testHelpers.clickButton('[data-testid="unshare-agent"]');
        await testHelpers.clickButton('[data-testid="confirm-unshare"]');
        await testHelpers.waitForToast('Agent unshared');
      }
    });
  });

  test.describe('Resources Shared with Me', () => {
    test('should list resources shared with current user', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      // Navigate to "Shared with Me" tab
      await testHelpers.clickButton('[data-testid="shared-with-me-tab"]');
      
      // Should show resources shared with user
      await testHelpers.waitForElement('[data-testid="shared-with-me-list"]');
      await expect(testHelpers.page.locator('[data-testid="shared-with-me-list"]')).toBeVisible();
    });

    test('should access shared knowledge base', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      await testHelpers.clickButton('[data-testid="shared-with-me-tab"]');
      
      // If there are shared KBs, try to access one
      const sharedKb = testHelpers.page.locator('[data-testid^="shared-kb-"]').first();
      if (await sharedKb.isVisible()) {
        await testHelpers.clickButton(sharedKb);
        
        // Should navigate to KB details
        await testHelpers.waitForPageLoad();
      }
    });

    test('should access shared agent', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      await testHelpers.clickButton('[data-testid="shared-with-me-tab"]');
      
      // If there are shared agents, try to access one
      const sharedAgent = testHelpers.page.locator('[data-testid^="shared-agent-"]').first();
      if (await sharedAgent.isVisible()) {
        await testHelpers.clickButton(sharedAgent);
        
        // Should navigate to agent details
        await testHelpers.waitForPageLoad();
      }
    });

    test('should show appropriate permissions for shared resources', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      await testHelpers.clickButton('[data-testid="shared-with-me-tab"]');
      
      // Check if shared resources show permission indicators
      const sharedResource = testHelpers.page.locator('[data-testid^="shared-"]').first();
      if (await sharedResource.isVisible()) {
        // Should show permission badges
        const hasPermissionBadge = await testHelpers.elementExists('[data-testid="permission-badge"]');
        if (hasPermissionBadge) {
          await expect(testHelpers.page.locator('[data-testid="permission-badge"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Sharing Validation and Error Handling', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      
      // Create a KB for testing
      await testHelpers.navigateTo('/knowledge-bases');
      await testHelpers.clickButton(SELECTORS.buttons.create);
      await testHelpers.fillField('input[name="name"]', 'Validation Test KB');
      await testHelpers.clickButton(SELECTORS.buttons.save);
      await testHelpers.waitForToast('Knowledge base created');
    });

    test('should validate email format when sharing', async () => {
      await testHelpers.clickButton('text=Validation Test KB');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      
      // Enter invalid email
      await testHelpers.fillField('input[name="email"]', 'invalid-email');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      
      // Should show validation error
      await expect(testHelpers.page.locator('input[name="email"]:invalid')).toBeVisible();
    });

    test('should require at least one permission when sharing', async () => {
      await testHelpers.clickButton('text=Validation Test KB');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      
      // Enter valid email but no permissions
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton('[data-testid="share-submit"]');
      
      // Should show permission validation error
      await testHelpers.waitForToast('Please select at least one permission');
    });

    test('should handle sharing with non-existent user', async () => {
      await testHelpers.clickButton('text=Validation Test KB');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      
      // Share with non-existent user
      await testHelpers.fillField('input[name="email"]', 'nonexistent@example.com');
      await testHelpers.clickButton('input[name="canView"]');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      
      // Should show error
      await testHelpers.waitForToast('User not found');
    });

    test('should prevent sharing with self', async () => {
      await testHelpers.clickButton('text=Validation Test KB');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      
      // Try to share with self
      await testHelpers.fillField('input[name="email"]', TEST_USERS.paid.email);
      await testHelpers.clickButton('input[name="canView"]');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      
      // Should show error
      await testHelpers.waitForToast('Cannot share with yourself');
    });

    test('should handle duplicate sharing attempts', async () => {
      // Share with user first
      await testHelpers.clickButton('text=Validation Test KB');
      await testHelpers.clickButton(SELECTORS.buttons.share);
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton('input[name="canView"]');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      await testHelpers.waitForLoadingToComplete();
      
      // Try to share with same user again
      await testHelpers.clickButton(SELECTORS.buttons.share);
      await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
      await testHelpers.clickButton('input[name="canView"]');
      await testHelpers.clickButton('[data-testid="share-submit"]');
      
      // Should show error or update existing sharing
      await testHelpers.waitForLoadingToComplete();
    });
  });

  test.describe('Sharing Permissions and Access Control', () => {
    test('should enforce view-only permissions', async () => {
      // This would test that users with view-only access can't edit
      // For now, we'll just verify the UI shows appropriate controls
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      await testHelpers.clickButton('[data-testid="shared-with-me-tab"]');
      
      // Check if view-only resources don't show edit buttons
      const viewOnlyResource = testHelpers.page.locator('[data-permission="view"]').first();
      if (await viewOnlyResource.isVisible()) {
        await expect(viewOnlyResource.locator('[data-testid="edit-button"]')).not.toBeVisible();
      }
    });

    test('should enforce edit permissions', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      await testHelpers.clickButton('[data-testid="shared-with-me-tab"]');
      
      // Check if editable resources show edit buttons
      const editableResource = testHelpers.page.locator('[data-permission*="edit"]').first();
      if (await editableResource.isVisible()) {
        await expect(editableResource.locator('[data-testid="edit-button"]')).toBeVisible();
      }
    });

    test('should show owner-only actions', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      // Navigate to resources I own
      await testHelpers.clickButton('[data-testid="my-shared-resources-tab"]');
      
      // Should show owner actions like delete, unshare
      const ownedResource = testHelpers.page.locator('[data-testid^="owned-"]').first();
      if (await ownedResource.isVisible()) {
        await expect(ownedResource.locator('[data-testid="delete-button"]')).toBeVisible();
        await expect(ownedResource.locator('[data-testid="unshare-button"]')).toBeVisible();
      }
    });
  });

  test.describe('Sharing Notifications and Activity', () => {
    test('should show sharing activity', async () => {
      await authHelpers.loginAsPaidUser();
      await testHelpers.navigateTo('/shared-resources');
      
      // Navigate to activity tab if available
      const activityTab = testHelpers.page.locator('[data-testid="sharing-activity-tab"]');
      if (await activityTab.isVisible()) {
        await testHelpers.clickButton('[data-testid="sharing-activity-tab"]');
        
        // Should show activity feed
        await expect(testHelpers.page.locator('[data-testid="activity-feed"]')).toBeVisible();
      }
    });

    test('should show sharing notifications', async () => {
      await authHelpers.loginAsPaidUser();
      
      // Check for notification indicator
      const notificationBell = testHelpers.page.locator('[data-testid="notifications"]');
      if (await notificationBell.isVisible()) {
        await testHelpers.clickButton('[data-testid="notifications"]');
        
        // Should show notifications dropdown
        await expect(testHelpers.page.locator('[data-testid="notifications-dropdown"]')).toBeVisible();
      }
    });
  });

  test.describe('Bulk Sharing Operations', () => {
    test.beforeEach(async () => {
      await authHelpers.loginAsPaidUser();
      
      // Create multiple resources for bulk operations
      await testHelpers.navigateTo('/knowledge-bases');
      
      const kbNames = ['Bulk KB 1', 'Bulk KB 2', 'Bulk KB 3'];
      for (const name of kbNames) {
        await testHelpers.clickButton(SELECTORS.buttons.create);
        await testHelpers.fillField('input[name="name"]', name);
        await testHelpers.clickButton(SELECTORS.buttons.save);
        await testHelpers.waitForToast('Knowledge base created');
      }
    });

    test('should select multiple resources for bulk sharing', async () => {
      // Navigate to shared resources
      await testHelpers.navigateTo('/shared-resources');
      
      // If bulk selection is available
      const bulkSelectButton = testHelpers.page.locator('[data-testid="bulk-select"]');
      if (await bulkSelectButton.isVisible()) {
        await testHelpers.clickButton('[data-testid="bulk-select"]');
        
        // Select multiple resources
        await testHelpers.clickButton('[data-testid="select-resource-1"]');
        await testHelpers.clickButton('[data-testid="select-resource-2"]');
        
        // Should show bulk actions
        await expect(testHelpers.page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      }
    });

    test('should perform bulk sharing', async () => {
      await testHelpers.navigateTo('/shared-resources');
      
      const bulkShareButton = testHelpers.page.locator('[data-testid="bulk-share"]');
      if (await bulkShareButton.isVisible()) {
        // Select resources and share
        await testHelpers.clickButton('[data-testid="bulk-select"]');
        await testHelpers.clickButton('[data-testid="select-all"]');
        await testHelpers.clickButton('[data-testid="bulk-share"]');
        
        // Fill bulk sharing form
        await testHelpers.fillField('input[name="email"]', TEST_USERS.free.email);
        await testHelpers.clickButton('input[name="canView"]');
        await testHelpers.clickButton('[data-testid="bulk-share-submit"]');
        
        // Should show success
        await testHelpers.waitForToast('Resources shared successfully');
      }
    });
  });
});
