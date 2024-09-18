import type { TaskBehavior, TaskConfig, TaskId } from "./Task";
import { TaskBehaviorSymbol, TaskHelpers } from "./Task";

const DoNothingTaskId = "DoNothingTask" as TaskId;

export interface DoNothingTaskConfig extends TaskConfig<typeof DoNothingTaskId> {}

const DoNothingTaskBehavior: TaskBehavior<typeof DoNothingTaskId> = {
  type: TaskBehaviorSymbol,
  id: DoNothingTaskId,
  start(creep: Creep, config?: DoNothingTaskConfig): void {
    TaskHelpers.start(creep, this);
  },
  run(creep: Creep, config?: DoNothingTaskConfig): void {},
  stop(creep: Creep): void {}
};

export const DoNothingTask = DoNothingTaskBehavior;
