import type { TaskBehavior, TaskConfig } from "./Task";
import { TaskBehaviorSymbol, TaskHelpers, TaskId } from "./Task";
import { Logger } from "utils/Logger";

const DepositEnergyTaskId = "DepositEnergyTask" as TaskId;

export interface DepositEnergyTaskConfig extends TaskConfig<typeof DepositEnergyTaskId> {
  target: Id<Structure>;
}

const logger = Logger.get("DepositEnergyTask");

const DepositEnergyTaskBehavior: TaskBehavior<typeof DepositEnergyTaskId> = {
  type: TaskBehaviorSymbol,
  id: DepositEnergyTaskId,
  start(creep: Creep): void {
    TaskHelpers.start(creep, this);
  },
  run(creep: Creep, config?: DepositEnergyTaskConfig): void {
    logger.info(`Executing ${this.id} for ${creep.name}`);
    let target: Structure | null = null;

    if (config?.target) {
      target = Game.getObjectById(config.target);
    }

    if (target === null) {
      target = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
    }

    // Save it if we can
    if (config !== undefined && target !== null) {
      config.target = target.id;
    }

    if (target !== null) {
      if (creep.pos.getRangeTo(target) > 1) {
        creep.moveTo(target);
      } else {
        creep.transfer(target, RESOURCE_ENERGY);
        // All done
        creep.stopTask();
      }
    }
  },
  stop(creep: Creep): void {}
};

export const DepositEnergyTask = DepositEnergyTaskBehavior;
