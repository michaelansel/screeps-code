export interface Task {
    id: Id<Task>;
    start(creep: Creep): void;
    run(creep: Creep): void;
    stop(creep: Creep): void;
};

export let Tasks: { [taskId: Id<Task>]: Task } = {};
export function registerTask(task: Task) {
    Tasks[task.id] = task;
}
