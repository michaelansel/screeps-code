import type { Task } from '../tasks';
import * as tasks from '../tasks';

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
        console.log(`Executing ${(this.constructor as unknown as { RoleName: string }).RoleName} logic for ${this.creep.name}`);
        if (this.task === null) {
            this.task = this.nextTask();
        }
        this.task?.run(this);
    };

    nextTask(): Task | null {
        if (this.fullOfEnergy()) {
            return tasks.DepositEnergyTask;
        } else {
            return tasks.HarvestEnergyTask;
        }
    }

    get task(): Task | null {
        if (this._task == undefined) {
            if (this.creep.memory.task == undefined) {
                return null;
            } else {
                this._task = tasks.Tasks[this.creep.memory.task];
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
