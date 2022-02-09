import type {Task} from './index.js'
import { TaskHelpers } from './Task.js';

export const DepositEnergyTask = <Task>{
    id: "DepositEnergyTask",
    start(creep: Creep): void {
        TaskHelpers.start(creep, DepositEnergyTask);
    },
    run(creep: Creep): void {
        // console.log(`Executing ${this.id} for ${creep.name}`);
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
