# Screeps Functional Test Harness

A reliable, standalone functional testing library for Screeps bots using containerized servers. This library provides clean separation of concerns with container management, server lifecycle, game state operations, and bot deployment.

## Features

- **Container Runtime Abstraction**: Supports both Docker and Finch container runtimes
- **Server Lifecycle Management**: Automated setup, cleanup, and reset operations
- **Game State Management**: Memory manipulation, game object queries, and state validation
- **Bot Deployment System**: Code injection and execution monitoring
- **Simulation Control**: Pause, resume, and tick advancement control
- **Comprehensive API**: Clean, well-documented interface for all operations
- **Reliable Test Isolation**: Proper cleanup and state management between tests
- **TypeScript Support**: Full type definitions and IDE support

## Installation

```bash
npm install screeps-functional-test-harness
```

For development:
```bash
git clone <repository>
cd screeps-functional-test-harness
npm install
npm run build
npm link
```

Then in your project:
```bash
npm link screeps-functional-test-harness
```

## Quick Start

```typescript
import { ScreepsFunctionalTestHarness } from 'screeps-functional-test-harness';

async function example() {
  const harness = new ScreepsFunctionalTestHarness();
  
  // Setup environment (one-time expensive operation)
  await harness.setup();
  
  // Deploy your bot
  const deployment = await harness.deployBot('./dist/main.js', {
    username: 'TestBot',
    room: 'W10N10'
  });
  
  // Monitor execution
  const execution = await harness.monitorExecution(deployment.userId, {
    duration: 60,
    expectations: { minTicks: 10 }
  });
  
  // Check memory state
  const memory = await harness.getMemoryState(deployment.userId);
  console.log('Bot memory:', memory);
  
  // Cleanup
  await harness.cleanup();
}
```

## API Reference

### Core Class

#### `ScreepsFunctionalTestHarness`

The main orchestrator class providing unified API for all testing operations.

```typescript
const harness = new ScreepsFunctionalTestHarness(config);
```

**Config Options:**
- `containerImage`: Docker image to use (default: 'screepers/screeps-launcher:functional')
- `composeFile`: Docker compose file path (default: './docker-compose.functional.yml')
- `ports`: Port configuration for game and CLI access
- `timeout`: Default timeout for operations (default: 120000ms)

### Lifecycle Management

#### `setup(): Promise<void>`
Setup the test environment. This is an expensive operation that should be done once per test suite.

#### `cleanup(preserveForInspection?: boolean): Promise<void>`
Cleanup the test environment. If `preserveForInspection` is true, leaves containers running for manual inspection.

#### `resetGameState(): Promise<void>`
Reset game state for a fresh test. This is a fast operation suitable for between-test cleanup.

#### `isReady(): boolean`
Check if the harness is ready for testing operations.

### Bot Deployment & Monitoring

#### `deployBot(codePath: string, options?): Promise<DeploymentResult>`
Deploy bot code to the server.

**Options:**
- `username`: Bot username (default: 'TestBot')
- `room`: Target room (default: 'W12N12')
- `cpu`: CPU limit (default: 100)
- `cpuAvailable`: Available CPU (default: 10000)

**Returns:**
```typescript
interface DeploymentResult {
  success: boolean;
  userId: string;
  codeSize: number;
  room: string;
  error?: string;
}
```

#### `monitorExecution(userId: string, options: MonitorOptions): Promise<ExecutionResult>`
Monitor bot execution and collect evidence of activity.

**Options:**
```typescript
interface MonitorOptions {
  duration: number; // seconds
  expectations: {
    minTicks: number;
  };
}
```

**Returns:**
```typescript
interface ExecutionResult {
  ticksAdvanced: number;
  cpuUsed: boolean;
  spawnActive: boolean;
  memoryInitialized: boolean;
  consoleOutput: string[];
}
```

#### `getLastDeployment(): DeploymentResult`
Get the last deployment result. Throws if no deployment has been made.

#### `hasValidDeployment(): boolean`
Check if there's a valid deployment without throwing.

### Simulation Control

#### `getSimulationState(): SimulationState`
Get current simulation state.

```typescript
interface SimulationState {
  tick: number;
  paused: boolean;
  cpu: number;
}
```

#### `pauseSimulation(): void`
Pause the simulation.

#### `resumeSimulation(): void`
Resume the simulation.

#### `waitForTicks(ticks: number): Promise<void>`
Wait for a specific number of game ticks to advance.

#### `getGameTick(): number`
Get current game tick.

### Memory Management

#### `getMemoryState(userId: string): Promise<any>`
Get memory state for a user. Returns `null` if no memory exists.

#### `setMemoryState(userId: string, memory: any): Promise<{success: boolean; error?: string}>`
Set memory state for a user.

#### `preloadMemory(userId: string, memory: any): Promise<{success: boolean; error?: string}>`
Preload memory state for scenario testing (alias for `setMemoryState`).

#### `mergeMemory(userId: string, memoryUpdate: any): Promise<{success: boolean; error?: string}>`
Merge memory state with existing data.

#### `checkMemoryPatterns(userId: string, patterns: Record<string, any>): Promise<Record<string, boolean>>`
Check memory patterns for validation. Supports nested properties using dot notation.

**Example:**
```typescript
const patterns = {
  'creepCounter': 5,
  'projects': null, // Check existence
  'creeps.worker1.role': 'harvester'
};
const results = await harness.checkMemoryPatterns(userId, patterns);
// returns: { 'creepCounter': true, 'projects': true, 'creeps.worker1.role': false }
```

