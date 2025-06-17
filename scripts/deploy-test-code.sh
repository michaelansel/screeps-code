#!/bin/bash
set -e

echo "📦 Deploying code to test environment..."

# Build the main game code
echo "🔧 Building main game code..."
npm run build

# Create bot directory structure in volume
echo "📁 Setting up bot directory structure..."
finch run --rm \
    -v screeps-initialized-data:/screeps \
    screepers/screeps-launcher:latest \
    sh -c "mkdir -p /screeps/bots/user"

# Copy main game code to bot directory
echo "📤 Copying main.js to bot directory..."
finch run --rm \
    -v screeps-initialized-data:/screeps \
    -v "$(pwd)/dist:/host-dist" \
    screepers/screeps-launcher:latest \
    cp /host-dist/main.js /screeps/bots/user/main.js

# Copy any additional test files if they exist
if [ -f "dist/test-script.js" ]; then
    echo "📤 Copying test script..."
    finch run --rm \
        -v screeps-initialized-data:/screeps \
        -v "$(pwd)/dist:/host-dist" \
        screepers/screeps-launcher:latest \
        cp /host-dist/test-script.js /screeps/test-script.js
fi

echo "✅ Code deployment complete"
echo "🚀 Ready to start server with deployed code"