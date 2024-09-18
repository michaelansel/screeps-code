import type { ProjectBehavior, ProjectConfig, ProjectId } from "./Project";
import { ProjectBehaviorSymbol, ProjectHelpers } from "./Project";

const DoNothingProjectId = "DoNothingProject" as ProjectId;

export interface DoNothingProjectConfig extends ProjectConfig<typeof DoNothingProjectId> {}

const DoNothingProjectBehavior: ProjectBehavior<typeof DoNothingProjectId> = {
  type: ProjectBehaviorSymbol,
  id: DoNothingProjectId,
  start(creep: Creep, config?: DoNothingProjectConfig): void {
    ProjectHelpers.start(creep, this);
  },
  run(creep: Creep, config?: DoNothingProjectConfig): void {},
  stop(creep: Creep): void {
    ProjectHelpers.stop(creep, this);
  }
};

export const DoNothingProject = DoNothingProjectBehavior;
