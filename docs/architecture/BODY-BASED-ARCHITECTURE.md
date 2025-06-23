# Body-Based Creep Architecture

## Overview

This document describes the implemented body-based creep management system. Instead of spawning "harvesters" or "builders", we spawn creeps with specific body configurations that define their capabilities. Projects then claim creeps based on what they can do, not what role they were assigned.

**Implementation Status**: ✅ Complete - All phases implemented and tested

## Core Concepts

### Body Capabilities

Each body part provides specific capabilities:
- **WORK**: harvest, build, repair, dismantle, upgradeController
- **CARRY**: store resources, transfer
- **MOVE**: movement speed
- **ATTACK**: attack other creeps
- **RANGED_ATTACK**: ranged combat
- **HEAL**: heal creeps
- **CLAIM**: claim controllers
- **TOUGH**: damage absorption

### Creep Templates

Instead of roles, we define body templates optimized for different purposes:

```typescript
// Energy Production Specialist (formerly "harvester")
// 5W 1C 3M = 550 energy - optimized for stationary harvesting
const ENERGY_SPECIALIST = [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];

// General Worker (can harvest, build, repair, upgrade)
// 2W 2C 2M = 300 energy - balanced for multiple tasks
const GENERAL_WORKER = [WORK, WORK, CARRY, CARRY, MOVE, MOVE];

// Transport Specialist (formerly "hauler")
// 4C 2M = 300 energy - optimized for carrying
const TRANSPORT_SPECIALIST = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];

// Heavy Worker (builder/upgrader focus)
// 4W 2C 3M = 650 energy - work-heavy for construction
const HEAVY_WORKER = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
```

### Capability Detection

Projects identify suitable creeps by checking capabilities:

```typescript
interface CreepCapabilities {
  canWork: boolean;         // has WORK parts
  workPower: number;        // total WORK parts
  canCarry: boolean;        // has CARRY parts  
  carryCapacity: number;    // total carry capacity
  moveSpeed: number;        // movement capability
  canHarvest: boolean;      // WORK parts > 0
  canBuild: boolean;        // WORK + CARRY > 0
  canHaul: boolean;         // CARRY parts > 0
  canUpgrade: boolean;      // WORK + CARRY > 0
}
```

### Project Assignment Strategy

Projects claim creeps based on:
1. **Required Capabilities**: What the project needs (e.g., harvesting requires WORK)
2. **Efficiency Score**: How well-suited the creep is (e.g., 5 WORK better for harvesting than 1 WORK)
3. **Availability**: Whether the creep is already assigned
4. **Proximity**: Distance to work site

## Implementation Components

### ✅ Core Infrastructure (Complete)

1. **CreepCapabilities System** (`src/utils/CreepCapabilities.ts`)
   - ✅ Capability detection from body parts
   - ✅ Efficiency scoring for different tasks
   - ✅ Caching system for performance

2. **Body Template Manager** (`src/utils/BodyTemplates.ts`)
   - ✅ Standard body templates (ENERGY_SPECIALIST, GENERAL_WORKER, etc.)
   - ✅ Template scaling based on available energy
   - ✅ Smart template selection logic

3. **Spawn Planning Refactor** (`src/utils/CapabilityManager.ts`)
   - ✅ Capability-based needs analysis
   - ✅ "We need 10 WORK parts for harvesting" approach
   - ✅ Dynamic body selection based on room needs

### ✅ Project System Updates (Complete)

1. **Project Requirements**
   - ✅ Projects use capability-based assignment
   - ✅ Creep scoring for task suitability
   - ✅ Flexible project switching

2. **Assignment Logic** (`src/utils/CapabilityManager.ts`)
   - ✅ Priority-based capability assignment
   - ✅ Dynamic re-assignment based on needs
   - ✅ Emergency capability handling

### ✅ Migration & Testing (Complete)

1. **System Transition**
   - ✅ Removed legacy role-based code
   - ✅ Full capability-based spawn management
   - ✅ Updated main loop to use new system

2. **Test Coverage**
   - ✅ Comprehensive capability system tests
   - ✅ Body template selection tests
   - ✅ Project assignment tests
   - ✅ All 340 unit tests passing

## Benefits

1. **Flexibility**: A "general worker" can harvest, build, and haul as needed
2. **Efficiency**: Spawn exactly the capabilities needed
3. **Resilience**: Any creep with WORK can emergency harvest
4. **Simplicity**: Projects define needs, not roles
5. **Adaptability**: Easy to create new body designs

## Example Scenarios

### Scenario 1: Early Game
- Spawn 2 GENERAL_WORKERS
- Both harvest when needed
- Both build when construction available
- Both upgrade when idle

### Scenario 2: Economy Crash
- Any creep with WORK can harvest
- Any creep with CARRY can haul
- No rigid role restrictions

### Scenario 3: Specialized Economy
- ENERGY_SPECIALISTS on sources
- TRANSPORT_SPECIALISTS for hauling
- HEAVY_WORKERS for building/upgrading
- But all can help in emergencies

## System Usage

### Spawning Flow
1. **CapabilityManager.analyzeRoomNeeds()** - Calculate required capabilities
2. **CapabilityManager.getNextSpawnRequest()** - Determine optimal body template
3. **BodyTemplateManager.selectTemplate()** - Choose specific body configuration
4. **Spawn with capability metadata** - Store capability information in creep memory

### Project Assignment Flow
1. **CapabilityManager.assignProjectToCreep()** - Match creep capabilities to project needs
2. **Projects claim suitable creeps** - Based on capability requirements
3. **Dynamic reassignment** - When priorities change or tasks complete

### Key Files
- `src/utils/CapabilityManager.ts` - Central capability management
- `src/utils/CreepCapabilities.ts` - Capability analysis and scoring
- `src/utils/BodyTemplates.ts` - Body template definitions and selection
- `src/main.ts` - Main loop using capability system

This architecture fundamentally changes how we think about creeps - from "what role am I" to "what can I do".