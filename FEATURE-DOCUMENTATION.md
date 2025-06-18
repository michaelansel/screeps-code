# Screeps AI Feature Documentation

> Comprehensive guide to all implemented features and capabilities in this Screeps AI codebase
> Generated: 2025-06-18

## Table of Contents

1. [Core Features](#core-features)
2. [Game Systems](#game-systems)
3. [Framework Architecture](#framework-architecture)
4. [Testing Infrastructure](#testing-infrastructure)
5. [Developer Tools](#developer-tools)
6. [Memory Management](#memory-management)
7. [Extension System](#extension-system)
8. [API Reference](#api-reference)

## Core Features

### Project/Task Framework

The AI uses a hierarchical control system for managing creep behavior:

#### Projects
Long-term goals that define a creep's overall purpose.

**Available Projects:**
- `HarvestEnergyProject` - Manages energy harvesting workflow
- `DoNothingProject` - Minimal project for testing

**Usage Example:**
```typescript
// Assigning a project to a creep
creep.startProject(HarvestEnergyProject);

// Project automatically manages task transitions
// HarvestEnergyTask → DepositEnergyTask (when full)
```

#### Tasks
Short-term actions that creeps perform to achieve project goals.

**Available Tasks:**
- `HarvestEnergyTask` - Harvest energy from sources
- `DepositEnergyTask` - Deposit energy to spawns/extensions
- `DoNothingTask` - No-op task for testing

**Task Lifecycle:**
1. Project assigns task via `creep.startTask(TaskClass, config)`
2. Task executes via `task.run(creep)`
3. Task completes via `creep.stopTask()`
4. Project assigns next task

### Source Planning

The `SourcePlanner` manages optimal assignment of creeps to energy sources.

**Features:**
- Maximum 3 creeps per source
- Dynamic reassignment when creeps die
- Room-aware assignment logic
- Persistent assignments across ticks

**Usage:**
```typescript
// In main loop
SourcePlanner.instance.assignSources();

// Accessing assignments
const assignments = SourcePlanner.instance.creepsBySourceInRoom(room);
```

## Game Systems

### Energy Harvesting

Complete energy harvesting cycle implementation:

1. **Spawning**: Creeps spawn with `[WORK, CARRY, MOVE]` body
2. **Assignment**: SourcePlanner assigns available sources
3. **Harvesting**: Creeps move to and harvest from sources
4. **Depositing**: Full creeps return energy to spawn/extensions
5. **Repeat**: Cycle continues automatically

### Creep Spawning

Basic spawning system in `main.ts`:

```typescript
// Spawns basic worker creeps
Game.spawns.Spawn1.spawnCreep(
  [WORK, CARRY, MOVE], 
  `Worker${Memory.creepCounter}`,
  { memory: { project: { id: HarvestEnergyProjectId } } }
);
```

**Features:**
- Automatic naming with counter
- Project assignment on spawn
- Energy requirement checking

## Framework Architecture

### Memory-Backed Classes

The `MemoryBackedClass` system enables persistent object state:

**Key Concepts:**
- Automatic serialization/deserialization
- Lazy loading from Memory
- Type-safe property access
- Support for game object references

**Example:**
```typescript
class MyPlanner extends MemoryBackedClass<MyPlanner> {
  private creeps: Record<string, CreepData> = {};
  
  protected static get memoryKey(): string {
    return "MyPlanner";
  }
  
  protected static get serde(): SerDeFunctions<MyPlanner> {
    return {
      creeps: proxyMapOfRecords(CreepDataSerDe)
    };
  }
}
```

### Runtime Extensions

The extension system adds functionality to Screeps objects:

**Extended Objects:**
- `Creep` - Task/project management, logic
- `Memory` - Global memory extensions
- `CreepMemory` - Per-creep memory structure

**Extension Pattern:**
```typescript
// Define extension class
class CreepLogicExtension {
  public run(this: Creep): void {
    // Custom logic
  }
}

// Applied automatically at runtime
creep.run(); // Now available
```

## Testing Infrastructure

### Three-Layer Testing Approach

#### 1. Unit Tests (Fast)
- **Framework**: Mocha + Chai + Sinon
- **Location**: `test/unit/`
- **Coverage**: 83 passing tests
- **Mock Strategy**: Complete Game/Memory mocking

#### 2. Integration Tests (Medium)
- **Types**: Framework validation, build verification
- **Location**: `test/integration/`
- **Coverage**: 37 passing tests
- **Features**: Real module loading, build artifact analysis

#### 3. Functional Tests (Comprehensive)
- **Infrastructure**: ARM64 Screeps server
- **Technology**: FileBot mod, Docker/Finch containers
- **Evidence Points**: 4/6 validation methodology
- **Bot Size**: 318KB functional bot

### Test Execution

```bash
# Run all tests
npm test

# Run specific suites
npm run test:unit
npm run test:integration  
npm run test:functional

# Functional test management
npm run test:functional:env:setup    # Setup environment
npm run test:functional:env:clean    # Clean up
```

## Developer Tools

### Logging System

Configurable logging with component filtering:

```typescript
// Enable logging for specific components
Logger.enable("task.HarvestEnergyTask");
Logger.enable("project.*"); // Wildcard support

// Usage in code
Logger.info("component.name", "Message", data);
Logger.warn("component.name", "Warning", data);
Logger.error("component.name", "Error", error);
```

### Error Mapping

Source-mapped error tracking for TypeScript debugging:

```typescript
// Automatically wraps main loop
export const loop = ErrorMapper.wrapLoop(() => {
  // Your main loop code
});
```

**Features:**
- Maps JavaScript errors to TypeScript source
- Preserves stack traces
- Improves debugging experience

### Console Utilities

Helper functions for in-game console usage:

```typescript
// Available in game console
registerConsoleUtils({
  clearMemory: () => { /* ... */ },
  listCreeps: () => { /* ... */ },
  // Custom utilities
});
```

## Memory Management

### Memory Structure

```typescript
interface Memory {
  creepCounter?: number;          // Global creep naming counter
  SourcePlanner?: SourcePlannerMemory;  // Planner state
  creeps: { [name: string]: CreepMemory };  // Standard Screeps
}

interface CreepMemory {
  project?: {
    id: ProjectId;
    config?: ProjectConfig<any>;
  };
  task?: {
    id: TaskId;
    config?: TaskConfig<any>;
  };
}
```

### Memory Patterns

**Automatic Cleanup:**
```typescript
// In main.ts
for (const name in Memory.creeps) {
  if (!Game.creeps[name]) {
    delete Memory.creeps[name];
  }
}
```

**Persistent State:**
- Projects and tasks store configuration in creep memory
- Planners use MemoryBackedClass for complex state
- Game object references stored as IDs

## Extension System

### How Extensions Work

1. **Discovery**: Find extendable objects at runtime
2. **Application**: Apply mixins to prototypes
3. **Type Safety**: TypeScript declaration merging

### Creating Extensions

```typescript
// 1. Define extension interface
interface CreepExtension {
  customMethod(): void;
}

// 2. Implement extension class
class CreepCustomExtension {
  public customMethod(this: Creep): void {
    // Implementation
  }
}

// 3. Register with system
declare global {
  interface Creep extends CreepExtension {}
}

// 4. Apply mixins
applyMixins(Creep, [CreepCustomExtension]);
```

## API Reference

### Project API

```typescript
interface ProjectBehavior<T extends ProjectId> {
  readonly id: T;
  readonly type: typeof ProjectBehaviorSymbol;
  start(creep: Creep, config?: ProjectConfig<T>): void;
  run(creep: Creep, config: ProjectConfig<T>): void;
  stop(creep: Creep, config: ProjectConfig<T>): void;
}
```

### Task API

```typescript
interface TaskBehavior<T extends TaskId> {
  readonly id: T;
  readonly type: typeof TaskBehaviorSymbol;
  start(creep: Creep, config?: TaskConfig<T>): void;
  run(creep: Creep, config: TaskConfig<T>): void;
  stop(creep: Creep, config: TaskConfig<T>): void;
}
```

### Creep Extensions API

```typescript
interface Creep {
  // Project management
  project: ProjectBehavior<ProjectId> | null;
  startProject<T extends ProjectId>(
    project: ProjectBehavior<T>, 
    config?: ProjectConfig<T>
  ): void;
  stopProject(): void;
  
  // Task management
  task: TaskBehavior<TaskId> | null;
  startTask<T extends TaskId>(
    task: TaskBehavior<T>, 
    config?: TaskConfig<T>
  ): void;
  stopTask(): void;
  
  // Logic execution
  run(): void;
}
```

### MemoryBackedClass API

```typescript
abstract class MemoryBackedClass<T extends object> {
  // Singleton access
  static get instance(): T;
  
  // Memory key for storage
  protected static get memoryKey(): string;
  
  // Serialization configuration
  protected static get serde(): SerDeFunctions<T>;
  
  // Manual persistence
  protected persist(): void;
}
```

## Performance Characteristics

Based on integration testing:

- **Main loop execution**: ~0.13ms max
- **50 creeps handling**: ~0.02ms
- **Memory footprint**: ~230KB for 100 executions
- **Bundle size**: 311KB production build
- **Scaling**: Linear with creep count

## Best Practices

### Code Organization
- One class per file
- Mirror src/ structure in test/
- Use index.ts for exports
- Follow existing patterns

### Memory Usage
- Minimize memory writes
- Use IDs for game object references
- Clean up unused memory
- Leverage MemoryBackedClass for complex state

### Testing
- Write unit tests for logic
- Use integration tests for interactions
- Reserve functional tests for validation
- Mock external dependencies

### Performance
- Cache expensive lookups
- Minimize Memory access
- Use early returns
- Profile CPU usage

## Future Extensibility

The framework is designed for growth:

1. **New Projects**: Extend `Project` base class
2. **New Tasks**: Extend `Task` base class
3. **New Planners**: Extend `MemoryBackedClass`
4. **New Extensions**: Use mixin pattern
5. **New Features**: Follow existing architecture

This modular design ensures new features integrate seamlessly with existing systems while maintaining code quality and performance.