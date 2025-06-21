import { ProjectBehaviorSymbol, ProjectHelpers, ProjectBehavior, ProjectConfig, ProjectId } from "./Project";
import { WithdrawEnergyTask, WithdrawEnergyTaskId } from "../tasks/WithdrawEnergyTask";
import { DepositEnergyTask, DepositEnergyTaskId } from "../tasks/DepositEnergyTask";

export const HaulerProjectId = "HaulerProject" as ProjectId;

export interface HaulerProjectConfig extends ProjectConfig<typeof HaulerProjectId> {
  targetRoom?: string;
}

export const HaulerProject: ProjectBehavior<typeof HaulerProjectId> = {
  id: HaulerProjectId,
  type: ProjectBehaviorSymbol,

  start(creep: Creep, config?: HaulerProjectConfig): void {
    ProjectHelpers.start(creep, HaulerProject, config);
  },

  run(creep: Creep, config: HaulerProjectConfig): void {
    const room = config.targetRoom ? Game.rooms[config.targetRoom] : creep.room;

    if (!room) {
      console.log(`Hauler ${creep.name} cannot find room ${config.targetRoom}`);
      return;
    }

    // If we have energy, find somewhere to deposit it
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      // Haulers prioritize spawn/extensions, then towers, then storage
      creep.startTask(DepositEnergyTask, {
        haulerPriority: true // New flag to indicate hauler-specific priority
      });
    } else {
      // If we don't have energy, find a container or storage to withdraw from
      const containers = room.find(FIND_STRUCTURES, {
        filter: s => (s.structureType === STRUCTURE_CONTAINER || 
                     s.structureType === STRUCTURE_STORAGE) &&
                     s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      });

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
          });
        }
      }
    }
  },

  stop(creep: Creep, config: HaulerProjectConfig): void {
    ProjectHelpers.stop(creep);
  }
};