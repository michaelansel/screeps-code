# Implementation Guide

This document covers the TypeScript-specific implementation details, including interfaces, classes, coding patterns, and development conventions.

## Project Structure

```
src/
├── main.ts                 # Main entry point and game loop
├── extensions/             # Runtime extensions for Screeps objects
│   ├── Creep/             # Creep object extensions
│   ├── Memory.ts          # Global memory interface extensions
│   └── CreepMemory.ts     # Creep memory interface extensions
├── planners/              # Strategic decision-making modules
│   └── SourcePlanner.ts   # Source assignment logic
├── projects/              # Long-term creep roles and behaviors
│   ├── HarvestEnergyProject.ts
│   ├── BuilderProject.ts
│   └── UpgradeControllerProject.ts
├── tasks/                 # Short-term creep actions
│   ├── HarvestEnergyTask.ts
│   ├── DepositEnergyTask.ts
│   └── WithdrawEnergyTask.ts
└── utils/                 # Utility classes and helper functions
    ├── MemoryBackedClass.ts
    ├── RoleManager.ts
    └── EnergySourceManager.ts
```

## Core Interfaces

### Project System

```typescript
// Project identification and configuration
export const HarvestEnergyProjectId = "HarvestEnergyProject" as Id<Project>;

export interface ProjectConfig<T extends ProjectId> {
  readonly type: typeof ProjectConfigSymbol;
  readonly id: T;
}

export interface ProjectBehavior<T extends ProjectId> {
  readonly id: T;
  readonly type: typeof ProjectBehaviorSymbol;
  
  start(creep: Creep, config?: ProjectConfig<T>): void;
  run(creep: Creep, config: ProjectConfig<T>): void;
  stop(creep: Creep, config: ProjectConfig<T>): void;
}

// Registration system
export function registerProject<T extends ProjectId>(project: ProjectBehavior<T>): void {
  projects.set(project.id, project as ProjectBehavior<ProjectId>);
}
```

### Task System

```typescript
// Task identification and configuration
export const HarvestEnergyTaskId = "HarvestEnergyTask" as Id<Task>;

export interface TaskConfig<T extends TaskId> {
  readonly type: typeof TaskConfigSymbol;
  readonly id: T;
}

export interface TaskBehavior<T extends TaskId> {
  readonly id: T;
  readonly type: typeof TaskBehaviorSymbol;
  
  start(creep: Creep, config?: TaskConfig<T>): void;
  run(creep: Creep, config: TaskConfig<T>): void;
  stop(creep: Creep, config: TaskConfig<T>): void;
}

// Specific task configurations
export interface HarvestEnergyTaskConfig extends TaskConfig<typeof HarvestEnergyTaskId> {
  source: Id<Source>;
}

// HarvestEnergyTask now integrates with SourcePlanner
// Ensures proper distribution of harvesters across sources

export interface PickupEnergyTaskConfig extends TaskConfig<typeof PickupEnergyTaskId> {
  target?: Id<Resource<ResourceConstant> | Tombstone>;
  targetType?: 'resource' | 'tombstone';
  maxRange?: number;
}
```

### Memory System

```typescript
// Global memory extensions
declare global {
  interface Memory {
    creepCounter?: number;
    SourcePlanner?: SourcePlannerMemory;
  }
  
  interface CreepMemory {
    project?: CreepProjectMemory;
    task?: CreepTaskMemory;
  }
}

// Creep memory structures
interface CreepProjectMemory {
  id: ProjectId;
  config?: ProjectConfig<any>;
}

interface CreepTaskMemory {
  id: TaskId;
  config?: TaskConfig<any>;
}
```

## Implementation Patterns

### Creating a New Project

