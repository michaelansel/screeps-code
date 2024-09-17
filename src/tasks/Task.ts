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
};

export interface TaskConfig<T extends TaskId> {
    readonly type: typeof TaskConfigSymbol,
    readonly id: T,
};

export let Tasks: { [taskId: Id<Task>]: Task } = {};
export function registerTask(task: Task) {
    Tasks[task.id] = task;
}

export const TaskHelpers = {
    start(creep: Creep, TaskType: Task) {
        if (creep.task !== TaskType) { throw new Error("Starting task for creep that doesn't know it is doing that task. This usually happens if you call Task.start directly instead of using Creep.startTask."); }
    },
}
