import { Page, expect, Locator } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Test utilities for LEGAIA automation testing
 */

// Test data interfaces
export interface TestUser {
  email: string;
  password: string;
  name: string;
  groups: string[];
}

export interface TestConversation {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
}

export interface TestAgent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: string;
}

/**
 * Authentication utilities
 */
export class AuthUtils {
  constructor(private page: Page) {}

  async loginWithGoogle(email: string, password: string) {
    // Navigate to login page
    await this.page.goto('/');
    
    // Click Google sign-in button
    await this.page.click('[data-testid="google-signin-button"]');
    
    // Handle Google OAuth flow
    await this.page.waitForURL('**/auth.us-east-1.amazoncognito.com/**');
    
    // Fill in credentials
    await this.page.fill('input[type="email"]', email);
    await this.page.click('button[type="submit"]');
    
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect back to app
    await this.page.waitForURL('**/auth/callback**');
    await this.page.waitForURL('/');
    
    // Verify login success
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/');
    
    // Verify logout success
    await expect(this.page.locator('[data-testid="google-signin-button"]')).toBeVisible();
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.locator('[data-testid="user-menu"]').waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Chat utilities
 */
export class ChatUtils {
  constructor(private page: Page) {}

  async sendMessage(message: string, waitForResponse: boolean = true) {
    // Type message in chat input
    await this.page.fill('[data-testid="chat-input"]', message);
    
    // Send message
    await this.page.click('[data-testid="send-button"]');
    
    if (waitForResponse) {
      // Wait for AI response to appear
      await this.page.waitForSelector('[data-testid="ai-message"]', { timeout: 60000 });
      
      // Wait for streaming to complete (no loading indicator)
      await this.page.waitForSelector('[data-testid="message-loading"]', { 
        state: 'detached',
        timeout: 120000 
      });
    }
  }

  async getLastMessage(): Promise<string> {
    const messages = await this.page.locator('[data-testid="message-content"]').all();
    if (messages.length === 0) return '';
    
    return await messages[messages.length - 1].textContent() || '';
  }

  async getAllMessages(): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.page.locator('[data-testid="message"]').all();
    const result = [];
    
    for (const message of messages) {
      const role = await message.getAttribute('data-role') || 'unknown';
      const content = await message.locator('[data-testid="message-content"]').textContent() || '';
      result.push({ role, content });
    }
    
    return result;
  }

  async clearChat() {
    await this.page.click('[data-testid="clear-chat-button"]');
    await this.page.click('[data-testid="confirm-clear-button"]');
    
    // Verify chat is cleared
    await expect(this.page.locator('[data-testid="message"]')).toHaveCount(0);
  }

  async createNewConversation(title?: string) {
    await this.page.click('[data-testid="new-conversation-button"]');
    
    if (title) {
      await this.page.fill('[data-testid="conversation-title-input"]', title);
      await this.page.click('[data-testid="save-title-button"]');
    }
    
    // Wait for new conversation to be created
    await this.page.waitForSelector('[data-testid="chat-input"]');
  }

  async selectConversation(title: string) {
    await this.page.click(`[data-testid="conversation-item"][data-title="${title}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async deleteConversation(title: string) {
    const conversationItem = this.page.locator(`[data-testid="conversation-item"][data-title="${title}"]`);
    await conversationItem.hover();
    await conversationItem.locator('[data-testid="delete-conversation-button"]').click();
    await this.page.click('[data-testid="confirm-delete-button"]');
    
    // Verify conversation is deleted
    await expect(conversationItem).not.toBeVisible();
  }
}

/**
 * Agent utilities
 */
export class AgentUtils {
  constructor(private page: Page) {}

  async createAgent(agent: Partial<TestAgent>) {
    await this.page.goto('/agents');
    await this.page.click('[data-testid="create-agent-button"]');
    
    // Fill agent details
    if (agent.name) {
      await this.page.fill('[data-testid="agent-name-input"]', agent.name);
    }
    
    if (agent.description) {
      await this.page.fill('[data-testid="agent-description-input"]', agent.description);
    }
    
    if (agent.instructions) {
      await this.page.fill('[data-testid="agent-instructions-input"]', agent.instructions);
    }
    
    if (agent.model) {
      await this.page.selectOption('[data-testid="agent-model-select"]', agent.model);
    }
    
    // Save agent
    await this.page.click('[data-testid="save-agent-button"]');
    
    // Wait for agent to be created
    await this.page.waitForSelector('[data-testid="agent-created-success"]');
  }

  async deleteAgent(name: string) {
    await this.page.goto('/agents');
    
    const agentItem = this.page.locator(`[data-testid="agent-item"][data-name="${name}"]`);
    await agentItem.hover();
    await agentItem.locator('[data-testid="delete-agent-button"]').click();
    await this.page.click('[data-testid="confirm-delete-button"]');
    
    // Verify agent is deleted
    await expect(agentItem).not.toBeVisible();
  }

  async selectAgent(name: string) {
    await this.page.goto('/agents');
    await this.page.click(`[data-testid="agent-item"][data-name="${name}"]`);
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Knowledge Base utilities
 */
export class KnowledgeBaseUtils {
  constructor(private page: Page) {}

  async createKnowledgeBase(name: string, description?: string) {
    await this.page.goto('/knowledge-base');
    await this.page.click('[data-testid="create-kb-button"]');
    
    await this.page.fill('[data-testid="kb-name-input"]', name);
    
    if (description) {
      await this.page.fill('[data-testid="kb-description-input"]', description);
    }
    
    await this.page.click('[data-testid="save-kb-button"]');
    await this.page.waitForSelector('[data-testid="kb-created-success"]');
  }

  async uploadDocument(kbName: string, filePath: string) {
    await this.page.goto('/knowledge-base');
    await this.page.click(`[data-testid="kb-item"][data-name="${kbName}"]`);
    
    // Upload file
    const fileInput = this.page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await this.page.waitForSelector('[data-testid="upload-success"]', { timeout: 60000 });
  }

  async deleteKnowledgeBase(name: string) {
    await this.page.goto('/knowledge-base');
    
    const kbItem = this.page.locator(`[data-testid="kb-item"][data-name="${name}"]`);
    await kbItem.hover();
    await kbItem.locator('[data-testid="delete-kb-button"]').click();
    await this.page.click('[data-testid="confirm-delete-button"]');
    
    // Verify KB is deleted
    await expect(kbItem).not.toBeVisible();
  }
}

/**
 * Wait utilities
 */
export class WaitUtils {
  constructor(private page: Page) {}

  async waitForAIResponse(timeout: number = 120000) {
    // Wait for AI response to start
    await this.page.waitForSelector('[data-testid="message-loading"]', { timeout: 10000 });
    
    // Wait for AI response to complete
    await this.page.waitForSelector('[data-testid="message-loading"]', { 
      state: 'detached',
      timeout 
    });
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('[data-testid="page-loaded"]', { timeout: 30000 });
  }

  async waitForApiCall(urlPattern: string, timeout: number = 30000) {
    return await this.page.waitForResponse(
      response => response.url().includes(urlPattern) && response.status() === 200,
      { timeout }
    );
  }
}

/**
 * Data utilities
 */
export class DataUtils {
  static loadTestUsers(): Record<string, TestUser> {
    const filePath = join(process.cwd(), 'test-data/fixtures/users.json');
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  static loadTestConversations(): TestConversation[] {
    const filePath = join(process.cwd(), 'test-data/fixtures/conversations.json');
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  static generateUniqueId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateTestEmail(): string {
    return `test-${this.generateUniqueId()}@example.com`;
  }

  static async cleanupTestData(page: Page) {
    // Clean up test conversations
    await page.goto('/conversations');
    const testConversations = await page.locator('[data-testid="conversation-item"][data-title*="test"]').all();
    
    for (const conversation of testConversations) {
      await conversation.hover();
      await conversation.locator('[data-testid="delete-conversation-button"]').click();
      await page.click('[data-testid="confirm-delete-button"]');
    }

    // Clean up test agents
    await page.goto('/agents');
    const testAgents = await page.locator('[data-testid="agent-item"][data-name*="test"]').all();
    
    for (const agent of testAgents) {
      await agent.hover();
      await agent.locator('[data-testid="delete-agent-button"]').click();
      await page.click('[data-testid="confirm-delete-button"]');
    }

    // Clean up test knowledge bases
    await page.goto('/knowledge-base');
    const testKBs = await page.locator('[data-testid="kb-item"][data-name*="test"]').all();
    
    for (const kb of testKBs) {
      await kb.hover();
      await kb.locator('[data-testid="delete-kb-button"]').click();
      await page.click('[data-testid="confirm-delete-button"]');
    }
  }
}

/**
 * Assertion utilities
 */
export class AssertionUtils {
  static async assertMessageContains(page: Page, content: string) {
    const lastMessage = await page.locator('[data-testid="message-content"]').last();
    await expect(lastMessage).toContainText(content);
  }

  static async assertConversationExists(page: Page, title: string) {
    await page.goto('/conversations');
    await expect(page.locator(`[data-testid="conversation-item"][data-title="${title}"]`)).toBeVisible();
  }

  static async assertAgentExists(page: Page, name: string) {
    await page.goto('/agents');
    await expect(page.locator(`[data-testid="agent-item"][data-name="${name}"]`)).toBeVisible();
  }

  static async assertKnowledgeBaseExists(page: Page, name: string) {
    await page.goto('/knowledge-base');
    await expect(page.locator(`[data-testid="kb-item"][data-name="${name}"]`)).toBeVisible();
  }

  static async assertResponseTime(page: Page, maxTime: number) {
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: maxTime });
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(maxTime);
  }
}

/**
 * Performance utilities
 */
export class PerformanceUtils {
  constructor(private page: Page) {}

  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async measureAIResponseTime(message: string): Promise<number> {
    const startTime = Date.now();
    
    // Send message
    await this.page.fill('[data-testid="chat-input"]', message);
    await this.page.click('[data-testid="send-button"]');
    
    // Wait for response
    await this.page.waitForSelector('[data-testid="ai-message"]');
    await this.page.waitForSelector('[data-testid="message-loading"]', { state: 'detached' });
    
    return Date.now() - startTime;
  }

  async getMemoryUsage(): Promise<any> {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
  }
}

/**
 * Security utilities
 */
export class SecurityUtils {
  constructor(private page: Page) {}

  async testXSSProtection(input: string) {
    await this.page.fill('[data-testid="chat-input"]', input);
    await this.page.click('[data-testid="send-button"]');
    
    // Verify XSS payload is not executed
    const alertPromise = this.page.waitForEvent('dialog', { timeout: 5000 }).catch(() => null);
    const alert = await alertPromise;
    
    expect(alert).toBeNull();
  }

  async testCSRFProtection() {
    // Attempt to make request without proper CSRF token
    const response = await this.page.request.post('/api/conversations', {
      data: { title: 'Test Conversation' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Should be rejected due to missing CSRF protection
    expect(response.status()).toBeGreaterThanOrEqual(400);
  }

  async testAuthenticationRequired(protectedUrl: string) {
    // Clear authentication
    await this.page.context().clearCookies();
    await this.page.goto(protectedUrl);
    
    // Should redirect to login
    await expect(this.page).toHaveURL(/.*auth.*/);
  }
}

// Export all utilities
export {
  AuthUtils,
  ChatUtils,
  AgentUtils,
  KnowledgeBaseUtils,
  WaitUtils,
  DataUtils,
  AssertionUtils,
  PerformanceUtils,
  SecurityUtils,
};
