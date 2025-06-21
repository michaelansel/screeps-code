/* eslint-disable sort-imports */
export { Tasks, TaskConfig } from "./Task";
import { registerTask } from "./Task";

import { DepositEnergyTask } from "./DepositEnergyTask";
registerTask(DepositEnergyTask);
export { DepositEnergyTask };
export type { DepositEnergyTaskConfig } from "./DepositEnergyTask";

import { HarvestEnergyTask } from "./HarvestEnergyTask";
registerTask(HarvestEnergyTask);
export { HarvestEnergyTask };
export type { HarvestEnergyTaskConfig } from "./HarvestEnergyTask";

import { DoNothingTask } from "./DoNothingTask";
registerTask(DoNothingTask);
export { DoNothingTask };
export type { DoNothingTaskConfig } from "./DoNothingTask";

import { UpgradeControllerTask } from "./UpgradeControllerTask";
registerTask(UpgradeControllerTask);
export { UpgradeControllerTask };
export type { UpgradeControllerTaskConfig } from "./UpgradeControllerTask";

import { BuildTask } from "./BuildTask";
registerTask(BuildTask);
export { BuildTask };
export type { BuildTaskConfig } from "./BuildTask";

import { RepairTask } from "./RepairTask";
registerTask(RepairTask);
export { RepairTask };
export type { RepairTaskConfig } from "./RepairTask";

import { WithdrawEnergyTask } from "./WithdrawEnergyTask";
registerTask(WithdrawEnergyTask);
export { WithdrawEnergyTask };
export type { WithdrawEnergyTaskConfig } from "./WithdrawEnergyTask";
