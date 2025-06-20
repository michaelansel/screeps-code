/* eslint-disable sort-imports */
export { Tasks, TaskConfig } from "./Task";
import { registerTask } from "./Task";

import { DepositEnergyTask } from "./DepositEnergyTask";
registerTask(DepositEnergyTask);
export { DepositEnergyTask };

import { HarvestEnergyTask } from "./HarvestEnergyTask";
registerTask(HarvestEnergyTask);
export { HarvestEnergyTask };

import { DoNothingTask } from "./DoNothingTask";
registerTask(DoNothingTask);
export { DoNothingTask };

import { UpgradeControllerTask } from "./UpgradeControllerTask";
registerTask(UpgradeControllerTask);
export { UpgradeControllerTask };

import { BuildTask } from "./BuildTask";
registerTask(BuildTask);
export { BuildTask };

import { RepairTask } from "./RepairTask";
registerTask(RepairTask);
export { RepairTask };
