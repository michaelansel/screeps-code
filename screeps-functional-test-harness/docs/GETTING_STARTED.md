# Getting Started

This guide will help you get up and running with the Screeps Functional Test Harness.

## Prerequisites

### Container Runtime

You need either Docker or Finch installed:

**Docker:**
```bash
# macOS (Homebrew)
brew install docker

# Ubuntu/Debian
sudo apt install docker.io

# Verify installation
docker --version
```

**Finch (recommended for macOS):**
```bash
# macOS (Homebrew)
brew install finch

# Verify installation
finch --version
```

### Node.js

Node.js 18 or higher is required:

```bash
# Check version
node --version

# Should be v18.0.0 or higher
```

## Installation

### From npm (when published)

```bash
npm install screeps-functional-test-harness
```

### From source (development)

```bash
git clone <repository-url>
cd screeps-functional-test-harness
npm install
npm run build
npm link

# In your project
npm link screeps-functional-test-harness
```

## Project Setup

### 1. Create Docker Compose File

Create `docker-compose.functional.yml` in your project root:

```yaml
version: '3.8'

services:
  screeps:
    image: screepers/screeps-launcher:functional
    ports:
      - "21025:21025"  # Game port
      - "21026:21026"  # CLI port
    environment:
      - MODFILE=/screeps/mods/filebot-mod.js
    volumes:
      - screeps_data:/screeps
      - ./filebot-mod.js:/tmp/filebot-mod.js:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:21026/cli"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  screeps_data:
```

### 2. FileBot Mod

Create `filebot-mod.js` in your project root:

```javascript
// FileBot mod for code injection
module.exports = function(config) {
  if (config.common.storage && config.common.storage.db) {
    config.common.storage.db.filebot = {
      inject: function(filename, userId, options) {
        const fs = require('fs');
        const code = fs.readFileSync(filename, 'utf8');
        
        // Implementation for code injection
        return { success: true, userId, codeSize: code.length };
      }
    };
  }
};
```

## Basic Usage

### 1. Simple Test

```typescript
import { ScreepsFunctionalTestHarness } from 'screeps-functional-test-harness';

describe('My Bot Tests', () => {
  let harness: ScreepsFunctionalTestHarness;

  before(async function() {
    this.timeout(180000); // 3 minutes for setup
    harness = new ScreepsFunctionalTestHarness();
    await harness.setup();
  });

  after(async () => {
    await harness.cleanup();
  });

  beforeEach(async () => {
    await harness.resetGameState();
  });

  it('should initialize bot memory', async () => {
    // Deploy bot
    const deployment = await harness.deployBot('./dist/main.js');
    expect(deployment.success).to.be.true;

    // Monitor execution
    const execution = await harness.monitorExecution(deployment.userId, {
      duration: 30,
      expectations: { minTicks: 5 }
    });

    expect(execution.memoryInitialized).to.be.true;

    // Check memory
    const memory = await harness.getMemoryState(deployment.userId);
    expect(memory).to.not.be.null;
    expect(memory.initialized).to.be.true;
  });
});
```

### 2. Memory Pattern Testing

```typescript
it('should manage creeps correctly', async () => {
  const deployment = await harness.deployBot('./dist/main.js');
  
  // Wait for activity
  await harness.monitorExecution(deployment.userId, {
    duration: 60,
    expectations: { minTicks: 20 }
  });
  
  // Check memory patterns
  const patterns = await harness.checkMemoryPatterns(deployment.userId, {
    'creepCounter': null,
    'creeps.Worker1.role': 'harvester',
    'projects': null
  });
  
  expect(patterns['creepCounter']).to.be.true;
  expect(patterns['creeps.Worker1.role']).to.be.true;
});
```

### 3. Scenario Testing

```typescript
it('should handle resource shortage', async () => {
  // Preload scenario
  await harness.preloadMemory('test_user', {
    resources: { energy: 0 },
    scenario: 'shortage'
  });
  
  const deployment = await harness.deployBot('./dist/main.js');
  
  // Monitor adaptation
  const execution = await harness.monitorExecution(deployment.userId, {
    duration: 90,
    expectations: { minTicks: 30 }
  });
  
  expect(execution.cpuUsed).to.be.true;
  
  // Verify adaptation
  const finalMemory = await harness.getMemoryState(deployment.userId);
  expect(finalMemory.adaptedToShortage).to.be.true;
});
```

## Configuration Options

### Server Configuration

```typescript
const harness = new ScreepsFunctionalTestHarness({
  containerImage: 'my-custom-screeps:latest',
  composeFile: './custom-compose.yml',
  timeout: 300000, // 5 minutes
  ports: {
    game: 21025,
    cli: 21026
  }
});
```

### Test Environment Variables

