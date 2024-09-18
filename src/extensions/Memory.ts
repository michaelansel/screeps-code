import { SourcePlannerMemory } from 'planners/SourcePlanner.js';

declare global {
    interface Memory extends MemoryExtension { }

    interface MemoryExtension {
        creepCounter?: number; // main.ts for generating unique creep names
        SourcePlanner?: SourcePlannerMemory;
    }
}
