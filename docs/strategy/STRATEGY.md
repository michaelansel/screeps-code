# Game Strategy

This document defines what we want to achieve in the Screeps game world, using game terminology and describing desired behaviors regardless of implementation details.

## Core Game Objectives

### Energy Economy
- **Harvest energy at generation rate**: Each energy source should have enough harvesters to extract energy as fast as it regenerates (10 energy per tick)
- **Minimize energy waste**: Energy should flow efficiently from sources to consumers without accumulation bottlenecks
- **Scale energy capacity with RCL**: Higher room control levels should support larger energy throughput and storage

### Room Control Level Progression
- **Upgrade controllers as fast as possible**: Controllers should receive constant energy flow when resources allow
- **Build optimal layouts for each RCL**: Structure placement should optimize for current RCL needs and prepare for next level
- **Prioritize critical structures**: Extensions and spawns first, then storage and infrastructure, finally luxury structures

### Resource Management Strategy
- **RCL 1-3 (Survival Phase)**: Focus on basic energy harvesting, spawning, and essential construction
- **RCL 4-6 (Growth Phase)**: Develop infrastructure, roads, containers, and storage systems
- **RCL 7-8 (Optimization Phase)**: Advanced logistics, terminals, labs, and efficiency maximization

### Defensive Strategy
- **Build fortifications progressively**: Walls and ramparts based on threat level and available resources
- **Maintain tower energy reserves**: Towers should always have energy available for emergency defense
- **Scale defensive structures with room value**: More valuable rooms justify stronger defenses

## Operational Behaviors

### Spawning Priorities
1. **Harvesters first**: Ensure energy income before other roles
2. **Builders for infrastructure**: When construction sites exist and energy allows
3. **Upgraders for progression**: Use excess energy for controller advancement
4. **Specialized roles**: Haulers, defenders, remote miners as room matures

### Construction Strategy
- **Critical repairs before construction**: Maintain existing infrastructure health
- **Roads for efficiency**: Build road networks between spawn, sources, and controller
- **Extensions for larger creeps**: Prioritize extensions to enable bigger, more efficient creeps
- **Storage when energy accumulates**: Build storage when harvesting exceeds consumption

### Work Assignment Logic
- **Construction over repair**: Build new infrastructure before repairing unless critical (sub-10% health)
- **Emergency repairs priority**: Damaged spawns, extensions, or critical structures get immediate attention
- **Infrastructure before luxury**: Essential structures (spawn, extensions, storage) before walls, decorations

### Energy Flow Strategy
- **Direct delivery in early game**: Harvesters deliver directly to spawn and extensions
- **Storage-based logistics in mid game**: Use storage and dedicated haulers when infrastructure supports it
- **Link networks in late game**: Minimize creep movement with link-based energy distribution

## RCL-Specific Goals

### RCL 1: Survival
- Maintain 2+ harvesters for energy security
- Build 1-2 upgraders for progression
- Construct essential extensions immediately
- Begin road network to sources

### RCL 2-3: Foundation
- Scale to 4-6 total creeps based on energy capacity
- Complete road network between key structures
- Build containers at source positions
- Establish basic construction workflow

### RCL 4-5: Infrastructure
- Implement storage-based energy economy
- Build comprehensive road networks
- Scale creep counts based on infrastructure capacity
- Begin defensive preparations

### RCL 6-8: Optimization
- Maximize energy throughput efficiency
- Implement advanced logistics systems
- Build complete defensive networks
- Optimize for specific room objectives (economy, military, research)

## Victory Conditions

### Short-term Success Metrics
- **Energy positive**: More energy harvested than consumed
- **Stable population**: Consistent creep count appropriate for RCL
- **Infrastructure growth**: New structures built when resources allow
- **Controller progression**: Regular controller upgrades

### Long-term Success Metrics
- **RCL advancement**: Progressing through room control levels efficiently
- **Economic surplus**: Accumulating energy for expansion or advanced operations
- **Defensive security**: Surviving attacks and protecting assets
- **Multi-room expansion**: Successfully claiming and developing additional rooms

## Adaptation Strategies

### Resource Constraints
- **Low energy**: Prioritize harvesters over all other roles
- **No construction sites**: Convert builders to upgraders temporarily
- **Under attack**: Redirect builders to repair and tower supply

### Infrastructure Failure
- **Spawn damaged**: Emergency repair priority for builders
- **Sources exhausted**: Implement emergency energy conservation
- **Storage destroyed**: Revert to direct delivery logistics

### Growth Opportunities
- **Energy surplus**: Increase upgrader count and construction activity
- **Stable economy**: Begin advanced structure development
- **Defensive security**: Consider expansion to additional rooms

This strategy focuses purely on game objectives and desired behaviors, providing the foundation for architectural and implementation decisions that achieve these goals in the Screeps game world.