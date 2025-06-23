import { Logger } from "./Logger";
import { RoleManager } from "./RoleManager";

const logger = Logger.get("SpawnManager");

export interface SpawnDecision {
  shouldSpawn: boolean;
  waitForEnergy?: number;
  reason: string;
}

export interface EnergyPipelineHealth {
  isHealthy: boolean;
  energyIncome: number; // Energy per tick
  energyCapacity: number;
  currentEnergy: number;
  fillRate: number; // 0-1, how full we typically are
  hasActiveHaulers: boolean;
  hasActiveHarvesters: boolean;
}

declare global {
  interface RoomMemory {
    spawnManager?: {
      energyHistory: number[];
      lastSpawnTime?: number;
      lastSpawnEnergy?: number;
      consecutiveWaitTicks: number;
    };
  }
}

export class SpawnManager {
  private static readonly ENERGY_HISTORY_LENGTH = 20;
  private static readonly MAX_WAIT_TICKS = 100; // Don't wait more than 5 seconds
  private static readonly MIN_FILL_RATE = 0.5; // Need 50% fill rate to be "healthy"
  private static readonly ENERGY_BUFFER = 50; // Keep some energy for emergencies

  /**
   * Analyze the health of the energy pipeline in a room
   */
  public static analyzeEnergyPipeline(room: Room): EnergyPipelineHealth {
    const memory = this.getRoomMemory(room);
    const currentEnergy = RoleManager.getRoomAvailableEnergy(room);
    const energyCapacity = RoleManager.getRoomEnergyCapacity(room);
    
    // Update energy history
    memory.energyHistory.push(currentEnergy);
    if (memory.energyHistory.length > this.ENERGY_HISTORY_LENGTH) {
      memory.energyHistory.shift();
    }

    // Calculate average fill rate over history
    const avgEnergy = memory.energyHistory.reduce((a, b) => a + b, 0) / memory.energyHistory.length;
    const fillRate = energyCapacity > 0 ? avgEnergy / energyCapacity : 0;

    // Calculate energy income (simplified - difference over time)
    let energyIncome = 0;
    if (memory.energyHistory.length >= 2) {
      const recentChanges = [];
      for (let i = 1; i < Math.min(5, memory.energyHistory.length); i++) {
        recentChanges.push(memory.energyHistory[memory.energyHistory.length - i] - 
                          memory.energyHistory[memory.energyHistory.length - i - 1]);
      }
      energyIncome = recentChanges.length > 0 ? 
        recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length : 0;
    }

    // Check for active workers
    const creeps = room.find(FIND_MY_CREEPS);
    const hasActiveHaulers = creeps.some(c => c.memory.role === 'hauler');
    const hasActiveHarvesters = creeps.some(c => c.memory.role === 'harvester');

    // Pipeline is healthy if we have workers and decent fill rate
    const isHealthy = hasActiveHarvesters && 
                     fillRate >= this.MIN_FILL_RATE && 
                     energyIncome >= 0;

    return {
      isHealthy,
      energyIncome,
      energyCapacity,
      currentEnergy,
      fillRate,
      hasActiveHaulers,
      hasActiveHarvesters
    };
  }

