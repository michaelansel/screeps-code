import { CreepBaseExtensionClass } from "./Base";

export interface CreepLogicExtension {
  get isFullOfEnergy(): boolean;
}

export class CreepLogicExtensionClass extends CreepBaseExtensionClass implements CreepLogicExtension {
  public get isFullOfEnergy(): boolean {
    // BUG returns true when full of minerals
    return Boolean(this.creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0);
  }
}
