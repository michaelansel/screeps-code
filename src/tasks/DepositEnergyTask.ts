import type { Task } from '.'
import { TaskHelpers, TaskSymbol } from './Task';
import { Logger } from 'utils/Logger';

const logger = Logger.get("DepositEnergyTask");

export const DepositEnergyTask: Task = {
    type: TaskSymbol,
    id: "DepositEnergyTask" as Id<Task>,
    start(creep: Creep): void {
        TaskHelpers.start(creep, DepositEnergyTask);
    },
    run(creep: Creep): void {
        logger.info(`Executing ${this.id} for ${creep.name}`);
        let target: Structure | null = null;

        if (!creep.memory.target) {
            creep.memory.target = creep.pos.findClosestByRange(FIND_MY_SPAWNS)?.id;
        }

        if (creep.memory.target != undefined) {
            target = Game.getObjectById(creep.memory.target);
        }

        if (target) {
            if (creep.pos.getRangeTo(target) > 1) {
                creep.moveTo(target);
            } else {
                creep.transfer(target, RESOURCE_ENERGY);
                // All done
                creep.stopTask();
            }
        }
    },
    stop(creep: Creep): void {
        creep.memory.target = undefined;
    },
}
