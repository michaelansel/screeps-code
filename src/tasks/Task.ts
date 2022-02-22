export const TaskSymbol: unique symbol = Symbol();
export interface Task {
    readonly type: typeof TaskSymbol;
    id: Id<Task>;
    start(creep: Creep): void;
    run(creep: Creep): void;
    stop(creep: Creep): void;
};

export let Tasks: { [taskId: Id<Task>]: Task } = {};
export function registerTask(task: Task) {
    Tasks[task.id] = task;
}

export const TaskHelpers = {
    start(creep: Creep, TaskType: Task) {
        if (creep.task !== TaskType) { throw new Error("Starting task for creep that doesn't know it is doing that task. This usually happens if you call Task.start directly instead of using Creep.startTask."); }
    }
}
