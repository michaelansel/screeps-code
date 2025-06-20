import { HarvestEnergyProject } from "../projects/HarvestEnergyProject";
import { UpgradeControllerProject } from "../projects/UpgradeControllerProject";
import { BuilderProject } from "../projects/BuilderProject";

export interface RoleQuotas {
  harvesters: number;
  upgraders: number;
  builders: number;
}

export interface RoleCounts {
  harvesters: number;
  upgraders: number;
  builders: number;
}

export class RoleManager {
  /**
   * Get the desired quotas for different roles based on room state
   */
  static getDesiredQuotas(room: Room): RoleQuotas {
    const sources = room.find(FIND_SOURCES);
    const controller = room.controller;
    
    // Base quotas - always need harvesters
    const quotas: RoleQuotas = {
      harvesters: Math.max(2, sources.length), // At least 2, or 1 per source
      upgraders: 0,
      builders: 0
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
      builders: 0
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

    // Priority order: harvesters first, then builders, then upgraders
    if (counts.harvesters < quotas.harvesters) {
      return {
        projectId: HarvestEnergyProject.id,
        roleName: "Harvester"
      };
    }

    // Builders second priority - construction is important for room development
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
    const baseBody: BodyPartConstant[] = [WORK, CARRY, MOVE];
    const baseCost = BODYPART_COST.work + BODYPART_COST.carry + BODYPART_COST.move;

    if (availableEnergy < baseCost) {
      return []; // Cannot afford minimum body
    }

    // For now, use basic body regardless of role or energy
    // TODO: Implement dynamic body scaling based on energy and role
    return baseBody;
  }
}