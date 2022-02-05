export { Task, Tasks } from './Task.js'
import { registerTask } from './Task.js'

import { DepositEnergyTask } from './DepositEnergyTask.js'; registerTask(DepositEnergyTask); export { DepositEnergyTask }
import { HarvestEnergyTask } from './HarvestEnergyTask.js'; registerTask(HarvestEnergyTask); export { HarvestEnergyTask }
