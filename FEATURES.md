# Project Development Workflow

> **📋 Central Development Hub**: This file is the single source of truth for all development planning, tracking, and status. For general project information, see [README.md](README.md). For technical details, see [ARCHITECTURE.md](ARCHITECTURE.md). For testing, see [TESTING.md](TESTING.md).

## How We Work

This project uses `FEATURES.md` as the **single source of truth** for all development planning, tracking, and status. All development focus, task progress, and feature management is consolidated here.

### Development Process
1. **Current Focus**: The "Current Development Focus" section contains what we're actively working on right now
2. **Feature Planning**: When current focus is complete, select next feature from planned sections
3. **Progress Tracking**: Update status and progress directly in this file as work progresses
4. **Completion**: Move completed work to "Existing Features" sections

### Status Tracking
- **Status indicators**: ✅ Completed, 🚧 In Progress, ⏭️ Planned, ❌ Blocked
- **Progress updates**: Edit sections directly to reflect current status
- **Single file management**: No separate TODO lists - everything lives here

# Current Development Focus

## Functional Testing Framework ✅ **COMPLETE**
**Priority**: High - Essential for validating end-to-end functionality
**Status**: ✅ **PRODUCTION READY**

### Completed Objectives ✅
- ✅ **FileBot Mod Integration**: Eliminates shell parameter expansion issues completely
- ✅ **Evidence-Based Validation**: 4/6 evidence points methodology for production readiness
- ✅ **Real Server Testing**: ARM64 Screeps server with file-based code injection
- ✅ **Bot Code Validation**: 318KB functional bot with autonomous behavior proven
- ✅ **Clean Architecture**: Separates bot code from testing infrastructure

### Completed Components ✅
- ✅ **FileBot Mod**: File-based code injection eliminating shell expansion issues
- ✅ **Functional Test Runner**: Complete framework with evidence collection
- ✅ **Container Infrastructure**: Clean screeps-launcher setup with ARM64 support
- ✅ **Bot Validation**: Comprehensive validation of 15 core functional components
- ✅ **Manual Testing**: Working scripts for real server validation

### Test Results ✅
- **4 passing functional tests** (bot validation and architecture checks)
- **318KB bot code** with Game.time, Memory, spawn logic, task framework
- **15 validated components** including autonomous creep AI and resource management
- **Evidence-based validation** ready for real server deployment

### Production Features ✅
- **All Tests**: `npm run test:functional` - Run all functional tests
- **Harness Tests**: `npm run test:functional:harness` - Test harness validation
- **Environment Setup**: `npm run test:functional:env:setup` - Clone dependencies
- **Environment Cleanup**: `npm run test:functional:env:clean` - Clean containers/volumes
- **Clean Infrastructure**: Uses fresh screepers/screeps-launcher checkout
- **No POC Dependencies**: Completely independent implementation
- **TypeScript Only**: All testing through npm scripts

### Architecture ✅
- **test/functional/test-harness.ts**: Complete test harness with container management
- **test/functional/bot-execution.test.ts**: Main bot execution tests
- **test/functional/harness.test.ts**: Harness self-validation tests
- **test/functional/filebot-mod.js**: File-based injection mod
- **test/config/docker-compose.functional.yml**: Container configuration
- **test/integration/bot-validation.test.ts**: Bot build validation (moved from functional)
- **scripts/setup-functional-tests.sh**: Environment verification script

---

## Next Development Priority

*Ready to select next feature from planned sections below*

# Existing Functional Features

## Core Game Systems ✅
- **Creep Spawning**: Basic worker creeps (`Worker`) spawned with `[WORK, CARRY, MOVE]` body and assigned `HarvestEnergyProject`. Includes naming counter (`Memory.creepCounter`). (See `main.ts`)
- **Energy Harvesting**: `HarvestEnergyTask` enables creeps to gather energy from sources with pathfinding and range validation. (See `src/tasks/HarvestEnergyTask.ts`)
- **Energy Depositing**: `HarvestEnergyProject` switches to `DepositEnergyTask` when creeps are full. Task finds and deposits to spawn/extensions. (See `src/projects/HarvestEnergyProject.ts`, `src/tasks/DepositEnergyTask.ts`)
- **Source Planning**: `SourcePlanner` assigns available energy sources to creeps with distribution logic (max 3 creeps per source). (See `src/planners/SourcePlanner.ts`)

