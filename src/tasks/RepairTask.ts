import type { TaskBehavior, TaskConfig, TaskId } from "./Task";
import { TaskBehaviorSymbol, TaskHelpers } from "./Task";
import { Logger } from "utils/Logger";

const RepairTaskId = "RepairTask" as TaskId;

export interface RepairTaskConfig extends TaskConfig<typeof RepairTaskId> {
  target?: Id<Structure>;
  repairThreshold?: number;
}

export interface RepairTaskBehavior extends TaskBehavior<typeof RepairTaskId> {}

const logger = Logger.get("RepairTask");

const RepairTaskBehavior: RepairTaskBehavior = {
  type: TaskBehaviorSymbol,
  id: RepairTaskId,
  
  start(creep: Creep, config?: RepairTaskConfig): void {
    TaskHelpers.start(creep, this);
  },
  
  run(creep: Creep, config?: RepairTaskConfig): void {
    logger.info(`Executing ${String(this.id)} for ${creep.name}`);
    
    let target: Structure | null = null;
    const repairThreshold = config?.repairThreshold ?? 0.75; // Default to 75% health
    
    // Use configured target if available
    if (config?.target !== undefined) {
      target = Game.getObjectById(config.target);
      
      // Check if target still needs repair
      if (target && target.hits >= target.hitsMax * repairThreshold) {
        logger.debug(`Target no longer needs repair`);
        target = null;
        delete config.target;
      }
    }
    
    // Find a new target if needed
    if (!target) {
      logger.debug(`Finding structure to repair`);
      
      // Find damaged structures, prioritizing critical ones
      const damaged = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          // Skip walls and ramparts for now (they have special fortification logic)
          if (structure.structureType === STRUCTURE_WALL || 
              structure.structureType === STRUCTURE_RAMPART) {
            return false;
          }
          
          // Repair anything below threshold
          return structure.hits < structure.hitsMax * repairThreshold;
        }
      });
      
      if (damaged.length > 0) {
        // Sort by damage percentage (most damaged first)
        damaged.sort((a, b) => {
          const aPercent = a.hits / a.hitsMax;
          const bPercent = b.hits / b.hitsMax;
          return aPercent - bPercent;
        });
        
        target = damaged[0];
        
        // Save target if we have config
        if (config && target) {
          config.target = target.id;
        }
      }
    }
    
    if (!target) {
      logger.debug(`No structures need repair`);
      // No repair work available, task complete
      creep.stopTask();
      return;
    }
    
    logger.debug(`Target: ${target.id} (${target.structureType}) Health: ${target.hits}/${target.hitsMax}`);
    
    // Move to target if not in range
    if (creep.pos.getRangeTo(target) > 3) {
      logger.debug(`Moving to repair target`);
      creep.moveTo(target, { range: 3 });
    } else {
      logger.debug(`Repairing ${target.structureType}`);
      const result = creep.repair(target);
      
      if (result === ERR_NOT_ENOUGH_RESOURCES) {
        // Out of energy, task complete
        logger.debug(`Out of energy, stopping repair task`);
        creep.stopTask();
      } else if (result === OK && target.hits >= target.hitsMax * repairThreshold) {
        // Target repaired to threshold, clear it
        logger.debug(`Target repaired to threshold`);
        if (config) {
          delete config.target;
        }
      }
    }
  },
  
  stop(creep: Creep): void {
    logger.debug(`Stopping ${String(this.id)} for ${creep.name}`);
  }
};

export const RepairTask = RepairTaskBehavior;