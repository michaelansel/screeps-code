import { CreepBaseExtension, CreepBaseExtensionClass } from "./Creep/Base";
import { CreepLogicExtension, CreepLogicExtensionClass } from "./Creep/Logic";
import { CreepTaskingExtension, CreepTaskingExtensionClass } from "./Creep/Tasking";
import { CreepOpportunisticPickupExtension, CreepOpportunisticPickupExtensionClass } from "./Creep/OpportunisticPickup";

import { applyMixins } from "utils/applyMixins";

declare global {
  interface Creep extends CreepBaseExtension, CreepLogicExtension, CreepTaskingExtension, CreepOpportunisticPickupExtension {}
}

export function use(CreepClass: CreepConstructor) {
  applyMixins(CreepClass, [CreepBaseExtensionClass, CreepLogicExtensionClass, CreepTaskingExtensionClass, CreepOpportunisticPickupExtensionClass]);
}
