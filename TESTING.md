# Testing Guide

This guide explains how to run tests, the different types of testing available, and how our testing architecture works.

## Test Types

We use a multi-layer testing approach that provides different levels of validation:

### 1. Unit Tests
- **Purpose**: Test individual functions and classes in isolation
- **Location**: `test/unit/`
- **Technology**: Mocha + Chai + Sinon
- **Speed**: Very fast (~10-100ms per test)
- **When to use**: TDD, testing business logic, rapid development

### 2. Integration Tests
Integration tests validate component interactions and system behavior:

#### Framework Integration Tests
- **Purpose**: Test component interactions with simulated game environment
- **Location**: `test/integration/framework/`
- **Technology**: Sinon.js mocks for Game/Memory objects
- **Speed**: Fast (~100ms per test)
- **When to use**: Testing game logic without server dependency

#### Build Pipeline Integration Tests  
- **Purpose**: Validate compiled output structure and exports
- **Location**: `test/integration/build-pipeline/`
- **Technology**: Direct file system analysis of dist/ output
- **Speed**: Medium (~500ms per test)
- **When to use**: CI/CD pipeline, deployment verification

### 3. Functional Tests
- **Purpose**: End-to-end validation in actual Screeps game environment
- **Location**: `test/functional/`
- **Technology**: ARM64 Screeps server + Docker/Finch
- **Speed**: Slow (~5-15 seconds per test)
- **When to use**: Release validation, production confidence

## Running Tests

### Quick Commands

```bash
# Run all tests (unit + integration + functional)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests (framework + build pipeline)
npm run test:integration

# Run only functional tests (with server setup/teardown)
npm run test:functional

# Run specific test categories
npm run test:integration -- --grep "Framework"
npm run test:integration -- --grep "Build Pipeline"
```

### Manual Control (if needed)

```bash
npm run test:functional:setup    # Build + start containers
npm run test:functional:run      # Run tests only (without setup/teardown)
npm run test:functional:teardown # Stop containers
npm run test:functional:build    # Build container only (Mac/ARM64)
```

## Functional Testing

### How It Works

Functional tests use an ARM64 Screeps server running in a container:

1. **Build Code**: Both main game code and test validation code
2. **Deploy**: Copy built files to the running server container
3. **Execute**: Server runs the code in game environment
4. **Validate**: Check execution through logs and memory state

### Dual Code Deployment

We deploy two separate modules to maintain clean separation:

- **Main Game Code**: `src/main.ts` → `dist/main.js` (production code)
- **Integration Test Code**: `test/integration/integration-test.ts` → `dist/integration-test.js` (validation code)

This ensures no test code pollutes the main game logic.

### Building Test Code

```bash
# Build main game code
npm run build

# Build both main and integration test code
npm run build:integration-test
```

### Integration Test Module

The integration test module provides functions that run inside the game engine:

```typescript
// Validates main code execution via Memory effects
validateMainCodeExecution(): boolean

// Proves test code execution in game engine  
validateTestCodeExecution(): boolean

// Runs complete validation cycle
runIntegrationTest(): IntegrationTestMemory
```

### Execution Proof Strategy

To prove both main and test code are executing:

**Main Code Detection:**
- Monitors `Memory.creepCounter` (set by main game loop)
- Validates `Game.time` progression
- Tracks execution in Memory

**Test Code Detection:**
- Direct Memory manipulation by test module
- Console log markers: `🧪 INTEGRATION_TEST:`
- Independent execution counters

## Writing Tests

### Unit Test Example

```typescript
// test/unit/example.test.ts
import { expect } from "chai";
import { MyClass } from "../../src/MyClass";

describe("MyClass", () => {
  it("should do something", () => {
    const instance = new MyClass();
    expect(instance.doSomething()).to.equal("expected result");
  });
});
```

### Mock Integration Test Example

```typescript
// test/integration/mock-example.test.ts
import { expect } from "chai";
import sinon from "sinon";

describe("Game Integration", () => {
  beforeEach(() => {
    global.Game = { time: 100, creeps: {} };
    global.Memory = { creeps: {} };
  });

  it("should interact with game objects", () => {
    // Test code that uses Game and Memory
  });
});
```

### Real Server Test Example

```typescript
// test/integration/server-example.test.ts
describe("Real Server Integration", () => {
  it("should validate code execution", async () => {
    // Build and deploy code
    await server.deployCode();
    await server.deployIntegrationTestCode();
    
    // Run simulation
    await server.runTicks(5);
    
    // Validate results
    const gameState = await server.getGameState();
    expect(gameState.codeExecuting).to.be.true;
  });
});
```

## Development Workflow

1. **Start with unit tests** for individual components
2. **Use mock integration tests** for rapid iteration on game logic
3. **Validate with build artifact tests** before committing
4. **Confirm with real server tests** before releases

## Troubleshooting

### Common Issues

**Tests fail with "docker: command not found"**
- Use `finch` instead of `docker` on this system
- Run `npm run test:integration:setup` to start containers

**Integration tests timeout**
- Increase timeout with `--timeout 30000`
- Check if containers are running: `finch ps`

**Build artifact tests fail**
- Run `npm run build` first
- Check `dist/` directory exists and contains files

**Real server tests show no execution**
- Server may need world configuration
- Check container logs: `finch logs screeps-code-screeps-1`
- Verify code deployment succeeded

### Debug Commands

```bash
# Check container status
finch ps

# View server logs
finch logs screeps-code-screeps-1

# Check deployed files
finch exec screeps-code-screeps-1 ls -la /screeps/

# Test server connectivity
curl http://localhost:21025
```

## Automated Container Build

The functional tests automatically build the required Screeps server container for your local machine when you run:

```bash
npm run test:functional
```

### Manual Build (If Needed)

If the automatic build fails, manually build the container:

```bash
npm run test:functional:build
```

This script:
1. Detects your machine architecture (x86_64/arm64)
2. Clones `screepers/screeps-launcher` to a temporary directory
3. Builds the container for your platform
4. Tags it as `screeps/screeps-launcher:latest`
5. Cleans up temporary files

## Architecture Notes

### Cross-Platform Compatibility

The build script automatically detects your architecture and builds accordingly:
- **x86_64/amd64**: Uses `linux/amd64` platform
- **ARM64**: Uses `linux/arm64` platform  

The image is tagged as `screeps/screeps-launcher:latest` which matches the public image name, allowing the local build to override it when needed.

### Why Dual Code Deployment?

- Keeps production code clean (no test pollution)
- Enables independent testing logic
- Provides execution proof for both code types
- Supports testing actual production builds

### Why File-Based Deployment?

File copying to containers is reliable, scriptable, and easier to debug than CLI automation.