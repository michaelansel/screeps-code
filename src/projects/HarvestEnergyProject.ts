import * as tasks from "tasks";
import type { ProjectBehavior, ProjectConfig, ProjectId } from "./Project";
import { ProjectBehaviorSymbol, ProjectHelpers } from "./Project";
import { Logger } from "utils/Logger";
import { shouldHarvesterUseStorage } from "../utils/EnergySourceManager";
import type { DepositEnergyTaskConfig } from "../tasks/DepositEnergyTask";

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
      // Determine deposit strategy based on room infrastructure
      const useStorage = shouldHarvesterUseStorage(creep.room);
      
      if (useStorage) {
        // Prioritize storage when infrastructure supports it
        creep.startTask(tasks.DepositEnergyTask, { prioritizeStorage: true } as DepositEnergyTaskConfig);
      } else {
        // Default priority: spawn/extensions first
        creep.startTask(tasks.DepositEnergyTask);
      }
    } else {
      creep.startTask(tasks.HarvestEnergyTask);
    }
  },
  stop(creep: Creep): void {
    ProjectHelpers.stop(creep);
  }
};

export const HarvestEnergyProject = HarvestEnergyProjectBehavior;
