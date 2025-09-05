#!/bin/bash

echo "🎭 Setting up Playwright E2E Testing Environment"
echo "================================================"

# Install Playwright browsers
echo "📦 Installing Playwright browsers..."
npx playwright install

# Install system dependencies (if needed)
echo "🔧 Installing system dependencies..."
npx playwright install-deps

# Create test directories
echo "📁 Creating test directories..."
mkdir -p test-results/screenshots
mkdir -p test-results/downloads
mkdir -p test-results/traces
mkdir -p test-results/videos

# Set up environment file
echo "⚙️ Setting up environment configuration..."
if [ ! -f .env.test ]; then
    cp .env.test .env.test.local 2>/dev/null || echo "# Copy and configure test environment variables" > .env.test.local
    echo "📝 Please configure .env.test.local with your test credentials"
fi

# Make test runner executable
chmod +x tests/run-tests.js

echo "✅ E2E testing environment setup complete!"
echo ""
echo "🚀 Quick Start:"
echo "  npm run test:e2e              # Run all tests"
echo "  npm run test:e2e:ui           # Run with UI"
echo "  npm run test:e2e:headed       # Run in headed mode"
echo "  node tests/run-tests.js --help # See all options"
echo ""
echo "📚 Documentation: tests/README.md"