```typescript
// 1. Define the project ID and config interface
export const MyProjectId = "MyProject" as Id<Project>;

export interface MyProjectConfig extends ProjectConfig<typeof MyProjectId> {
  targetRoom?: string;
  priority?: number;
}

// 2. Implement the project behavior
export const MyProject: ProjectBehavior<typeof MyProjectId> = {
  id: MyProjectId,
  type: ProjectBehaviorSymbol,
  
  start(creep: Creep, config?: MyProjectConfig): void {
    ProjectHelpers.start(creep, MyProject, config);
  },
  
  run(creep: Creep, config: MyProjectConfig): void {
    // Project logic - assign tasks based on creep state
    if (creep.store.getFreeCapacity() > 0) {
      creep.startTask(HarvestEnergyTask, { source: this.selectSource(creep) });
    } else {
      creep.startTask(DepositEnergyTask, { prioritizeStorage: false });
    }
  },
  
  stop(creep: Creep, config: MyProjectConfig): void {
    ProjectHelpers.stop(creep);
  }
};

// 3. Register the project
registerProject(MyProject);
```

### Creating a New Task

```typescript
// 1. Define task ID and config
export const MyTaskId = "MyTask" as Id<Task>;

export interface MyTaskConfig extends TaskConfig<typeof MyTaskId> {
  target: Id<Structure>;
  maxRetries?: number;
}

// 2. Implement task behavior
export const MyTask: TaskBehavior<typeof MyTaskId> = {
  id: MyTaskId,
  type: TaskBehaviorSymbol,
  
  start(creep: Creep, config?: MyTaskConfig): void {
    TaskHelpers.start(creep, MyTask, config);
  },
  
  run(creep: Creep, config: MyTaskConfig): void {
    const target = Game.getObjectById(config.target);
    if (!target) {
      creep.stopTask();
      return;
    }
    
    if (creep.pos.isNearTo(target)) {
      // Perform the actual task action
      const result = creep.transfer(target, RESOURCE_ENERGY);
      if (result === OK) {
        creep.stopTask(); // Task completed successfully
      }
    } else {
      creep.moveTo(target);
    }
  },
  
  stop(creep: Creep, config: MyTaskConfig): void {
    // Cleanup if needed
  }
};

// 3. Register the task
registerTask(MyTask);
```

### Using MemoryBackedClass

```typescript
// Define interfaces for memory storage
interface MyPlannerMemory {
  assignments?: Record<string, string>;
  lastUpdate?: number;
}

interface MyPlannerData {
  assignments: Record<string, string>;
  lastUpdate: number;
}

class MyPlanner extends MemoryBackedClass<MyPlanner> {
  private assignments: Record<string, string> = {};
  private lastUpdate: number = Game.time;
  
  protected static get memoryKey(): string {
    return "MyPlanner";
  }
  
  protected static get serde(): SerDeFunctions<MyPlanner> {
    return {
      assignments: {
        required: false,
        fromMemory: (memory) => memory.assignments || {},
        toMemory: (memory, value) => {
          memory.assignments = value;
          return true;
        }
      },
      lastUpdate: {
        required: false,
        fromMemory: (memory) => memory.lastUpdate || Game.time,
        toMemory: (memory, value) => {
          memory.lastUpdate = value;
          return true;
        }
      }
    };
  }
  
  public assign(creepName: string, targetId: string): void {
    this.assignments[creepName] = targetId;
    this.lastUpdate = Game.time;
    this.persist(); // Save changes to memory
  }
  
  public getAssignment(creepName: string): string | undefined {
    return this.assignments[creepName];
  }
}

// Usage
MyPlanner.instance.assign("Worker1", "source123");
const assignment = MyPlanner.instance.getAssignment("Worker1");
```

### Extending Creep Objects

