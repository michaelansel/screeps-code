import { Task, TaskHelpers, TaskSymbol } from './Task';

export const DoNothingTask: Task = {
    type: TaskSymbol,
    id: "DoNothingTask" as Id<Task>,
    start(creep: Creep): void {
        TaskHelpers.start(creep, DoNothingTask);
    },
    run(creep: Creep): void {
    },
    stop(creep: Creep): void {
    },
}
