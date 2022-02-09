import type { Project } from '.'
import { ProjectHelpers } from './Project';
import * as tasks from 'tasks';

export const HarvestEnergyProject = <Project>{
    id: "HarvestEnergyProject",
    // Is there a way I can add local helper functions without confusing the type system?

    start(creep: Creep): void {
        ProjectHelpers.start(creep, HarvestEnergyProject);
    },
    run(creep: Creep): void {
        console.log(`Executing ${this.id} for ${creep.name}`);

        if (creep.isFullOfEnergy) {
            creep.startTask(tasks.DepositEnergyTask);
        } else {
            creep.startTask(tasks.HarvestEnergyTask);
        }
    },
    stop(creep: Creep): void {
        ProjectHelpers.stop(creep, HarvestEnergyProject);
    },
};