```bash
# Custom container image
SCREEPS_CONTAINER_IMAGE=my-custom-image

# Custom timeout
SCREEPS_TIMEOUT=300000

# Preserve containers for debugging
SCREEPS_PRESERVE=true
```

## Development Workflow

### 1. Test-Driven Development

```typescript
describe('New Feature', () => {
  it('should implement feature X', async () => {
    // 1. Deploy current bot
    const deployment = await harness.deployBot('./dist/main.js');
    
    // 2. Verify current behavior
    const baseline = await harness.monitorExecution(deployment.userId, {
      duration: 30,
      expectations: { minTicks: 10 }
    });
    
    // 3. Test should fail initially
    expect(baseline.someNewBehavior).to.be.undefined;
    
    // 4. Implement feature
    // 5. Test should pass
  });
});
```

### 2. Regression Testing

```typescript
describe('Regression Tests', () => {
  const testCases = [
    { scenario: 'normal', expectations: { creeps: 2, energy: 1000 } },
    { scenario: 'shortage', expectations: { creeps: 1, energy: 0 } },
    { scenario: 'expansion', expectations: { creeps: 5, rooms: 2 } }
  ];

  testCases.forEach(({ scenario, expectations }) => {
    it(`should handle ${scenario} scenario`, async () => {
      await harness.preloadMemory('test_user', { scenario });
      
      const deployment = await harness.deployBot('./dist/main.js');
      const execution = await harness.monitorExecution(deployment.userId, {
        duration: 60,
        expectations: { minTicks: 20 }
      });
      
      const finalState = await harness.getGameObjects(deployment.userId);
      expect(finalState.creeps.length).to.equal(expectations.creeps);
    });
  });
});
```

### 3. Performance Testing

```typescript
it('should maintain performance under load', async () => {
  // Setup heavy scenario
  await harness.preloadMemory('test_user', {
    creeps: generateLargeCreepSet(100),
    rooms: generateMultipleRooms(10)
  });
  
  const deployment = await harness.deployBot('./dist/main.js');
  
  // Monitor CPU usage
  const execution = await harness.monitorExecution(deployment.userId, {
    duration: 120,
    expectations: { minTicks: 50 }
  });
  
  expect(execution.cpuUsed).to.be.true;
  
  // Check CPU stays within limits
  const finalCpu = harness.getCpuUsage(deployment.userId);
  expect(finalCpu).to.be.lessThan(100);
});
```

## Debugging

### 1. Live Inspection

```typescript
after(async () => {
  // Preserve containers for manual inspection
  await harness.cleanup(true);
  
  console.log('Server available at: http://localhost:21025');
  console.log('CLI available at: http://localhost:21026/cli');
});
```

### 2. Console Logs

```typescript
it('should log debug information', async () => {
  const deployment = await harness.deployBot('./dist/main.js');
  
  await harness.monitorExecution(deployment.userId, {
    duration: 30,
    expectations: { minTicks: 10 }
  });
  
  const logs = harness.getConsoleLogs(deployment.userId);
  console.log('Bot console output:', logs);
  
  expect(logs.some(log => log.includes('Debug:'))).to.be.true;
});
```

### 3. Memory Inspection

```typescript
it('should provide detailed memory stats', async () => {
  const deployment = await harness.deployBot('./dist/main.js');
  
  await harness.monitorExecution(deployment.userId, {
    duration: 30,
    expectations: { minTicks: 10 }
  });
  
  const stats = await harness.getMemoryStats(deployment.userId);
  console.log('Memory stats:', stats);
  
  expect(stats.exists).to.be.true;
  expect(stats.size).to.be.greaterThan(0);
});
```

## Troubleshooting

### Common Issues

1. **"No container runtime found"**
   - Install Docker or Finch
   - Ensure it's in your PATH

2. **"Server failed to start"**
   - Check if ports 21025/21026 are available
   - Verify docker-compose.yml syntax
   - Check container logs

3. **"FileBot mod failed to load"**
   - Ensure filebot-mod.js exists and is mounted correctly
   - Check container logs for mod loading errors

4. **Tests timeout**
   - Increase timeout values
   - Check if container has sufficient resources
   - Verify bot code doesn't have infinite loops

### Getting Help

1. **Check container logs:**
   ```bash
   docker-compose -f docker-compose.functional.yml logs screeps
   ```

2. **Test CLI access:**
   ```bash
   curl -s http://localhost:21026/cli -d "storage.env.get('gameTime')"
   ```

3. **Verify container status:**
   ```bash
   docker-compose -f docker-compose.functional.yml ps
   ```

## Next Steps

- Read the [API Documentation](./API.md) for detailed method reference
- Explore the [examples](../examples/) directory for more complex scenarios
- Check out the [integration test](../test/integration.test.ts) for comprehensive usage examples
- Contribute to the project on GitHub