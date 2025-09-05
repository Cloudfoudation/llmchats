import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load test backend environment
dotenv.config({ path: '.env.test.backend' });

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Test Backend Global Setup...');
  
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3030';
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log(`📡 Checking test backend availability at ${baseURL}`);
    
    // Wait for the test backend to be ready
    let retries = 0;
    const maxRetries = 30; // 30 seconds
    
    while (retries < maxRetries) {
      try {
        const response = await page.goto(baseURL, { timeout: 2000 });
        if (response && response.ok()) {
          console.log('✅ Test backend is ready');
          break;
        }
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          throw new Error(`Test backend not available after ${maxRetries} seconds`);
        }
        console.log(`⏳ Waiting for test backend... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Verify test environment configuration
    console.log('🔧 Verifying test environment configuration...');
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_USER_POOL_ID',
      'NEXT_PUBLIC_USER_POOL_CLIENT_ID',
      'NEXT_PUBLIC_IDENTITY_POOL_ID',
      'NEXT_PUBLIC_CONVERSATIONS_TABLE',
      'NEXT_PUBLIC_AGENTS_TABLE'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('Some tests may fail due to missing configuration');
    } else {
      console.log('✅ All required environment variables are set');
    }
    
    // Check if test users are configured
    const testUsers = [
      'TEST_ADMIN_EMAIL',
      'TEST_PAID_EMAIL', 
      'TEST_FREE_EMAIL'
    ];
    
    const missingUsers = testUsers.filter(user => !process.env[user]);
    
    if (missingUsers.length > 0) {
      console.warn(`⚠️  Missing test user credentials: ${missingUsers.join(', ')}`);
      console.warn('Authentication tests may be skipped');
    } else {
      console.log('✅ Test user credentials are configured');
    }
    
    console.log('🎯 Test Backend Global Setup Complete');
    
  } catch (error) {
    console.error('❌ Test Backend Global Setup Failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
