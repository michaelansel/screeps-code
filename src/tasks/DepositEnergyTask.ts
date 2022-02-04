import type {Task} from './'
import type {CreepRole} from '../roles'

export const DepositEnergyTask = <Task>{
    id: "DepositEnergyTask",
    start(creep: CreepRole): void {
        creep.task = this;
    },
    run(creep: CreepRole): void {
        console.log(`Executing ${this.id} for ${creep.creep.name}`);
        let target: Structure | null = null;

        if (!creep.creep.memory.target) {
            creep.creep.memory.target = creep.creep.pos.findClosestByRange(FIND_MY_SPAWNS)?.id;
        }

        if (creep.creep.memory.target != undefined) {
            target = Game.getObjectById(creep.creep.memory.target);
        }

        if (target) {
            if (creep.creep.pos.getRangeTo(target) > 1) {
                creep.creep.moveTo(target);
            } else {
                creep.creep.transfer(target, RESOURCE_ENERGY);
                // All done
                this.stop(creep);
            }
        }
    },
    stop(creep: CreepRole): void {
        creep.creep.memory.target = undefined;
        creep.task = null;
    },
}
