# Emergency Recovery Strategy

## Problem Statement

During full creep wipe situations, the colony needs to bootstrap its economy efficiently. Two main energy sources are available:

1. **Harvesting** - Slow but guaranteed, generates ~10 energy/tick per WORK part
2. **Hauling** - Fast if available, can collect 50+ energy per trip from storage/containers

The key insight is that emergency recovery should prioritize speed over efficiency, and leverage stored energy when available rather than waiting for optimal spawning conditions.

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
- Use available room energy immediately (including extensions)
- Emergency worker: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] (300 energy)
- Strong capabilities: 4 work power, 100 carry capacity, balanced movement
- Don't wait for extensions to fill or optimal conditions

**Phase 2: Rapid Scaling**
- Continue emergency spawning until stable worker count (3-6 workers)
- Begin infrastructure assessment for hauling opportunities
- Balance harvesting and hauling based on available stored energy
- Prioritize speed over specialization

**Phase 3: Normal Operations**
- Transition to capability-based spawning with specialization
- Use full room energy for optimal creep designs
- Focus on efficiency and long-term sustainability

## Mathematics

### Emergency Worker Analysis (Game Mechanics)
```
Emergency worker design: [WORK, WORK, CARRY, CARRY, MOVE, MOVE] (300 energy cost)

Core game mechanics:
- Each WORK part harvests 2 energy/tick from sources
- Each CARRY part provides 50 energy capacity  
- Each MOVE part enables 1 tile/tick movement when total weight ≤ MOVE parts
- Body weight = total body parts (6 parts = 6 weight)

Performance calculation:
- Harvest rate: 2 WORK × 2 energy/tick = 4 energy/tick
- Capacity: 2 CARRY × 50 = 100 energy max
- Time to fill: 100 capacity ÷ 4 energy/tick = 25 ticks
- Movement: 6 body parts ÷ 2 MOVE = 3 effective speed (moves every 3 ticks)
- Travel time: ~6 tiles × 3 ticks/tile = ~18 ticks round trip
- Total cycle: 25 + 18 = 43 ticks for 100 energy = 2.3 energy/tick delivered

Time to accumulate 300 energy for next spawn: 300 ÷ 2.3 = ~130 ticks (6.5 minutes)
```

### Hauling vs Harvesting Speed (Game Mechanics)
```
Emergency Harvesting (calculated above):
- 2.3 energy/tick delivered to spawn
- Self-sufficient, requires only sources

Hauling stored energy:
- Hauler body: [CARRY, CARRY, MOVE, MOVE] (200 energy cost)
- Capacity: 2 CARRY × 50 = 100 energy
- Weight: 4 body parts ÷ 2 MOVE = 2 effective speed (moves every 2 ticks)
- Travel time: ~6 tiles × 2 ticks/tile = 12 ticks round trip
- Load time: 1 tick to withdraw from storage
- Total cycle: 12 + 1 = 13 ticks for 100 energy = 7.7 energy/tick delivered

Hauling advantage: 7.7 ÷ 2.3 = 3.3x faster than harvesting when energy available
```

## Implementation Requirements

1. **Energy Source Detection**: Scan for available energy sources at recovery start
2. **Dynamic Recovery Mode**: Switch between hauling and harvesting based on availability  
3. **Rapid Spawning**: Don't wait for optimal conditions during emergency phase
4. **Recovery Metrics**: Track progress and automatically transition phases
5. **Strong Emergency Workers**: Design emergency bodies for capability, not just survival

## Strategic Insights

- **Speed > Efficiency**: During recovery, rapid worker scaling is more important than optimal energy usage
- **Emergency Workers Are Capable**: 300-energy balanced workers provide strong recovery foundation, not just survival
- **Energy Source Priority**: Hauling existing energy is 2-3x faster than generating new energy through harvesting
- **Compound Growth**: Each emergency worker enables the next spawn in ~70 ticks, creating exponential recovery
- **Immediate Action**: Don't wait for extensions to fill or optimal spawning conditions during emergency
- **Baseline + Optimization**: Emergency harvesting provides reliable baseline, hauling provides speed boost when available