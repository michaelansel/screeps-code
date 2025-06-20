import type { TaskBehavior, TaskConfig, TaskId } from "./Task";
import { TaskBehaviorSymbol, TaskHelpers } from "./Task";
import { Logger } from "utils/Logger";

const BuildTaskId = "BuildTask" as TaskId;

export interface BuildTaskConfig extends TaskConfig<typeof BuildTaskId> {
  target?: Id<ConstructionSite>;
}

export interface BuildTaskBehavior extends TaskBehavior<typeof BuildTaskId> {}

const logger = Logger.get("BuildTask");

const BuildTaskBehavior: BuildTaskBehavior = {
  type: TaskBehaviorSymbol,
  id: BuildTaskId,
  
  start(creep: Creep, config?: BuildTaskConfig): void {
    TaskHelpers.start(creep, this);
  },
  
  run(creep: Creep, config?: BuildTaskConfig): void {
    logger.info(`Executing ${String(this.id)} for ${creep.name}`);
    
    let target: ConstructionSite | null = null;
    
    // Use configured target if available
    if (config?.target !== undefined) {
      target = Game.getObjectById(config.target);
      
      // If target no longer exists, clear it
      if (!target) {
        delete config.target;
      }
    }
    
    // Find a new target if needed
    if (!target) {
      logger.debug(`Finding new construction site`);
      
      // Prioritize construction sites by progress (continue partially built ones)
      const sites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
      if (sites.length > 0) {
        // Sort by progress (highest first) to finish partially built structures
        sites.sort((a, b) => b.progress - a.progress);
        target = sites[0];
        
        // Save target if we have config
        if (config && target) {
          config.target = target.id;
        }
      }
    }
    
    if (!target) {
      logger.debug(`No construction sites found`);
      // No construction work available, task complete
      creep.stopTask();
      return;
    }
    
    logger.debug(`Target: ${target.id} (${target.structureType}) Progress: ${target.progress}/${target.progressTotal}`);
    
    // Move to target if not in range
    if (creep.pos.getRangeTo(target) > 3) {
      logger.debug(`Moving to construction site`);
      creep.moveTo(target, { range: 3 });
    } else {
      logger.debug(`Building ${target.structureType}`);
      const result = creep.build(target);
      
      if (result === ERR_NOT_ENOUGH_RESOURCES) {
        // Out of energy, task complete
        logger.debug(`Out of energy, stopping build task`);
        creep.stopTask();
      } else if (result === ERR_INVALID_TARGET) {
        // Target no longer valid, clear it and find new one next tick
        logger.debug(`Invalid target, clearing`);
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

export const BuildTask = BuildTaskBehavior;