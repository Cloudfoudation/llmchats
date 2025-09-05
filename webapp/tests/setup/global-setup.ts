import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Create browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3030';
    console.log(`🔗 Connecting to: ${baseUrl}`);
    
    // Check if server is running first
    try {
      await page.goto(baseUrl, { timeout: 30000 });
    } catch (error) {
      console.error('❌ Server connection failed. Make sure to start the server with: npm run devsg -- --port 3030');
      throw new Error(`Server not accessible at ${baseUrl}. Please start the development server using 'npm run devsg -- --port 3030'`);
    }
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Check if the app is responding
    const title = await page.title();
    console.log(`✅ Application is ready. Title: ${title}`);
    
    // Setup test data if needed
    await setupTestData(page);
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestData(page: any) {
  // This function can be used to set up test data
  // For example, creating test users, knowledge bases, etc.
  console.log('📝 Setting up test data...');
  
  // Add any test data setup logic here
  // For now, we'll just log that we're ready
  console.log('✅ Test data setup completed');
}

export default globalSetup;
