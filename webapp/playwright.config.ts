import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Test timeout to accommodate AI response streaming - 5 minutes */
  timeout: 300000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['line']
  ],
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/setup/global-setup'),
  globalTeardown: require.resolve('./tests/setup/global-teardown'),
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3030',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Timeout for AI streaming responses - 60s for complete response */
    actionTimeout: 60000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
    
    /* SECURITY: Only ignore HTTPS errors in development environment */
    ignoreHTTPSErrors: process.env.NODE_ENV === 'development' && !process.env.CI,
    
    /* Additional security headers for testing */
    extraHTTPHeaders: {
      'X-Test-Environment': process.env.NODE_ENV || 'test',
      'X-Playwright-Test': 'true'
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        /* Security: Enable additional Chrome security features */
        launchOptions: {
          args: [
            '--disable-web-security=false',
            '--disable-features=VizDisplayCompositor',
            '--enable-strict-mixed-content-checking',
            '--enable-strict-powerful-feature-restrictions'
          ]
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run devsg -- --port 3030',
    url: 'http://localhost:3030',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
