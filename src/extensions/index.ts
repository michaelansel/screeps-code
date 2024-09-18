import { use as useCreep } from './Creep'
import { use as useCreepMemory } from './CreepMemory'
import { use as useMemory } from './Memory'

// This is a bit wonky, but exists so that extensions are applied at runtime, not module load-time
export function use(extend: {
    Creep?: Creep,
    CreepMemory?: CreepMemory,
    Memory?: Memory,
}) {
    if (extend.Creep) useCreep(<{ Creep: Creep }>extend);
    if (extend.CreepMemory !== undefined) useCreepMemory(<{ CreepMemory: CreepMemory }>extend);
    if (extend.Memory !== undefined) useMemory(<{ Memory: Memory }>extend);
}
