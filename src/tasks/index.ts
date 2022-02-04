import type {CreepRole} from '../roles';

export interface Task {
    id: Id<Task>;
    start(creep: CreepRole): void;
    run(creep: CreepRole): void;
    stop(creep: CreepRole): void;
};

export let Tasks: { [taskId: Id<Task>]: Task } = {};
function registerTask(task: Task) {
    Tasks[task.id] = task;
}

import {DepositEnergyTask} from './DepositEnergyTask.js' ; registerTask(DepositEnergyTask) ; export {DepositEnergyTask}
import {HarvestEnergyTask} from './HarvestEnergyTask.js' ; registerTask(HarvestEnergyTask) ; export {HarvestEnergyTask}
