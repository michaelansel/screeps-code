import type { Task } from './index.js'

export const HarvestEnergyTask = <Task>{
    id: "HarvestEnergyTask", // TODO Consider using a Symbol https://www.typescriptlang.org/docs/handbook/symbols.html

    // Is there a way I can add local helper functions without confusing the type system?

    start(creep: Creep): void {
        creep.setTask(this, true);
    },

    run(creep: Creep): void {
        console.log(`Executing ${this.id} for ${creep.name}`);
        let source: Source | null = null;

        if (creep.memory.source == undefined) {
            creep.memory.source = creep.pos.findClosestByPath(FIND_SOURCES, { range: 1 })?.id;
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
            this.stop(creep);
        }
    },
    stop(creep: Creep): void {
        creep.memory.source = undefined;
        creep.setTask(null, true);
    },
};
