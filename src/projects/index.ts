export { Project, Projects, ProjectConfig } from "./Project";
import { registerProject } from "./Project";

import { HarvestEnergyProject } from "./HarvestEnergyProject";
registerProject(HarvestEnergyProject);
export { HarvestEnergyProject };
import { DoNothingProject } from "./DoNothingProject";
registerProject(DoNothingProject);
export { DoNothingProject };
