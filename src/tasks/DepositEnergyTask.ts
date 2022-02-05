import type {Task} from './index.js'

export const DepositEnergyTask = <Task>{
    id: "DepositEnergyTask",
    start(creep: Creep): void {
        creep.setTask(this, true);
    },
    run(creep: Creep): void {
        console.log(`Executing ${this.id} for ${creep.name}`);
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
                this.stop(creep);
            }
        }
    },
    stop(creep: Creep): void {
        creep.memory.target = undefined;
        creep.setTask(null, true);
    },
}
