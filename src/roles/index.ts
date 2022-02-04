export const registeredCreepRoles: Array<typeof CreepRole> = [];
export function registerCreepRole<T extends typeof CreepRole>(target: T) {
    registeredCreepRoles.push(target);
    return target;
}

declare global {
    interface CreepMemory {
        task: Id<Task> | undefined;
        // TODO Consider scoping these by Task ID instead of it being a shared top-level scope
        source: Id<Source> | undefined;
        target: Id<Structure> | undefined;
    }
}

@registerCreepRole
export class CreepRole {
    static readonly RoleName: string = "DefaultRole";
    creep: Creep;
    private _task: Task | undefined;

    constructor(creep: Creep) {
        this.matchRoleOrThrow(creep, (this.constructor as typeof CreepRole).RoleName);
        this.creep = creep;
    }

    private matchRoleOrThrow(creep: Creep, roleName: string) {
        if (creep.memory.role != roleName) throw Error(`Unable to create creep with mismatched role (expected: ${roleName}; got: ${creep.memory.role})`);
    }

    static matchesRole(creep: Creep): boolean {
        return creep.memory.role == this.RoleName;
    }

    run(): any {
        console.log(`Executing ${(this.constructor as unknown as {RoleName : string}).RoleName} logic for ${this.creep.name}`);
        if (this.task === null) {
            this.task = this.nextTask();
        }
        this.task?.run(this);
    };

    nextTask() : Task | null {
        if (this.fullOfEnergy()) {
            return DepositEnergyTask;
        } else {
            return HarvestEnergyTask;
        }
    }

    get task(): Task | null {
        if (this._task == undefined) {
            if (this.creep.memory.task == undefined) {
                return null;
            } else {
                this._task = Tasks[this.creep.memory.task];
                return this._task;
            }
        }
        return this._task ? this._task : null;
    }
    set task(task: Task | null) {
        if (task == null) {
            this._task = undefined;
            this.creep.memory.task = undefined;
        } else {
            this._task = task;
            this.creep.memory.task = task.id;
        }
    }

    fullOfEnergy() {
        return this.creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0;
    }
}

interface Task {
    id: Id<Task>;
    start(creep: CreepRole): void;
    run(creep: CreepRole): void;
    stop(creep: CreepRole): void;
};

let Tasks: { [taskId: Id<Task>]: Task } = {};
function registerTask(task: Task) {
    Tasks[task.id] = task;
}

const HarvestEnergyTask = <Task>{
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
registerTask(HarvestEnergyTask);

const DepositEnergyTask = <Task>{
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
registerTask(DepositEnergyTask);
