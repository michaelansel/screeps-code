import { TaskBehavior, TaskBehaviorSymbol, TaskConfig, TaskHelpers, TaskId } from "./Task";

export const UpgradeControllerTaskId = "UpgradeControllerTask" as TaskId;

export interface UpgradeControllerTaskConfig extends TaskConfig<typeof UpgradeControllerTaskId> {
  controller: Id<StructureController>;
}

export const UpgradeControllerTask: TaskBehavior<typeof UpgradeControllerTaskId> = {
  id: UpgradeControllerTaskId,
  type: TaskBehaviorSymbol,

  start(creep: Creep, config?: UpgradeControllerTaskConfig): void {
    TaskHelpers.start(creep, UpgradeControllerTask, config);
  },

  run(creep: Creep, config: UpgradeControllerTaskConfig): void {
    // If creep has no energy, it cannot upgrade
    if (creep.store[RESOURCE_ENERGY] === 0) {
      creep.stopTask();
      return;
    }

    const controller = Game.getObjectById(config.controller);
    if (!controller) {
      // Controller no longer exists, stop task
      creep.stopTask();
      return;
    }

    // Move to controller if not in range
    if (!creep.pos.inRangeTo(controller, 3)) {
      creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
      return;
    }

    // Upgrade the controller
    const result = creep.upgradeController(controller);
    if (result === ERR_NOT_ENOUGH_ENERGY) {
      // Ran out of energy during upgrade
      creep.stopTask();
    } else if (result !== OK) {
      // Some other error occurred
      console.log(`UpgradeControllerTask error for ${creep.name}: ${result}`);
      creep.stopTask();
    }
  },

  stop(creep: Creep): void {
    // No cleanup needed
  }
};