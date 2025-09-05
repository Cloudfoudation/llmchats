# 🎯 LEGAIA Testing Guide

Quick reference for creating realistic test cases in the LEGAIA AI platform.

## 📋 Table of Contents

1. [Test Architecture](#test-architecture)
2. [Test Optimization Patterns](#test-optimization-patterns)
3. [Quick Start Template](#quick-start-template)
4. [Chat Testing](#chat-testing)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## 🏗️ Test Architecture

### Current Test Structure
```
tests/e2e/
├── auth/auth.spec.ts                     ✅ Complete
├── agents/agents.spec.ts                 ✅ Complete  
├── groups/groups.spec.ts                 ✅ Complete
├── knowledge-base/knowledge-base.spec.ts ✅ Complete
├── shared-resources/shared-resources.spec.ts ✅ Complete
├── user-management/user-management.spec.ts ✅ Complete
├── chat/                                 ✅ Optimized
│   ├── model-switching-test.spec.ts      ✅ Complete
│   └── dev-chat-flow.spec.ts            ✅ Complete
└── smoke.spec.ts                        ✅ Complete
```

### Key Infrastructure
- **AuthHelpers**: `loginAsAdmin()`, `loginAsPaidUser()`, `loginAsFreeUser()`
- **TestHelpers**: `clickButton()`, `fillField()`, `waitForElement()`, `takeScreenshot()`
- **Test Data**: Centralized selectors, timeouts, and test constants

## 🔄 Test Optimization Patterns

### Optimized Structure
```typescript
import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { SELECTORS, TIMEOUTS, TEST_PROMPTS } from '../../fixtures/test-data';

test.describe('Feature Tests', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('Focused test case', async ({ page }) => {
    await authHelpers.loginAsPaidUser();
    const result = await helperFunction(page, 'test-data');
    expect(result).toBe(true);
  });
});
```

### Helper Functions Pattern
```typescript
async function sendMessageAndWaitForResponse(
  page: Page, 
  message: string, 
  context: string
): Promise<{sent: boolean, responseReceived: boolean}> {
  try {
    const messageInput = page.locator(SELECTORS.chat.input).first();
    await messageInput.focus();
    await messageInput.fill(message);
    await page.keyboard.press('Enter');

    await testHelpers.waitForElement(
      SELECTORS.chat.messageAssistant + ':last-child', 
      TIMEOUTS.aiResponse
    );
    
    const response = await testHelpers.getTextContent(
      SELECTORS.chat.messageAssistant + ':last-child'
    );
    
    return { 
      sent: true, 
      responseReceived: response && response.length > 5 
    };
  } catch (error) {
    return { sent: false, responseReceived: false };
  }
}
```

## 🚀 Quick Start Template

```typescript
import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestHelpers } from '../../utils/test-helpers';
import { SELECTORS, TIMEOUTS, TEST_PROMPTS } from '../../fixtures/test-data';

test.describe('New Feature Tests', () => {
  let authHelpers: AuthHelpers;
  let testHelpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    testHelpers = new TestHelpers(page);
    await authHelpers.clearSession();
  });

  test('Feature functionality', async ({ page }) => {
    // Step 1: Authenticate
    await authHelpers.loginAsPaidUser();
    
    // Step 2: Navigate
    await testHelpers.clickButton(SELECTORS.nav.featureName);
    
    // Step 3: Perform action
    await testHelpers.fillField('input[name="test"]', 'test data');
    await testHelpers.clickButton(SELECTORS.buttons.save);
    
    // Step 4: Verify
    await testHelpers.waitForToast('Success message');
    expect(await testHelpers.getTextContent('.result')).toContain('expected');
  });
});
```

## 💬 Chat Testing

### Key Selectors
```typescript
export const SELECTORS = {
  chat: {
    input: 'textarea',
    send: 'button:has-text("Send"), button:has-text("Generate")',
    messageAssistant: '.message-assistant',
    modelSelector: 'button[title="Select Model"]'
  }
};
```

### Chat Test Pattern
```typescript
test('Chat functionality', async ({ page }) => {
  await authHelpers.loginAsPaidUser();
  await testHelpers.clickButton('button:has-text("New Chat")');
  
  const result = await sendMessageAndWaitForResponse(
    page, 
    TEST_PROMPTS.simple, 
    'test'
  );
  
  expect(result.sent).toBe(true);
  expect(result.responseReceived).toBe(true);
});
```

### Model Switching
```typescript
async function selectModel(page: Page, model: any): Promise<boolean> {
  try {
    const modelSelectorButtons = [
      'button[title="Select Model"]',
      'button:has([class*="settings"])'
    ];

    for (const selector of modelSelectorButtons) {
      if (await testHelpers.elementExists(selector)) {
        await page.click(selector);
        await page.waitForTimeout(1000);
        
        for (const modelSelector of model.selectors) {
          if (await testHelpers.elementExists(modelSelector)) {
            await page.click(modelSelector);
            return true;
          }
        }
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}
```

## ✅ Best Practices

### Do's
- ✅ Use centralized `SELECTORS`, `TIMEOUTS`, `TEST_PROMPTS`
- ✅ Create reusable helper functions with proper typing
- ✅ Write focused, single-concern tests
- ✅ Use `authHelpers.clearSession()` in beforeEach
- ✅ Handle errors gracefully with try-catch
- ✅ Use multiple fallback selectors

### Don'ts
- ❌ Don't use `page.goto()` for navigation (use click navigation)
- ❌ Don't hardcode selectors in tests
- ❌ Don't write one massive test (split into focused tests)
- ❌ Don't ignore error handling

### Navigation Pattern
```typescript
// ✅ Correct: Use existing navigation
await testHelpers.clickButton(SELECTORS.nav.knowledgeBase);

// ❌ Avoid: Direct page navigation
await page.goto('/knowledge-base');
```

## 🐛 Troubleshooting

### Common Issues

**Authentication Not Working**
```typescript
const authState = await authHelpers.checkAuthState();
if (authState === 'loading') {
  await authHelpers.waitForAuth();
}
```

**Element Not Found**
```typescript
// Use multiple fallback selectors
const createButton = await findElementWithFallbacks(
  testHelpers,
  SELECTORS.buttons.create,
  ['button:has-text("Create")', 'button:has-text("New")']
);
```

**Timeout Issues**
```typescript
// Adjust timeouts for different operations
await testHelpers.waitForElement(selector, TIMEOUTS.aiResponse); // 15s for AI
await testHelpers.waitForElement(selector, TIMEOUTS.medium);     // 10s for UI
```

**Chat Response Issues**
```typescript
// Wait for processing before checking response
await page.waitForTimeout(2000);
await testHelpers.waitForElement(
  SELECTORS.chat.messageAssistant + ':last-child', 
  TIMEOUTS.aiResponse
);
```

## 🎯 Key Test Data

```typescript
export const TEST_PROMPTS = {
  simple: "Hello! Please respond with 'Test successful'.",
  creative: "Write a creative short story about a time traveler...",
  technical: "Explain machine learning in exactly 100 words..."
};

export const TEST_MODELS = [
  {
    name: "Claude 3.5 Haiku",
    selectors: [
      'button:has-text("Claude 3.5 Haiku")',
      'button:has-text("Haiku")'
    ]
  }
];

export const TIMEOUTS = {
  short: 5000,
  medium: 10000,
  long: 30000,
  aiResponse: 15000
};
```

## 🏃 Quick Commands

```bash
# Run specific test
npx playwright test tests/e2e/chat/model-switching-test.spec.ts

# Run with UI
npx playwright test --headed

# Run in one browser
npx playwright test --browser=chromium
```

---

**Key Optimization**: Tests transformed from 157-line procedural code to clean, modular, maintainable test suites with proper error handling and reusable helper functions.