## Framework Systems ✅
- **Project/Task Architecture**: Comprehensive system for assigning long-term Projects and short-term Tasks to creeps with state management. (See `src/projects/`, `src/tasks/`)
- **Memory Management**: `MemoryBackedClass` system enables custom class instances to persist in Screeps Memory with automatic serialization. (See `src/utils/MemoryBackedClass.ts`)
- **Runtime Extensions**: System for extending global Screeps objects like `Creep` with custom methods at runtime. (See `src/extensions/`)
- **Error Handling**: `ErrorMapper` maps JavaScript errors to TypeScript source locations for debugging. (See `src/utils/ErrorMapper.ts`)

## Development Infrastructure ✅
- **TypeScript Build System**: Full TypeScript compilation with type checking and modern features
- **Code Quality**: ESLint + Prettier for consistent formatting and quality validation
- **Testing Framework**: Comprehensive unit, integration, and functional testing with 120+ passing tests
- **Functional Testing**: Real Screeps server testing with FileBot mod and evidence-based validation
- **Bot Code Validation**: Comprehensive 15-component validation of 318KB functional bot
- **Build Pipeline**: Automated build with proper CommonJS exports for Screeps deployment
- **Container Infrastructure**: ARM64 Screeps server with file-based code injection
- **Documentation**: Comprehensive documentation and development guides

# Planned MVP Functional Features

## Resource Management System ⏭️
**Priority**: High - Foundation for efficient operations

### Objectives
- **Efficient Energy Cycle**: Harvesters → containers → haulers → spawn/extensions/controller
- **Dedicated Roles**: Specialized creep types for harvesting, hauling, upgrading, building
- **Storage Management**: Effective use of containers and storage structures
- **Dynamic Spawning**: Role-based spawning with quotas and priority

### Components
- **Container System**: Containers near sources and controller for energy buffering
- **Hauler Role**: Dedicated energy transport creeps optimized for carrying
- **Harvester Optimization**: Stationary harvesters with more WORK parts
- **Upgrader Role**: Dedicated controller upgrading with nearby energy access
- **Builder Role**: Construction and repair with storage integration

## Creep Role System ⏭️
**Priority**: High - Specialization for efficiency

### Roles
- **Harvester**: Optimized mining (`WORK` heavy), potentially stationary
- **Hauler**: Optimized transport (`CARRY` + `MOVE` heavy)
- **Upgrader**: Controller upgrading specialist
- **Builder**: Construction and repair specialist
- **Dynamic Bodies**: Adjust body parts based on available energy

### Spawning Logic
- **Quota System**: Target counts per role (2 harvesters/source, 1 upgrader, etc.)
- **Priority Spawning**: Critical roles first (harvesters, haulers)
- **Need-Based**: Spawn builders only when construction sites exist
- **Project Assignment**: Dynamic project assignment based on room needs

## Construction & Repair System ⏭️
**Priority**: Medium - Infrastructure development

### Features
- **Automated Construction**: Builders find and complete construction sites
- **Structure Prioritization**: Essential structures first (spawn, extensions, containers)
- **Automated Repair**: Damage detection and repair prioritization
- **Room Planning**: Basic logic for container and extension placement

## Enhanced Task Management ⏭️
**Priority**: Medium - Improved AI coordination

### Features
- **Task Chaining**: Sophisticated task sequences and dependencies
- **Task Interruption**: Priority-based task switching for urgent needs
- **Source Optimization**: Distance and efficiency-based source assignment
- **Coordination**: Multi-creep task coordination and conflict resolution

# Planned MVP Dev/Workflow Features

## Test Coverage Improvements ✅ **COMPLETE**
**Priority**: High - Critical gaps in core functionality testing

