#!/usr/bin/env node

/**
 * Simple test script to verify i18n setup
 * Run with: node test-i18n.js
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 Testing Bilingual Setup...\n');

// Test 1: Check if message files exist
console.log('1. Checking message files...');
const enPath = path.join(__dirname, 'messages', 'en.json');
const viPath = path.join(__dirname, 'messages', 'vi.json');

if (fs.existsSync(enPath)) {
  console.log('✅ English messages file exists');
} else {
  console.log('❌ English messages file missing');
  process.exit(1);
}

if (fs.existsSync(viPath)) {
  console.log('✅ Vietnamese messages file exists');
} else {
  console.log('❌ Vietnamese messages file missing');
  process.exit(1);
}

// Test 2: Check if message files are valid JSON
console.log('\n2. Validating JSON structure...');
try {
  const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  console.log('✅ English JSON is valid');
  
  const viMessages = JSON.parse(fs.readFileSync(viPath, 'utf8'));
  console.log('✅ Vietnamese JSON is valid');
  
  // Test 3: Check key consistency
  console.log('\n3. Checking key consistency...');
  const enKeys = getAllKeys(enMessages);
  const viKeys = getAllKeys(viMessages);
  
  const missingInVi = enKeys.filter(key => !viKeys.includes(key));
  const missingInEn = viKeys.filter(key => !enKeys.includes(key));
  
  if (missingInVi.length === 0 && missingInEn.length === 0) {
    console.log('✅ All keys are consistent between languages');
  } else {
    if (missingInVi.length > 0) {
      console.log('⚠️  Keys missing in Vietnamese:', missingInVi);
    }
    if (missingInEn.length > 0) {
      console.log('⚠️  Keys missing in English:', missingInEn);
    }
  }
  
  // Test 4: Check key counts
  console.log('\n4. Translation statistics...');
  console.log(`📊 English keys: ${enKeys.length}`);
  console.log(`📊 Vietnamese keys: ${viKeys.length}`);
  console.log(`📊 Coverage: ${Math.round((Math.min(enKeys.length, viKeys.length) / Math.max(enKeys.length, viKeys.length)) * 100)}%`);
  
} catch (error) {
  console.log('❌ JSON parsing error:', error.message);
  process.exit(1);
}

// Test 5: Check configuration files
console.log('\n5. Checking configuration files...');
const configFiles = [
  'src/i18n/request.ts',
  'src/lib/i18n.ts',
  'src/middleware.ts',
  'next.config.ts'
];

configFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

console.log('\n🎉 Bilingual setup test completed!');
console.log('\n📝 Next steps:');
console.log('1. Run `npm run dev` to start the development server');
console.log('2. Look for the language switcher in the header');
console.log('3. Test switching between English and Vietnamese');
console.log('4. Check browser console for any errors');

// Helper function to get all keys from nested object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}
