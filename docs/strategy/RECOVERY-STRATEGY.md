# Emergency Recovery Strategy

## Problem Statement

During full creep wipe situations, the colony needs to bootstrap its economy efficiently. Two main energy sources are available:

1. **Harvesting** - Slow but guaranteed, generates ~10 energy/tick per WORK part
2. **Hauling** - Fast if available, can collect 50+ energy per trip from storage/containers

The current system may get stuck waiting to fill extensions before spawning additional creeps, which is inefficient during recovery.

## Recovery Decision Tree

### 1. Energy Source Assessment
```
Available Energy Sources (priority order):
1. Dropped resources near spawn
2. Storage with energy > 1000
3. Containers with energy > 500  
4. Sources (harvesting fallback)
```

### 2. Spawning Strategy

**Phase 1: Emergency Bootstrap**
- Use only spawn energy (300)
- Spawn minimal worker: [WORK, CARRY, MOVE] (200 energy)
- Don't wait for extensions to fill

**Phase 2: Rapid Scaling**
- As soon as spawn has 200+ energy, spawn another worker
- Continue until we have 2-3 active workers
- Only then consider using extension energy for larger creeps

**Phase 3: Normal Operations**
- Transition to capability-based spawning
- Use full room energy for optimal creep designs

## Mathematics

### Extension Filling Analysis
```
Scenario: 1 weak harvester [WORK,CARRY,MOVE]
- Harvest rate: 2 energy/tick
- Round trip to spawn: ~10 ticks
- Net energy delivery: ~10 energy per 15 ticks = 0.67 energy/tick to spawn

Time to fill 200 energy extensions: 200 / 0.67 = ~300 ticks (15 minutes!)

Alternative: Spawn 3 weak workers immediately
- Combined harvest: 3 × 0.67 = 2 energy/tick to spawn  
- Time to spawn 4th worker: 200 / 2 = 100 ticks (5 minutes)
- Much faster scaling!
```

### Hauling vs Harvesting Speed
```
Hauling (if energy available):
- [CARRY,CARRY,MOVE] can move 100 energy per ~15 tick round trip
- Rate: ~6.7 energy/tick delivered

Harvesting:
- [WORK,CARRY,MOVE] delivers ~0.67 energy/tick  
- Hauling is 10x faster when energy is available!
```

## Implementation Requirements

1. **Energy Source Detection**: Scan for available energy sources at recovery start
2. **Dynamic Recovery Mode**: Switch between hauling and harvesting based on availability  
3. **Rapid Spawning**: Don't wait for extensions during emergency phase
4. **Recovery Metrics**: Track progress and automatically transition phases

## Strategic Insights

- **Speed > Efficiency**: During recovery, many weak creeps >> few strong creeps
- **Energy Source Priority**: Hauling existing energy is much faster than generating new energy
- **Extension Trap**: Waiting for extensions to fill can create 15+ minute delays
- **Compound Growth**: Each additional worker accelerates the next spawn exponentially