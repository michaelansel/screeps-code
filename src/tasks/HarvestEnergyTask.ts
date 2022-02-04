import type {Task} from './'
import type {CreepRole} from '../roles'

export const HarvestEnergyTask = <Task>{
    id: "HarvestEnergyTask", // TODO Consider using a Symbol https://www.typescriptlang.org/docs/handbook/symbols.html

    // Is there a way I can add local helper functions without confusing the type system?

    start(creep: CreepRole): void {
        creep.task = this;
    },

    run(creep: CreepRole): void {
        console.log(`Executing ${this.id} for ${creep.creep.name}`);
        let source: Source | null = null;

        if (creep.creep.memory.source == undefined) {
            creep.creep.memory.source = creep.creep.pos.findClosestByPath(FIND_SOURCES, {range: 1})?.id;
        }

        if (creep.creep.memory.source != undefined) {
            source = Game.getObjectById(creep.creep.memory.source);
        }

        if (source) {
            if (creep.creep.pos.getRangeTo(source) > 1) {
                creep.creep.moveTo(source, { range: 1 });
            } else {
                creep.creep.harvest(source);
            }
        }

        if (creep.fullOfEnergy()) {
            // All done
            this.stop(creep);
        }
    },
    stop(creep: CreepRole): void {
        creep.creep.memory.source = undefined;
        creep.task = null;
    },
};
