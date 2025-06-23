import { HarvestEnergyProject } from "../projects/HarvestEnergyProject";
import { UpgradeControllerProject } from "../projects/UpgradeControllerProject";
import { BuilderProject } from "../projects/BuilderProject";
import { HaulerProject } from "../projects/HaulerProject";

export interface RoleQuotas {
  harvesters: number;
  upgraders: number;
  builders: number;
  haulers: number;
}

export interface RoleCounts {
  harvesters: number;
  upgraders: number;
  builders: number;
  haulers: number;
}

export class RoleManager {
  /**
   * Calculate total available energy for spawning in a room (spawn + extensions)
   */
  static getRoomAvailableEnergy(room: Room): number {
    let totalEnergy = 0;
    
    // Add energy from spawns
    const spawns = room.find(FIND_MY_SPAWNS);
    for (const spawn of spawns) {
      totalEnergy += spawn.store[RESOURCE_ENERGY];
    }
    
    // Add energy from extensions
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_EXTENSION }
    }) as StructureExtension[];
    
    for (const extension of extensions) {
      totalEnergy += extension.store[RESOURCE_ENERGY];
    }
    
    return totalEnergy;
  }

  /**
   * Calculate total energy capacity for spawning in a room (spawn + extensions)
   */
  static getRoomEnergyCapacity(room: Room): number {
    let totalCapacity = 0;
    
    // Add capacity from spawns
    const spawns = room.find(FIND_MY_SPAWNS);
    for (const spawn of spawns) {
      totalCapacity += spawn.store.getCapacity(RESOURCE_ENERGY);
    }
    
    // Add capacity from extensions
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: { structureType: STRUCTURE_EXTENSION }
    }) as StructureExtension[];
    
    for (const extension of extensions) {
      totalCapacity += extension.store.getCapacity(RESOURCE_ENERGY);
    }
    
    return totalCapacity;
  }

  /**
   * Get the desired quotas for different roles based on room state
   */
  static getDesiredQuotas(room: Room): RoleQuotas {
    const sources = room.find(FIND_SOURCES);
    const controller = room.controller;
    
    // Base quotas - always need harvesters
    const quotas: RoleQuotas = {
      harvesters: sources.length, // Exactly 1 per source with optimal sizing
      upgraders: 0,
      builders: 0,
      haulers: 0
    };

    // Add upgraders if we have a controller
    if (controller && controller.my) {
      quotas.upgraders = 3; // Standard upgrader count
    }

    // Add builders based on RCL and construction/repair needs
    if (controller && controller.my) {
      const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
      const damagedStructures = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          // Skip walls and ramparts for now
          if (structure.structureType === STRUCTURE_WALL || 
              structure.structureType === STRUCTURE_RAMPART) {
            return false;
          }
          return structure.hits < structure.hitsMax * 0.75;
        }
      });

      // Scale builders based on work available and RCL
      if (constructionSites.length > 0 || damagedStructures.length > 0) {
        // RCL-aware scaling: more builders at higher RCL
        if (controller.level >= 4) {
          quotas.builders = 2; // Can support more builders at higher RCL
        } else {
          quotas.builders = 1; // Just one builder at low RCL
        }
      }

      // Add haulers when we have containers
      const containers = room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      });
      
      if (containers.length > 0) {
        // Dynamic hauler calculation based on actual energy flow needs
        const storage = room.storage;
        
        if (storage && storage.store[RESOURCE_ENERGY] > 10000) {
          // With good storage buffer, minimize haulers
          quotas.haulers = 1;
        } else if (controller.level >= 4) {
          // Higher RCL with better infrastructure
          quotas.haulers = Math.min(Math.ceil(sources.length * 1.5), 3); // 1.5 per source, max 3
        } else {
          // Low RCL - start with minimal haulers and scale up if needed
          // With optimal harvesters (5 WORK), one hauler can usually handle 2 sources
          quotas.haulers = Math.max(1, Math.ceil(sources.length / 2));
        }
      }
    }

    return quotas;
  }

  /**
   * Count existing creeps by role in a room
   */
  static countCreepsByRole(room: Room): RoleCounts {
    const counts: RoleCounts = {
      harvesters: 0,
      upgraders: 0,
      builders: 0,
      haulers: 0
    };

    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.room.name === room.name) {
        if (creep.memory.project?.id === HarvestEnergyProject.id) {
          counts.harvesters++;
        } else if (creep.memory.project?.id === UpgradeControllerProject.id) {
          counts.upgraders++;
        } else if (creep.memory.project?.id === BuilderProject.id) {
          counts.builders++;
        } else if (creep.memory.project?.id === HaulerProject.id) {
          counts.haulers++;
        }
      }
    }

    return counts;
  }

  /**
   * Determine the next role to spawn based on quotas vs current counts
   */
  static getNextRoleToSpawn(room: Room): { projectId: string; config?: any; roleName: string } | null {
    const quotas = this.getDesiredQuotas(room);
    const counts = this.countCreepsByRole(room);
    const sources = room.find(FIND_SOURCES);

    // CRITICAL: Ensure adequate harvester coverage before other roles
    const minHarvesters = Math.max(2, sources.length); // At least 2, or 1 per source
    if (counts.harvesters < minHarvesters) {
      return {
        projectId: HarvestEnergyProject.id,
        roleName: "Harvester"
      };
    }

    // Only spawn haulers after adequate harvester coverage
    if (counts.haulers < quotas.haulers && counts.harvesters >= minHarvesters) {
      return {
        projectId: HaulerProject.id,
        config: { targetRoom: room.name },
        roleName: "Hauler"
      };
    }

    // Builders third priority - construction is important for room development
    if (counts.builders < quotas.builders) {
      return {
        projectId: BuilderProject.id,
        roleName: "Builder"
      };
    }

    if (counts.upgraders < quotas.upgraders && room.controller) {
      return {
        projectId: UpgradeControllerProject.id,
        config: { controller: room.controller.id },
        roleName: "Upgrader"
      };
    }

    return null; // No roles needed
  }

  /**
   * Get appropriate body parts for a role based on available energy
   */
  static getBodyPartsForRole(projectId: string, availableEnergy: number): BodyPartConstant[] {
    const baseCost = BODYPART_COST.work + BODYPART_COST.carry + BODYPART_COST.move;

    if (availableEnergy < baseCost) {
      return []; // Cannot afford minimum body
    }

    // Role-specific body part generation with dynamic scaling
    if (projectId === HarvestEnergyProject.id) {
      return this.getHarvesterBody(availableEnergy);
    } else if (projectId === BuilderProject.id) {
      return this.getBuilderBody(availableEnergy);
    } else if (projectId === UpgradeControllerProject.id) {
      return this.getUpgraderBody(availableEnergy);
    } else if (projectId === HaulerProject.id) {
      return this.getHaulerBody(availableEnergy);
    }

    // Fallback to basic body
    return [WORK, CARRY, MOVE];
  }

  /**
   * Generate optimized harvester body - static harvester design
   */
  private static getHarvesterBody(availableEnergy: number): BodyPartConstant[] {
    const body: BodyPartConstant[] = [];
    let remainingEnergy = availableEnergy;

    // Check if we have containers (enables static harvesters)
    // In test environments Game.rooms might not exist
    const rooms = Game.rooms ? Object.values(Game.rooms) : [];
    const room = rooms[0]; // TODO: Make this room-specific
    const hasContainers = room && room.find && room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    }).length > 0;

    if (hasContainers && availableEnergy >= 550) {
      // Static harvester design: 5 WORK + 1 CARRY + 1 MOVE
      // 5 WORK can fully drain a source (10 energy/tick)
      // 1 CARRY for occasional container management
      // 1 MOVE to reach the source
      body.push(WORK, WORK, WORK, WORK, WORK, CARRY, MOVE);
      remainingEnergy -= 550;

      // If we have extra energy, add another MOVE for better positioning
      if (remainingEnergy >= 50) {
        body.push(MOVE);
        remainingEnergy -= 50;
      }
    } else {
      // Fallback: Traditional harvester for no-container rooms
      // Start with minimum viable body
      body.push(WORK, CARRY, MOVE);
      remainingEnergy -= BODYPART_COST.work + BODYPART_COST.carry + BODYPART_COST.move;

      // Add more WORK parts for faster harvesting (up to 5 WORK parts max)
      let workParts = 1;
      while (remainingEnergy >= BODYPART_COST.work + BODYPART_COST.move && workParts < 5) {
        body.push(WORK, MOVE);
        remainingEnergy -= BODYPART_COST.work + BODYPART_COST.move;
        workParts++;
      }

      // Add extra CARRY parts if we have remaining energy
      while (remainingEnergy >= BODYPART_COST.carry + BODYPART_COST.move && body.length < 49) {
        body.push(CARRY, MOVE);
        remainingEnergy -= BODYPART_COST.carry + BODYPART_COST.move;
      }
    }

    return body;
  }

  /**
   * Generate optimized builder body - balanced WORK, CARRY, MOVE
   */
  private static getBuilderBody(availableEnergy: number): BodyPartConstant[] {
    const body: BodyPartConstant[] = [];
    let remainingEnergy = availableEnergy;

    // Start with minimum viable body
    body.push(WORK, CARRY, MOVE);
    remainingEnergy -= BODYPART_COST.work + BODYPART_COST.carry + BODYPART_COST.move;

    // Add parts in balanced ratios: 1 WORK, 2 CARRY, 2 MOVE (for carrying and building)
    while (remainingEnergy >= BODYPART_COST.work + 2 * BODYPART_COST.carry + 2 * BODYPART_COST.move && body.length < 47) {
      body.push(WORK, CARRY, CARRY, MOVE, MOVE);
      remainingEnergy -= BODYPART_COST.work + 2 * BODYPART_COST.carry + 2 * BODYPART_COST.move;
    }

    // Add remaining energy as CARRY + MOVE pairs
    while (remainingEnergy >= BODYPART_COST.carry + BODYPART_COST.move && body.length < 49) {
      body.push(CARRY, MOVE);
      remainingEnergy -= BODYPART_COST.carry + BODYPART_COST.move;
    }

    return body;
  }

  /**
   * Generate optimized upgrader body - prioritizes WORK parts for upgrading
   */
  private static getUpgraderBody(availableEnergy: number): BodyPartConstant[] {
    const body: BodyPartConstant[] = [];
    let remainingEnergy = availableEnergy;

    // Start with minimum viable body
    body.push(WORK, CARRY, MOVE);
    remainingEnergy -= BODYPART_COST.work + BODYPART_COST.carry + BODYPART_COST.move;

    // Add more WORK parts for faster upgrading
    while (remainingEnergy >= BODYPART_COST.work + BODYPART_COST.move && body.length < 48) {
      body.push(WORK, MOVE);
      remainingEnergy -= BODYPART_COST.work + BODYPART_COST.move;
    }

    // Add extra CARRY parts if we have remaining energy
    while (remainingEnergy >= BODYPART_COST.carry + BODYPART_COST.move && body.length < 49) {
      body.push(CARRY, MOVE);
      remainingEnergy -= BODYPART_COST.carry + BODYPART_COST.move;
    }

    return body;
  }

  /**
   * Generate optimized hauler body - prioritizes CARRY and MOVE parts
   */
  private static getHaulerBody(availableEnergy: number): BodyPartConstant[] {
    const body: BodyPartConstant[] = [];
    let remainingEnergy = availableEnergy;

    // Haulers use 2 CARRY + 1 MOVE pattern for efficient transport
    // Start with minimum viable body (2 CARRY + 1 MOVE = 150 energy)
    if (remainingEnergy >= 150) {
      body.push(CARRY, CARRY, MOVE);
      remainingEnergy -= 150;
    } else {
      // Fallback to basic body if can't afford hauler minimum
      return [WORK, CARRY, MOVE];
    }

    // Add more 2 CARRY + 1 MOVE units for maximum hauling efficiency
    while (remainingEnergy >= 150 && body.length <= 47) {
      body.push(CARRY, CARRY, MOVE);
      remainingEnergy -= 150;
    }

    // Use remaining energy for single CARRY + MOVE pairs if possible
    while (remainingEnergy >= 100 && body.length < 49) {
      body.push(CARRY, MOVE);
      remainingEnergy -= 100;
    }

    return body;
  }
}