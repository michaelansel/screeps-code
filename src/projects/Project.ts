export interface Project {
    readonly type: unique symbol;
    id: Id<Project>;
    start(creep: Creep): void;
    run(creep: Creep): void;
    stop(creep: Creep): void;
};

export let Projects: { [projectId: Id<Project>]: Project } = {};
export function registerProject(project: Project) {
    Projects[project.id] = project;
}

export const ProjectHelpers = {
    start(creep: Creep, ProjectType: Project) {
        if (creep.project !== ProjectType) { throw new Error("Starting project for creep that doesn't know it is doing that project. This usually happens if you call Project.start directly instead of using Creep.startProject."); }
    },
    stop(creep: Creep, ProjectType: Project) {
        if (creep.task !== null) { throw new Error("Stopping a project for a creep with a running task. This usually happens if you call Project.stop directly instead of using Creep.stopProject."); }
    },
}
