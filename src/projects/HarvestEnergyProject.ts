import type { Project } from '.'
import { ProjectHelpers, ProjectSymbol } from './Project';
import * as tasks from 'tasks';

export const HarvestEnergyProject: Project = {
    type: ProjectSymbol,
    id: "HarvestEnergyProject" as Id<Project>,
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
