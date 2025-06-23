import { Logger } from "./Logger";
import { CreepCapabilityAnalyzer } from "./CreepCapabilities";
import { BodyTemplateManager } from "./BodyTemplates";

const logger = Logger.get("CapabilityManager");

export interface CapabilityNeeds {
  harvest: { required: number; current: number; priority: number };
  build: { required: number; current: number; priority: number };
  haul: { required: number; current: number; priority: number };
  upgrade: { required: number; current: number; priority: number };
}

export interface SpawnRequest {
  body: BodyPartConstant[];
  memory: CreepMemory;
  priority: number;
  purpose: string;
}

/**
 * Manages capability-based spawning instead of role-based
 */
export class CapabilityManager {
  /**
   * Analyze room's capability needs
   */
  public static analyzeRoomNeeds(room: Room): CapabilityNeeds {
    const sources = room.find(FIND_SOURCES);
    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    const damagedStructures = room.find(FIND_STRUCTURES, {
      filter: (s) => s.hits < s.hitsMax * 0.75 && 
                     s.structureType !== STRUCTURE_WALL && 
                     s.structureType !== STRUCTURE_RAMPART
    });
    const containers = room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    });
    
    // Calculate required capabilities
    const needs: CapabilityNeeds = {
      harvest: {
        required: sources.length * 5, // 5 WORK per source optimal
        current: 0,
        priority: 10 // Highest priority
      },
      build: {
        required: constructionSites.length > 0 ? Math.min(constructionSites.length * 2, 8) : 0,
        current: 0,
        priority: constructionSites.length > 5 ? 7 : 5
      },
      haul: {
        required: containers.length > 0 ? Math.ceil(sources.length * 2) : 0, // 2 CARRY per WORK harvested
        current: 0,
        priority: containers.length > 0 ? 8 : 0
      },
      upgrade: {
        required: room.controller?.my ? 6 : 0, // Base 6 WORK for upgrading
        current: 0,
        priority: room.controller?.level === 8 ? 2 : 4
      }
    };
    
    // Add repair needs to build requirement
    if (damagedStructures.length > 0) {
      needs.build.required += Math.min(damagedStructures.length, 4);
      needs.build.priority = Math.max(needs.build.priority, 6);
    }
    
    // Calculate current capabilities from existing creeps
    const creeps = room.find(102 as any); // FIND_MY_CREEPS
    for (const creep of creeps) {
      const capabilities = CreepCapabilityAnalyzer.analyzeCapabilities(creep);
      
      needs.harvest.current += capabilities.workPower * capabilities.harvestEfficiency;
      needs.build.current += capabilities.workPower * capabilities.buildEfficiency;
      needs.haul.current += capabilities.carryCapacity * capabilities.haulEfficiency / CARRY_CAPACITY;
      needs.upgrade.current += capabilities.workPower * capabilities.upgradeEfficiency;
    }
    
    return needs;
  }
  
  /**
   * Determine what body to spawn next based on capability needs
   */
  public static getNextSpawnRequest(room: Room): SpawnRequest | null {
    const needs = this.analyzeRoomNeeds(room);
    const availableEnergy = this.getRoomAvailableEnergy(room);
    
    // Find the highest priority unmet need
    let highestPriority = -1;
    let mostNeededCapability: keyof CapabilityNeeds | null = null;
    let biggestGap = 0;
    
    for (const [capability, need] of Object.entries(needs)) {
      const gap = need.required - need.current;
      if (gap > 0 && need.priority > highestPriority) {
        highestPriority = need.priority;
        mostNeededCapability = capability as keyof CapabilityNeeds;
        biggestGap = gap;
      }
    }
    
    if (!mostNeededCapability) {
      return null; // All needs met
    }
    
    // Emergency: If no harvest capability and low energy, spawn minimal worker
    if (needs.harvest.current === 0 && availableEnergy < 550) {
      const body = BodyTemplateManager.getEmergencyWorker(availableEnergy);
      if (body.length > 0) {
        return {
          body,
          memory: {
            spawnTime: Game.time,
            purpose: "emergency",
            capabilities: {
              primary: "harvest",
              secondary: "build"
            }
          } as CreepMemory,
          priority: 100,
          purpose: "Emergency worker for economic recovery"
        };
      }
    }
    
    // Select appropriate body template
    const templateNeeds = {
      harvest: mostNeededCapability === 'harvest' ? 1 : 0.2,
      build: mostNeededCapability === 'build' ? 1 : 0.3,
      haul: mostNeededCapability === 'haul' ? 1 : 0.1,
      upgrade: mostNeededCapability === 'upgrade' ? 1 : 0.3
    };
    
    const body = BodyTemplateManager.selectTemplate(availableEnergy, templateNeeds);
    
    if (body.length === 0) {
      return null; // Cannot afford anything
    }
    
    // Create spawn request
    return {
      body,
      memory: {
        spawnTime: Game.time,
        purpose: mostNeededCapability,
        capabilities: {
          primary: mostNeededCapability,
          secondary: this.getSecondaryCapability(mostNeededCapability)
        }
      } as CreepMemory,
      priority: highestPriority,
      purpose: `${mostNeededCapability} specialist (gap: ${biggestGap.toFixed(1)})`
    };
  }
  
  /**
   * Assign a project to a creep based on its capabilities
   */
  public static assignProjectToCreep(creep: Creep): string | null {
    const capabilities = CreepCapabilityAnalyzer.analyzeCapabilities(creep);
    const room = creep.room;
    
    // Priority order based on room needs
    const needs = this.analyzeRoomNeeds(room);
    
    // Sort needs by priority and gap
    const sortedNeeds = Object.entries(needs)
      .filter(([_, need]) => need.required > need.current)
      .sort((a, b) => {
        // First by priority, then by gap size
        if (a[1].priority !== b[1].priority) {
          return b[1].priority - a[1].priority;
        }
        return (b[1].required - b[1].current) - (a[1].required - a[1].current);
      });
    
    // Try to assign based on creep's capabilities
    for (const [capability, need] of sortedNeeds) {
      switch (capability) {
        case 'harvest':
          if (capabilities.canHarvest && capabilities.harvestEfficiency > 0.3) {
            return 'HarvestEnergyProject';
          }
          break;
        case 'build':
          if (capabilities.canBuild && capabilities.buildEfficiency > 0.3) {
            return 'BuilderProject';
          }
          break;
        case 'haul':
          if (capabilities.canHaul && capabilities.haulEfficiency > 0.3) {
            return 'HaulerProject';
          }
          break;
        case 'upgrade':
          if (capabilities.canUpgrade && capabilities.upgradeEfficiency > 0.3) {
            return 'UpgradeControllerProject';
          }
          break;
      }
    }
    
    // Fallback assignments based on any capability
    if (capabilities.canHarvest) return 'HarvestEnergyProject';
    if (capabilities.canBuild) return 'BuilderProject';
    if (capabilities.canUpgrade) return 'UpgradeControllerProject';
    if (capabilities.canHaul) return 'HaulerProject';
    
    return 'DoNothingProject'; // Last resort
  }
  
  private static getRoomAvailableEnergy(room: Room): number {
    const spawns = room.find(FIND_MY_SPAWNS);
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: (s) => s.structureType === STRUCTURE_EXTENSION
    }) as StructureExtension[];
    
    let total = 0;
    for (const spawn of spawns) {
      total += spawn.store[RESOURCE_ENERGY];
    }
    for (const extension of extensions) {
      total += extension.store[RESOURCE_ENERGY];
    }
    
    return total;
  }
  
  private static getSecondaryCapability(primary: string): string {
    // Define complementary capabilities
    const complements: Record<string, string> = {
      harvest: 'haul',
      build: 'upgrade',
      haul: 'build',
      upgrade: 'build'
    };
    
    return complements[primary] || 'build';
  }
}