#### `getMemoryStats(userId: string): Promise<MemoryStats>`
Get memory statistics for analysis.

```typescript
interface MemoryStats {
  exists: boolean;
  size: number;
  hasCreeps: boolean;
  creepCount: number;
  hasCreepCounter: boolean;
  memoryStructure: string[];
}
```

#### `getAllUsersWithMemory(): Promise<UserInfo[]>`
Get all users with their memory data.

```typescript
interface UserInfo {
  userId: string;
  memory: any;
}
```

**Example:**
```typescript
const users = await harness.getAllUsersWithMemory();
console.log(`Found ${users.length} users with memory data`);
users.forEach(user => {
  console.log(`User ${user.userId}:`, user.memory);
});
```

### Game Objects & State

#### `getGameObjects(userId: string): Promise<GameObjects>`
Get game objects for a user.

```typescript
interface GameObjects {
  spawns: Array<{name: string; energy: number}>;
  creeps: Array<{name: string; memory: any}>;
  sources: Array<{id: string; energy: number}>;
  total: number;
}
```

#### `generateRoom(roomName: string): Promise<void>`
Generate a room for testing.

#### `getCpuUsage(userId: string): number`
Get CPU usage for a user.

#### `getSpawnStatus(userId: string): boolean`
Get spawn status for a user.

#### `getConsoleLogs(userId: string): string[]`
Get console logs for a user.

### Configuration

#### `setTestRoom(roomName: string): void`
Set test room for bot deployments.

#### `getTestRoom(): string`
Get current test room.

### Utilities

#### `executeCli(command: string): string`
Execute raw CLI command for advanced usage.

## Testing Patterns

### Basic Test Structure

```typescript
import { ScreepsFunctionalTestHarness } from 'screeps-functional-test-harness';

describe('Bot Functional Tests', () => {
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

  it('should initialize memory correctly', async () => {
    const deployment = await harness.deployBot('./dist/main.js');
    
    const execution = await harness.monitorExecution(deployment.userId, {
      duration: 30,
      expectations: { minTicks: 5 }
    });
    
    expect(execution.memoryInitialized).to.be.true;
    
    const memory = await harness.getMemoryState(deployment.userId);
    expect(memory).to.not.be.null;
    expect(memory.initialized).to.be.true;
  });
});
```

### Memory Pattern Testing

```typescript
it('should manage creeps correctly', async () => {
  const deployment = await harness.deployBot('./dist/main.js');
  
  // Wait for some activity
  await harness.monitorExecution(deployment.userId, {
    duration: 60,
    expectations: { minTicks: 20 }
  });
  
  // Check memory patterns
  const patterns = await harness.checkMemoryPatterns(deployment.userId, {
    'creepCounter': null, // Should exist
    'creeps.Worker1.role': 'harvester',
    'creeps.Worker1.project': null,
    'projects': null
  });
  
  expect(patterns['creepCounter']).to.be.true;
  expect(patterns['creeps.Worker1.role']).to.be.true;
});
```

### Scenario Testing

```typescript
it('should handle resource shortage scenario', async () => {
  // Preload specific memory state
  await harness.preloadMemory('test_user', {
    creeps: {
      Worker1: { role: 'harvester', energy: 0 }
    },
    resources: { energy: 0 },
    scenario: 'resource_shortage'
  });
  
  const deployment = await harness.deployBot('./dist/main.js');
  
  // Monitor how bot handles the scenario
  const execution = await harness.monitorExecution(deployment.userId, {
    duration: 120,
    expectations: { minTicks: 30 }
  });
  
  expect(execution.cpuUsed).to.be.true;
  
  // Verify bot adapted to scenario
  const finalMemory = await harness.getMemoryState(deployment.userId);
  expect(finalMemory.scenario).to.equal('resource_shortage');
});
```

## Container Requirements

### Docker Compose Setup

Create a `docker-compose.functional.yml` file in your project:

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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:21026/cli"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  screeps_data:
```

### FileBot Mod

The library requires the FileBot mod for code injection. Ensure it's available in your container image or mount it appropriately.

## Error Handling

The library is designed to handle errors gracefully:

- **Container runtime errors**: Automatic detection and fallback between Docker/Finch
- **Server startup failures**: Configurable timeouts and retry logic
- **Memory parsing errors**: Robust handling of various undefined states
- **CLI command failures**: Graceful degradation with appropriate defaults

## Performance Considerations

- **Setup cost**: Container setup is expensive (~30-60 seconds), do it once per test suite
- **Reset cost**: Game state reset is fast (~2 seconds), suitable for between tests
- **Memory operations**: Generally fast, but avoid excessive polling
- **Monitoring duration**: Balance thoroughness with test speed

## Troubleshooting

### Common Issues

1. **"No container runtime found"**: Install Docker or Finch
2. **"Server failed to start"**: Check container image and ports
3. **"FileBot mod failed to load"**: Verify mod file exists and is accessible
4. **Memory parsing errors**: Check for invalid JSON in memory state

### Debug Mode

Enable live inspection mode for debugging:

```typescript
await harness.cleanup(true); // Preserves containers for inspection
```

This provides access to:
- Game server: http://localhost:21025
- CLI interface: http://localhost:21026/cli

### Logging

The library provides detailed console output for troubleshooting. Set appropriate timeouts for operations to avoid premature failures.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the test suite: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.