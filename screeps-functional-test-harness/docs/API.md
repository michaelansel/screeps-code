# API Documentation

This document provides detailed API documentation for the Screeps Functional Test Harness.

## Table of Contents

- [Core Classes](#core-classes)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Core Classes

### ScreepsFunctionalTestHarness

The main orchestrator class providing unified API for all testing operations.

#### Constructor

```typescript
constructor(config?: ServerConfig)
```

Creates a new test harness instance.

**Parameters:**
- `config` (optional): Server configuration object

**Example:**
```typescript
const harness = new ScreepsFunctionalTestHarness({
  containerImage: 'screepers/screeps-launcher:functional',
  timeout: 120000
});
```

#### Methods

##### Lifecycle Management

**`setup(): Promise<void>`**

Setup the test environment. This is an expensive operation that should be done once per test suite.

- Starts container environment
- Waits for server to be ready
- Installs and verifies FileBot mod
- Sets up test infrastructure

**Throws:** Error if container runtime is not available or server fails to start.

**`cleanup(preserveForInspection?: boolean): Promise<void>`**

Cleanup the test environment.

**Parameters:**
- `preserveForInspection` (default: false): If true, leaves containers running for manual inspection

**`resetGameState(): Promise<void>`**

Reset game state for a fresh test. This is a fast operation suitable for between-test cleanup.

- Resets all game data
- Clears bot deployment state
- Preserves container environment

**`isReady(): boolean`**

Check if the harness is ready for testing operations.

**Returns:** true if setup is complete and server is ready

##### Bot Deployment & Monitoring

**`deployBot(codePath: string, options?: DeploymentOptions): Promise<DeploymentResult>`**

Deploy bot code to the server.

**Parameters:**
- `codePath`: Absolute path to bot code file
- `options` (optional): Deployment configuration

**DeploymentOptions:**
```typescript
interface DeploymentOptions {
  username?: string;    // Bot username (default: 'TestBot')
  room?: string;        // Target room (default: 'W12N12')
  cpu?: number;         // CPU limit (default: 100)
  cpuAvailable?: number; // Available CPU (default: 10000)
}
```

**Returns:** DeploymentResult object

**Throws:** Error if server is not ready

**`monitorExecution(userId: string, options: MonitorOptions): Promise<ExecutionResult>`**

Monitor bot execution and collect evidence of activity.

**Parameters:**
- `userId`: User ID from deployment result
- `options`: Monitoring configuration

**Returns:** ExecutionResult with activity evidence

**`getLastDeployment(): DeploymentResult`**

Get the last deployment result.

**Throws:** Error if no deployment has been made

**`hasValidDeployment(): boolean`**

Check if there's a valid deployment without throwing.

##### Simulation Control

**`getSimulationState(): SimulationState`**

Get current simulation state including tick, pause status, and CPU usage.

**`pauseSimulation(): void`**

Pause the simulation.

**`resumeSimulation(): void`**

Resume the simulation.

**`waitForTicks(ticks: number): Promise<void>`**

Wait for a specific number of game ticks to advance.

**Parameters:**
- `ticks`: Number of ticks to wait

**Timeout:** 2 minutes maximum

**`getGameTick(): number`**

Get current game tick.

##### Memory Management

**`getMemoryState(userId: string): Promise<any>`**

Get memory state for a user.

**Returns:** Memory object or null if no memory exists

**`setMemoryState(userId: string, memory: any): Promise<{success: boolean; error?: string}>`**

Set memory state for a user.

**`preloadMemory(userId: string, memory: any): Promise<{success: boolean; error?: string}>`**

Preload memory state for scenario testing. Alias for `setMemoryState`.

**`mergeMemory(userId: string, memoryUpdate: any): Promise<{success: boolean; error?: string}>`**

Merge memory state with existing data.

**`checkMemoryPatterns(userId: string, patterns: Record<string, any>): Promise<Record<string, boolean>>`**

Check memory patterns for validation. Supports nested properties using dot notation.

**Pattern Examples:**
```typescript
const patterns = {
  'creepCounter': 5,              // Exact value match
  'projects': null,               // Check existence
  'creeps.worker1.role': 'harvester', // Nested property
  'creeps.worker1.energy': null   // Check nested existence
};
```

**`getMemoryStats(userId: string): Promise<MemoryStats>`**

Get memory statistics for analysis.

**`getAllUsersWithMemory(): Promise<UserInfo[]>`**

Get all users with their memory data. Returns an array of UserInfo objects containing user IDs and their associated memory.

##### Game Objects & State

**`getGameObjects(userId: string): Promise<GameObjects>`**

Get game objects for a user.

**`generateRoom(roomName: string): Promise<void>`**

Generate a room for testing.

**`getCpuUsage(userId: string): number`**

Get CPU usage for a user.

**`getSpawnStatus(userId: string): boolean`**

Get spawn status for a user.

**`getConsoleLogs(userId: string): string[]`**

Get console logs for a user.

##### Configuration

**`setTestRoom(roomName: string): void`**

Set test room for bot deployments.

**`getTestRoom(): string`**

Get current test room.

##### Utilities

**`executeCli(command: string): string`**

Execute raw CLI command for advanced usage.

### ContainerManager

Manages Docker/Finch container runtime operations.

#### Key Methods

**`getRuntime(): ContainerRuntime`**

Get information about the detected container runtime.

**`isRunning(): boolean`**

Check if containers are currently running.

**`buildContainer(): Promise<void>`**

Build the container image.

**`startContainers(): Promise<void>`**

Start the container environment.

**`stopContainers(): Promise<void>`**

Stop and remove containers.

### ServerManager

Manages Screeps server lifecycle and communication.

#### Key Methods

**`setup(): Promise<void>`**

Setup server environment.

**`cleanup(preserveForInspection?: boolean): Promise<void>`**

Cleanup server environment.

**`resetGameState(): Promise<void>`**

Reset game state.

**`curlCli(script: string): string`**

Execute CLI command on server.

### GameStateManager

Manages game state operations and queries.

#### Key Methods

**`getMemoryState(userId: string): Promise<any>`**

Get user memory state.

**`setMemoryState(userId: string, memory: any): Promise<{success: boolean; error?: string}>`**

Set user memory state.

**`getGameObjects(userId: string): Promise<GameObjects>`**

Get game objects for user.

### BotManager

Manages bot deployment and monitoring.

#### Key Methods

**`deployBot(codePath: string, options?: DeploymentOptions): Promise<DeploymentResult>`**

Deploy bot code.

**`monitorExecution(userId: string, options: MonitorOptions): Promise<ExecutionResult>`**

Monitor bot execution.

## Type Definitions

### ServerConfig

```typescript
interface ServerConfig {
  containerImage?: string;
  composeFile?: string;
  ports?: {
    game: number;
    cli: number;
  };
  timeout?: number;
}
```

### DeploymentResult

```typescript
interface DeploymentResult {
  success: boolean;
  userId: string;
  codeSize: number;
  room: string;
  error?: string;
}
```

### ExecutionResult

```typescript
interface ExecutionResult {
  ticksAdvanced: number;
  cpuUsed: boolean;
  spawnActive: boolean;
  memoryInitialized: boolean;
  consoleOutput: string[];
}
```

### MonitorOptions

```typescript
interface MonitorOptions {
  duration: number; // seconds
  expectations: {
    minTicks: number;
    cpuUsed?: boolean;
    spawnActive?: boolean;
  };
}
```

### GameObjects

```typescript
interface GameObjects {
  spawns: { name: string; energy: number }[];
  creeps: { name: string; memory: any }[];
  sources: { id: string; energy: number }[];
  total: number;
}
```

### MemoryStats

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

### SimulationState

```typescript
interface SimulationState {
  tick: number;
  paused: boolean;
  cpu: number;
}
```

### UserInfo

```typescript
interface UserInfo {
  userId: string;
  memory: any;
}
```

Information about a user and their memory state, returned by `getAllUsersWithMemory()`.

## Error Handling

The library is designed to handle errors gracefully:

### Common Error Scenarios

1. **Container Runtime Not Available**
   - Thrown during ContainerManager initialization
   - Message: "No container runtime found. Install Docker or Finch."

2. **Server Not Ready**
   - Thrown when attempting operations before setup
   - Message: "Server not ready. Call ServerManager.setup() first"

3. **File Not Found**
   - Thrown during bot deployment with invalid path
   - Returns DeploymentResult with success: false

4. **Memory Parse Errors**
   - Handled gracefully, returns null for invalid memory states

5. **CLI Command Failures**
   - Operations return appropriate defaults or empty results

### Error Recovery

- **Setup failures**: Clean up partially created resources
- **Deployment failures**: Return detailed error information
- **Memory operations**: Graceful degradation with null/empty returns
- **Container operations**: Automatic retry logic where appropriate

## Best Practices

### Performance Optimization

1. **Setup Once**: Call `setup()` once per test suite, not per test
2. **Reset Between Tests**: Use `resetGameState()` for fast cleanup
3. **Monitor Duration**: Balance thoroughness with test speed
4. **Resource Cleanup**: Always call `cleanup()` in test teardown

### Test Organization

1. **Shared Setup**: Use before/after hooks for environment management
2. **Isolation**: Reset state between tests to prevent interference
3. **Timeouts**: Set appropriate timeouts for different operations
4. **Error Handling**: Test both success and failure scenarios

### Memory Management

1. **Pattern Validation**: Use `checkMemoryPatterns()` for robust validation
2. **Nested Properties**: Use dot notation for complex memory structures
3. **Scenario Testing**: Use `preloadMemory()` for specific test scenarios
4. **Statistics**: Use `getMemoryStats()` for analysis and debugging

### Container Management

1. **Runtime Detection**: Library automatically detects Docker/Finch
2. **Resource Limits**: Configure appropriate timeouts and resource limits
3. **Development Mode**: Use `preserveForInspection` for debugging
4. **Cleanup**: Ensure proper cleanup to avoid resource leaks