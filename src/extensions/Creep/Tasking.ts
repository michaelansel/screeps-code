import { CreepBaseExtensionClass } from './Base.js';
import type { Task } from '../../tasks';
import type { Project } from '../../projects';
import * as tasks from '../../tasks';
import * as projects from '../../projects';

export interface CreepTaskingExtension {
    run(): void;

    get project(): Project | null;
    startProject(project: Project): void;
    stopProject(): void;

    get task(): Task | null;
    startTask(task: Task): void;
    stopTask(): void;
}

export class CreepTaskingExtensionClass extends CreepBaseExtensionClass implements CreepTaskingExtension {
    private _project: Project | undefined;
    private _task: Task | undefined;

    run(): void {
        console.log(`Executing logic for ${this.creep.name}`);

        if (this.task === null) {
            this.project?.run(this.creep);
        }

        this.task?.run(this.creep);
        // BUG? If no task, and no project, then we do nothing at all and depend on external stimuli.
    };

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
            this._project = this.loadFromId(this.creep.memory.project, projects.Projects);
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
        this.creep.memory.project = project.id;
        project.start(this.creep); // Can call stopProject right away if there is an error
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
