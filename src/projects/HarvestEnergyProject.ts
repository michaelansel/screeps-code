import * as tasks from "tasks";
import type { ProjectBehavior, ProjectConfig, ProjectId } from "./Project";
import { ProjectBehaviorSymbol, ProjectHelpers } from "./Project";
import { Logger } from "utils/Logger";
import { shouldHarvesterUseStorage } from "../utils/EnergySourceManager";
import type { DepositEnergyTaskConfig } from "../tasks/DepositEnergyTask";
import { EmergencyManager, EmergencyLevel } from "../utils/EmergencyManager";

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

    // Harvesters should pick up nearby energy if they have space
    if (typeof creep.checkForNearbyEnergy === 'function' && 
        !creep.isFullOfEnergy && 
        creep.checkForNearbyEnergy(2)) {
      return; // Let the pickup task run (smaller range for harvesters)
    }

    if (creep.isFullOfEnergy) {
      const emergencyLevel = EmergencyManager.getEmergencyLevel(creep.room);
      
      // Emergency mode: harvesters help with spawn/extension energy
      if (emergencyLevel === EmergencyLevel.CRITICAL) {
        logger.info(`${creep.name} activating emergency deposit mode`);
        creep.startTask(tasks.DepositEnergyTask, { 
          emergencyMode: true 
        } as DepositEnergyTaskConfig);
      } else {
        // Normal mode: check if we should use containers or storage
        const useStorage = shouldHarvesterUseStorage(creep.room);
        
        if (useStorage) {
          // Prioritize storage when infrastructure supports it
          creep.startTask(tasks.DepositEnergyTask, { 
            prioritizeStorage: true 
          } as DepositEnergyTaskConfig);
        } else if (emergencyLevel === EmergencyLevel.NORMAL) {
          // When haulers are active, prefer containers
          creep.startTask(tasks.DepositEnergyTask, { 
            preferContainers: true 
          } as DepositEnergyTaskConfig);
        } else {
          // Default priority: spawn/extensions first
          creep.startTask(tasks.DepositEnergyTask);
        }
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
