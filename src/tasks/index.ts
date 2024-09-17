export { Tasks, TaskConfig } from './Task'
import { registerTask } from './Task'

import { DepositEnergyTask } from './DepositEnergyTask'; registerTask(DepositEnergyTask); export { DepositEnergyTask }
import { HarvestEnergyTask } from './HarvestEnergyTask'; registerTask(HarvestEnergyTask); export { HarvestEnergyTask }
import { DoNothingTask } from './DoNothingTask'; registerTask(DoNothingTask); export { DoNothingTask }
