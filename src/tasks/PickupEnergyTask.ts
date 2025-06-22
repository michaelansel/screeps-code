import type { TaskBehavior, TaskConfig, TaskId } from "./Task";
import { TaskBehaviorSymbol, TaskHelpers } from "./Task";
import { Logger } from "utils/Logger";

const PickupEnergyTaskId = "PickupEnergyTask" as TaskId;

export interface PickupEnergyTaskConfig extends TaskConfig<typeof PickupEnergyTaskId> {
  target?: Id<Resource<ResourceConstant> | Tombstone>;
  targetType?: 'resource' | 'tombstone';
  maxRange?: number;
}

const logger = Logger.get("PickupEnergyTask");

const PickupEnergyTaskBehavior: TaskBehavior<typeof PickupEnergyTaskId> = {
  type: TaskBehaviorSymbol,
  id: PickupEnergyTaskId,
  start(creep: Creep): void {
    TaskHelpers.start(creep, this);
  },
  run(creep: Creep, config?: PickupEnergyTaskConfig): void {
    logger.info(`Executing ${this.id} for ${creep.name}`);
    
    // If creep is full, stop immediately
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      logger.debug(`Creep is full of energy`);
      creep.stopTask();
      return;
    }

    let target: Resource<ResourceConstant> | Tombstone | null = null;
    const maxRange = config?.maxRange ?? 5; // Default to 5 tiles

    // Try to use configured target first
    if (config?.target) {
      target = Game.getObjectById(config.target);
      // If target no longer exists, clear it
      if (!target) {
        config.target = undefined;
        config.targetType = undefined;
      }
    }

    // Find a new target if we don't have one
    if (!target) {
      // Find both dropped resources and tombstones within range
      const droppedEnergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, maxRange, {
        filter: (resource) => resource.resourceType === RESOURCE_ENERGY && resource.amount > 0
      });

      const tombstones = creep.pos.findInRange(FIND_TOMBSTONES, maxRange, {
        filter: (tombstone) => tombstone.store[RESOURCE_ENERGY] > 0
      });

      // Combine both types of targets
      const allTargets: (Resource<ResourceConstant> | Tombstone)[] = [...droppedEnergy, ...tombstones];

      if (allTargets.length > 0) {
        // Pick the closest one
        target = creep.pos.findClosestByPath(allTargets);
        
        // Determine target type for config
        if (config && target) {
          if ('amount' in target) {
            config.targetType = 'resource';
          } else {
            config.targetType = 'tombstone';
          }
        }
      }
    }

    // Save the target if we found one
    if (config && target) {
      config.target = target.id;
    }

    if (target) {
      const range = creep.pos.getRangeTo(target);
      if (range > 1) {
        const energyAmount = 'amount' in target ? target.amount : target.store[RESOURCE_ENERGY];
        const targetType = config?.targetType || ('amount' in target ? 'resource' : 'tombstone');
        logger.debug(`Moving to ${targetType} (${energyAmount} energy, ${range} tiles away)`);
        creep.moveTo(target);
      } else {
        // Handle pickup/withdraw based on target type
        let result: ScreepsReturnCode;
        if (config?.targetType === 'tombstone' || !('amount' in target)) {
          // It's a tombstone, use withdraw
          const tombstone = target as Tombstone;
          logger.debug(`Withdrawing ${tombstone.store[RESOURCE_ENERGY]} energy from tombstone`);
          result = creep.withdraw(tombstone, RESOURCE_ENERGY);
        } else {
          // It's a dropped resource, use pickup
          const resource = target as Resource<ResourceConstant>;
          logger.debug(`Picking up ${resource.amount} energy`);
          result = creep.pickup(resource);
        }
        
        if (result === OK) {
          // Clear target after successful pickup/withdraw
          if (config) {
            config.target = undefined;
            config.targetType = undefined;
          }
        }
      }
    } else {
      logger.debug(`No energy sources within ${maxRange} tiles`);
      // No energy to pickup, stop the task
      creep.stopTask();
    }
  },
  stop(creep: Creep): void {}
};

export const PickupEnergyTask = PickupEnergyTaskBehavior;