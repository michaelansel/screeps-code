import { CreepBaseExtensionClass } from "./Base";
import { TaskConfig, Tasks } from "tasks";
import type { Project, ProjectConfig } from "projects";
import { Projects } from "projects";
import { Logger } from "utils/Logger";
import { loadByIdFromTable } from "utils/MemoryHelpers";
import { Task, TaskBehavior, TaskId } from "tasks/Task";
import { ProjectBehavior, ProjectId } from "projects/Project";

const logger = Logger.get("Tasking");

// CreepMemory.task
export interface CreepTaskMemory {
  id: TaskId;
  config?: TaskConfig<any>;
}

// CreepMemory.project
export interface CreepProjectMemory {
  id: ProjectId;
  config?: ProjectConfig<any>;
}

export interface CreepTaskingExtension {
  run(): void;

  // //// Tasks

  get task(): Task | null;
  startTask(task: Task): void;
  stopTask(): void;

  // //// Projects

  get project(): Project | null;
  startProject(project: Project): void;
  stopProject(): void;
}

// TODO is there any way to reduce the code duplication between tasks and projects?

export class CreepTaskingExtensionClass extends CreepBaseExtensionClass implements CreepTaskingExtension {
  run(): void {
    logger.info(`Executing logic for ${this.creep.name}`);

    // Tasks run to completion and then return to the Project for more instructions; no Project-level pre-emption

    if (this.task === null) {
      this.project?.run(this.creep, this.creep.memory.project?.config);
    }

    this.task?.run(this.creep, this.creep.memory.task?.config);
    // BUG? If no task, and no project, then we do nothing at all and depend on external stimuli.
  }

  // //// Tasks

  private _task: Task | undefined;

  get task(): Task | null {
    if (this._task === undefined) {
      this._task = loadByIdFromTable(this.creep.memory.task?.id, Tasks);
    }
    return this._task !== undefined ? this._task : null;
  }

  startTask<T extends TaskId>(task: TaskBehavior<T>, config?: TaskConfig<T>) {
    // Stop any previously running task
    if (this._task !== undefined) {
      this.stopTask();
    }

    this._task = task;
    this.creep.memory.task = {
      id: task.id,
      config: config === undefined ? ({} as TaskConfig<typeof task.id>) : config
    };
    task.start(this.creep, this.creep.memory.task.config); // Task can call stopTask before returning
  }

  stopTask() {
    if (this._task !== undefined) {
      this._task.stop(this.creep);
    }
    this._task = undefined;
    this.creep.memory.task = undefined;
  }

  // //// Projects

  private _project: Project | undefined;

  get project(): Project | null {
    if (this._project === undefined) {
      this._project = loadByIdFromTable(this.creep.memory.project?.id, Projects);
    }
    return this._project !== undefined ? this._project : null;
  }

  startProject<T extends ProjectId>(project: ProjectBehavior<T>, config?: ProjectConfig<T>): void {
    // Stop any previously running project
    if (this._project !== undefined) {
      this.stopProject();
    }

    this._project = project;
    this.creep.memory.project = {
      id: project.id,
      config: config === undefined ? ({} as ProjectConfig<typeof project.id>) : config
    };
    project.start(this.creep, this.creep.memory.project.config); // Project can call stopProject before returning
  }

  stopProject(): void {
    this.stopTask(); // This is the one line that is materially different from all the task code
    if (this._project !== undefined) {
      this._project.stop(this.creep);
    }
    this._project = undefined;
    this.creep.memory.project = undefined;
  }
}
