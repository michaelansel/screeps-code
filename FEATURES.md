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

## Resource Management System ✅ **COMPLETE**
**Priority**: High - Foundation for efficient operations
**Status**: ✅ **PRODUCTION READY**

### Completed Objectives ✅
- ✅ **Specialized Creep Roles**: Implemented Harvester and Upgrader roles with distinct behavior
- ✅ **Role-Based Spawning**: Intelligent spawning system with quotas (2 harvesters, 3 upgraders)
- ✅ **RoleManager System**: Centralized role quota management and spawning logic
- ✅ **Controller Upgrading**: Dedicated UpgradeControllerTask and UpgradeControllerProject
- ✅ **Dynamic Role Assignment**: Creeps switch between harvesting energy and upgrading controller
- ✅ **Full Test Coverage**: Comprehensive unit tests for all new components

### Completed Components ✅
- ✅ **UpgradeControllerTask**: Task for upgrading room controllers with energy and pathfinding
- ✅ **UpgradeControllerProject**: Project managing the harvest-upgrade cycle for upgrader creeps
- ✅ **RoleManager**: Utility class for role quota calculation and spawn decision logic
- ✅ **Enhanced main.ts**: Role-based spawning system replacing basic worker spawning
- ✅ **Unit Tests**: Full test coverage for UpgradeControllerTask and UpgradeControllerProject

### Test Results ✅
- **173 passing unit tests** (increased from 156, +17 tests for resource management)
- **Role-based spawning logic** tested and validated
- **Controller upgrading behavior** comprehensively tested with edge cases
- **RoleManager functionality** validated for quota management

### Production Features ✅
- **Intelligent Spawning**: Automatically spawns harvesters and upgraders based on room needs
- **Resource Efficiency**: Creeps optimally switch between energy gathering and controller upgrading
- **Scalable Design**: RoleManager easily extensible for additional roles
- **Quota Management**: Configurable role quotas (2 harvesters minimum, 3 upgraders max)
- **Source Integration**: Works seamlessly with existing SourcePlanner system

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

## Advanced Creep Role System ⏭️
**Priority**: High - Next after resource management
**Inspired by master branch role-based implementation**

### Core Roles
- **Harvester**: Advanced source selection with workpart optimization, position optimization near sources/links/containers, bootstrap container building
- **Hauler**: Complex priority delivery system (attack mode tower priorities, spawn/extension feeding, rebalancing mode, sleep mechanics)
- **Builder**: Blacklisting system, repair thresholds, flag-based construction/destruction, tower coordination avoidance
- **Upgrader**: Dynamic work/carry part balancing, energy-based activation/deactivation, controller downgrade prevention
- **Miner**: Mineral extraction with position optimization, multi-resource handling, specialized for late-game mineral economy
- **Claimer**: Multi-room expansion with conflict avoidance, room assignment queuing, automatic cleanup after success

### Specialized Roles
- **Linker**: Link energy distribution management, optimized for energy network efficiency
- **LongHauler**: Inter-room resource transport with optimized carry/move ratios for off-road travel
- **MinHauler**: Mineral-specific transport, container-to-storage logistics
- **Recycle**: Emergency role for disposing of unneeded creeps during resource constraints

### Advanced Body Design
- **Dynamic Scaling**: Body parts scale with available energy up to MAX_CREEP_COST limits
- **Role-Optimized Bodies**: Harvester (max 6 WORK), Hauler (max 10 CARRY), LongHauler (max 20 CARRY), etc.
- **Movement Optimization**: Different move/work/carry ratios for road vs off-road efficiency
- **Body Part Ordering**: Optimized ordering with guaranteed final MOVE part for survival

### Intelligent Spawning Logic
- **Dynamic Quotas**: Room-specific role counts based on containers, energy levels, controller status
- **Energy-Based Scaling**: High-energy rooms spawn more upgraders, low-energy rooms focus on efficiency
- **Emergency Spawning**: Cross-room emergency spawning when local spawns are unavailable
- **Role Recycling**: Automatic conversion of roles (upgraders→builders, builders→upgraders) based on room needs
- **Source-Based Scaling**: Harvester counts based on source spaces and workpart efficiency calculations

## Advanced Construction & Repair System ⏭️
**Priority**: Medium - Infrastructure development
**Inspired by master branch advanced building logic**

