import { CreepBaseExtensionClass } from "./Base";

export interface CreepLogicExtension {
  get isFullOfEnergy(): boolean;
}

export class CreepLogicExtensionClass extends CreepBaseExtensionClass implements CreepLogicExtension {
  public get isFullOfEnergy(): boolean {
    // Check if creep is at full capacity AND that capacity is all energy
    // This avoids the bug where creep full of minerals would return true
    const totalCapacity = this.creep.store.getCapacity();
    const energyAmount = this.creep.store.getUsedCapacity(RESOURCE_ENERGY);
    return Boolean(totalCapacity > 0 && energyAmount === totalCapacity);
  }
}
