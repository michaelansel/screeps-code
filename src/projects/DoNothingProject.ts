import type { Project } from '.'
import { ProjectHelpers, ProjectSymbol } from './Project';

export const DoNothingProject: Project = {
    type: ProjectSymbol,
    id: "DoNothingProject" as Id<Project>,
    start(creep: Creep): void {
        ProjectHelpers.start(creep, DoNothingProject);
    },
    run(creep: Creep): void {
    },
    stop(creep: Creep): void {
        ProjectHelpers.stop(creep, DoNothingProject);
    },
};