### Construction Management
- **Flag-Based Construction**: GREEN+BROWN flags for priority construction sites with automatic flag cleanup
- **Flag-Based Destruction**: RED+BROWN flags for targeted structure dismantling with energy recovery
- **Target Blacklisting**: TTL-based blacklisting to prevent creeps getting stuck on impossible tasks
- **Construction Prioritization**: Critical repairs → Flag construction → General construction sites
- **RCL Validation**: Automatic blacklisting of structures requiring higher room control level

### Repair & Fortification
- **Dynamic Repair Thresholds**: Room memory-based repair levels (e.g., 75% for regular, custom fortify levels)
- **Tower Coordination**: Builders avoid repairs when towers are available and active
- **Fortification Management**: Separate wall/rampart thresholds with progressive fortification goals
- **Critical Repair Priority**: Emergency repairs for structures below 10% health
- **Damage Detection**: Automatic identification and queuing of damaged structures

### Room Planning & Infrastructure
- **Container Bootstrap**: Harvesters automatically build containers at source positions
- **Fortification Strategy**: Configurable fortification levels with energy budget considerations
- **Infrastructure Progression**: Planned structure placement based on room development stage

## Enhanced Task Management ⏭️
**Priority**: Medium - Improved AI coordination
**Inspired by master branch sophisticated coordination**

### Advanced Task Features
- **Task Chaining**: Sophisticated task sequences and dependencies
- **Task Interruption**: Priority-based task switching for urgent needs
- **Source Optimization**: Workpart-based efficiency calculations, source space management, distance optimization
- **Multi-Creep Coordination**: Conflict resolution, resource contention handling, load balancing

### Energy Management
- **Energy Reservation System**: Prevents multiple creeps targeting same energy sources
- **Priority Energy Distribution**: Attack mode (towers first), normal mode (spawns→towers→power→nukers→labs)
- **Energy Threshold Logic**: Different behaviors based on storage energy levels (>100k enables power/nuker filling)
- **Rebalancing Mode**: Haulers redistribute energy between containers when no priority targets exist

### Position Optimization
- **Multi-Target Optimization**: Creeps position optimally relative to multiple relevant structures
- **Source Position Caching**: Scanned source accessibility with space counting for harvester assignment
- **Pathfinding Enhancement**: ERR_NO_PATH handling with target reassignment fallbacks

## Advanced Defense & Tower Management ⏭️
**Priority**: High - Essential for room security
**Inspired by master branch sophisticated tower AI**

### Tower Defense Logic
- **Attack Priority System**: Healers first, then other hostiles, with closest-range targeting
- **Ally System**: Configurable ally list to avoid attacking friendly players
- **Repair Prioritization**: Critical structures (< 10% health) → Creep healing → General repairs
- **Energy Conservation**: Reserve 25% energy for critical operations (attack/emergency repair)
- **Fortification Support**: Towers repair walls/ramparts up to room fortification levels

### Attack Response
- **Under Attack Detection**: Automatic detection of hostile creeps with room state tracking
- **Priority Rebalancing**: Haulers prioritize tower energy during attacks (10% → 90% → 100% thresholds)
- **Coordinate Repair**: Avoid builder repair conflicts during tower operations
- **Flag Integration**: Respect destruction flags (RED+BROWN) and avoid repairing flagged structures

## Market & Economic Management ⏭️
**Priority**: Medium - Advanced economic optimization
**Inspired by master branch market automation**

### Automated Trading
- **Price Monitoring**: Track best buy order prices across all resources
- **Intelligent Selling**: Auto-sell excess minerals when storage/terminal >90% full
- **Energy Cost Optimization**: Calculate transaction costs and select most efficient orders
- **Emergency Selling**: No-limit sales when storage reaches 99% capacity
- **Market Integration**: Console commands for manual market operations

### Resource Management
- **Storage Overflow Prevention**: Automatic market sales when approaching capacity limits
- **Terminal Management**: Coordinated terminal/storage logistics
- **Mineral Valuation**: Minimum price thresholds to prevent poor trades (>0.05 credits default)
- **Resource Prioritization**: Sell highest quantity resources first for storage optimization

## Performance & CPU Management ⏭️
**Priority**: Medium - Scalability and efficiency
**Inspired by master branch sophisticated profiling**