  /**
   * Decide whether to spawn now or wait for more energy
   */
  public static getSpawnDecision(
    room: Room, 
    projectId: string,
    minBodyCost: number
  ): SpawnDecision {
    const memory = this.getRoomMemory(room);
    const pipeline = this.analyzeEnergyPipeline(room);
    const currentEnergy = pipeline.currentEnergy;
    const capacity = pipeline.energyCapacity;

    // Always spawn if we're at capacity
    if (currentEnergy >= capacity - this.ENERGY_BUFFER) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: "At energy capacity"
      };
    }

    // Always spawn if we don't have minimum energy
    if (currentEnergy < minBodyCost) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: false,
        reason: "Insufficient energy for minimum body"
      };
    }

    // Critical roles should spawn immediately
    const counts = RoleManager.countCreepsByRole(room);
    const quotas = RoleManager.getDesiredQuotas(room);
    
    // Emergency: No harvesters
    if (counts.harvesters === 0) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: "Emergency: No harvesters"
      };
    }

    // Emergency: Below minimum quotas for critical roles
    // CRITICAL FIX: Ensure adequate harvesters before spawning haulers
    const minHarvesters = Math.max(2, quotas.harvesters); // At least 2, or 1 per source
    if (counts.harvesters < minHarvesters) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: `Below critical harvester minimum (${counts.harvesters}/${minHarvesters})`
      };
    }

    // Only spawn haulers if we have adequate harvesters
    if (counts.haulers === 0 && quotas.haulers > 0 && counts.harvesters >= minHarvesters) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: "Below critical hauler minimum (but harvesters adequate)"
      };
    }

    // If pipeline is not healthy, spawn with what we have
    if (!pipeline.isHealthy) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: "Energy pipeline unhealthy"
      };
    }

    // Calculate optimal body cost for this role
    const optimalCost = this.getOptimalBodyCost(room, projectId);
    
    // If we're already at optimal, spawn now
    if (currentEnergy >= optimalCost) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: "Have energy for optimal body"
      };
    }

    // Check if we've been waiting too long
    if (memory.consecutiveWaitTicks >= this.MAX_WAIT_TICKS) {
      logger.info(`Room ${room.name}: Waited ${memory.consecutiveWaitTicks} ticks, spawning now`);
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: "Exceeded maximum wait time"
      };
    }

    // Calculate time to reach optimal energy
    const energyNeeded = optimalCost - currentEnergy;
    const timeToOptimal = pipeline.energyIncome > 0 ? 
      Math.ceil(energyNeeded / pipeline.energyIncome) : Infinity;

    // If it would take too long, spawn now
    if (timeToOptimal > this.MAX_WAIT_TICKS - memory.consecutiveWaitTicks) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: "Would take too long to reach optimal"
      };
    }

    // Check if waiting would actually help (energy is increasing)
    if (pipeline.energyIncome <= 0) {
      memory.consecutiveWaitTicks = 0;
      return {
        shouldSpawn: true,
        reason: "Energy not increasing"
      };
    }

    // We can wait for better energy
    memory.consecutiveWaitTicks++;
    return {
      shouldSpawn: false,
      waitForEnergy: optimalCost,
      reason: `Waiting for optimal energy (${currentEnergy}/${optimalCost})`
    };
  }

  /**
   * Calculate the optimal body cost for a given role
   */
  private static getOptimalBodyCost(room: Room, projectId: string): number {
    const capacity = RoleManager.getRoomEnergyCapacity(room);
    
    // Get the body parts for maximum capacity
    const maxBody = RoleManager.getBodyPartsForRole(projectId, capacity);
    const maxCost = maxBody.reduce((sum, part) => sum + BODYPART_COST[part], 0);

    // For different roles, we might want different thresholds
    // Harvesters: Want maximum work parts ASAP
    // Haulers: Want good capacity but not necessarily maximum
    // Builders/Upgraders: Can be more flexible

    switch (projectId) {
      case "HarvestEnergyProject":
        // For harvesters, aim for 80% of max to get good work parts
        return Math.min(maxCost, Math.floor(capacity * 0.8));
        
      case "HaulerProject":
        // For haulers, 60% is usually enough for good efficiency
        return Math.min(maxCost, Math.floor(capacity * 0.6));
        
      case "BuilderProject":
      case "UpgradeControllerProject":
        // For builders/upgraders, 50% is acceptable
        return Math.min(maxCost, Math.floor(capacity * 0.5));
        
      default:
        // Default to 50% of capacity
        return Math.min(maxCost, Math.floor(capacity * 0.5));
    }
  }

  /**
   * Record that a spawn occurred
   */
  public static recordSpawn(room: Room, energyUsed: number): void {
    const memory = this.getRoomMemory(room);
    memory.lastSpawnTime = Game.time;
    memory.lastSpawnEnergy = energyUsed;
    memory.consecutiveWaitTicks = 0;
  }

  private static getRoomMemory(room: Room): NonNullable<RoomMemory['spawnManager']> {
    if (!room.memory.spawnManager) {
      room.memory.spawnManager = {
        energyHistory: [],
        consecutiveWaitTicks: 0
      };
    }
    return room.memory.spawnManager;
  }
}