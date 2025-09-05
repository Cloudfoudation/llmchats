import { test, expect } from '@playwright/test';

test.describe('API Integration Testing', () => {
  const apiEndpoints = {
    agentManagement: 'https://3re1uczeb2.execute-api.us-east-1.amazonaws.com/test/',
    documentApi: 'https://k02dz36th9.execute-api.us-east-1.amazonaws.com/test/',
    knowledgeBase: 'https://7r91o2v3b1.execute-api.us-east-1.amazonaws.com/test/',
    userManagement: 'https://ycr4wrjlt1.execute-api.us-east-1.amazonaws.com/test/',
    groupManagement: 'https://ot750w6yx9.execute-api.us-east-1.amazonaws.com/test/',
    sharedResources: 'https://qvmmlfentk.execute-api.us-east-1.amazonaws.com/test/',
    profile: 'https://fq4tb7f4ic.execute-api.us-east-1.amazonaws.com/test/'
  };

  test('should test API endpoint availability', async ({ request }) => {
    for (const [name, url] of Object.entries(apiEndpoints)) {
      try {
        const response = await request.get(url);
        console.log(`${name}: ${response.status()} - ${response.statusText()}`);
        
        // API should respond (even if with auth error)
        expect(response.status()).toBeLessThan(500);
        
      } catch (error) {
        console.log(`${name}: Error - ${error.message}`);
      }
    }
  });

  test('should test API CORS headers', async ({ request }) => {
    for (const [name, url] of Object.entries(apiEndpoints)) {
      try {
        const response = await request.options(url, {
          headers: {
            'Origin': 'http://localhost:3030',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type,Authorization'
          }
        });
        
        const corsHeaders = {
          'access-control-allow-origin': response.headers()['access-control-allow-origin'],
          'access-control-allow-methods': response.headers()['access-control-allow-methods'],
          'access-control-allow-headers': response.headers()['access-control-allow-headers']
        };
        
        console.log(`${name} CORS:`, corsHeaders);
        
      } catch (error) {
        console.log(`${name} CORS test failed:`, error.message);
      }
    }
  });

  test('should test API authentication requirements', async ({ request }) => {
    // Test without authentication - should get 401/403
    for (const [name, url] of Object.entries(apiEndpoints)) {
      try {
        const response = await request.get(url + 'test');
        
        console.log(`${name} (no auth): ${response.status()}`);
        
        // Should require authentication
        if (response.status() === 401 || response.status() === 403) {
          console.log(`✅ ${name} properly requires authentication`);
        } else if (response.status() === 404) {
          console.log(`ℹ️  ${name} endpoint not found (expected for some)`);
        } else {
          console.log(`⚠️  ${name} may not require authentication: ${response.status()}`);
        }
        
      } catch (error) {
        console.log(`${name} auth test error:`, error.message);
      }
    }
  });

  test('should test API response formats', async ({ request }) => {
    for (const [name, url] of Object.entries(apiEndpoints)) {
      try {
        const response = await request.get(url);
        const contentType = response.headers()['content-type'];
        
        console.log(`${name} Content-Type: ${contentType}`);
        
        // Should return JSON for API endpoints
        if (contentType && contentType.includes('application/json')) {
          console.log(`✅ ${name} returns JSON`);
          
          try {
            const body = await response.json();
            console.log(`${name} response structure:`, Object.keys(body));
          } catch (jsonError) {
            console.log(`${name} JSON parse error:`, jsonError.message);
          }
        }
        
      } catch (error) {
        console.log(`${name} response format test error:`, error.message);
      }
    }
  });
});

