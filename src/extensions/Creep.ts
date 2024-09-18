import { CreepBaseExtension, CreepBaseExtensionClass } from "./Creep/Base";
import { CreepLogicExtension, CreepLogicExtensionClass } from "./Creep/Logic";
import { CreepTaskingExtension, CreepTaskingExtensionClass } from "./Creep/Tasking";

import { applyMixins } from "utils/applyMixins";

declare global {
  interface Creep extends CreepBaseExtension, CreepLogicExtension, CreepTaskingExtension {}
}

export function use(CreepClass: CreepConstructor) {
  applyMixins(CreepClass, [CreepBaseExtensionClass, CreepLogicExtensionClass, CreepTaskingExtensionClass]);
}
