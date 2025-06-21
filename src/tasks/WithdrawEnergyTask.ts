import type { TaskBehavior, TaskConfig, TaskId } from "./Task";
import { TaskBehaviorSymbol, TaskHelpers } from "./Task";
import { Logger } from "utils/Logger";

const WithdrawEnergyTaskId = "WithdrawEnergyTask" as TaskId;

export interface WithdrawEnergyTaskConfig extends TaskConfig<typeof WithdrawEnergyTaskId> {
  target?: Id<StructureStorage | StructureContainer>;
}

const logger = Logger.get("WithdrawEnergyTask");

const WithdrawEnergyTaskBehavior: TaskBehavior<typeof WithdrawEnergyTaskId> = {
  type: TaskBehaviorSymbol,
  id: WithdrawEnergyTaskId,
  start(creep: Creep): void {
    TaskHelpers.start(creep, this);
  },
  run(creep: Creep, config?: WithdrawEnergyTaskConfig): void {
    logger.info(`Executing ${this.id} for ${creep.name}`);
    let target: StructureStorage | StructureContainer | null = null;

    // Try to use configured target first
    if (config?.target) {
      target = Game.getObjectById(config.target);
      // If target no longer exists or is empty, clear it
      if (!target || target.store[RESOURCE_ENERGY] === 0) {
        config.target = undefined;
        target = null;
      }
    }

    // Find a new target if we don't have one
    if (!target) {
      // Priority: Storage > Containers with energy
      const storage = creep.room.storage;
      if (storage && storage.store[RESOURCE_ENERGY] > 0) {
        target = storage;
      } else {
        // Find containers with energy
        const containers = creep.room.find(FIND_STRUCTURES, {
          filter: (structure): structure is StructureContainer => 
            structure.structureType === STRUCTURE_CONTAINER &&
            structure.store[RESOURCE_ENERGY] > 0
        });
        
        if (containers.length > 0) {
          // Find the closest container with energy
          target = creep.pos.findClosestByPath(containers);
        }
      }
    }

    // Save the target if we found one
    if (config && target) {
      config.target = target.id;
    }

    if (target) {
      if (creep.pos.getRangeTo(target) > 1) {
        logger.debug(`Moving to energy source: ${target.structureType}`);
        creep.moveTo(target);
      } else {
        logger.debug(`Withdrawing energy from ${target.structureType}`);
        const result = creep.withdraw(target, RESOURCE_ENERGY);
        if (result === ERR_NOT_ENOUGH_RESOURCES) {
          // Target is empty, clear it and try again next tick
          if (config) {
            config.target = undefined;
          }
        }
      }
    } else {
      logger.debug(`No energy sources available (storage/containers)`);
      // No energy sources available, stop the task
      creep.stopTask();
    }

    // Check if creep is full
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      logger.debug(`Creep is full of energy`);
      creep.stopTask();
    }
  },
  stop(creep: Creep): void {}
};

export const WithdrawEnergyTask = WithdrawEnergyTaskBehavior;