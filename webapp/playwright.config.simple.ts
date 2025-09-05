import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load test backend environment variables
dotenv.config({ path: '.env.test.backend' });

/**
 * Simplified Playwright configuration for single browser testing with separate backend
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Run tests in sequence for better debugging */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry once on failure */
  retries: 1,
  
  /* Single worker for sequential testing */
  workers: 1,
  
  /* Test timeout - 2 minutes for AI responses */
  timeout: 120000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 15000,
  },
  
  /* Simple reporter configuration */
  reporter: [
    ['html', { 
      outputFolder: 'test-results/html-report',
      open: 'on-failure'
    }],
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/setup/global-setup-simple'),
  globalTeardown: require.resolve('./tests/setup/global-teardown-simple'),
  
  /* Shared settings */
  use: {
    /* Base URL for test backend */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3030',

    /* Always collect trace for debugging */
    trace: 'on',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* No video recording to keep it simple */
    video: 'off',
    
    /* Timeout for actions */
    actionTimeout: 30000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors in test environment */
    ignoreHTTPSErrors: true,
    
    /* Test headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'test-backend',
      'X-Test-Browser': 'chromium-only',
    },
    
    /* Locale and timezone */
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    /* Standard desktop viewport */
    viewport: { width: 1280, height: 720 },
  },

  /* Single browser project - Chromium only */
  projects: [
    {
      name: 'chromium-test',
      use: { 
        ...devices['Desktop Chrome'],
        /* Launch options for better debugging */
        launchOptions: {
          headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
          slowMo: process.env.DEBUG_MODE === 'true' ? 500 : 0,
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ]
        }
      },
    },
  ],

  /* Run test backend server before starting tests */
  webServer: {
    command: 'npm run dev:test-backend',
    url: 'http://localhost:3030',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      NODE_ENV: 'test',
    },
  },

  /* Output directory */
  outputDir: 'test-results/artifacts',
});
