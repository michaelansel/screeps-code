import { CreepBaseExtensionClass } from "./Base";
import { PickupEnergyTask } from "tasks/PickupEnergyTask";
import { Logger } from "utils/Logger";

const logger = Logger.get("OpportunisticPickup");

export interface CreepOpportunisticPickupExtension {
  checkForNearbyEnergy(maxRange?: number): boolean;
  shouldPickupEnergy(): boolean;
}

export class CreepOpportunisticPickupExtensionClass extends CreepBaseExtensionClass implements CreepOpportunisticPickupExtension {
  /**
   * Check if there's energy nearby worth picking up
   * @param maxRange Maximum range to look for energy (default 3)
   * @returns true if energy was found and pickup task started
   */
  public checkForNearbyEnergy(maxRange: number = 3): boolean {
    // Don't pickup if already full
    if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return false;
    }

    // Don't interrupt current task if it's important
    if (this.creep.task && !this.shouldPickupEnergy()) {
      return false;
    }

    // Ensure we have required methods (for testing compatibility)
    if (!this.creep.pos || typeof this.creep.pos.findInRange !== 'function') {
      return false;
    }

    // Look for nearby dropped energy and tombstones
    const droppedEnergy = this.creep.pos.findInRange(FIND_DROPPED_RESOURCES, maxRange, {
      filter: (resource) => resource.resourceType === RESOURCE_ENERGY && resource.amount > 0
    });

    const tombstones = this.creep.pos.findInRange(FIND_TOMBSTONES, maxRange, {
      filter: (tombstone) => tombstone.store[RESOURCE_ENERGY] > 0
    });

    // Combine both types of targets
    const allTargets: (Resource<ResourceConstant> | Tombstone)[] = [...droppedEnergy, ...tombstones];

    if (allTargets.length === 0) {
      return false;
    }

    // Find the closest energy source
    if (typeof this.creep.pos.findClosestByPath !== 'function') {
      // Fallback for testing - just use first item
      const closest = allTargets[0];
      if (!closest) {
        return false;
      }
      return this.handlePickup(closest, maxRange);
    }
    
    const closest = this.creep.pos.findClosestByPath(allTargets);
    if (!closest) {
      return false;
    }

    return this.handlePickup(closest, maxRange);
  }

  private handlePickup(target: Resource<ResourceConstant> | Tombstone, maxRange: number): boolean {
    // Get energy amount based on target type
    const energyAmount = 'amount' in target ? target.amount : target.store[RESOURCE_ENERGY];
    const range = this.creep.pos.getRangeTo(target);
    
    // Check if it's worth picking up (at least 10 energy or we're very close)
    if (energyAmount < 10 && range > 1) {
      return false;
    }

    const targetType = 'amount' in target ? 'resource' : 'tombstone';
    logger.debug(`${this.creep.name} found ${energyAmount} energy in ${targetType} ${range} tiles away`);

    // Start pickup task
    this.creep.startTask(PickupEnergyTask, {
      target: target.id,
      targetType: targetType,
      maxRange: maxRange
    });

    return true;
  }

  /**
   * Determine if this creep should interrupt its current task to pickup energy
   * @returns true if creep should pickup energy
   */
  public shouldPickupEnergy(): boolean {
    // Always pickup if no task
    if (!this.creep.task) {
      return true;
    }

    // Check role-specific rules
    const role = this.creep.memory.role;
    
    // Haulers should always pickup energy
    if (role === "hauler") {
      return true;
    }

    // Harvesters and upgraders should pickup if they have free capacity
    if ((role === "harvester" || role === "upgrader") && this.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      return true;
    }

    // Builders should pickup if they're low on energy
    if (role === "builder" && this.creep.store.getUsedCapacity(RESOURCE_ENERGY) < this.creep.store.getCapacity() * 0.5) {
      return true;
    }

    // Don't interrupt other roles/tasks
    return false;
  }
}