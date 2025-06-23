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

export interface RecoveryAnalysis {
  phase: 'emergency' | 'rapid' | 'normal';
  availableEnergySources: {
    droppedResources: number;
    storage: number;
    containers: number;
    total: number;
  };
  shouldPrioritizeHauling: boolean;
  shouldUseSpawnEnergyOnly: boolean;
  activeWorkerCount: number;
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
    const recovery = this.analyzeRecoveryStatus(room);
    
    // Use recovery-specific spawning logic during emergency/rapid phases
    if (recovery.phase !== 'normal') {
      return this.getRecoverySpawnRequest(room, recovery);
    }
    
    // Normal capability-based spawning
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
        spawnTime: (global as any).Game?.time || 0,
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

  /**
   * Analyze the recovery status and determine appropriate strategy
   */
  public static analyzeRecoveryStatus(room: Room): RecoveryAnalysis {
    const creeps = room.find(102 as any); // FIND_MY_CREEPS
    const creepCount = creeps.length;
    
    // Count active workers (creeps with WORK or CARRY parts)
    const activeWorkers = creeps.filter(creep => {
      const capabilities = CreepCapabilityAnalyzer.analyzeCapabilities(creep);
      return capabilities.canHarvest || capabilities.canHaul;
    }).length;

    // Detect available energy sources
    const energySources = this.detectAvailableEnergySources(room);
    
    // Check if capability needs are being met despite low worker count
    const needs = this.analyzeRoomNeeds(room);
    const needsBeingMet = needs.harvest.current >= needs.harvest.required * 0.8 &&
                         needs.build.current >= needs.build.required * 0.5 &&
                         needs.upgrade.current >= needs.upgrade.required * 0.5;

    // Determine recovery phase
    let phase: 'emergency' | 'rapid' | 'normal';
    if (creepCount === 0 || activeWorkers === 0) {
      phase = 'emergency';
    } else if (needsBeingMet) {
      // If needs are being met, we're in normal operations regardless of worker count
      phase = 'normal';
    } else if (activeWorkers < 3 && energySources.total > 0) {
      phase = 'rapid';
    } else if (activeWorkers < 2) {
      phase = 'rapid';
    } else {
      phase = 'normal';
    }

    const shouldPrioritizeHauling = energySources.total > 200;
    const shouldUseSpawnEnergyOnly = phase === 'emergency' || (phase === 'rapid' && activeWorkers < 2);

    return {
      phase,
      availableEnergySources: energySources,
      shouldPrioritizeHauling,
      shouldUseSpawnEnergyOnly,
      activeWorkerCount: activeWorkers
    };
  }

  /**
   * Detect available energy sources for recovery
   */
  public static detectAvailableEnergySources(room: Room): RecoveryAnalysis['availableEnergySources'] {
    // Dropped resources
    const droppedResources = room.find(104 as any, { // FIND_DROPPED_RESOURCES
      filter: (r: any) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
    });
    const droppedEnergy = droppedResources ? droppedResources.reduce((sum: number, r: any) => sum + r.amount, 0) : 0;

    // Storage energy
    const storage = room.storage;
    const storageEnergy = storage && storage.store && storage.store[RESOURCE_ENERGY] > 1000 ? storage.store[RESOURCE_ENERGY] : 0;

    // Container energy
    const containerStructures = room.find(106 as any, { // FIND_STRUCTURES
      filter: (s: any) => s.structureType === STRUCTURE_CONTAINER && s.store && s.store[RESOURCE_ENERGY] > 500
    });
    const containers = containerStructures ? containerStructures as StructureContainer[] : [];
    const containerEnergy = containers.reduce((sum, c) => sum + (c.store ? c.store[RESOURCE_ENERGY] : 0), 0);

    return {
      droppedResources: droppedEnergy,
      storage: storageEnergy,
      containers: containerEnergy,
      total: droppedEnergy + storageEnergy + containerEnergy
    };
  }

