export { }
import { applyMixins } from '../utils/applyMixins.js';
import type { Task } from '../tasks';
import * as tasks from '../tasks';

declare global {
    interface Creep extends CreepExtension { }

    interface CreepExtension {
        run(): void;
        get isFullOfEnergy() : boolean;
        get task() : Task | null;
        // This should only be called from Task.start to ensure Task initialization is complete
        setTask(task: Task | null, calledFromTaskStart: true) : void;
    }
}

class CreepExtensionClass implements CreepExtension {
    private _task: Task | undefined;

    run(): void {
        console.log(`Executing logic for ${(<Creep><unknown>this).name}`);

        // TODO Define higher-order construct for task assignment
        if (this.task === null) {
            if (this.isFullOfEnergy) {
                tasks.DepositEnergyTask.start(<Creep><unknown>this);
            } else {
                tasks.HarvestEnergyTask.start(<Creep><unknown>this);
            }
        }

        this.task?.run(<Creep><unknown>this);
    };

    get isFullOfEnergy(): boolean {
        // BUG returns true when full of minerals
        return Boolean((<Creep><unknown>this).store.getFreeCapacity(RESOURCE_ENERGY) == 0);
    }

    get task(): Task | null {
        if (this._task == undefined) {
            let taskId = (<Creep><unknown>this).memory.task;
            if (taskId == undefined) {
                return null;
            } else {
                this._task = tasks.Tasks[taskId];
                return this._task;
            }
        }
        return this._task ? this._task : null;
    }
    setTask(task: Task | null, calledFromTaskStart: true) {
        // TODO this is completely wonky and very surprising (read creep property, but call task function); need a way to set on creep, but pass "Task Config" to the task
        if (!calledFromTaskStart) throw new Error("Don't set Creep.task directly; call Task.start(creep) instead.");

        if (task == null) {
            this._task = undefined;
            (<Creep><unknown>this).memory.task = undefined;
        } else {
            this._task = task;
            (<Creep><unknown>this).memory.task = task.id;
        }
    }
}
applyMixins(Creep, [CreepExtensionClass])
