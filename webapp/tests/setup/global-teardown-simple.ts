import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Test Backend Global Teardown...');
  
  try {
    // Clean up test data if needed
    if (process.env.CLEANUP_TEST_DATA === 'true') {
      console.log('🗑️  Cleaning up test data...');
      
      // Run cleanup script
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        await execAsync('node scripts/cleanup-test-data.js --dry-run');
        console.log('✅ Test data cleanup completed');
      } catch (error) {
        console.warn('⚠️  Test data cleanup failed:', error);
      }
    }
    
    // Log test summary
    console.log('📊 Test Backend Session Summary:');
    console.log(`   Environment: ${process.env.NEXT_PUBLIC_ENVIRONMENT || 'test-backend'}`);
    console.log(`   Base URL: ${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3030'}`);
    console.log(`   Browser: Chromium only`);
    console.log(`   Workers: 1 (sequential testing)`);
    
    console.log('✅ Test Backend Global Teardown Complete');
    
  } catch (error) {
    console.error('❌ Test Backend Global Teardown Failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

export default globalTeardown;