```typescript
// 1. Define the extension class
class CreepTaskingExtension {
  public startTask<T extends TaskId>(
    this: Creep,
    task: TaskBehavior<T>,
    config?: TaskConfig<T>
  ): void {
    // Stop current task if running
    if (this.memory.task) {
      this.stopTask();
    }
    
    // Start new task
    task.start(this, config);
  }
  
  public stopTask(this: Creep): void {
    if (this.memory.task) {
      const task = getTask(this.memory.task.id);
      if (task) {
        task.stop(this, this.memory.task.config);
      }
      delete this.memory.task;
    }
  }
  
  public runTask(this: Creep): void {
    if (this.memory.task) {
      const task = getTask(this.memory.task.id);
      if (task) {
        task.run(this, this.memory.task.config);
      }
    }
  }
}

// 2. Add TypeScript interface
declare global {
  interface Creep {
    startTask<T extends TaskId>(task: TaskBehavior<T>, config?: TaskConfig<T>): void;
    stopTask(): void;
    runTask(): void;
  }
}

// 3. Apply the extension
applyMixins(Creep, [CreepTaskingExtension]);
```

## TypeScript Configuration

### Strict Type Checking
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "alwaysStrict": true
  }
}
```

### ESLint Configuration
```javascript
// .eslintrc.js key rules
{
  "@typescript-eslint/explicit-member-accessibility": "error",
  "@typescript-eslint/no-explicit-any": "warn",
  "camelcase": "error",
  "max-classes-per-file": ["error", 1],
  "no-underscore-dangle": ["error", { "allowAfterThis": true }]
}
```

## Coding Conventions

### Naming Conventions
- **Classes**: `PascalCase` (e.g., `HarvestEnergyProject`, `TaskConfig`)
- **Methods/Functions**: `camelCase` (e.g., `runTask`, `getSourceById`)
- **Variables/Properties**: `camelCase` (e.g., `currentSource`, `creepCount`)
- **Constants**: `UPPER_SNAKE_CASE` for globals, `camelCase` for local constants
- **IDs**: `PascalCase` with `Id` suffix (e.g., `HarvestEnergyProjectId`)

### File Organization
- One class per file
- Export interfaces and classes at the top level
- Use barrel exports in index files
- Group related functionality in subdirectories

### Error Handling
```typescript
// Use ErrorMapper for stack traces
export const loop = ErrorMapper.wrapLoop(() => {
  // Main game loop logic
});

// Handle API failures gracefully
const result = creep.harvest(source);
if (result !== OK) {
  Logger.warn(`Creep ${creep.name} failed to harvest: ${result}`);
  creep.stopTask();
}
```

### Memory Management
```typescript
// Store IDs, not objects
creep.memory.targetSourceId = source.id; // Good
creep.memory.targetSource = source; // Bad - won't serialize

// Clean up dead creep memory
for (const name in Memory.creeps) {
  if (!Game.creeps[name]) {
    delete Memory.creeps[name];
  }
}
```

### Performance Optimization
```typescript
// Cache expensive lookups
const sources = room.find(FIND_SOURCES);
const sourceById = sources.reduce((map, source) => {
  map[source.id] = source;
  return map;
}, {} as Record<string, Source>);

// Use early returns
if (!creep.memory.task) return;
if (creep.spawning) return;

// Avoid repeated Memory access
const taskConfig = creep.memory.task;
if (taskConfig && taskConfig.id === HarvestEnergyTaskId) {
  // Use local variable
}
```

## Testing Patterns

### Unit Test Structure
```typescript
import { expect } from "chai";
import * as sinon from "sinon";

describe("HarvestEnergyProject", () => {
  let sandbox: sinon.SinonSandbox;
  let mockCreep: any;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockCreep = {
      name: "TestCreep",
      store: { getFreeCapacity: () => 50 },
      memory: {},
      startTask: sandbox.stub()
    };
    
    global.Game = { time: 100 } as any;
    global.Memory = { creeps: {} } as any;
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  it("should start harvest task when creep has capacity", () => {
    const config: HarvestEnergyProjectConfig = {
      type: ProjectConfigSymbol,
      id: HarvestEnergyProjectId
    };
    
    HarvestEnergyProject.run(mockCreep, config);
    
    expect(mockCreep.startTask).to.have.been.calledOnce;
  });
});
```

### Functional Testing Strategy

The functional testing strategy uses a Docker-based Screeps server environment to validate end-to-end behavior. This approach tests real bot execution in a controlled environment.

#### Optimal Harvester Allocation Testing

```typescript
// Test optimal harvester body composition (5 WORK parts)
it("should spawn optimal harvesters with 5 WORK parts in advanced rooms", async () => {
  // 1. Deploy bot to test environment
  // 2. Wait for spawning system to create harvesters
  // 3. Verify body composition: 5W+1C+1M for 550 energy cost
  // 4. Confirm energy efficiency: 10 energy/tick matches source regeneration
});

