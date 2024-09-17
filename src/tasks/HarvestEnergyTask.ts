import { SourcePlanner } from 'planners/SourcePlanner';
import type { TaskBehavior, TaskConfig, TaskId } from './Task';
import { TaskBehaviorSymbol, TaskHelpers } from './Task';
import { Logger } from 'utils/Logger';

const HarvestEnergyTaskId = <TaskId>"HarvestEnergyTask";

export interface HarvestEnergyTaskConfig extends TaskConfig<typeof HarvestEnergyTaskId> {
    source: Id<Source>,
}

const logger = Logger.get("HarvestEnergyTask");

const HarvestEnergyTaskBehavior: TaskBehavior<typeof HarvestEnergyTaskId> = {
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
        if (config?.source != undefined) {
            source = Game.getObjectById(config.source);
        }

        if (source == undefined) {
            source = creep.pos.findClosestByPath(FIND_SOURCES, { range: 1 });
            // SourcePlanner.instance.requestSourceAssignment(creep); // TODO return a source object directly
        }

        // Save it if we can
        if (config && source) {
            config.source = source.id;
        }

        if (source) {
            if (creep.pos.getRangeTo(source) > 1) {
                creep.moveTo(source, { range: 1 });
            } else {
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
}

export const HarvestEnergyTask = HarvestEnergyTaskBehavior;
