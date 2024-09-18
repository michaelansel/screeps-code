import type { TaskBehavior, TaskConfig, TaskId } from "./Task";
import { TaskBehaviorSymbol, TaskHelpers } from "./Task";
import { Logger } from "utils/Logger";

const HarvestEnergyTaskId = "HarvestEnergyTask" as TaskId;

export interface HarvestEnergyTaskConfig extends TaskConfig<typeof HarvestEnergyTaskId> {
  source: Id<Source>;
}

export interface HarvestEnergyTaskBehavior extends TaskBehavior<typeof HarvestEnergyTaskId> {
  updateSource(creep: Creep, source: Source): void;
}

const logger = Logger.get("HarvestEnergyTask");

const HarvestEnergyTaskBehavior: HarvestEnergyTaskBehavior = {
  type: TaskBehaviorSymbol,
  id: HarvestEnergyTaskId,
  start(creep: Creep, config?: HarvestEnergyTaskConfig): void {
    TaskHelpers.start(creep, this);
    // SourcePlanner.instance.requestSourceAssignment(creep);
  },
  run(creep: Creep, config?: HarvestEnergyTaskConfig): void {
    logger.info(`Executing ${String(this.id)} for ${creep.name}`);
    let source: Source | null = null;

    // Prefer configured/remembered source
    if (config?.source !== undefined) {
      source = Game.getObjectById(config.source);
    }

    if (source === null) {
      logger.debug(`Need a new source`);
      source = creep.pos.findClosestByPath(FIND_SOURCES, { range: 1 });
      // SourcePlanner.instance.requestSourceAssignment(creep); // TODO return a source object directly
    }

    if (source === null) {
      logger.debug(`No Source found`);
    } else {
      logger.debug(`Source: ${source?.id}`);
    }

    // Save it if we can
    if (config !== undefined && source !== null) {
      logger.debug(`Saving source to Memory`);
      config.source = source.id;
    }

    if (source !== null) {
      if (creep.pos.getRangeTo(source) > 1) {
        logger.debug(`Moving to Source`);
        creep.moveTo(source, { range: 1 });
      } else {
        logger.debug(`Harvesting from Source`);
        creep.harvest(source);
      }
    }

    if (creep.isFullOfEnergy) {
      // All done
      creep.stopTask();
    }
  },
  stop(creep: Creep): void {
    // TODO notify SourcePlanner
  },
  updateSource(creep: Creep, source: Source): void {
    const config = TaskHelpers.loadConfig<HarvestEnergyTaskConfig>(creep, this);
    config.source = source.id;
  }
};

export const HarvestEnergyTask = HarvestEnergyTaskBehavior;