### CPU Optimization
- **Sleep Logic**: Automatic sleep when CPU timeouts occur with exponential backoff
- **CPU Bucket Monitoring**: Adjust tick limits based on bucket levels (>100 = 90% limit, else 15 CPU)
- **Room Processing Order**: Rotate room processing order to ensure fairness
- **CPU Profiling**: Detailed per-room and per-subsystem CPU tracking
- **Performance Limits**: Emergency CPU cutoffs with timing diagnostics

### Memory & Caching
- **Structured Caching**: Per-tick caching for creeps and structures to avoid repeated lookups
- **Memory Cleanup**: Automatic cleanup of expired room memory, dead creep memory
- **Memory Protection**: Protected memory keys system to prevent accidental deletion
- **Statistics Tracking**: Comprehensive game statistics with JSON serialization

### Room Processing
- **Incremental Processing**: Room processing with CPU cutoffs and continuation
- **Priority Rooms**: Own rooms processed first with CPU budget allocation
- **Processing Fairness**: Round-robin room processing to prevent starvation
- **Creep Processing**: Separate CPU budgets for room logic vs creep logic

## Advanced Statistics & Monitoring ⏭️
**Priority**: Low - Operational intelligence
**Inspired by master branch comprehensive analytics**

### Room Statistics
- **Energy Budgeting**: 15k-tick energy budget analysis with income/expense breakdown
- **Maintenance Costs**: Calculated costs for roads, ramparts, containers, creeps
- **Controller Monitoring**: RCL progress tracking, downgrade risk assessment
- **Source Efficiency**: Track harvesting efficiency and detect inefficient sources

### Console Utilities
- **Build Mode**: Convert upgraders to builders on demand
- **Claim Command**: Queue rooms for claiming with automatic route optimization
- **Market Command**: Manual market operations via console
- **Statistics Display**: Comprehensive room status with formatted output
- **Large Number Formatting**: Human-readable number display (K, M, G suffixes)

### Performance Analytics
- **Processing Time Tracking**: Per-room CPU usage measurement
- **Timing Diagnostics**: Detailed timing when approaching CPU limits
- **Efficiency Metrics**: Track creep utilization and task effectiveness
- **Budget Analysis**: Income vs maintenance cost analysis with percentage allocation

## Multi-Room & Expansion ⏭️
**Priority**: Low - Late game scaling
**Inspired by master branch room expansion system**

### Room Claiming
- **Claim Queue System**: Rooms-to-claim list with automatic assignment
- **Route Optimization**: Closest spawn to target room selection for claimer spawning
- **Conflict Avoidance**: Multiple claimers avoid targeting same room
- **Automatic Cleanup**: Claimers suicide after successful claiming

### Remote Operations
- **Cross-Room Spawning**: Emergency spawning in nearby rooms when local spawns unavailable
- **Long-Distance Transport**: Specialized LongHauler creeps for inter-room resource transport
- **Remote Mining**: Mineral extraction coordination across multiple rooms
- **Room Memory Management**: Distributed room memory with expiration systems

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
- **Advanced Spawn Queue**: Priority-based spawning with resource waiting and cross-room coordination
- **Link Networks**: Automated link energy distribution with path optimization
- **Lab Management**: Automated mineral processing, boosting, and resource production chains
- **Power Creep Management**: Power creep integration, abilities, and room assignments
- **Combat AI**: Squad formations, tactical combat, and coordinated defense
- **Automated Room Planning**: AI-driven structure placement and room layout optimization
- **Advanced AI Behaviors**: Machine learning for task prioritization and efficiency optimization

## Power & Late Game Features  
- **Power Processing**: Automated power harvesting, processing, and power creep management
- **Factory Management**: Commodity production chains and automated factory operations
- **Seasonal Features**: Integration with seasonal mechanics and specialized strategies
- **Advanced Market Operations**: Market manipulation, resource speculation, buy order management
- **Inter-Shard Operations**: Cross-shard resource coordination and expansion planning
- **Mineral Economy**: Complex mineral processing chains and optimization
- **Advanced Logistics**: Multi-room supply chains and resource distribution networks

## Advanced Dev/Workflow Features
- **Build Optimization**: Advanced bundling and deployment options
- **Version Control**: Conventional commits and branching strategy
- **Simulation Tools**: Isolated scenario testing without full game environment
- **Performance Profiling**: Detailed CPU and memory analysis tools

---

*This file serves as the complete development roadmap and status tracker. Update sections as work progresses and move completed items to "Existing Features" sections.*
