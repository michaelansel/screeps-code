# Screeps Development Framework

This document describes reusable development tools and patterns that can be adopted by any Screeps player, regardless of their specific strategy or bot architecture. These tools are designed to be portable and make no assumptions about your game objectives or tactical approach.

## Core Framework Components

### MemoryBackedClass System
A TypeScript utility for persisting complex object state in Screeps Memory with automatic serialization and deserialization.

#### Purpose
- Persist class instances across game ticks
- Automatic serialization of complex data structures
- Type-safe memory access with lazy loading
- Handle game object references via ID storage

#### Basic Usage Pattern
```typescript
interface MyDataMemory {
  counter?: number;
  assignments?: Record<string, string>;
}

class MyPersistentClass extends MemoryBackedClass<MyPersistentClass> {
  private counter: number = 0;
  private assignments: Record<string, string> = {};
  
  protected static get memoryKey(): string {
    return "MyPersistentClass"; // Key in global Memory object
  }
  
  protected static get serde(): SerDeFunctions<MyPersistentClass> {
    return {
      counter: {
        required: false,
        fromMemory: (memory) => memory.counter || 0,
        toMemory: (memory, value) => {
          memory.counter = value;
          return true;
        }
      },
      assignments: {
        required: false,
        fromMemory: (memory) => memory.assignments || {},
        toMemory: (memory, value) => {
          memory.assignments = value;
          return true;
        }
      }
    };
  }
  
  public increment(): void {
    this.counter++;
    this.persist(); // Save to memory
  }
}

// Access the singleton instance
const instance = MyPersistentClass.instance;
instance.increment();
```

#### Key Concepts
- **SerDeFunctions**: Define how each property serializes to/from memory
- **Lazy Loading**: Properties loaded from memory on first access
- **Game Object IDs**: Store `Id<GameObjectType>` instead of objects themselves
- **Singleton Pattern**: Use `ClassName.instance` for global access

### Runtime Extension System
A pattern for adding custom methods to existing Screeps objects like Creep, Spawn, Room, etc.

#### Purpose
- Add functionality to game objects without modifying prototypes directly
- Maintain type safety with TypeScript
- Organize extensions into logical modules
- Enable/disable extensions as needed

#### Extension Pattern
```typescript
// 1. Define extension class
class CreepUtilityExtension {
  public isIdle(this: Creep): boolean {
    return !this.memory.task && this.store.getFreeCapacity() === 0;
  }
  
  public findNearestSource(this: Creep): Source | null {
    return this.pos.findClosestByPath(FIND_SOURCES);
  }
}

// 2. Extend TypeScript interface
declare global {
  interface Creep {
    isIdle(): boolean;
    findNearestSource(): Source | null;
  }
}

// 3. Apply extension
applyMixins(Creep, [CreepUtilityExtension]);

// 4. Use extended functionality
creep.isIdle(); // Now available on all Creep objects
```

#### Extension Organization
- **Base Extensions**: Core functionality additions
- **Feature Extensions**: Specific feature-related methods
- **Utility Extensions**: General helper methods
- **One Extension Per File**: Keep extensions focused and testable

### Project/Task Framework
A hierarchical behavior system for managing creep actions and long-term goals.

#### Framework Architecture
```typescript
// Core interfaces (implement these for your specific needs)
export interface ProjectBehavior<T extends ProjectId> {
  readonly id: T;
  readonly type: typeof ProjectBehaviorSymbol;
  
  start(creep: Creep, config?: ProjectConfig<T>): void;
  run(creep: Creep, config: ProjectConfig<T>): void;
  stop(creep: Creep, config: ProjectConfig<T>): void;
}

export interface TaskBehavior<T extends TaskId> {
  readonly id: T;
  readonly type: typeof TaskBehaviorSymbol;
  
  start(creep: Creep, config?: TaskConfig<T>): void;
  run(creep: Creep, config: TaskConfig<T>): void;
  stop(creep: Creep, config: TaskConfig<T>): void;
}

// Registration system
const projects = new Map<ProjectId, ProjectBehavior<ProjectId>>();
const tasks = new Map<TaskId, TaskBehavior<TaskId>>();

export function registerProject<T extends ProjectId>(project: ProjectBehavior<T>): void {
  projects.set(project.id, project as ProjectBehavior<ProjectId>);
}

export function registerTask<T extends TaskId>(task: TaskBehavior<T>): void {
  tasks.set(task.id, task as TaskBehavior<TaskId>);
}
```

#### Benefits
- **Separation of Concerns**: Projects handle strategy, tasks handle tactics
- **Reusable Components**: Tasks can be shared across different projects
- **State Management**: Automatic persistence of project/task state
- **Type Safety**: Full TypeScript support for configurations
- **Testing**: Each component can be unit tested independently

