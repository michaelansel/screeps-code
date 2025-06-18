#!/bin/bash
# Setup script for functional testing environment

echo "🔧 Setting up functional testing environment..."

# Check if screeps-launcher exists in test/config
if [ ! -d "test/config/screeps-launcher" ]; then
    echo "📦 Cloning screeps-launcher repository..."
    cd test/config
    git clone https://github.com/screepers/screeps-launcher.git
    cd ../..
else
    echo "✅ screeps-launcher already exists"
fi

# Verify FileBot mod exists
if [ ! -f "test/functional/filebot-mod.js" ]; then
    echo "❌ FileBot mod not found at test/functional/filebot-mod.js"
    exit 1
else
    echo "✅ FileBot mod found"
fi

# Verify docker compose file exists
if [ ! -f "test/config/docker-compose.functional.yml" ]; then
    echo "❌ Docker compose file not found at test/config/docker-compose.functional.yml"
    exit 1
else
    echo "✅ Docker compose configuration found"
fi

# Check container runtime
if command -v finch >/dev/null 2>&1; then
    echo "✅ Finch container runtime found"
elif command -v docker >/dev/null 2>&1; then
    echo "✅ Docker container runtime found"
else
    echo "❌ No container runtime found. Please install Docker or Finch."
    exit 1
fi

echo ""
echo "🎉 Functional testing environment is ready!"
echo ""
echo "Test commands:"
echo "  npm test                        - Run all tests (unit + integration + functional)"
echo "  npm run test:unit               - Run unit tests (fast)"
echo "  npm run test:integration        - Run integration tests (includes bot build validation)"
echo "  npm run test:functional         - Run functional tests (real server)"
echo "  npm run test:functional:harness - Test harness validation only"
echo ""
echo "Environment management:"
echo "  npm run test:functional:env:setup - Clone screeps-launcher repository"
echo "  npm run test:functional:env:clean - Clean up containers and volumes"
echo ""
echo "Test architecture:"
echo "  • Unit tests: Fast validation of individual components"
echo "  • Integration tests: Build pipeline and bot structure validation"
echo "  • Functional tests: Real Screeps server execution testing"
echo ""