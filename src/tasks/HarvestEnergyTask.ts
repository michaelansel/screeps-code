import { SourcePlanner } from 'planners/SourcePlanner';
import type { Task } from '.'
import { TaskHelpers, TaskSymbol } from './Task';

export const HarvestEnergyTask: Task = {
    type: TaskSymbol,
    id: "HarvestEnergyTask" as Id<Task>,
    start(creep: Creep): void {
        TaskHelpers.start(creep, HarvestEnergyTask);
        SourcePlanner.instance.requestSourceAssignment(creep);
    },
    run(creep: Creep): void {
        // console.log(`Executing ${this.id} for ${creep.name}`);
        let source: Source | null = null;

        if (creep.memory.source == undefined) {
            // creep.memory.source = creep.pos.findClosestByPath(FIND_SOURCES, { range: 1 })?.id;
            SourcePlanner.instance.requestSourceAssignment(creep);
        }

        if (creep.memory.source != undefined) {
            source = Game.getObjectById(creep.memory.source);
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
        creep.memory.source = undefined;
    },
};
