export { }

import { SourcePlannerMemory } from 'planners/SourcePlanner.js';

declare global {
    interface Memory extends MemoryExtension { }

    interface MemoryExtension {
        creepCounter?: number;
        SourcePlanner?: SourcePlannerMemory;
    }
}
