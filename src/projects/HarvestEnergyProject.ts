import type { Project } from '.'
import { ProjectHelpers, ProjectSymbol } from './Project';
import * as tasks from 'tasks';
import { Logger } from 'utils/Logger';

const logger = Logger.get("HarvestEnergyProject");

export const HarvestEnergyProject: Project = {
    type: ProjectSymbol,
    id: "HarvestEnergyProject" as Id<Project>,
    start(creep: Creep): void {
        ProjectHelpers.start(creep, HarvestEnergyProject);
    },
    run(creep: Creep): void {
        logger.info(`Executing ${this.id} for ${creep.name}`);

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