  /**
   * Recovery-specific spawning logic
   */
  public static getRecoverySpawnRequest(room: Room, recovery: RecoveryAnalysis): SpawnRequest | null {
    const spawns = room.find(108 as any); // FIND_MY_SPAWNS
    const spawnEnergy = spawns.reduce((sum, spawn) => {
      if (spawn.store && spawn.store[RESOURCE_ENERGY] !== undefined) {
        return sum + spawn.store[RESOURCE_ENERGY];
      }
      return sum;
    }, 0);

    let availableEnergy: number;
    if (recovery.shouldUseSpawnEnergyOnly) {
      availableEnergy = spawnEnergy;
    } else {
      availableEnergy = this.getRoomAvailableEnergy(room);
    }

    // Emergency phase: spawn minimal workers
    if (recovery.phase === 'emergency') {
      if (availableEnergy < 200) return null; // Can't afford minimum worker

      let primaryCapability: string;
      if (recovery.shouldPrioritizeHauling) {
        primaryCapability = 'haul';
      } else {
        primaryCapability = 'harvest';
      }

      const body = BodyTemplateManager.getEmergencyWorker(Math.min(availableEnergy, 300));
      
      return {
        body,
        memory: {
          spawnTime: (global as any).Game?.time || 0,
          purpose: "emergency",
          capabilities: {
            primary: primaryCapability,
            secondary: "build"
          }
        } as CreepMemory,
        priority: 100,
        purpose: `Emergency ${primaryCapability} worker (Recovery Phase: ${recovery.phase})`
      };
    }

    // Rapid phase: prioritize speed over efficiency
    if (recovery.phase === 'rapid') {
      if (availableEnergy < 200) return null;

      let bodyType: string;
      let primaryCapability: string;

      if (recovery.shouldPrioritizeHauling && recovery.activeWorkerCount === 0) {
        // First worker should be a hauler if energy is available
        bodyType = 'transport-specialist';
        primaryCapability = 'haul';
      } else if (recovery.activeWorkerCount < 2) {
        // Spawn general workers for first 2 creeps
        bodyType = 'balanced-worker';
        primaryCapability = 'harvest';
      } else {
        // After 2 workers, fill specific needs
        const needs = this.analyzeRoomNeeds(room);
        if (needs.haul.current < needs.haul.required && recovery.shouldPrioritizeHauling) {
          bodyType = 'transport-specialist';
          primaryCapability = 'haul';
        } else {
          bodyType = 'energy-specialist';
          primaryCapability = 'harvest';
        }
      }

      const templateNeeds = this.getTemplateNeeds(primaryCapability);
      const body = BodyTemplateManager.selectTemplate(Math.min(availableEnergy, 800), templateNeeds);

      if (body.length === 0) return null;

      return {
        body,
        memory: {
          spawnTime: (global as any).Game?.time || 0,
          purpose: primaryCapability,
          capabilities: {
            primary: primaryCapability,
            secondary: this.getSecondaryCapability(primaryCapability)
          }
        } as CreepMemory,
        priority: 90,
        purpose: `Rapid recovery ${bodyType} (${recovery.activeWorkerCount}/3 workers)`
      };
    }

    return null; // Should not reach here
  }

  private static getTemplateNeeds(primaryCapability: string) {
    const templateNeeds = {
      harvest: primaryCapability === 'harvest' ? 1 : 0.2,
      build: primaryCapability === 'build' ? 1 : 0.3,
      haul: primaryCapability === 'haul' ? 1 : 0.1,
      upgrade: primaryCapability === 'upgrade' ? 1 : 0.3
    };
    return templateNeeds;
  }
  
  private static getRoomAvailableEnergy(room: Room): number {
    const spawns = room.find(108 as any); // FIND_MY_SPAWNS
    const extensions = room.find(109 as any, { // FIND_MY_STRUCTURES
      filter: (s) => s.structureType === STRUCTURE_EXTENSION
    }) as StructureExtension[];
    
    let total = 0;
    for (const spawn of spawns) {
      if (spawn.store && spawn.store[RESOURCE_ENERGY] !== undefined) {
        total += spawn.store[RESOURCE_ENERGY];
      }
    }
    for (const extension of extensions) {
      if (extension.store && extension.store[RESOURCE_ENERGY] !== undefined) {
        total += extension.store[RESOURCE_ENERGY];
      }
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