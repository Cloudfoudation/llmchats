import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test.backend' });

/**
 * Enhanced Playwright configuration for automation testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 1,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  
  /* Test timeout to accommodate AI response streaming - 5 minutes */
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '300000'),
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 30000,
  },
  
  /* Reporter configuration for comprehensive reporting */
  reporter: [
    ['html', { 
      outputFolder: 'test-results/html-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['line'],
    ['allure-playwright', { 
      outputFolder: 'test-results/allure-results',
      detail: true,
      suiteTitle: false
    }],
  ],
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/setup/global-setup'),
  globalTeardown: require.resolve('./tests/setup/global-teardown'),
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3030',

    /* Collect trace when retrying the failed test */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: process.env.SCREENSHOT_ON_FAILURE === 'true' ? 'only-on-failure' : 'off',
    
    /* Record video on failure */
    video: process.env.VIDEO_ON_FAILURE === 'true' ? 'retain-on-failure' : 'off',
    
    /* Timeout for AI streaming responses */
    actionTimeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '60000'),
    
    /* Navigation timeout */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors in development */
    ignoreHTTPSErrors: process.env.NODE_ENV === 'test' && !process.env.CI,
    
    /* Additional headers for testing */
    extraHTTPHeaders: {
      'X-Test-Environment': process.env.NEXT_PUBLIC_ENVIRONMENT || 'test',
      'X-Playwright-Test': 'true',
      'X-Test-Run-ID': process.env.TEST_RUN_ID || Date.now().toString(),
    },
    
    /* Locale and timezone */
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    /* Viewport size */
    viewport: { width: 1280, height: 720 },
    
    /* User agent */
    userAgent: 'LEGAIA-Test-Agent/1.0 (Playwright)',
  },

  /* Configure projects for different browsers and scenarios */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    
    // Desktop Chrome - Main testing browser
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security=false',
            '--disable-features=VizDisplayCompositor',
            '--enable-strict-mixed-content-checking',
            '--enable-strict-powerful-feature-restrictions',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ]
        }
      },
      dependencies: ['setup'],
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
      },
      dependencies: ['setup'],
    },

    // Desktop Safari
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
      },
      dependencies: ['setup'],
    },

    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
      },
      dependencies: ['setup'],
    },

    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
      },
      dependencies: ['setup'],
    },

    // API Testing
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        baseURL: process.env.NEXT_PUBLIC_AGENT_MANAGEMENT_API_URL,
      },
    },

    // Performance Testing
    {
      name: 'performance',
      testMatch: /.*\.perf\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
      dependencies: ['setup'],
    },

    // Accessibility Testing
    {
      name: 'accessibility',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },

    // Security Testing
    {
      name: 'security',
      testMatch: /.*\.security\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:test-backend',
    url: 'http://localhost:3030',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
    },
  },

  /* Output directories */
  outputDir: 'test-results/artifacts',
  
  /* Test metadata */
  metadata: {
    testEnvironment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'test',
    testRunId: process.env.TEST_RUN_ID || Date.now().toString(),
    buildVersion: process.env.BUILD_VERSION || 'local',
    testSuite: 'LEGAIA Automation Tests',
  },
});
