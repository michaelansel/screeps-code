export { }
import { applyMixins } from '../utils/applyMixins.js';
import type { Task } from '../tasks';
import * as tasks from '../tasks';

declare global {
    interface Creep extends CreepExtension { }

    interface CreepExtension {
        run(): void;
        get isFullOfEnergy(): boolean;
        get task(): Task | null;
        startTask(task: Task): void;
        stopTask(): void;
    }
}

class CreepExtensionClass implements CreepExtension {
    private _task: Task | undefined;
    private get creep(): Creep { return <Creep><unknown>this; } // Do the funky typecast once instead of everywhere

    run(): void {
        console.log(`Executing logic for ${this.creep.name}`);

        // TODO Define higher-order construct for task assignment
        if (this.task === null) {
            if (this.isFullOfEnergy) {
                this.startTask(tasks.DepositEnergyTask);
            } else {
                this.startTask(tasks.HarvestEnergyTask);
            }
        }

        this.task?.run(this.creep);
    };

    get isFullOfEnergy(): boolean {
        // BUG returns true when full of minerals
        return Boolean(this.creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0);
    }

    get task(): Task | null {
        if (this._task == undefined) {
            let taskId = this.creep.memory.task;
            if (taskId == undefined) {
                return null;
            } else {
                this._task = tasks.Tasks[taskId];
                return this._task;
            }
        }
        return this._task ? this._task : null;
    }
    startTask(task: Task) {
        // Stop any previously running task
        if (this._task !== undefined) {
            this.stopTask();
            this._task = undefined;
            this.creep.memory.task = undefined;
        }

        this._task = task;
        this.creep.memory.task = task.id;
        task.start(this.creep); // Can call stopTask right away if there is an error
    }
    stopTask() {
        if (this._task !== undefined) {
            this._task.stop(this.creep);
            this._task = undefined;
            this.creep.memory.task = undefined;
        }
    }
}
applyMixins(Creep, [CreepExtensionClass])
