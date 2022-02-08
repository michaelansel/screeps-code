export { }
import { applyMixins } from '../utils/applyMixins.js';

import { CreepBaseExtension, CreepBaseExtensionClass } from './Creep/Base.js';
import { CreepLogicExtension, CreepLogicExtensionClass } from './Creep/Logic.js';
import { CreepTaskingExtension, CreepTaskingExtensionClass } from './Creep/Tasking.js';

declare global {
    interface Creep extends CreepBaseExtension, CreepLogicExtension, CreepTaskingExtension { }
}

applyMixins(Creep, [CreepBaseExtensionClass, CreepLogicExtensionClass, CreepTaskingExtensionClass])
