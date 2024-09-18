import { CreepLogicExtensionClass } from "extensions/Creep/Logic";

export const TaskBehaviorSymbol: unique symbol = Symbol();
export const TaskConfigSymbol: unique symbol = Symbol();

export type Task = TaskBehavior<any>;
export type TaskId = Id<Task>;

export interface TaskBehavior<T extends TaskId> {
  readonly type: typeof TaskBehaviorSymbol;
  readonly id: T;
  start(creep: Creep, config?: TaskConfig<T>): void;
  run(creep: Creep, config?: TaskConfig<T>): void;
  stop(creep: Creep): void;
}

export interface TaskConfig<T extends TaskId> {
  readonly type: typeof TaskConfigSymbol;
  readonly id: T;
}

export const Tasks: { [taskId: Id<Task>]: Task } = {};
export function registerTask(task: Task) {
  Tasks[task.id] = task;
}

type TaskBehaviorForConfig<C extends TaskConfig<TaskId>> = TaskBehavior<TaskId>;

export const TaskHelpers = {
  start(creep: Creep, TaskType: Task) {
    if (creep.task !== TaskType) {
      throw new Error(
        "Starting task for creep that doesn't know it is doing that task. This usually happens if you call Task.start directly instead of using Creep.startTask."
      );
    }
  },
  // Call with loadConfig<MyConfigType>(creep, MyBehaviorObject)
  loadConfig<C extends TaskConfig<any>>(creep: Creep, TaskType: TaskBehaviorForConfig<C>): C {
    // TODO how can I get the config without leaking the Tasking memory abstraction?
    if (creep.task != TaskType) {
      throw new Error("Running TaskBehavior method on a Creep that isn't assigned to the Task");
    }
    if (creep.memory.task === undefined)
      throw new Error("Corrupt Creep memory: no CreepTaskMemory structure when assigned Task");
    if (creep.memory.task.config === undefined) creep.memory.task.config = {} as C;
    return creep.memory.task.config as C;
  }
};
