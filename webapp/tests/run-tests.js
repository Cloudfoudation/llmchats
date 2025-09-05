#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const config = {
  // Test suites to run
  suites: {
    auth: 'tests/e2e/auth',
    'knowledge-base': 'tests/e2e/knowledge-base',
    agents: 'tests/e2e/agents',
    groups: 'tests/e2e/groups',
    'shared-resources': 'tests/e2e/shared-resources',
    'user-management': 'tests/e2e/user-management'
  },
  
  // Browsers to test
  browsers: ['chromium', 'firefox', 'webkit'],
  
  // Test modes
  modes: {
    smoke: ['auth', 'knowledge-base'],
    regression: Object.keys(this.suites || {}),
    full: Object.keys(this.suites || {})
  }
};

class TestRunner {
  constructor() {
    this.args = process.argv.slice(2);
    this.options = this.parseArgs();
  }

  parseArgs() {
    const options = {
      suite: 'full',
      browser: 'chromium',
      headed: false,
      debug: false,
      ui: false,
      workers: undefined,
      retries: undefined,
      reporter: 'html',
      grep: undefined,
      timeout: undefined
    };

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      const nextArg = this.args[i + 1];

      switch (arg) {
        case '--suite':
        case '-s':
          options.suite = nextArg;
          i++;
          break;
        case '--browser':
        case '-b':
          options.browser = nextArg;
          i++;
          break;
        case '--headed':
          options.headed = true;
          break;
        case '--debug':
          options.debug = true;
          break;
        case '--ui':
          options.ui = true;
          break;
        case '--workers':
        case '-w':
          options.workers = nextArg;
          i++;
          break;
        case '--retries':
        case '-r':
          options.retries = nextArg;
          i++;
          break;
        case '--reporter':
          options.reporter = nextArg;
          i++;
          break;
        case '--grep':
        case '-g':
          options.grep = nextArg;
          i++;
          break;
        case '--timeout':
        case '-t':
          options.timeout = nextArg;
          i++;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
      }
    }

    return options;
  }

  showHelp() {
    console.log(`
🎭 Playwright E2E Test Runner

Usage: node tests/run-tests.js [options]

Options:
  -s, --suite <name>      Test suite to run (smoke|regression|full|auth|knowledge-base|agents|groups|shared-resources|user-management)
  -b, --browser <name>    Browser to use (chromium|firefox|webkit|all)
  -w, --workers <num>     Number of parallel workers
  -r, --retries <num>     Number of retries for failed tests
  --headed               Run tests in headed mode
  --debug                Run tests in debug mode
  --ui                   Run tests with Playwright UI
  --reporter <name>      Reporter to use (html|json|junit|line)
  -g, --grep <pattern>   Only run tests matching pattern
  -t, --timeout <ms>     Global timeout for tests
  -h, --help             Show this help message

Examples:
  node tests/run-tests.js --suite smoke --browser chromium
  node tests/run-tests.js --suite auth --headed --debug
  node tests/run-tests.js --ui
  node tests/run-tests.js --grep "should login" --browser firefox
    `);
  }

  async run() {
    console.log('🎭 Starting Playwright E2E Tests');
    console.log('================================');
    
    // Validate options
    if (!this.validateOptions()) {
      process.exit(1);
    }

    // Setup environment
    await this.setupEnvironment();

    // Build command
    const command = this.buildCommand();
    
    console.log(`Running: ${command.join(' ')}`);
    console.log('================================\n');

    // Execute tests
    const result = await this.executeCommand(command);
    
    // Handle results
    await this.handleResults(result);
  }

  validateOptions() {
    const { suite, browser } = this.options;

    // Validate suite
    const validSuites = ['smoke', 'regression', 'full', ...Object.keys(config.suites)];
    if (!validSuites.includes(suite)) {
      console.error(`❌ Invalid suite: ${suite}`);
      console.error(`Valid suites: ${validSuites.join(', ')}`);
      return false;
    }

    // Validate browser
    const validBrowsers = [...config.browsers, 'all'];
    if (!validBrowsers.includes(browser)) {
      console.error(`❌ Invalid browser: ${browser}`);
      console.error(`Valid browsers: ${validBrowsers.join(', ')}`);
      return false;
    }

    return true;
  }

  async setupEnvironment() {
    // Load test environment variables
    const envFile = path.join(__dirname, '../.env.test');
    if (fs.existsSync(envFile)) {
      require('dotenv').config({ path: envFile });
      console.log('✅ Loaded test environment configuration');
    }

    // Create test results directory
    const resultsDir = path.join(__dirname, '../test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
      console.log('✅ Created test results directory');
    }

    // Create screenshots directory
    const screenshotsDir = path.join(resultsDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      console.log('✅ Created screenshots directory');
    }

    // Create downloads directory
    const downloadsDir = path.join(resultsDir, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
      console.log('✅ Created downloads directory');
    }
  }

  buildCommand() {
    const { suite, browser, headed, debug, ui, workers, retries, reporter, grep, timeout } = this.options;
    
    let command = ['npx', 'playwright', 'test'];

    // Add test files based on suite
    if (suite === 'smoke' || suite === 'regression' || suite === 'full') {
      const suites = config.modes[suite] || Object.keys(config.suites);
      for (const s of suites) {
        if (config.suites[s]) {
          command.push(config.suites[s]);
        }
      }
    } else if (config.suites[suite]) {
      command.push(config.suites[suite]);
    }

    // Add browser project
    if (browser !== 'all') {
      command.push('--project', browser);
    }

    // Add other options
    if (headed) command.push('--headed');
    if (debug) command.push('--debug');
    if (ui) command = ['npx', 'playwright', 'test', '--ui'];
    if (workers) command.push('--workers', workers);
    if (retries) command.push('--retries', retries);
    if (reporter && !ui) command.push('--reporter', reporter);
    if (grep) command.push('--grep', grep);
    if (timeout) command.push('--timeout', timeout);

    return command;
  }

  executeCommand(command) {
    return new Promise((resolve) => {
      const process = spawn(command[0], command.slice(1), {
        stdio: 'inherit',
        shell: true
      });

      process.on('close', (code) => {
        resolve({ code, success: code === 0 });
      });

      process.on('error', (error) => {
        console.error('❌ Failed to start test process:', error);
        resolve({ code: 1, success: false, error });
      });
    });
  }

  async handleResults(result) {
    console.log('\n================================');
    
    if (result.success) {
      console.log('✅ All tests passed!');
      
      // Show test report location
      const reportPath = path.join(__dirname, '../playwright-report/index.html');
      if (fs.existsSync(reportPath)) {
        console.log(`📊 Test report: file://${path.resolve(reportPath)}`);
      }
      
    } else {
      console.log('❌ Some tests failed');
      console.log(`Exit code: ${result.code}`);
      
      if (result.error) {
        console.error('Error:', result.error.message);
      }
    }

    // Show additional information
    console.log('\n📁 Test artifacts:');
    console.log(`   Screenshots: test-results/screenshots/`);
    console.log(`   Videos: test-results/videos/`);
    console.log(`   Traces: test-results/traces/`);
    
    process.exit(result.code);
  }
}

// Run the test runner
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;
