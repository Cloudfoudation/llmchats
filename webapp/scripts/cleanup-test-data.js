#!/usr/bin/env node

/**
 * Test Data Cleanup Script
 * Cleans up test data from DynamoDB tables and S3 buckets
 */

const { DynamoDBClient, ScanCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.test.local' });

const region = process.env.NEXT_PUBLIC_REGION || 'us-east-1';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region });
const s3Client = new S3Client({ region });

// Configuration
const config = {
  tables: {
    conversations: process.env.NEXT_PUBLIC_CONVERSATIONS_TABLE,
    agents: process.env.NEXT_PUBLIC_AGENTS_TABLE,
    groups: process.env.NEXT_PUBLIC_GROUPS_TABLE,
    userGroups: process.env.NEXT_PUBLIC_USER_GROUPS_TABLE,
    sharedAgents: process.env.NEXT_PUBLIC_SHARED_AGENTS_TABLE,
    sharedKnowledgeBases: process.env.NEXT_PUBLIC_SHARED_KNOWLEDGE_BASES_TABLE,
  },
  buckets: {
    attachments: process.env.NEXT_PUBLIC_ATTACHMENTS_BUCKET,
  },
  testIdentifiers: ['test-', 'e2e-', 'automation-', 'playwright-'],
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
};

// Utility functions
const log = (message, level = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = level.toUpperCase();
  console.log(`[${timestamp}] ${prefix}: ${message}`);
};

const isTestItem = (item, identifiers = config.testIdentifiers) => {
  const itemStr = JSON.stringify(item).toLowerCase();
  return identifiers.some(identifier => itemStr.includes(identifier.toLowerCase()));
};

// DynamoDB cleanup functions
const cleanupDynamoDBTable = async (tableName) => {
  if (!tableName) {
    log(`Skipping undefined table`, 'warn');
    return;
  }

  log(`Scanning table: ${tableName}`);
  
  try {
    const scanCommand = new ScanCommand({
      TableName: tableName,
    });

    const response = await dynamoClient.send(scanCommand);
    const items = response.Items || [];
    
    log(`Found ${items.length} items in ${tableName}`);

    const testItems = items.filter(item => isTestItem(item));
    log(`Found ${testItems.length} test items to delete in ${tableName}`);

    if (config.dryRun) {
      log(`DRY RUN: Would delete ${testItems.length} items from ${tableName}`);
      if (config.verbose) {
        testItems.forEach((item, index) => {
          log(`  ${index + 1}. ${JSON.stringify(item, null, 2)}`);
        });
      }
      return;
    }

    // Delete test items
    for (const item of testItems) {
      try {
        // Extract key attributes (assuming userId and id are the keys)
        const key = {};
        if (item.userId) key.userId = item.userId;
        if (item.id) key.id = item.id;
        if (item.pk) key.pk = item.pk;
        if (item.sk) key.sk = item.sk;

        const deleteCommand = new DeleteItemCommand({
          TableName: tableName,
          Key: key,
        });

        await dynamoClient.send(deleteCommand);
        
        if (config.verbose) {
          log(`Deleted item with key: ${JSON.stringify(key)}`);
        }
      } catch (error) {
        log(`Error deleting item from ${tableName}: ${error.message}`, 'error');
      }
    }

    log(`Deleted ${testItems.length} test items from ${tableName}`, 'success');
  } catch (error) {
    log(`Error scanning table ${tableName}: ${error.message}`, 'error');
  }
};

// S3 cleanup functions
const cleanupS3Bucket = async (bucketName) => {
  if (!bucketName) {
    log(`Skipping undefined bucket`, 'warn');
    return;
  }

  log(`Scanning bucket: ${bucketName}`);
  
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];
    
    log(`Found ${objects.length} objects in ${bucketName}`);

    const testObjects = objects.filter(obj => isTestItem({ key: obj.Key }));
    log(`Found ${testObjects.length} test objects to delete in ${bucketName}`);

    if (config.dryRun) {
      log(`DRY RUN: Would delete ${testObjects.length} objects from ${bucketName}`);
      if (config.verbose) {
        testObjects.forEach((obj, index) => {
          log(`  ${index + 1}. ${obj.Key}`);
        });
      }
      return;
    }

    // Delete test objects
    for (const obj of testObjects) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: obj.Key,
        });

        await s3Client.send(deleteCommand);
        
        if (config.verbose) {
          log(`Deleted object: ${obj.Key}`);
        }
      } catch (error) {
        log(`Error deleting object ${obj.Key} from ${bucketName}: ${error.message}`, 'error');
      }
    }

    log(`Deleted ${testObjects.length} test objects from ${bucketName}`, 'success');
  } catch (error) {
    log(`Error scanning bucket ${bucketName}: ${error.message}`, 'error');
  }
};

// Main cleanup function
const cleanup = async () => {
  log('Starting test data cleanup...');
  
  if (config.dryRun) {
    log('DRY RUN MODE - No data will be deleted', 'warn');
  }

  // Cleanup DynamoDB tables
  log('Cleaning up DynamoDB tables...');
  for (const [tableName, tableValue] of Object.entries(config.tables)) {
    await cleanupDynamoDBTable(tableValue);
  }

  // Cleanup S3 buckets
  log('Cleaning up S3 buckets...');
  for (const [bucketName, bucketValue] of Object.entries(config.buckets)) {
    await cleanupS3Bucket(bucketValue);
  }

  log('Test data cleanup completed!', 'success');
};

// Error handling
const handleError = (error) => {
  log(`Cleanup failed: ${error.message}`, 'error');
  if (config.verbose) {
    console.error(error);
  }
  process.exit(1);
};

// Help function
const showHelp = () => {
  console.log(`
LEGAIA Test Data Cleanup Script

Usage: node scripts/cleanup-test-data.js [options]

Options:
  --dry-run     Show what would be deleted without actually deleting
  --verbose     Show detailed output
  --help        Show this help message

Environment Variables:
  The script uses environment variables from .env.test.local for AWS configuration.

Examples:
  # Dry run to see what would be deleted
  node scripts/cleanup-test-data.js --dry-run

  # Verbose cleanup
  node scripts/cleanup-test-data.js --verbose

  # Dry run with verbose output
  node scripts/cleanup-test-data.js --dry-run --verbose

Test Item Identification:
  Items are considered test data if they contain any of these identifiers:
  - test-
  - e2e-
  - automation-
  - playwright-

Tables cleaned:
  - Conversations
  - Agents
  - Groups
  - User Groups
  - Shared Agents
  - Shared Knowledge Bases

Buckets cleaned:
  - Attachments bucket

Note: This script only deletes items that match test identifiers to prevent
accidental deletion of production data.
`);
};

// Main execution
if (process.argv.includes('--help')) {
  showHelp();
  process.exit(0);
}

// Validate configuration
if (!config.tables.conversations) {
  log('Missing required environment variables. Please check .env.test.local', 'error');
  process.exit(1);
}

// Run cleanup
cleanup().catch(handleError);

module.exports = {
  cleanup,
  cleanupDynamoDBTable,
  cleanupS3Bucket,
  isTestItem,
};
