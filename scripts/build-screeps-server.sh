#!/bin/bash
set -e

echo "🔧 Building and initializing Screeps server for local testing..."

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  "x86_64"|"amd64")
    PLATFORM="linux/amd64"
    BUILD_ARCH="amd64"
    echo "📋 Detected x86_64/amd64 architecture"
    ;;
  "arm64"|"aarch64")
    PLATFORM="linux/arm64"
    BUILD_ARCH="arm64"
    echo "📋 Detected ARM64 architecture"
    ;;
  *)
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Check if base image exists, build if needed
if ! finch images | grep -q "screepers/screeps-launcher.*latest"; then
    echo "📦 Building screepers/screeps-launcher:latest from source..."
    
    # Create temporary build directory
    BUILD_DIR=$(mktemp -d)
    echo "📥 Cloning screeps-launcher to $BUILD_DIR"
    
    # Clone and build
    git clone https://github.com/screepers/screeps-launcher.git "$BUILD_DIR"
    cd "$BUILD_DIR"
    
    echo "🏗️  Building container for $PLATFORM..."
    finch build --platform "$PLATFORM" --build-arg ARCH="$BUILD_ARCH" -t screepers/screeps-launcher:latest .
    
    # Clean up
    cd /
    rm -rf "$BUILD_DIR"
    echo "✅ Base image built successfully"
else
    echo "✅ Base image screepers/screeps-launcher:latest already exists"
fi

# Check if we have an initialized volume
if finch volume ls | grep -q "screeps-initialized-data"; then
    echo "✅ Initialized screeps volume already exists"
    exit 0
fi

echo "🚀 Initializing screeps server state..."

# Create the volume
finch volume create screeps-initialized-data

# Run upgrade to initialize the /screeps directory
echo "📦 Running screeps-launcher upgrade to initialize packages..."
finch run --rm \
    -v screeps-initialized-data:/screeps \
    -v "$(pwd)/screeps-launcher-config.yml:/screeps/config.yml" \
    screepers/screeps-launcher:latest upgrade

echo "✅ Screeps server initialized successfully with persistent volume"
echo "🔧 Volume 'screeps-initialized-data' contains fully initialized screeps environment"
