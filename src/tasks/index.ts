export { Task, Tasks } from './Task'
import { registerTask } from './Task'

import { DepositEnergyTask } from './DepositEnergyTask'; registerTask(DepositEnergyTask); export { DepositEnergyTask }
import { HarvestEnergyTask } from './HarvestEnergyTask'; registerTask(HarvestEnergyTask); export { HarvestEnergyTask }
