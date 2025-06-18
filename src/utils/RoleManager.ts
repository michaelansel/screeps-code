import { HarvestEnergyProject } from "../projects/HarvestEnergyProject";
import { UpgradeControllerProject } from "../projects/UpgradeControllerProject";

export interface RoleQuotas {
  harvesters: number;
  upgraders: number;
}

export interface RoleCounts {
  harvesters: number;
  upgraders: number;
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
      upgraders: 0
    };

    // Add upgraders if we have a controller
    if (controller && controller.my) {
      quotas.upgraders = 3; // Standard upgrader count
    }

    return quotas;
  }

  /**
   * Count existing creeps by role in a room
   */
  static countCreepsByRole(room: Room): RoleCounts {
    const counts: RoleCounts = {
      harvesters: 0,
      upgraders: 0
    };

    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.room.name === room.name) {
        if (creep.memory.project?.id === HarvestEnergyProject.id) {
          counts.harvesters++;
        } else if (creep.memory.project?.id === UpgradeControllerProject.id) {
          counts.upgraders++;
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

    // Priority order: harvesters first, then upgraders
    if (counts.harvesters < quotas.harvesters) {
      return {
        projectId: HarvestEnergyProject.id,
        roleName: "Harvester"
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