import { ProjectBehaviorSymbol, ProjectHelpers, ProjectBehavior, ProjectConfig, ProjectId } from "./Project";
import { WithdrawEnergyTask } from "../tasks/WithdrawEnergyTask";
import { DepositEnergyTask } from "../tasks/DepositEnergyTask";
import type { WithdrawEnergyTaskConfig } from "../tasks/WithdrawEnergyTask";
import type { DepositEnergyTaskConfig } from "../tasks/DepositEnergyTask";

export const HaulerProjectId = "HaulerProject" as ProjectId;

export interface HaulerProjectConfig extends ProjectConfig<typeof HaulerProjectId> {
  targetRoom?: string;
}

export const HaulerProject: ProjectBehavior<typeof HaulerProjectId> = {
  id: HaulerProjectId,
  type: ProjectBehaviorSymbol,

  start(creep: Creep, config: HaulerProjectConfig): void {
    ProjectHelpers.start(creep, HaulerProject, config);
  },

  run(creep: Creep, config: HaulerProjectConfig): void {
    const room = config.targetRoom ? Game.rooms[config.targetRoom] : creep.room;

    if (!room) {
      console.log(`Hauler ${creep.name} cannot find room ${config.targetRoom || 'undefined'}`);
      return;
    }

    // Check for nearby dropped energy first (haulers should always pick up free energy)
    if (typeof creep.checkForNearbyEnergy === 'function' && creep.checkForNearbyEnergy()) {
      return; // Let the pickup task run
    }

    // If we have energy, find somewhere to deposit it
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      // Haulers prioritize spawn/extensions, then towers, then storage
      creep.startTask(DepositEnergyTask, {
        haulerPriority: true // New flag to indicate hauler-specific priority
      } as DepositEnergyTaskConfig);
    } else {
      // If we don't have energy, find a container or storage to withdraw from
      const containers = room.find(FIND_STRUCTURES, {
        filter: s => {
          if (s.structureType === STRUCTURE_CONTAINER) {
            const container = s as StructureContainer;
            return container.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
          }
          if (s.structureType === STRUCTURE_STORAGE) {
            const storage = s as StructureStorage;
            return storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
          }
          return false;
        }
      }) as (StructureContainer | StructureStorage)[];

      if (containers.length > 0) {
        // Find containers near sources first (prioritize miner containers)
        const sources = room.find(FIND_SOURCES);
        let targetContainer: StructureContainer | StructureStorage | null = null;
        let maxEnergy = 0;

        for (const container of containers) {
          if (container.structureType === STRUCTURE_CONTAINER) {
            // Check if near a source (within 2 tiles)
            const nearSource = sources.some(source => 
              source.pos.getRangeTo(container) <= 2
            );
            
            if (nearSource) {
              const energy = container.store.getUsedCapacity(RESOURCE_ENERGY);
              if (energy > maxEnergy) {
                maxEnergy = energy;
                targetContainer = container as StructureContainer;
              }
            }
          }
        }

        // If no source containers found, use storage or any container
        if (!targetContainer && containers.length > 0) {
          targetContainer = containers.reduce((best, current) => {
            const currentEnergy = current.store.getUsedCapacity(RESOURCE_ENERGY);
            const bestEnergy = best.store.getUsedCapacity(RESOURCE_ENERGY);
            return currentEnergy > bestEnergy ? current : best;
          }) as StructureContainer | StructureStorage;
        }

        if (targetContainer) {
          creep.startTask(WithdrawEnergyTask, {
            target: targetContainer.id
          } as WithdrawEnergyTaskConfig);
        }
      }
    }
  },

  stop(creep: Creep): void {
    ProjectHelpers.stop(creep);
  }
};