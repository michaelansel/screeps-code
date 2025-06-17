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

## Integration Testing Framework ⚠️ **NEEDS FIXING**
**Priority**: High - Essential for validating end-to-end functionality
**Status**: ⚠️ **Infrastructure Complete but Using Mock Server Instead of Real Screeps**

### Completed Objectives ✅
- ✅ **Environment Testing**: Built ARM64 Screeps server from source
- ✅ **Container Infrastructure**: Deployed containerized server on ports 21025/21026
- ✅ **Test Coverage**: 35 passing tests covering framework, build, and functional aspects
- ✅ **Build Pipeline**: Fixed CommonJS exports and deployment mechanism
- ✅ **Documentation**: Testing guide in `TESTING.md`

### Completed Components ✅
- ✅ **ARM64 Screeps Server**: Custom built `screeps-launcher-arm64` container
- ✅ **Multi-Layer Testing**: Unit, integration, and functional tests
- ✅ **Test Markers**: Memory-based execution tracking
- ✅ **Deployment Pipeline**: Code builds, deploys to container, validates execution

### Test Results ✅
- **35 passing tests** (framework + performance + build + functional)
- **Automated pipeline** working (build → deploy → test → cleanup)
- **Performance tests** passing
- **Server infrastructure** operational

### ⚠️ Known Issues
- **Server configuration**: Real Screeps server builds but needs Steam key and world setup
- **No actual game execution**: Server starts but lacks proper configuration for testing
- **Configuration required**: Need to set up minimal world and proper server config

### Current Progress ✅
- **Real server building**: Now builds actual `screepers/screeps-launcher` instead of mock server
- **Cross-platform support**: Auto-detects architecture (x86_64/ARM64) and builds accordingly
- **Proper tagging**: Uses standard `screeps/screeps-launcher:latest` tag for compatibility

### Future Work Required
- Rework everything to a new sequence that should give us what we want for a clean, fast launch every time
  - Pull the latest screepers/screeps-launcher from GitHub
  - Set the ARCH build arg based on the current system architecture (e.g. arm64)
  - Build a new screepers/screeps-launcher:latest image using the Dockerfile in the repo
  - Add a config.yaml that creates a bot that will load our main.js code that we inject into the file system (see the sample in the upstream repo for ideas; the file might already be done in screeps-launcher-config.yml)
  - Initialize the /screeps folder and save it so that we don't have to re-initialize for every test run. If you launch the container with "upgrade" as an argument, it will do all the installation steps and exit before starting the server. Then we just need to save the /screeps folder and use it as a starting point for all future launches. Not sure how to do this, but maybe volumes, maybe something else. Future launches _must not_ modify the state.
  - Get everything saved and ready so that we can single-command spin up/tear down the container in the future. This is currently the compose file, but can change if needed.
- **Server configuration**: Set up minimal world and Steam key for testing
- **Game state validation**: Implement room setup and code execution verification
- **Configuration automation**: Automate server setup for testing environment

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
- **Testing Framework**: Comprehensive unit and integration testing with 117+ passing tests
- **Integration Testing**: Real Screeps server testing with ARM64 containerized environment
- **Code Execution Proof**: Integration test markers validate actual code execution
- **Build Pipeline**: Automated build with proper CommonJS exports for Screeps deployment
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

## Enhanced Testing Framework ⏭️
**Priority**: Medium - Build on integration testing success

### Objectives
- **Jest Migration**: Migrate to Jest with `screeps-jest` for improved mocking
- **Coverage Expansion**: Increase test coverage for all critical modules
- **Performance Testing**: Validate performance characteristics systematically

### Components
- **Advanced Scenarios**: Multi-room testing, edge cases, error conditions
- **Behavioral Validation**: Verify AI decision-making and coordination
- **CI/CD Integration**: Automated testing in continuous integration

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
