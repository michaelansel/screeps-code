# Screeps AI Quick Reference

> Quick access to common patterns, commands, and code snippets

## Commands

### Development
```bash
npm run build          # Build production code
npm run watch          # Watch mode for development
npm run lint           # Run TypeScript + ESLint
npm run pre-commit     # Full validation before commit
```

### Testing
```bash
npm test               # Run all tests (279 unit tests + integration + functional)
npm run test:unit      # Unit tests only (~200ms, 279 passing)
npm run test:integration # Integration tests (~500ms)
npm run test:functional # Functional tests (~60s+)

# Specific functional test categories
npm run test:functional -- --grep "RCL Progression"
npm run test:functional -- --grep "Builder Role" 
npm run test:functional -- --grep "Resource Management"
```

### Deployment
```bash
npm run upload-main    # Deploy to main branch
npm run upload-sim     # Deploy to simulation  
npm run upload-ptr     # Deploy to PTR (latest with energy management)
```

## Common Code Patterns

### Creating a New Project
```typescript
// 1. Define the project ID
export const MyProjectId = "MyProject" as Id<Project>;

// 2. Define config interface (if needed)
export interface MyProjectConfig extends ProjectConfig<typeof MyProjectId> {
  targetRoom?: string;
}

// 3. Implement the project
export const MyProject: ProjectBehavior<typeof MyProjectId> = {
  id: MyProjectId,
  type: ProjectBehaviorSymbol,
  
  start(creep: Creep, config?: MyProjectConfig): void {
    ProjectHelpers.start(creep, MyProject, config);
  },
  
  run(creep: Creep, config: MyProjectConfig): void {
    // Project logic - assign tasks based on state
    if (creep.store.getFreeCapacity() > 0) {
      creep.startTask(CollectTask);
    } else {
      creep.startTask(DeliverTask);
    }
  },
  
  stop(creep: Creep, config: MyProjectConfig): void {
    ProjectHelpers.stop(creep);
  }
};

// 4. Register the project
registerProject(MyProject);
```

### Creating a New Task
```typescript
// 1. Define the task ID
export const MyTaskId = "MyTask" as Id<Task>;

// 2. Define config interface
export interface MyTaskConfig extends TaskConfig<typeof MyTaskId> {
  target: Id<Structure>;
}

// 3. Implement the task
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
      // Perform action
      creep.stopTask();
    } else {
      creep.moveTo(target);
    }
  },
  
  stop(creep: Creep, config: MyTaskConfig): void {
    // Cleanup if needed
  }
};

// 4. Register the task
registerTask(MyTask);

// Example: PickupEnergyTask with multiple target types
export interface PickupEnergyTaskConfig extends TaskConfig<typeof PickupEnergyTaskId> {
  target?: Id<Resource<ResourceConstant> | Tombstone>;
  targetType?: 'resource' | 'tombstone';
  maxRange?: number;
}
```

### Using MemoryBackedClass
```typescript
class MyPlanner extends MemoryBackedClass<MyPlanner> {
  private assignments: Record<string, string> = {};
  
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
      }
    };
  }
  
  public assign(creepName: string, targetId: string): void {
    this.assignments[creepName] = targetId;
    this.persist(); // Save to memory
  }
}

// Usage
MyPlanner.instance.assign("Worker1", "source123");
```

### Adding Creep Extensions
```typescript
// 1. Define the extension
class CreepCustomExtension {
  public customMethod(this: Creep): void {
    console.log(`Creep ${this.name} doing custom action`);
  }
}

// 2. Add TypeScript types
declare global {
  interface Creep {
    customMethod(): void;
  }
}

// 3. Apply the extension
applyMixins(Creep, [CreepCustomExtension]);
```

### Energy Management Patterns
```typescript
// Check if room should use storage for energy
import { analyzeEnergyInfrastructure, shouldHarvesterUseStorage } from "utils/EnergySourceManager";

const energyInfo = analyzeEnergyInfrastructure(room);
if (energyInfo.preferWithdraw) {
  // Use WithdrawEnergyTask for builders/upgraders
  creep.startTask(WithdrawEnergyTask);
} else {
  // Fall back to harvesting
  creep.startTask(HarvestEnergyTask, { source: sourceId });
}

// Smart harvester storage logic
if (shouldHarvesterUseStorage(room)) {
  // Prioritize storage when infrastructure supports it
  creep.startTask(DepositEnergyTask, { prioritizeStorage: true });
} else {
  // Default priority: spawn/extensions first
  creep.startTask(DepositEnergyTask);
}

// Opportunistic energy collection (automatic for all creeps)
if (typeof creep.checkForNearbyEnergy === 'function' && creep.checkForNearbyEnergy()) {
  // Pickup task automatically started, will return to primary task when done
  return;
}
```

### Role Management Patterns
```typescript
// Extension-aware spawning
const roomEnergy = RoleManager.getRoomAvailableEnergy(room);
const bodyParts = RoleManager.getBodyPartsForRole(roleId, roomEnergy);

// Get optimal role counts
const quotas = RoleManager.getDesiredQuotas(room);
const nextRole = RoleManager.getNextRoleToSpawn(room);

if (nextRole) {
  const name = `${nextRole.projectId.replace('Project', '')}${counter++}`;
  spawn.spawnCreep(bodyParts, name, {
    memory: { project: { id: nextRole.projectId } }
  });
}
```

