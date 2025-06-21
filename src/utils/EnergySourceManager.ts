/**
 * Utility functions for managing energy source selection and prioritization
 */

export interface EnergySourceInfo {
  preferWithdraw: boolean;
  hasReliableHaulers: boolean;
  storageEnergy: number;
  containerEnergy: number;
  sourceCount: number;
}

/**
 * Analyzes the room's energy infrastructure to determine optimal energy strategies
 */
export function analyzeEnergyInfrastructure(room: Room): EnergySourceInfo {
  // Handle test environments where room might not have all properties
  if (!room || typeof room.find !== 'function') {
    return {
      preferWithdraw: false,
      hasReliableHaulers: false,
      storageEnergy: 0,
      containerEnergy: 0,
      sourceCount: 0
    };
  }

  const storage = room.storage;
  const storageEnergy = storage?.store?.[RESOURCE_ENERGY] || 0;
  
  // Count containers with energy
  const containers = room.find(FIND_STRUCTURES, {
    filter: (structure): structure is StructureContainer =>
      structure.structureType === STRUCTURE_CONTAINER
  });
  const containerEnergy = containers.reduce((total, container) => 
    total + (container.store?.[RESOURCE_ENERGY] || 0), 0);
  
  const sources = room.find(FIND_SOURCES);
  const sourceCount = sources.length;
  
  // Determine if there are reliable haulers (harvesters putting energy into storage/containers)
  const hasReliableHaulers = analyzeHaulerSupport(room, storageEnergy, containerEnergy);
  
  // Decide if builders/upgraders should prefer withdrawing from storage
  const preferWithdraw = shouldPreferWithdraw(room, storageEnergy, containerEnergy, hasReliableHaulers);
  
  return {
    preferWithdraw,
    hasReliableHaulers,
    storageEnergy,
    containerEnergy,
    sourceCount
  };
}

/**
 * Determines if the room has reliable hauler support
 */
function analyzeHaulerSupport(room: Room, storageEnergy: number, containerEnergy: number): boolean {
  // Check if we have significant energy reserves (indicating good harvester->storage flow)
  const totalReserves = storageEnergy + containerEnergy;
  
  // If we have storage and it has substantial energy, assume reliable haulers
  if (room.storage && storageEnergy > 50000) {
    return true;
  }
  
  // If we have multiple containers with energy, assume some hauling system
  if (containerEnergy > 10000) {
    return true;
  }
  
  // Check room controller level - higher RCL usually means more mature infrastructure
  const rcl = room.controller?.level || 0;
  if (rcl >= 4 && totalReserves > 5000) {
    return true;
  }
  
  return false;
}

/**
 * Determines if builders/upgraders should prefer withdrawing from storage over harvesting
 */
function shouldPreferWithdraw(room: Room, storageEnergy: number, containerEnergy: number, hasReliableHaulers: boolean): boolean {
  // Always prefer storage if we have significant reserves and reliable haulers
  if (hasReliableHaulers && (storageEnergy > 10000 || containerEnergy > 5000)) {
    return true;
  }
  
  // At high RCL with storage, prefer withdrawing to optimize harvester efficiency
  const rcl = room.controller?.level || 0;
  if (rcl >= 5 && room.storage && storageEnergy > 5000) {
    return true;
  }
  
  // If storage/containers have more energy than a few harvester loads, prefer withdraw
  const totalStored = storageEnergy + containerEnergy;
  if (totalStored > 2000) {
    return true;
  }
  
  return false;
}

/**
 * Determines if harvesters should prioritize storage over spawn/extensions
 */
export function shouldHarvesterUseStorage(room: Room): boolean {
  // Handle test environments
  if (!room || typeof room.find !== 'function') {
    return false;
  }

  const info = analyzeEnergyInfrastructure(room);
  
  // Only use storage if we have reliable infrastructure and haulers
  if (!info.hasReliableHaulers) {
    return false;
  }
  
  // Check if spawn/extensions are well-supplied
  const spawnsAndExtensions = room.find(FIND_MY_STRUCTURES, {
    filter: (structure): structure is StructureSpawn | StructureExtension =>
      structure.structureType === STRUCTURE_SPAWN || 
      structure.structureType === STRUCTURE_EXTENSION
  });
  
  const totalCapacity = spawnsAndExtensions.reduce((total, structure) => {
    if ('energyCapacity' in structure) {
      return total + structure.energyCapacity;
    }
    return total + structure.store.getCapacity(RESOURCE_ENERGY);
  }, 0);
  
  const currentEnergy = spawnsAndExtensions.reduce((total, structure) => {
    if ('energy' in structure) {
      return total + structure.energy;
    }
    return total + structure.store[RESOURCE_ENERGY];
  }, 0);
  
  // If spawn/extensions are well-supplied (>80%), consider using storage
  const supplyRatio = totalCapacity > 0 ? currentEnergy / totalCapacity : 0;
  
  return supplyRatio > 0.8 && info.hasReliableHaulers;
}