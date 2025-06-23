import { ProjectBehavior, ProjectBehaviorSymbol, ProjectConfig, ProjectHelpers, ProjectId } from "./Project";
import { HarvestEnergyTask } from "../tasks/HarvestEnergyTask";
import { WithdrawEnergyTask } from "../tasks/WithdrawEnergyTask";
import { UpgradeControllerTask } from "../tasks/UpgradeControllerTask";
import type { HarvestEnergyTaskConfig } from "../tasks/HarvestEnergyTask";
import type { WithdrawEnergyTaskConfig } from "../tasks/WithdrawEnergyTask";
import type { UpgradeControllerTaskConfig } from "../tasks/UpgradeControllerTask";
import { analyzeEnergyInfrastructure } from "../utils/EnergySourceManager";

export const UpgradeControllerProjectId = "UpgradeControllerProject" as ProjectId;

export interface UpgradeControllerProjectConfig extends ProjectConfig<typeof UpgradeControllerProjectId> {
  controller: Id<StructureController>;
}

export const UpgradeControllerProject: ProjectBehavior<typeof UpgradeControllerProjectId> = {
  id: UpgradeControllerProjectId,
  type: ProjectBehaviorSymbol,

  start(creep: Creep, config: UpgradeControllerProjectConfig): void {
    ProjectHelpers.start(creep, UpgradeControllerProject, config);
  },

  run(creep: Creep, config?: UpgradeControllerProjectConfig): void {
    // Check for nearby dropped energy opportunistically
    if (typeof creep.checkForNearbyEnergy === 'function' && 
        creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && 
        creep.checkForNearbyEnergy()) {
      return; // Let the pickup task run
    }

    // Determine what task the creep should be doing
    if (creep.store[RESOURCE_ENERGY] === 0) {
      // Creep needs energy - choose between harvesting and withdrawing from storage
      const energyInfo = analyzeEnergyInfrastructure(creep.room);
      
      if (energyInfo.preferWithdraw) {
        // Try to withdraw from storage/containers first
        const storage = creep.room.storage;
        const containers = creep.room.find(FIND_STRUCTURES, {
          filter: (structure): structure is StructureContainer =>
            structure.structureType === STRUCTURE_CONTAINER &&
            structure.store[RESOURCE_ENERGY] > 0
        });
        
        if ((storage && storage.store[RESOURCE_ENERGY] > 0) || containers.length > 0) {
          creep.startTask(WithdrawEnergyTask, {} as WithdrawEnergyTaskConfig);
          return;
        }
      }
      
      // Fall back to harvesting from sources
      const room = Game.rooms[creep.room.name];
      const sources = room.find(FIND_SOURCES);
      
      if (sources.length > 0) {
        // Just pick the first available source for now
        // TODO: Integrate with SourcePlanner for better assignment
        const source = sources[0];
        creep.startTask(HarvestEnergyTask, { source: source.id } as HarvestEnergyTaskConfig);
      } else {
        // No sources available, stay idle
        console.log(`${creep.name}: No sources available for energy`);
      }
    } else {
      // Creep has energy - upgrade the controller
      const controllerId = config?.controller || creep.room.controller?.id;
      if (!controllerId) {
        console.log(`${creep.name}: No controller configured and no room controller available`);
        return;
      }
      
      const controller = Game.getObjectById(controllerId);
      if (controller) {
        creep.startTask(UpgradeControllerTask, { controller: controllerId } as UpgradeControllerTaskConfig);
      } else {
        console.log(`${creep.name}: Controller ${controllerId} not found`);
      }
    }
  },

  stop(creep: Creep): void {
    ProjectHelpers.stop(creep);
  }
};