### Road Rebuilding Pattern
```typescript
// In BuilderProject - automatic road maintenance
const missingRoads = findMissingRoads(room);
if (missingRoads.length > 0) {
  createRoadConstructionSites(room, missingRoads);
  creep.startTask(BuildTask); // Build roads first
}
```

## Memory Patterns

### Accessing Memory
```typescript
// Global memory
Memory.creepCounter = (Memory.creepCounter || 0) + 1;

// Creep memory
creep.memory.role = "harvester";
creep.memory.targetSource = source.id;

// Complex memory with MemoryBackedClass
interface PlannerMemory {
  assignments?: Record<string, string>;
  lastUpdate?: number;
}
```

### Memory Cleanup
```typescript
// Clean dead creep memory
for (const name in Memory.creeps) {
  if (!Game.creeps[name]) {
    delete Memory.creeps[name];
  }
}

// Reset specific memory sections
delete Memory.SourcePlanner;
Memory.creepCounter = 0;
```

## Testing Patterns

### Unit Test Template
```typescript
import { expect } from "chai";
import * as sinon from "sinon";

describe("MyClass", () => {
  let sandbox: sinon.SinonSandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Setup mocks
    global.Game = { creeps: {}, time: 100 } as any;
    global.Memory = { creeps: {} } as any;
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  it("should do something", () => {
    const instance = new MyClass();
    expect(instance.doSomething()).to.equal("expected");
  });
});
```

### Integration Test Pattern
```typescript
describe("Integration - MyFeature", () => {
  beforeEach(() => {
    setupTestEnvironment();
  });
  
  afterEach(() => {
    teardownTestEnvironment();
  });
  
  it("should work end-to-end", () => {
    // Test complete workflow
  });
});
```

## Debugging

### Enable Logging
```typescript
// In console or code
Logger.enable("*"); // All logs
Logger.enable("task.*"); // All task logs
Logger.enable("project.HarvestEnergyProject"); // Specific

// In code
Logger.info("module.name", "Message", { data });
```

### Console Commands
```typescript
// Project assignment helpers (see CONSOLE_HELPERS.md)
C.listProjects()          // List all available projects
C.listCreeps()            // List creeps and their projects
C.projectStatus()         // Detailed project status overview
C.assignProject('Harvester1', 'BuilderProject') // Assign project
C.assignProjectToRole('Builder', 'BuilderProject') // Assign to role

// Energy management analysis
import { analyzeEnergyInfrastructure } from "utils/EnergySourceManager";
analyzeEnergyInfrastructure(Game.rooms.W1N1)

// Role management information
import { RoleManager } from "utils/RoleManager";
RoleManager.getDesiredQuotas(Game.rooms.W1N1)
RoleManager.getRoomAvailableEnergy(Game.rooms.W1N1)

// Check memory
JSON.stringify(Memory, null, 2)

// Reset specific creep
delete Game.creeps.Worker1.memory.task
```

### Common Issues

**Creep not moving?**
- Check if task is assigned: `creep.memory.task`
- Verify pathfinding: `creep.moveTo()` return code
- Check fatigue: `creep.fatigue`

**Task not completing?**
- Add logging to task run method
- Check task config in memory
- Verify `creep.stopTask()` is called

**Memory corruption?**
- Check for circular references
- Verify SerDe functions
- Use `JSON.stringify` to validate structure

## Performance Tips

### CPU Optimization
```typescript
// Cache expensive lookups
const sources = room.find(FIND_SOURCES);
for (const source of sources) {
  // Use cached result
}

// Early returns
if (!creep.memory.task) return;

// Avoid repeated Memory access
const task = creep.memory.task;
if (task && task.id === "harvest") {
  // Use local variable
}
```

### Memory Optimization
```typescript
// Store IDs, not objects
creep.memory.targetId = target.id; // Good
creep.memory.target = target; // Bad - won't serialize

// Clean up unused data
if (creep.memory.oldTarget) {
  delete creep.memory.oldTarget;
}
```

## Functional Test Helpers

### Check Server Status
```bash
# Container status
finch ps

# Server logs
finch logs screeps-code-screeps-1

# Check deployed code
finch exec screeps-code-screeps-1 ls -la /screeps/
```

### Monitor Bot Execution
```typescript
// In functional tests
const stats = await harness.getMemoryStats(userId);
expect(stats.hasCreepCounter).to.be.true;

// Check memory patterns
const patterns = await harness.checkMemoryPatterns(userId, {
  'creepCounter': null,
  'creeps.Worker1.project': 'HarvestEnergyProject'
});
```

## Architecture Decisions

### Why Projects/Tasks?
- **Separation of Concerns**: Projects handle strategy, tasks handle tactics
- **Reusability**: Tasks can be shared across projects
- **Testability**: Each piece can be tested in isolation
- **Flexibility**: Easy to add new behaviors

### Why MemoryBackedClass?
- **Persistence**: Complex state survives across ticks
- **Type Safety**: Full TypeScript support
- **Performance**: Lazy loading and caching
- **Consistency**: Standard pattern for stateful modules

### Why Extensions?
- **Clean API**: Natural method calls on game objects
- **Modularity**: Features in separate files
- **No Pollution**: Original prototypes preserved
- **Type Safety**: Full IDE support

## Useful Links

- [Screeps API Docs](https://docs.screeps.com/api/)
- [TypeScript Types](https://github.com/screeps/typed-screeps)
- [Project Architecture](./ARCHITECTURE.md)
- [Testing Guide](./TESTING.md)
- [Feature Roadmap](./FEATURES.md)