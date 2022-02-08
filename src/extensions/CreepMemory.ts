export { }
import type { Project } from '../projects';
import type { Task } from '../tasks';

declare global {
    interface CreepMemory extends CreepMemoryExtension { }

    interface CreepMemoryExtension {
        // TODO refactor to be somehow defined closer to where they are used
        project?: Id<Project>; // CreepTaskingExtension
        task?: Id<Task>; // CreepTaskingExtension
        target?: Id<Structure>; // DepositEnergyTask
        source?: Id<Source>; // HarvestEnergyTask
    }
}

