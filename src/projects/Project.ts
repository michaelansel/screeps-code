export const ProjectBehaviorSymbol: unique symbol = Symbol();
export const ProjectConfigSymbol: unique symbol = Symbol();

export type Project = ProjectBehavior<ProjectId>;
export type ProjectId = Id<Project>;

export interface ProjectBehavior<T extends ProjectId> {
  readonly type: typeof ProjectBehaviorSymbol;
  readonly id: T;
  start(creep: Creep, config?: ProjectConfig<T>): void;
  run(creep: Creep, config?: ProjectConfig<T>): void;
  stop(creep: Creep): void;
}

export interface ProjectConfig<T extends ProjectId> {
  readonly type: typeof ProjectConfigSymbol;
  readonly id: T;
}

export const Projects: { [projectId: Id<Project>]: Project } = {};
export function registerProject(project: Project) {
  Projects[project.id] = project;
}

export const ProjectHelpers = {
  start(creep: Creep, ProjectType: Project) {
    if (creep.project !== ProjectType) {
      throw new Error(
        "Starting project for creep that doesn't know it is doing that project. This usually happens if you call Project.start directly instead of using Creep.startProject."
      );
    }
  },
  stop(creep: Creep, ProjectType: Project) {
    if (creep.task !== null) {
      throw new Error(
        "Stopping a project for a creep with a running task. This usually happens if you call Project.stop directly instead of using Creep.stopProject."
      );
    }
  }
};