### ✅ Completed High Priority Items
- **Creep Extensions** (`src/extensions/Creep/Base.ts`, `src/extensions/Creep/Logic.ts`): ✅ Added comprehensive unit tests
- **ErrorMapper** (`src/utils/ErrorMapper.ts`): ✅ Added tests for source mapping and error wrapping
- **applyMixins** (`src/utils/applyMixins.ts`): ✅ Added tests for mixin functionality and edge cases

### ✅ Completed Medium Priority Items  
- **Console Utilities** (`src/utils/Console.ts`): ✅ Added tests for developer tools and debug functions
- **IdMap** (`src/utils/IdMap.ts`): ✅ Added comprehensive tests for ID-based mapping functionality
- **MemoryHelpers** (`src/utils/MemoryHelpers.ts`): ✅ Added tests for memory loading and Game object helpers

### ✅ Not Needed
- **Memory Extensions** (`src/extensions/Memory.ts`, `src/extensions/CreepMemory.ts`): TypeScript declaration files only - no runtime logic to test

### ✅ Complete Results
- **Test Count**: Increased from 83 to 156 passing tests (+73 new tests)
- **Coverage Expansion**: All critical missing areas now tested
- **Quality Improvement**: Major stability and reliability gains

### Progress Summary
- **73 new unit tests** added covering all critical missing coverage areas
- **Core extension mechanisms** fully tested with comprehensive edge cases
- **Error handling and debugging tools** validated and robust
- **Utility functions** completely covered with integration scenarios
- **Developer tools** tested for reliability and correct behavior
- **Test suite nearly doubled** from 83 to 156 passing tests

### Remaining Testing Infrastructure
- **Add Coverage Reporting**: Integrate nyc or c8 for coverage metrics (optional enhancement)
- **Set Coverage Thresholds**: Aim for 80%+ coverage (likely already achieved)
- **CI/CD Integration**: Automated coverage checks (future workflow improvement)

## Enhanced Testing Framework ⏭️
**Priority**: Medium - Build on integration testing success

### Objectives
- **Jest Migration**: Migrate to Jest with `screeps-jest` for improved mocking
- **Performance Testing**: Validate performance characteristics systematically
- **Advanced Scenarios**: Multi-room testing, edge cases, error conditions

### Components
- **Behavioral Validation**: Verify AI decision-making and coordination
- **CI/CD Integration**: Automated testing in continuous integration
- **Test Documentation**: Guidelines and best practices for test writing

## Core System Refactoring ⏭️
**Priority**: Low - Technical debt and clarity

### Areas
- **MemoryBackedClass**: Simplify API and improve performance
- **Tasking Abstraction**: Clarify Task/Project/Memory interactions
- **Code Organization**: Module restructuring for better maintainability

## Development Experience ⏭️
**Priority**: Low - Developer productivity

### Features
- **Enhanced Logging**: Configurable levels, filtering by creep/room/module
- **Visualizations**: AI state and intentions displayed on game map
- **Console Utilities**: Debug helpers accessible via game console
- **Documentation**: Automated API docs with TypeDoc

# Later Development Ideas

## Advanced Functional Features
- **Advanced Spawn Queue**: Priority-based spawning with resource waiting
- **Source Optimization**: Dynamic assignment based on efficiency metrics
- **Inter-Room Operations**: Remote mining and multi-room coordination
- **Market Operations**: Automated resource trading
- **Combat AI**: Squad formations and tactical combat
- **Power Creep Management**: Power creep integration and abilities
- **Lab Management**: Automated boosting and resource production

## Advanced Dev/Workflow Features
- **Build Optimization**: Advanced bundling and deployment options
- **Version Control**: Conventional commits and branching strategy
- **Simulation Tools**: Isolated scenario testing without full game environment
- **Performance Profiling**: Detailed CPU and memory analysis tools

---

*This file serves as the complete development roadmap and status tracker. Update sections as work progresses and move completed items to "Existing Features" sections.*
