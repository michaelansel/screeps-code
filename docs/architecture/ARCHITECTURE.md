# Bot Architecture

This document describes the bot logic design and how different components work together to achieve the game strategy. This uses bot terminology (planners, projects, tasks) and is language-agnostic - it could theoretically be implemented in any programming language.

## Overall Architecture

The bot employs a hierarchical control system with three main layers:

### 1. Planners (Strategic Layer)
At the highest level, planners make strategic decisions and coordinate multiple entities:
- **SourcePlanner**: Assigns energy sources to creeps based on capacity and efficiency
- **RoleManager**: Determines optimal creep counts and spawning priorities for each room
- **EnergySourceManager**: Analyzes room infrastructure to optimize energy flow strategies

Planners operate on a global or multi-room scale and make decisions that affect entire rooms or multiple creeps simultaneously.

### 2. Projects (Tactical Layer) 
Each creep is assigned a single "Project" that represents its long-term role:
- **HarvestEnergyProject**: Manages the harvester role lifecycle (harvest → deposit → repeat)
- **BuilderProject**: Handles construction and repair work with priority-based task selection
- **UpgradeControllerProject**: Manages the upgrader role (gather energy → upgrade controller)

Projects determine a creep's general behavior and decide which tasks are appropriate to achieve their goals. They coordinate the overall workflow for their assigned creep.

### 3. Tasks (Operational Layer)
Tasks are specific, short-term actions that make progress toward project goals:
- **HarvestEnergyTask**: Move to source and harvest energy
- **DepositEnergyTask**: Transfer energy to spawn, extensions, or storage
- **WithdrawEnergyTask**: Collect energy from storage or containers
- **BuildTask**: Construct buildings or repair structures
- **UpgradeControllerTask**: Upgrade room controller with carried energy

Tasks focus on one specific action at a time and handle the detailed game mechanics.

## Decision Flow

### Creep Lifecycle
1. **Spawning**: RoleManager determines which project type to spawn based on room needs
2. **Project Assignment**: Newly spawned creep receives initial project based on spawning decision
3. **Task Selection**: Project evaluates creep state and assigns appropriate task
4. **Task Execution**: Creep performs specific actions (move, harvest, build, etc.)
5. **Task Completion**: When task finishes, project selects next appropriate task
6. **Project Switching**: Creeps can be reassigned to different projects based on changing needs

### Information Flow
- **Planners** analyze global state and make assignments/recommendations
- **Projects** use planner assignments and local creep state to select tasks
- **Tasks** execute game actions and report completion to projects
- **Memory** persists state and decisions across game ticks

## Core Systems

### Energy Management
The bot implements intelligent energy flow strategies:

**Energy Acquisition Strategy**:
- Early game: Direct harvesting from sources
- Mid game: Storage-based withdrawal when infrastructure supports it
- Decision factors: Storage levels, hauler reliability, spawn/extension status

**Energy Distribution Priority**:
1. Spawn and Extensions (critical for spawning)
2. Containers (local energy supply)
3. Storage (bulk energy reserves)
4. Towers (defensive needs)

**Infrastructure Analysis**:
- Evaluates room maturity and hauler support
- Determines optimal energy source for builders/upgraders
- Switches between harvesting and withdrawal strategies

### Role Management
Dynamic role assignment based on room conditions:

**Spawning Priority**:
1. Harvesters (minimum 2 for energy security)
2. Builders (when construction sites exist)
3. Upgraders (for controller progression)

**Body Scaling**:
- Analyzes total room energy (spawn + extensions)
- Generates role-appropriate body parts within energy limits
- Optimizes for movement efficiency and role-specific needs

**Quota Management**:
- Calculates desired creep counts based on room state
- Adjusts for RCL, energy capacity, and infrastructure needs
- Handles emergency scaling during resource constraints

### Construction Management
Intelligent building and repair strategies:

**Priority System**:
1. Critical repairs (structures below 10% health)
2. Missing roads on key paths
3. Construction sites
4. General maintenance repairs

**Road Network**:
- Automatically detects missing roads between key structures
- Plans paths from spawn to sources, controller, and extensions
- Creates construction sites for missing infrastructure

**Building Logic**:
- Prioritizes extensions and spawn-related structures
- Avoids building luxury structures until infrastructure is stable
- Coordinates with energy management for resource allocation

## Component Interactions

### Planner-Project Coordination
- **SourcePlanner** assigns sources to harvesters
- **RoleManager** provides spawning recommendations to room logic
- **EnergySourceManager** influences task selection in builder/upgrader projects

### Project-Task Coordination
- Projects evaluate creep state (energy level, position, capacity)
- Projects select appropriate tasks based on strategy and current needs
- Tasks report completion and any failures back to projects

### Memory and Persistence
- Planners maintain strategic state across ticks
- Projects store creep-specific configuration and progress
- Tasks handle temporary state during execution
- Global counters and assignments persist in structured memory

## Scaling Architecture

### Room Control Level Adaptation
The architecture adapts behavior based on room development:

**RCL 1-3 (Basic)**: 
- Simple direct energy flow
- Minimal role specialization
- Basic construction priority

**RCL 4-6 (Intermediate)**:
- Storage-based energy management
- Specialized hauler logistics
- Advanced construction planning

**RCL 7-8 (Advanced)**:
- Complex energy networks
- Highly specialized roles
- Optimized efficiency systems

### Multi-Room Coordination
Architecture supports expansion to multiple rooms:
- Planners can coordinate resources across rooms
- Projects can handle inter-room logistics
- Tasks support remote operations and long-distance travel

## Error Handling and Recovery

### Graceful Degradation
- Missing infrastructure reverts to simpler strategies
- Creep loss triggers emergency spawning protocols
- Resource constraints shift priorities automatically

### State Recovery
- Memory corruption handling with safe defaults
- Creep reassignment when projects become invalid
- Automatic cleanup of orphaned assignments

This architecture provides a flexible, scalable foundation that can adapt to changing game conditions while maintaining clear separation of concerns between strategic planning, tactical coordination, and operational execution.