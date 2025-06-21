import { Logger } from "./Logger";

const logger = Logger.get("EmergencyManager");

export enum EmergencyLevel {
  NORMAL = 0,
  CAUTION = 1,    // Some haulers died, monitoring
  WARNING = 2,    // Sustained absence, energy declining
  CRITICAL = 3    // All conditions met, activate fallback
}

export interface HaulerEmergencyState {
  lastHaulerDeathTime?: number;
  consecutiveTicksWithoutHaulers: number;
  spawnEnergyHistory: number[];
  lastEmergencyLevel: EmergencyLevel;
}

export interface RoomEmergencyMemory {
  haulerEmergency?: HaulerEmergencyState;
}

declare global {
  interface RoomMemory {
    emergency?: RoomEmergencyMemory;
  }
}

export class EmergencyManager {
  private static readonly SUSTAINED_ABSENCE_THRESHOLD = 50; // ticks (~2.5 minutes)
  private static readonly ENERGY_HISTORY_LENGTH = 10;
  private static readonly MINIMUM_HAULER_COST = 150; // 2 CARRY + 1 MOVE

  public static updateEmergencyState(room: Room): void {
    const memory = this.getEmergencyMemory(room);
    const haulers = this.getHaulers(room);
    const hasHaulers = haulers.length > 0;

    if (hasHaulers) {
      memory.consecutiveTicksWithoutHaulers = 0;
    } else {
      memory.consecutiveTicksWithoutHaulers++;
      if (memory.consecutiveTicksWithoutHaulers === 1) {
        memory.lastHaulerDeathTime = Game.time;
      }
    }

    // Track energy trend
    const totalEnergy = this.getTotalSpawnEnergy(room);
    memory.spawnEnergyHistory.push(totalEnergy);
    if (memory.spawnEnergyHistory.length > this.ENERGY_HISTORY_LENGTH) {
      memory.spawnEnergyHistory.shift(); // Keep last N ticks
    }

    // Update emergency level
    const newLevel = this.calculateEmergencyLevel(room);
    if (newLevel !== memory.lastEmergencyLevel) {
      logger.info(`Room ${room.name} emergency level changed: ${EmergencyLevel[memory.lastEmergencyLevel]} → ${EmergencyLevel[newLevel]}`);
      memory.lastEmergencyLevel = newLevel;
    }
  }

  public static getEmergencyLevel(room: Room): EmergencyLevel {
    const memory = this.getEmergencyMemory(room);
    return memory.lastEmergencyLevel;
  }

  public static shouldActivateHarvesterFallback(room: Room): boolean {
    return this.getEmergencyLevel(room) === EmergencyLevel.CRITICAL;
  }

  private static calculateEmergencyLevel(room: Room): EmergencyLevel {
    if (this.hasLivingHaulers(room)) {
      return EmergencyLevel.NORMAL;
    }

    const state = this.getEmergencyMemory(room);
    const totalEnergy = this.getTotalSpawnEnergy(room);
    const haulerCost = this.getMinimumHaulerCost(room);

    // Caution: Just started monitoring
    if (state.consecutiveTicksWithoutHaulers < 20) {
      return EmergencyLevel.CAUTION;
    }

    // Check for critical conditions
    const sustainedAbsence = state.consecutiveTicksWithoutHaulers > this.SUSTAINED_ABSENCE_THRESHOLD;
    const cannotSpawnHauler = totalEnergy < haulerCost;
    const energyTrendNegative = this.isEnergyTrendDecreasing(state.spawnEnergyHistory);
    const noStorageBackup = !room.storage || room.storage.store.energy < haulerCost;

    if (sustainedAbsence && cannotSpawnHauler && energyTrendNegative && noStorageBackup) {
      return EmergencyLevel.CRITICAL;
    }

    // Warning: Getting serious but not critical yet
    if (totalEnergy < haulerCost && state.consecutiveTicksWithoutHaulers > 50) {
      return EmergencyLevel.WARNING;
    }

    return EmergencyLevel.WARNING;
  }

  private static getEmergencyMemory(room: Room): HaulerEmergencyState {
    // Handle test environments where room.memory might not exist
    if (!room || !room.memory) {
      return {
        consecutiveTicksWithoutHaulers: 0,
        spawnEnergyHistory: [],
        lastEmergencyLevel: EmergencyLevel.NORMAL
      };
    }

    if (!room.memory.emergency) {
      room.memory.emergency = {};
    }

    if (!room.memory.emergency.haulerEmergency) {
      room.memory.emergency.haulerEmergency = {
        consecutiveTicksWithoutHaulers: 0,
        spawnEnergyHistory: [],
        lastEmergencyLevel: EmergencyLevel.NORMAL
      };
    }

    return room.memory.emergency.haulerEmergency;
  }

  private static getHaulers(room: Room): Creep[] {
    return room.find(FIND_MY_CREEPS, {
      filter: c => c.memory.role === 'hauler'
    });
  }

  private static hasLivingHaulers(room: Room): boolean {
    return this.getHaulers(room).length > 0;
  }

  private static getTotalSpawnEnergy(room: Room): number {
    const spawns = room.find(FIND_MY_SPAWNS);
    const extensions = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_EXTENSION
    }) as StructureExtension[];

    let total = 0;
    for (const spawn of spawns) {
      total += spawn.energy;
    }
    for (const extension of extensions) {
      total += extension.energy;
    }

    return total;
  }

  private static getMinimumHaulerCost(room: Room): number {
    // Could be made more sophisticated based on RCL
    return this.MINIMUM_HAULER_COST;
  }

  private static isEnergyTrendDecreasing(history: number[]): boolean {
    if (history.length < 3) {
      return false;
    }

    // Calculate simple moving average trend
    const recentAvg = history.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = history.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;

    return recentAvg < olderAvg * 0.8; // 20% decline threshold
  }
}