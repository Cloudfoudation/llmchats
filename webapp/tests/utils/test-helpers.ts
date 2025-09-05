import { Page, expect } from '@playwright/test';

export class TestHelpers {
  private stepCounter = 0;
  private testName = '';

  constructor(private page: Page) {}

  /**
   * Initialize test with name for screenshot naming
   */
  initializeTest(testName: string) {
    this.testName = testName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    this.stepCounter = 0;
  }

  /**
   * Take screenshot for a specific step with detailed naming
   */
  async takeStepScreenshot(stepDescription: string, fullPage = true) {
    this.stepCounter++;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${this.testName}-step-${this.stepCounter.toString().padStart(2, '0')}-${stepDescription.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${timestamp}`;
    
    const screenshotPath = `test-results/screenshots/${fileName}.png`;
    
    try {
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: fullPage 
      });
      console.log(`📸 Screenshot taken: Step ${this.stepCounter} - ${stepDescription}`);
      return screenshotPath;
    } catch (error) {
      console.error(`❌ Failed to take screenshot for step ${this.stepCounter}:`, error);
      return null;
    }
  }

  /**
   * Take screenshot with current URL and page info
   */
  async takeStepScreenshotWithInfo(stepDescription: string, additionalInfo?: string) {
    const currentUrl = this.page.url();
    const pageTitle = await this.page.title().catch(() => 'Unknown Title');
    
    console.log(`📸 Step ${this.stepCounter + 1}: ${stepDescription}`);
    console.log(`🔗 URL: ${currentUrl}`);
    console.log(`📄 Title: ${pageTitle}`);
    if (additionalInfo) {
      console.log(`ℹ️ Info: ${additionalInfo}`);
    }
    
    return await this.takeStepScreenshot(stepDescription);
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for element to be visible and stable
   */
  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
    await this.page.waitForTimeout(100); // Small delay for stability
  }

  /**
   * Fill form field with validation
   */
  async fillField(selector: string, value: string) {
    await this.waitForElement(selector);
    
    // Handle multiple elements by using first() if selector matches multiple
    const locator = this.page.locator(selector);
    const count = await locator.count();
    
    if (count > 1) {
      console.log(`⚠️ Selector "${selector}" matched ${count} elements, using first one`);
      await locator.first().fill(value);
      await expect(locator.first()).toHaveValue(value);
    } else {
      await this.page.fill(selector, value);
      await expect(locator).toHaveValue(value);
    }
  }

  /**
   * Fill form field with screenshot
   */
  async fillFieldWithStep(selector: string, value: string, fieldName: string) {
    console.log(`📝 Filling ${fieldName} field with: ${value}`);
    await this.fillField(selector, value);
    await this.takeStepScreenshot(`Fill ${fieldName} field`);
  }

  /**
   * Click button and wait for action to complete
   */
  async clickButton(selector: string) {
    await this.waitForElement(selector);
    await this.page.click(selector);
    await this.page.waitForTimeout(500); // Wait for click to register
  }

  /**
   * Close modal by clicking outside of it
   */
  async closeModalByClickingOutside() {
    console.log('🚪 Closing modal by clicking outside...');
    // Click on the backdrop/overlay area (usually top-left corner works well)
    await this.page.click('body', { position: { x: 10, y: 10 } });
    await this.page.waitForTimeout(500); // Wait for modal to close
  }

  /**
   * Close modal using the proper close button
   */
  async closeModal() {
    console.log('🚪 Closing modal using close button...');
    
    // Try the visible close button first (not the mobile-hidden one)
    const hasVisibleCloseButton = await this.elementExists('button[aria-label="Close"]:not(.lg\\:hidden)');
    if (hasVisibleCloseButton) {
      await this.clickButton('button[aria-label="Close"]:not(.lg\\:hidden)');
      await this.page.waitForTimeout(500);
      return;
    }
    
    // Try any close button that's actually visible
    const visibleCloseButtons = await this.page.locator('button[aria-label="Close"]').all();
    for (const button of visibleCloseButtons) {
      const isVisible = await button.isVisible();
      if (isVisible) {
        await button.click();
        await this.page.waitForTimeout(500);
        console.log('✅ Clicked visible close button');
        return;
      }
    }
    
    // Fallback to click outside if no visible close button found
    console.log('🚪 No visible close button found, falling back to click outside...');
    await this.closeModalByClickingOutside();
  }

  /**
   * Click button with screenshot
   */
  async clickButtonWithStep(selector: string, buttonName: string) {
    console.log(`🖱️ Clicking ${buttonName} button`);
    await this.takeStepScreenshot(`Before clicking ${buttonName}`);
    await this.clickButton(selector);
    await this.page.waitForTimeout(1000); // Extra wait for UI changes
    await this.takeStepScreenshot(`After clicking ${buttonName}`);
  }

  /**
   * Wait for toast/alert message
   */
  async waitForToast(message?: string, timeout = 5000) {
    const toastSelector = '[data-testid="toast"], .toast, [role="alert"]';
    await this.page.waitForSelector(toastSelector, { timeout });
    
    if (message) {
      await expect(this.page.locator(toastSelector)).toContainText(message);
    }
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingToComplete() {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[aria-label="Loading"]'
    ];

    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'hidden', timeout: 1000 });
      } catch {
        // Ignore if selector doesn't exist
      }
    }
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check for common authenticated state indicators
      const authIndicators = [
        '[data-testid="user-menu"]',
        '[data-testid="logout-button"]',
        '.user-avatar',
        '[aria-label="User menu"]'
      ];

      for (const selector of authIndicators) {
        if (await this.page.locator(selector).isVisible()) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Navigate to page and wait for load with screenshot
   */
  async navigateTo(path: string, takeScreenshot = true) {
    await this.page.goto(path);
    await this.waitForPageLoad();
    
    if (takeScreenshot) {
      await this.takeStepScreenshotWithInfo(`Navigate to ${path}`);
    }
  }

  /**
   * Enhanced navigation with step logging
   */
  async navigateToWithStep(path: string, stepDescription: string) {
    console.log(`🧭 ${stepDescription}`);
    await this.page.goto(path);
    await this.waitForPageLoad();
    await this.takeStepScreenshotWithInfo(stepDescription);
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout = 10000) {
    return await this.page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * Mock API response
   */
  async mockApiResponse(urlPattern: string | RegExp, response: any, status = 200) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Clear all cookies and local storage
   */
  async clearSession() {
    await this.page.context().clearCookies();
    try {
      await this.page.evaluate(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      });
    } catch (error) {
      // Ignore localStorage errors - might not be available in some contexts
      console.log('⚠️ Could not clear storage:', error.message);
    }
  }

  /**
   * Set viewport size
   */
  async setViewport(width: number, height: number) {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * Scroll element into view
   */
  async scrollIntoView(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Wait for text to appear
   */
  async waitForText(text: string, timeout = 10000) {
    await this.page.waitForSelector(`text=${text}`, { timeout });
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).count() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get element text content
   */
  async getTextContent(selector: string): Promise<string> {
    await this.waitForElement(selector);
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * Upload file
   */
  async uploadFile(inputSelector: string, filePath: string) {
    await this.page.setInputFiles(inputSelector, filePath);
  }

  /**
   * Download file and return path
   */
  async downloadFile(triggerSelector: string): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.clickButton(triggerSelector);
    const download = await downloadPromise;
    const path = `test-results/downloads/${download.suggestedFilename()}`;
    await download.saveAs(path);
    return path;
  }
}
