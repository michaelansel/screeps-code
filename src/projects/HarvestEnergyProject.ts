import * as tasks from "tasks";
import type { ProjectBehavior, ProjectConfig, ProjectId } from "./Project";
import { ProjectBehaviorSymbol, ProjectHelpers } from "./Project";
import { Logger } from "utils/Logger";

const logger = Logger.get("HarvestEnergyProject");

const HarvestEnergyProjectId = "HarvestEnergyProject" as ProjectId;

export interface HarvestEnergyProjectConfig extends ProjectConfig<typeof HarvestEnergyProjectId> {}

const HarvestEnergyProjectBehavior: ProjectBehavior<typeof HarvestEnergyProjectId> = {
  type: ProjectBehaviorSymbol,
  id: HarvestEnergyProjectId,
  start(creep: Creep, config?: HarvestEnergyProjectConfig): void {
    ProjectHelpers.start(creep, HarvestEnergyProjectBehavior, config);
  },
  run(creep: Creep, config?: HarvestEnergyProjectConfig): void {
    logger.info(`Executing ${this.id} for ${creep.name}`);

    if (creep.isFullOfEnergy) {
      creep.startTask(tasks.DepositEnergyTask);
    } else {
      creep.startTask(tasks.HarvestEnergyTask);
    }
  },
  stop(creep: Creep): void {
    ProjectHelpers.stop(creep);
  }
};

export const HarvestEnergyProject = HarvestEnergyProjectBehavior;
