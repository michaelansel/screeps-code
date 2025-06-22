# Game Strategy

This document defines our opinionated approach to Screeps gameplay. Every decision here represents a specific choice with trade-offs we've explicitly accepted.

## Core Philosophy: Speed Over Efficiency

We optimize for reaching higher RCLs as fast as possible, even at the cost of energy efficiency. This means:
- We accept 50% energy waste if it means 20% faster RCL progression
- We spawn smaller, less efficient creeps if it reduces spawn downtime
- We delay infrastructure that doesn't directly accelerate RCL advancement

## Energy Economy Rules

### Source Harvesting
- **1 dedicated harvester per source** with exactly 5 WORK parts (once affordable)
- **No shared harvesters** - each source gets its own dedicated creep
- **Container mining only after RCL3** - before that, harvesters carry their own energy
- **Static harvesters after RCL4** - harvesters with no CARRY/MOVE, just WORK parts
- **Opportunistic energy collection** - all creeps collect dropped energy and tombstones when convenient

### Energy Ratios
- **RCL1-2**: 100% of energy to controller upgrades (survival minimum only)
- **RCL3-5**: 80% upgrading, 20% construction/defense
- **RCL6+**: 60% upgrading, 30% construction, 10% defense
- **Never below 50% to upgrading** until RCL8

### Storage Rules
- **No storage before 10,000 sustained energy/tick income** (typically RCL4)
- **Storage placement**: Exactly 1 tile from controller, 2 tiles from sources
- **Minimum storage reserve**: 50,000 energy (tower defense buffer)
- **Maximum storage**: 500,000 energy (build terminal after this)

## Creep Design Principles

### Body Part Ratios
- **Harvesters**: Maximum WORK, minimal CARRY (1-2), balanced MOVE
- **Upgraders**: 1:1 WORK:CARRY ratio, 1 MOVE per 2 other parts
- **Builders**: 1:1:1 WORK:CARRY:MOVE for flexibility
- **Haulers**: 0 WORK, 2:1 CARRY:MOVE ratio

### Creep Sizes by RCL
- **RCL1**: 3-part creeps only ([WORK,CARRY,MOVE])
- **RCL2**: 6-part creeps maximum (300 capacity)
- **RCL3**: 10-part creeps (550 capacity)
- **RCL4+**: Scale to available energy, max 15 parts until RCL7

### Spawn Time Optimization
- **Never spawn a creep that takes >500 ticks** (except harvesters)
- **Prefer 2 small creeps over 1 large creep** if spawn time < 75% combined
- **Emergency rule**: If no harvesters exist, spawn 3-part immediately

## Construction Priority Algorithm

1. **Extensions** (100% priority until all built for current RCL)
2. **Containers at sources** (only after all extensions)
3. **Roads** in this exact order:
   - Spawn to sources (straight line only)
   - Sources to controller
   - Spawn to controller
   - Everything else is luxury
4. **Storage** (only when energy income exceeds 10k/tick)
5. **Towers** (1 per 100,000 lifetime energy harvested)
6. **Walls/Ramparts** (never before RCL4, max 10k hits until RCL6)

### What We DON'T Build
- **No containers at controller** - upgraders should pull from storage/spawn
- **No roads in mineral fields** - not worth the maintenance
- **No ramparts on non-critical structures** - only spawn, storage, towers
- **No labs until RCL7** - focus on economy first

## RCL-Specific Strategies

### RCL1: The 200-Tick Sprint
- **Target**: Reach RCL2 in <15,000 ticks (concrete goal)
- **Creep mix**: 2-3 harvesters, 1-2 upgraders, all 3-part
- **Zero construction** - not even roads
- **Spawn pattern**: Harvester → Upgrader → Harvester → repeat
- **Failure condition**: If not RCL2 by 20,000 ticks, something is wrong

### RCL2: Extension Rush
- **First 1,000 ticks**: Build all 5 extensions, nothing else
- **Creep transition**: Start spawning 6-part creeps immediately
- **Target creep count**: 4 harvesters, 3 upgraders
- **First road**: Only after all extensions done

### RCL3: Container Economy
- **Containers at sources first** (within 2,000 ticks of RCL3)
- **Static harvesters**: Transition to 5-WORK, 1-CARRY, 3-MOVE design
- **Add haulers**: 1 hauler per 2 sources minimum
- **Road network**: Complete spawn-source-controller triangle