// Test source distribution (exactly 1 harvester per source)
it("should assign exactly one harvester per source", async () => {
  // 1. Wait for SourcePlanner to distribute harvesters
  // 2. Check SourcePlanner memory for assignment distribution
  // 3. Verify exactly one harvester assigned per source
  // 4. Ensure no sources are unassigned or double-assigned
});

// Test source draining efficiency (sources reach zero energy)
it("should ensure sources reach zero energy before regeneration", async () => {
  // 1. Monitor source energy levels over multiple ticks
  // 2. Track regeneration cycles (energy jumps from low to 3000)
  // 3. Verify sources reach near-zero before regeneration
  // 4. Calculate drainage efficiency percentage
});
```

#### Testing Framework Components

The functional test harness provides:

- **Environment Management**: Docker-based Screeps server setup and teardown
- **Bot Deployment**: Code compilation and deployment to test server
- **State Monitoring**: Real-time game object inspection and memory analysis
- **Scenario Setup**: Memory preloading for specific test conditions
- **Timing Control**: Tick-based execution with configurable wait periods

#### Test Data Validation

```typescript
// Verify harvester body composition
const workParts = harvester.body.filter(part => part.type === 'work').length;
expect(workParts).to.equal(5, "Optimal harvester should have 5 WORK parts");

// Verify source assignment distribution
const assignmentsBySource = groupAssignmentsBySource(sourcePlannerMemory);
for (const [sourceId, assignedCreeps] of assignmentsBySource.entries()) {
  expect(assignedCreeps.length).to.equal(1, `Source ${sourceId} should have exactly 1 harvester`);
}

// Verify source drainage efficiency
const drainageEfficiency = sourcesReachingZero / totalSources;
expect(drainageEfficiency).to.be.at.least(0.5, "At least 50% of sources should reach zero energy");
```

#### Integration Testing with RoleManager

```typescript
// Test quota system integration
it("should integrate properly with RoleManager quota system", async () => {
  // 1. Verify harvester count equals source count (not minimum 2)
  // 2. Check spawning priority: harvesters before upgraders/builders
  // 3. Ensure quota compliance across all roles
  // 4. Test harvester replacement when harvesters die
});
```

### Integration Testing with Mocks
```typescript
describe("Energy Management Integration", () => {
  beforeEach(() => {
    // Setup complete mock environment
    setupMockGame({
      rooms: {
        "W1N1": {
          find: sinon.stub().returns([mockSource, mockSpawn])
        }
      }
    });
  });
  
  it("should coordinate harvester and depositing workflow", () => {
    // Test complete project-task workflow
  });
});
```

### Testing Strategy Documentation

#### Key Testing Principles

1. **Real Environment Testing**: Use Docker-based Screeps server for end-to-end validation
2. **Behavioral Verification**: Test actual game behavior, not just code execution
3. **Performance Measurement**: Monitor energy efficiency and resource utilization
4. **Edge Case Coverage**: Test harvester death, memory corruption, unusual room layouts
5. **Integration Validation**: Verify proper interaction between systems (SourcePlanner, RoleManager, Tasks)

#### Test Categories

- **Unit Tests**: Individual component logic (tasks, projects, utilities)
- **Functional Tests**: End-to-end behavior in controlled environment
- **Integration Tests**: Cross-system interaction validation
- **Performance Tests**: Resource efficiency and optimization verification

This comprehensive testing approach ensures the optimal harvester allocation system works correctly in both isolated components and real game scenarios.

This implementation guide provides the TypeScript-specific details needed to work with the codebase, while the architecture and strategy documents provide the higher-level context for why these patterns exist.