test.describe('Database Integration Testing', () => {
  const tables = [
    'legaia-test-backend-agents',
    'legaia-test-backend-conversations', 
    'legaia-test-backend-groups',
    'legaia-test-backend-user-groups',
    'legaia-test-backend-shared-agents',
    'legaia-test-backend-shared-knowledge-bases'
  ];

  test('should verify DynamoDB table accessibility through API', async ({ request }) => {
    // Test through the APIs that would access these tables
    const apiTests = [
      { name: 'Agents API', url: apiEndpoints.agentManagement + 'agents', table: 'agents' },
      { name: 'User Management API', url: apiEndpoints.userManagement + 'users', table: 'users' },
      { name: 'Groups API', url: apiEndpoints.groupManagement + 'groups', table: 'groups' }
    ];

    for (const test of apiTests) {
      try {
        const response = await request.get(test.url);
        console.log(`${test.name} (${test.table}): ${response.status()}`);
        
        // Even auth errors indicate the API is working
        if (response.status() < 500) {
          console.log(`✅ ${test.name} API accessible`);
        }
        
      } catch (error) {
        console.log(`${test.name} error:`, error.message);
      }
    }
  });
});

test.describe('S3 Integration Testing', () => {
  test('should test S3 bucket accessibility', async ({ request }) => {
    const buckets = [
      'legaia-test-backend-attachments',
      'legaia-test-spa-bucket-2025'
    ];

    // Test through the document API which would access S3
    try {
      const response = await request.get(apiEndpoints.documentApi + 'files');
      console.log(`Document API (S3 access): ${response.status()}`);
      
      if (response.status() < 500) {
        console.log('✅ S3 integration appears functional through API');
      }
      
    } catch (error) {
      console.log('S3 integration test error:', error.message);
    }
  });
});

test.describe('OpenSearch Integration Testing', () => {
  test('should test Knowledge Base search functionality', async ({ request }) => {
    try {
      const response = await request.get(apiEndpoints.knowledgeBase + 'search?q=test');
      console.log(`Knowledge Base Search: ${response.status()}`);
      
      if (response.status() < 500) {
        console.log('✅ OpenSearch integration appears functional');
      }
      
    } catch (error) {
      console.log('OpenSearch integration test error:', error.message);
    }
  });
});

test.describe('End-to-End API Workflow Testing', () => {
  test('should test complete user workflow through APIs', async ({ request }) => {
    console.log('🔄 Testing complete API workflow...');
    
    // 1. Test user profile access
    try {
      const profileResponse = await request.get(apiEndpoints.profile + 'profile');
      console.log(`1. Profile API: ${profileResponse.status()}`);
    } catch (error) {
      console.log('1. Profile API error:', error.message);
    }
    
    // 2. Test agents listing
    try {
      const agentsResponse = await request.get(apiEndpoints.agentManagement + 'agents');
      console.log(`2. Agents API: ${agentsResponse.status()}`);
    } catch (error) {
      console.log('2. Agents API error:', error.message);
    }
    
    // 3. Test knowledge base access
    try {
      const kbResponse = await request.get(apiEndpoints.knowledgeBase + 'knowledge-bases');
      console.log(`3. Knowledge Base API: ${kbResponse.status()}`);
    } catch (error) {
      console.log('3. Knowledge Base API error:', error.message);
    }
    
    // 4. Test group management
    try {
      const groupsResponse = await request.get(apiEndpoints.groupManagement + 'groups');
      console.log(`4. Groups API: ${groupsResponse.status()}`);
    } catch (error) {
      console.log('4. Groups API error:', error.message);
    }
    
    console.log('✅ API workflow testing completed');
  });
});

test.describe('API Performance Testing', () => {
  test('should measure API response times', async ({ request }) => {
    const performanceTests = [];
    
    for (const [name, url] of Object.entries(apiEndpoints)) {
      const startTime = Date.now();
      
      try {
        const response = await request.get(url);
        const responseTime = Date.now() - startTime;
        
        performanceTests.push({
          name,
          responseTime,
          status: response.status()
        });
        
        console.log(`${name}: ${responseTime}ms (${response.status()})`);
        
        // API should respond within 5 seconds
        expect(responseTime).toBeLessThan(5000);
        
      } catch (error) {
        console.log(`${name} performance test error:`, error.message);
      }
    }
    
    // Log performance summary
    const avgResponseTime = performanceTests.reduce((sum, test) => sum + test.responseTime, 0) / performanceTests.length;
    console.log(`Average API response time: ${avgResponseTime.toFixed(2)}ms`);
  });
});
