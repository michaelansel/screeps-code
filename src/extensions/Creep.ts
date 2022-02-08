export { }
import { applyMixins } from '../utils/applyMixins.js';
import type { Task } from '../tasks';
import type { Project } from '../projects';
import * as tasks from '../tasks';
import * as projects from '../projects';

declare global {
    interface Creep extends CreepExtension { }

    interface CreepExtension {
        run(): void;
        get isFullOfEnergy(): boolean;
        get task(): Task | null;
        startTask(task: Task): void;
        stopTask(): void;
        get project(): Project | null;
        startProject(project: Project): void;
        stopProject(): void;
    }
}

class CreepExtensionClass implements CreepExtension {
    private _project: Project | undefined;
    private _task: Task | undefined;
    private get creep(): Creep { return <Creep><unknown>this; } // Do the funky typecast once instead of everywhere

    run(): void {
        console.log(`Executing logic for ${this.creep.name}`);

        // TODO link up with spawning
        if (this.project === null) {
            this.startProject(projects.HarvestEnergyProject);
        }

        if (this.task === null) {
            this.project?.run(this.creep);
        }

        this.task?.run(this.creep);
    };

    get isFullOfEnergy(): boolean {
        // BUG returns true when full of minerals
        return Boolean(this.creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0);
    }

    private loadFromId<T>(id: Id<T> | undefined, lookupTable: { [id: Id<T>]: T }): T | undefined {
        if (id == undefined) {
            return undefined;
        } else {
            if (id in lookupTable) {
                return lookupTable[id];
            }
            // else: this is an invalid/not-found ID, so we return undefined
        }
        return undefined;
    }

    get project(): Project | null {
        if (this._project === undefined) {
            this._project = this.loadFromId(this.creep.memory.task, projects.Projects);
        }
        return this._project !== undefined ? this._project : null;
    }
    startProject(project: Project): void {
        // Stop any previously running project
        if (this._project !== undefined) {
            this.stopProject();
            this._project = undefined;
            this.creep.memory.project = undefined;
        }

        this._project = project;
        this.creep.memory.task = project.id;
        project.start(this.creep); // Can call stopTask right away if there is an error
    }
    stopProject(): void {
        this.stopTask();
        if (this._project !== undefined) {
            this._project.stop(this.creep);
            this._project = undefined;
            this.creep.memory.project = undefined;
        }
    }

    get task(): Task | null {
        if (this._task === undefined) {
            this._task = this.loadFromId(this.creep.memory.task, tasks.Tasks);
        }
        return this._task !== undefined ? this._task : null;
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
