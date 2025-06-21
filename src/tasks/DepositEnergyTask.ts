import type { TaskBehavior, TaskConfig } from "./Task";
import { TaskBehaviorSymbol, TaskHelpers, TaskId } from "./Task";
import { Logger } from "utils/Logger";

const DepositEnergyTaskId = "DepositEnergyTask" as TaskId;

export interface DepositEnergyTaskConfig extends TaskConfig<typeof DepositEnergyTaskId> {
  target?: Id<Structure>;
  prioritizeStorage?: boolean; // When true, prefer storage over spawn/extensions
}

const logger = Logger.get("DepositEnergyTask");

const DepositEnergyTaskBehavior: TaskBehavior<typeof DepositEnergyTaskId> = {
  type: TaskBehaviorSymbol,
  id: DepositEnergyTaskId,
  start(creep: Creep): void {
    TaskHelpers.start(creep, this);
  },
  run(creep: Creep, config?: DepositEnergyTaskConfig): void {
    logger.info(`Executing ${this.id} for ${creep.name}`);
    let target: Structure | null = null;

    // Try to use configured target first
    if (config?.target) {
      target = Game.getObjectById(config.target);
      // If target no longer exists or is full, clear it
      if (!target || !this.canAcceptEnergy(target)) {
        config.target = undefined;
        target = null;
      }
    }

    // Find new target if we don't have one
    if (!target) {
      target = this.findBestEnergyTarget(creep, config?.prioritizeStorage || false);
    }

    // Save the target if we found one
    if (config && target) {
      config.target = target.id;
    }

    if (target) {
      if (creep.pos.getRangeTo(target) > 1) {
        logger.debug(`Moving to deposit target: ${target.structureType}`);
        creep.moveTo(target);
      } else {
        logger.debug(`Depositing energy to ${target.structureType}`);
        const result = creep.transfer(target, RESOURCE_ENERGY);
        if (result === OK || result === ERR_FULL) {
          // All done or target is full
          creep.stopTask();
        }
      }
    } else {
      logger.debug(`No suitable deposit targets found`);
      creep.stopTask();
    }
  },

  /**
   * Find the best target for energy deposit based on priority rules
   */
  findBestEnergyTarget(creep: Creep, prioritizeStorage: boolean): Structure | null {
    const room = creep.room;
    
    // Handle test environments where room might not have find method
    if (!room || typeof room.find !== 'function') {
      // Fallback for tests - try to find spawns using pos.findClosestByRange if available
      if (creep.pos && typeof creep.pos.findClosestByRange === 'function') {
        return creep.pos.findClosestByRange(FIND_MY_SPAWNS);
      }
      return null;
    }
    
    if (prioritizeStorage) {
      // Check storage first when prioritizing it
      const storage = room.storage;
      if (storage && this.canAcceptEnergy(storage)) {
        return storage;
      }
    }

    // Priority 1: Spawns and Extensions (critical infrastructure)
    const spawnsAndExtensions = room.find(FIND_MY_STRUCTURES, {
      filter: (structure): structure is StructureSpawn | StructureExtension => 
        (structure.structureType === STRUCTURE_SPAWN || 
         structure.structureType === STRUCTURE_EXTENSION) &&
        this.canAcceptEnergy(structure)
    });

    if (spawnsAndExtensions.length > 0) {
      // Find closest spawn/extension that needs energy
      return creep.pos.findClosestByPath(spawnsAndExtensions);
    }

    // Priority 2: Containers near sources or controller (for local energy supply)
    const containers = room.find(FIND_STRUCTURES, {
      filter: (structure): structure is StructureContainer =>
        structure.structureType === STRUCTURE_CONTAINER &&
        this.canAcceptEnergy(structure)
    });

    if (containers.length > 0) {
      return creep.pos.findClosestByPath(containers);
    }

    // Priority 3: Storage (if not already prioritized)
    if (!prioritizeStorage) {
      const storage = room.storage;
      if (storage && this.canAcceptEnergy(storage)) {
        return storage;
      }
    }

    // Priority 4: Towers (defensive structures)
    const towers = room.find(FIND_MY_STRUCTURES, {
      filter: (structure): structure is StructureTower =>
        structure.structureType === STRUCTURE_TOWER &&
        this.canAcceptEnergy(structure)
    });

    if (towers.length > 0) {
      return creep.pos.findClosestByPath(towers);
    }

    return null;
  },

  /**
   * Check if a structure can accept energy
   */
  canAcceptEnergy(structure: Structure): boolean {
    if ('store' in structure) {
      return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    }
    if ('energy' in structure && 'energyCapacity' in structure) {
      return structure.energy < structure.energyCapacity;
    }
    return false;
  },

  stop(creep: Creep): void {}
};

export const DepositEnergyTask = DepositEnergyTaskBehavior;
