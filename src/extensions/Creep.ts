export { }
import { applyMixins } from 'utils/applyMixins';

import { CreepBaseExtension, CreepBaseExtensionClass } from './Creep/Base';
import { CreepLogicExtension, CreepLogicExtensionClass } from './Creep/Logic';
import { CreepTaskingExtension, CreepTaskingExtensionClass } from './Creep/Tasking';

declare global {
    interface Creep extends CreepBaseExtension, CreepLogicExtension, CreepTaskingExtension { }
}

applyMixins(Creep, [CreepBaseExtensionClass, CreepLogicExtensionClass, CreepTaskingExtensionClass])
