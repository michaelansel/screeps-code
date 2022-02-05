export { }
import type { Task } from '../tasks';

declare global {
    interface CreepMemory extends CreepMemoryExtension { }

    interface CreepMemoryExtension {
        task: Id<Task> | undefined;
        // TODO refactor to be somehow defined closer to where they are used
        target: Id<Structure> | undefined; // DepositEnergyTask
        source: Id<Source> | undefined; // HarvestEnergyTask
    }
}