### RCL4: Storage Transition
- **Storage placement**: Pre-plan at RCL3, build immediately at RCL4
- **Creep redesign**: All creeps pull from storage, not sources
- **Link preparation**: Plan link placement, don't build yet
- **Tower placement**: First tower 3 tiles from storage

### RCL5-6: Infrastructure Maturity
- **Link network**: Source links first, controller link second
- **Terminal planning**: Identify location but don't build
- **Rampart critical structures**: 100k hits on spawn/storage
- **Begin remote mining**: Only rooms ≤2 distance

### RCL7-8: Optimization Phase
- **Lab complex**: 10-lab flower pattern only
- **Power banking**: Only with dedicated squad design
- **Market participation**: Energy sales only above 100k storage
- **Factory integration**: Only for specific commodity chains

## Combat Philosophy

### Defense Priorities
1. **Towers over creeps** - automated defense preferred
2. **Economic damage mitigation** - protect harvesters/haulers first
3. **Let them take the walls** - ramparts are renewable
4. **Safe mode threshold**: Use at <50% spawn health

### Military Spending
- **0% military budget** until RCL4
- **Max 10% energy on defense** at RCL4-6
- **Max 20% at RCL7+** unless under active siege
- **No preemptive attacks** - defense only until RCL8

## Opportunistic Energy Collection

### Collection Behavior Rules
- **Haulers**: Always collect dropped energy within 5 tiles - highest priority
- **Harvesters**: Collect nearby energy within 2 tiles when not full
- **Upgraders**: Collect energy when they have free capacity within 3 tiles  
- **Builders**: Collect energy when below 50% capacity within 4 tiles
- **Minimum threshold**: Only collect >10 energy unless very close (1 tile)

### Target Priority
1. **Dropped resources** and **tombstones** treated equally
2. **Closest energy source** wins regardless of type
3. **Never interrupt critical tasks** - only when idle or moving
4. **Automatic task switching** - seamlessly return to primary task after collection

### Energy Source Types
- **Dropped energy resources** - picked up with `pickup()` action
- **Tombstones with energy** - energy withdrawn with `withdraw()` action
- **Both types searched simultaneously** within specified range per role

## Anti-Patterns We Explicitly Reject

### Things We DON'T Do
- **No early remote mining** - not worth it before RCL4
- **No upgrader containers** - creates unnecessary hauling overhead
- **No distributed spawning** - centralize around primary spawn
- **No early market trading** - focus on internal economy
- **No repairing above 50%** unless critical structure
- **No aesthetic building** - purely functional layouts

### Common Mistakes We Avoid
- **Over-defending**: 1 tower is enough until RCL6
- **Perfectionist road placement**: Straight lines are fine
- **Creep role proliferation**: Maximum 4 roles until RCL6
- **Early terminal usage**: Costs too much energy in transfer fees

## Failure Recovery Procedures

### Creep Wipeout Recovery
1. **Tick 1-300**: Spawn [WORK,CARRY,MOVE] harvester
2. **Tick 301-600**: Second harvester if energy allows
3. **Tick 601+**: Resume normal operations
4. **Never**: Panic-spawn military units

### Economic Collapse
- **Energy debt**: Sell all non-WORK creep parts for energy
- **Spawn blocked**: Manually remove construction sites
- **Controller downgrade**: Accept it, focus on energy first

## Success Metrics

### Hard Numbers We Track
- **RCL2 by tick**: 15,000 (good), 20,000 (acceptable), 25,000+ (failure)
- **Energy per tick at RCL4**: 20+ (good), 15+ (acceptable), <15 (failure)
- **Upgrade rate**: 15 energy/tick minimum at all RCLs
- **Spawn utilization**: >80% active spawning time
- **CPU per room**: <10 CPU average, <20 CPU spike

### What We DON'T Measure
- **Energy efficiency** - speed matters more
- **Creep lifetime** - they're disposable
- **Road usage** - approximate placement is fine
- **Defense success rate** - safe mode exists

## Trade-Off Decisions

### We Choose Speed
- **Fast spawning over optimal creeps**: 300 tick spawn max
- **Direct paths over efficient paths**: CPU and simplicity win
- **More creeps over better creeps**: Until CPU limited
- **Upgrade constantly over save for burst**: Consistent progress

### We Choose Simplicity
- **Fixed ratios over dynamic calculation**: 2:1 harvester:upgrader
- **Hard thresholds over gradual transitions**: RCL4 = storage, period
- **Central planning over distributed decisions**: One brain model
- **Predictable over optimal**: Same build order every room

This strategy represents strong opinions loosely held. Every rule can be broken, but only with explicit justification.