### Functional Testing Infrastructure
A comprehensive testing framework for validating bot behavior in real Screeps environments.

#### Core Components
- **Test Harness**: Manages container lifecycle and server interaction
- **FileBot Mod**: File-based code injection avoiding shell parameter issues
- **Memory Monitoring**: Real-time validation of bot memory state
- **Evidence Collection**: Multi-point validation for production readiness

#### Testing Patterns
```typescript
// Example functional test structure
describe("Bot Behavior Validation", () => {
  const harness = new FunctionalTestHarness();
  
  before(async () => {
    await harness.setupEnvironment();
  });
  
  it("should demonstrate core functionality", async () => {
    // Deploy bot code
    const deployment = await harness.deployBot();
    
    // Wait for execution
    await harness.waitForTicks(deployment.userId, 20);
    
    // Validate behavior through memory state
    const memory = await harness.getMemoryState(deployment.userId);
    expect(memory).to.have.property('creepCounter');
    
    // Validate through game objects
    const objects = await harness.getGameObjects(deployment.userId);
    expect(objects.creeps.length).to.be.greaterThan(0);
  });
});
```

## Development Tools

### Logging System
Configurable logging with filtering and context:

```typescript
// Basic usage
Logger.info("module.name", "Message", { contextData });
Logger.warn("combat", "Low energy", { energy: creep.store.energy });

// Configure logging levels
Logger.enable("*"); // All logs
Logger.enable("task.*"); // All task-related logs  
Logger.enable("harvester"); // Specific module only
```

### Error Handling
Source-mapped error reporting:

```typescript
// Wrap main loop for proper stack traces
export const loop = ErrorMapper.wrapLoop(() => {
  // Your main game logic here
});

// Error handling in components
try {
  result = creep.harvest(source);
} catch (error) {
  Logger.error("harvest", "Failed to harvest", { error: error.message });
}
```

### Memory Management Helpers
Utilities for working with Screeps Memory:

```typescript
// Clean dead creep memory
MemoryHelpers.cleanDeadCreeps();

// Safe memory access
const creepMemory = MemoryHelpers.getCreepMemory(creepName);
const roomMemory = MemoryHelpers.getRoomMemory(roomName);

// Memory size monitoring
const memorySize = MemoryHelpers.getMemorySize();
Logger.info("memory", `Memory usage: ${memorySize} bytes`);
```

## Build and Deployment Tools

### TypeScript Configuration
Recommended TypeScript setup for Screeps development:

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2018",
    "lib": ["ES2018"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### Code Quality Tools
ESLint and Prettier configuration:

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    "@typescript-eslint/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  rules: {
    "@typescript-eslint/explicit-member-accessibility": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "camelcase": "error",
    "max-classes-per-file": ["error", 1]
  }
};
```

### Testing Framework
Multi-layer testing with different validation levels:

- **Unit Tests**: Fast component testing with mocks
- **Integration Tests**: Component interaction testing
- **Functional Tests**: End-to-end validation in real Screeps environment

```bash
# Testing commands
npm run test               # All tests
npm run test:unit          # Unit tests only (~200ms)
npm run test:integration   # Integration tests (~500ms) 
npm run test:functional    # Functional tests (~60s+)
```

## Best Practices

### Framework Usage Guidelines

1. **Start Simple**: Begin with basic extensions and memory patterns
2. **Test Early**: Write unit tests for custom components
3. **Iterate Gradually**: Add complexity incrementally
4. **Document Patterns**: Record your architectural decisions
5. **Monitor Performance**: Watch CPU usage and memory consumption

### Portable Design Principles

1. **No Strategy Assumptions**: Framework code shouldn't assume specific game strategies
2. **Configuration Over Convention**: Use config objects for customization
3. **Interface Segregation**: Define clear boundaries between components
4. **Dependency Injection**: Allow components to be swapped or mocked
5. **Error Recovery**: Handle failures gracefully with fallback behaviors

### Extension Guidelines

1. **Focused Extensions**: Each extension should have a single responsibility
2. **Minimal Dependencies**: Avoid complex interdependencies between extensions
3. **Optional Features**: Extensions should be independently enable/disable-able
4. **Performance Conscious**: Consider CPU impact of extension methods
5. **Type Safety**: Maintain full TypeScript support

This framework provides a foundation for building sophisticated Screeps bots while remaining flexible enough to support any strategy or architectural approach. The tools are designed to be adopted incrementally - you can start with simple extensions and gradually adopt more complex patterns as your bot evolves.