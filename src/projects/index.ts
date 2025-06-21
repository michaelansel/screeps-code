/* eslint-disable sort-imports */
export { Project, Projects, ProjectConfig } from "./Project";
import { registerProject } from "./Project";

import { HarvestEnergyProject } from "./HarvestEnergyProject";
registerProject(HarvestEnergyProject);
export { HarvestEnergyProject };

import { DoNothingProject } from "./DoNothingProject";
registerProject(DoNothingProject);
export { DoNothingProject };

import { UpgradeControllerProject } from "./UpgradeControllerProject";
registerProject(UpgradeControllerProject);
export { UpgradeControllerProject };

import { BuilderProject } from "./BuilderProject";
registerProject(BuilderProject);
export { BuilderProject };

import { HaulerProject } from "./HaulerProject";
registerProject(HaulerProject);
export { HaulerProject };
