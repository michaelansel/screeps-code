# Getting Started with Screeps AI Development

This guide helps new contributors understand the project structure and get productive quickly.

## First Steps

### 1. Environment Setup
```bash
# Clone and install
git clone <repository-url>
cd screeps-code
npm install

# Verify setup
npm run test:unit    # Should pass ~279 tests in ~200ms
npm run lint         # Should show no errors
npm run build        # Should create dist/ directory
```

### 2. Understand the Documentation Hierarchy

Read the documentation in this order to build understanding progressively:

#### 📋 **Start with Strategy** → [docs/strategy/STRATEGY.md](docs/strategy/STRATEGY.md)
**What we want to achieve in the game world**
- Energy economy goals (harvest at generation rate)
- RCL progression strategy (upgrade controllers efficiently)  
- Resource management priorities and victory conditions
- Uses only Screeps game terminology

#### 🏗️ **Then Architecture** → [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)
**How the bot logic is designed to achieve strategy**
- Planner/Project/Task hierarchy
- Component interactions and decision flows
- Energy management and role systems
- Language-agnostic design patterns

#### 💻 **Then Implementation** → [docs/implementation/IMPLEMENTATION.md](docs/implementation/IMPLEMENTATION.md)  
**TypeScript-specific code details**
- Interfaces and class structures
- Coding conventions and file organization
- Memory management and type safety
- Testing patterns and performance optimization

#### 🔧 **Framework Tools** → [docs/framework/FRAMEWORK.md](docs/framework/FRAMEWORK.md)
**Reusable development tools**
- MemoryBackedClass system for state persistence
- Runtime extension patterns for game objects
- Project/Task behavior framework
- Functional testing infrastructure

### 3. Development Workflow → [docs/development/WORK_PROMPT.md](docs/development/WORK_PROMPT.md)
**How to work on this project**
- Development process and session workflow
- Testing strategy and quality gates
- Task management and progress tracking

## Quick Orientation

### Project Architecture
The bot uses a **three-layer hierarchy**:

1. **Planners** (Strategic): SourcePlanner, RoleManager, EnergySourceManager
2. **Projects** (Tactical): HarvestEnergyProject, BuilderProject, UpgradeControllerProject  
3. **Tasks** (Operational): HarvestEnergyTask, BuildTask, DepositEnergyTask

### Core Components
- `src/main.ts` - Game loop entry point
- `src/planners/` - Strategic decision makers
- `src/projects/` - Long-term creep roles
- `src/tasks/` - Short-term actions
- `src/utils/` - Shared utilities and frameworks
- `src/extensions/` - Runtime enhancements to Screeps objects

### Testing Strategy
- **Unit Tests** (279 tests): Component isolation testing
- **Integration Tests**: Component interaction validation
- **Functional Tests**: End-to-end behavior in real Screeps server

## Common Tasks

### Running Tests
```bash
npm test                    # All tests
npm run test:unit           # Fast unit tests (~200ms)
npm run test:integration    # Component interaction tests
npm run test:functional     # Real server validation (~60s)

# Specific functional test categories
npm run test:functional -- --grep "RCL Progression"
npm run test:functional -- --grep "Builder Role"
npm run test:functional -- --grep "Resource Management"
```

### Development Commands
```bash
npm run build               # Production build
npm run watch               # Development watch mode
npm run lint                # TypeScript + ESLint validation
npm run pre-commit          # Full validation before commit

# Deployment (requires API configuration)
npm run upload-main         # Deploy to main branch
npm run upload-sim          # Deploy to simulation
npm run upload-ptr          # Deploy to PTR
```

### Code Examples

#### Creating a Simple Task
```typescript
// 1. Define task ID and config
export const MyTaskId = "MyTask" as Id<Task>;
export interface MyTaskConfig extends TaskConfig<typeof MyTaskId> {
  target: Id<Structure>;
}

// 2. Implement behavior
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
    // Cleanup
  }
};

// 3. Register
registerTask(MyTask);
```

#### Using Memory-Backed Classes
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
  
  public assign(creepName: string, target: string): void {
    this.assignments[creepName] = target;
    this.persist();
  }
}

// Usage
MyPlanner.instance.assign("Worker1", "source123");
```

## Debugging and Development

### Console Helpers
```typescript
// In-game console (see docs/development/CONSOLE_HELPERS.md)
C.listProjects()                    // List all available projects
C.listCreeps()                      // Show creeps and their projects
C.assignProject('Harvester1', 'BuilderProject')  // Reassign creep

// Energy management analysis
import { analyzeEnergyInfrastructure } from "utils/EnergySourceManager";
analyzeEnergyInfrastructure(Game.rooms.W1N1)
```

### Common Issues
- **Tests failing?** Run `npm run pre-commit` to validate everything
- **Creep not moving?** Check `creep.memory.task` for assigned task
- **Memory corruption?** Verify SerDe functions in MemoryBackedClass
- **Build errors?** Check TypeScript compiler output and fix type issues

## Contributing Guidelines

### Development Principles
1. **Strategy First**: Define game objectives before implementation
2. **Test Driven**: Write tests for new functionality
3. **Document Decisions**: Update relevant docs as you work
4. **Follow Patterns**: Use existing code patterns and conventions

### Quality Gates
- All tests must pass (`npm test`)
- No linting errors (`npm run lint`)
- Code follows existing patterns
- Documentation updated for significant changes

### Workflow
1. **Check Current Focus**: Read [docs/development/FEATURES.md](docs/development/FEATURES.md)
2. **Plan Approach**: Write brief implementation plan
3. **Implement with Tests**: Small, focused changes with unit tests
4. **Validate**: Run `npm run pre-commit` before committing
5. **Document**: Update progress and any architectural decisions

## Next Steps

1. **Read the Strategy**: Understand what we want to achieve in Screeps
2. **Review Architecture**: Learn how the bot logic is organized
3. **Explore Code**: Browse `src/` directory to see patterns in practice
4. **Run Tests**: Validate your environment setup
5. **Check Current Work**: See [docs/development/FEATURES.md](docs/development/FEATURES.md) for active development

For detailed development workflow, see [docs/development/WORK_PROMPT.md](docs/development/WORK_PROMPT.md).

**Welcome to the team!** 🚀