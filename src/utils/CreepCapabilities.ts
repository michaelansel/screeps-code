import { Logger } from "./Logger";

const logger = Logger.get("CreepCapabilities");

export interface CreepCapabilities {
  // Basic capabilities
  canWork: boolean;
  workPower: number;
  canCarry: boolean;
  carryCapacity: number;
  moveSpeed: number;
  
  // Derived capabilities
  canHarvest: boolean;
  canBuild: boolean;
  canRepair: boolean;
  canUpgrade: boolean;
  canHaul: boolean;
  canFight: boolean;
  canHeal: boolean;
  canClaim: boolean;
  
  // Efficiency scores (0-1, higher is better)
  harvestEfficiency: number;
  buildEfficiency: number;
  haulEfficiency: number;
  upgradeEfficiency: number;
  
  // Body composition
  bodyParts: {
    [WORK]: number;
    [CARRY]: number;
    [MOVE]: number;
    [ATTACK]: number;
    [RANGED_ATTACK]: number;
    [HEAL]: number;
    [CLAIM]: number;
    [TOUGH]: number;
  };
}

export class CreepCapabilityAnalyzer {
  private static capabilityCache = new Map<string, CreepCapabilities>();
  
  /**
   * Analyze a creep's capabilities based on its body parts
   */
  public static analyzeCapabilities(creep: Creep): CreepCapabilities {
    // Fail gracefully if essential game constants are missing (integration tests)
    if (typeof (global as any).WORK === 'undefined') {
      return this.getEmptyCapabilities();
    }
    
    // Check cache first
    const cacheKey = this.getCacheKey(creep);
    const cached = this.capabilityCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Count body parts
    const bodyParts = this.countBodyParts(creep);
    
    // Calculate basic capabilities
    const capabilities: CreepCapabilities = {
      // Basic
      canWork: bodyParts[WORK] > 0,
      workPower: bodyParts[WORK],
      canCarry: bodyParts[CARRY] > 0,
      carryCapacity: bodyParts[CARRY] * CARRY_CAPACITY,
      moveSpeed: this.calculateMoveSpeed(bodyParts, creep),
      
      // Derived
      canHarvest: bodyParts[WORK] > 0,
      canBuild: bodyParts[WORK] > 0 && bodyParts[CARRY] > 0,
      canRepair: bodyParts[WORK] > 0 && bodyParts[CARRY] > 0,
      canUpgrade: bodyParts[WORK] > 0 && bodyParts[CARRY] > 0,
      canHaul: bodyParts[CARRY] > 0,
      canFight: bodyParts[ATTACK] > 0 || bodyParts[RANGED_ATTACK] > 0,
      canHeal: bodyParts[HEAL] > 0,
      canClaim: bodyParts[CLAIM] > 0,
      
      // Efficiency scores
      harvestEfficiency: this.calculateHarvestEfficiency(bodyParts),
      buildEfficiency: this.calculateBuildEfficiency(bodyParts),
      haulEfficiency: this.calculateHaulEfficiency(bodyParts),
      upgradeEfficiency: this.calculateUpgradeEfficiency(bodyParts),
      
      // Body composition
      bodyParts
    };
    
    // Cache the result
    this.capabilityCache.set(cacheKey, capabilities);
    
    return capabilities;
  }
  
  /**
   * Get a list of creeps that meet minimum capability requirements
   */
  public static findCapableCreeps(
    creeps: Creep[],
    requirements: Partial<CreepCapabilities>
  ): Creep[] {
    return creeps.filter(creep => {
      const capabilities = this.analyzeCapabilities(creep);
      
      // Check each requirement
      for (const [key, value] of Object.entries(requirements)) {
        const creepValue = capabilities[key as keyof CreepCapabilities];
        
        if (typeof value === 'boolean' && creepValue !== value) {
          return false;
        }
        
        if (typeof value === 'number' && (creepValue as number) < value) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Score a creep for a specific task type
   */
  public static scoreCreepForTask(creep: Creep, taskType: 'harvest' | 'build' | 'haul' | 'upgrade'): number {
    const capabilities = this.analyzeCapabilities(creep);
    
    switch (taskType) {
      case 'harvest':
        return capabilities.canHarvest ? capabilities.harvestEfficiency : 0;
      case 'build':
        return capabilities.canBuild ? capabilities.buildEfficiency : 0;
      case 'haul':
        return capabilities.canHaul ? capabilities.haulEfficiency : 0;
      case 'upgrade':
        return capabilities.canUpgrade ? capabilities.upgradeEfficiency : 0;
      default:
        return 0;
    }
  }
  
  /**
   * Clear capability cache (call when creeps die or at tick intervals)
   */
  public static clearCache(): void {
    this.capabilityCache.clear();
  }
  
  /**
   * Get empty capabilities for integration test environments
   */
  private static getEmptyCapabilities(): CreepCapabilities {
    return {
      canWork: false,
      workPower: 0,
      canCarry: false,
      carryCapacity: 0,
      moveSpeed: 0,
      canHarvest: false,
      canBuild: false,
      canRepair: false,
      canUpgrade: false,
      canHaul: false,
      canFight: false,
      canHeal: false,
      canClaim: false,
      harvestEfficiency: 0,
      buildEfficiency: 0,
      haulEfficiency: 0,
      upgradeEfficiency: 0,
      bodyParts: {
        work: 0,
        carry: 0,
        move: 0,
        attack: 0,
        ranged_attack: 0,
        heal: 0,
        claim: 0,
        tough: 0
      }
    };
  }
  
  private static getCacheKey(creep: Creep): string {
    // Cache based on body composition and boost status
    if (!creep.body || !Array.isArray(creep.body)) {
      return `${creep.id}_empty`;
    }
    
    const bodyKey = creep.body
      .map(part => `${part.type}${part.boost ? ':' + part.boost : ''}`)
      .sort()
      .join(',');
    return `${creep.id}_${bodyKey}`;
  }
  
  private static countBodyParts(creep: Creep): CreepCapabilities['bodyParts'] {
    const parts: CreepCapabilities['bodyParts'] = {
      [WORK]: 0,
      [CARRY]: 0,
      [MOVE]: 0,
      [ATTACK]: 0,
      [RANGED_ATTACK]: 0,
      [HEAL]: 0,
      [CLAIM]: 0,
      [TOUGH]: 0
    };
    
    if (!creep.body || !Array.isArray(creep.body)) {
      return parts; // Return empty parts if no body
    }
    
    for (const part of creep.body) {
      if (part.hits > 0) { // Only count active parts
        parts[part.type]++;
      }
    }
    
    return parts;
  }
  
  private static calculateMoveSpeed(parts: CreepCapabilities['bodyParts'], creep: Creep): number {
    // Calculate effective move speed (0-1, where 1 is fastest)
    const totalParts = Object.values(parts).reduce((sum, count) => sum + count, 0);
    const moveParts = parts[MOVE];
    
    // Base speed: ratio of MOVE to total parts
    let speed = moveParts / totalParts;
    
    // Adjust for carry weight
    if (creep.store && typeof creep.store.getUsedCapacity === 'function') {
      const carryWeight = creep.store.getUsedCapacity() / creep.store.getCapacity();
      if (carryWeight > 0) {
        speed *= (1 - carryWeight * 0.5); // Heavy creeps move slower
      }
    }
    
    return Math.min(1, speed);
  }
  
  private static calculateHarvestEfficiency(parts: CreepCapabilities['bodyParts']): number {
    // Perfect harvester: 5 WORK, 1 CARRY, minimal MOVE
    const workRatio = Math.min(parts[WORK] / 5, 1); // Cap at 5 WORK
    const hasCarry = parts[CARRY] > 0 ? 1 : 0;
    const mobilityPenalty = parts[MOVE] > 3 ? 0.9 : 1; // Penalty for too much movement
    
    return workRatio * hasCarry * mobilityPenalty;
  }
  
  private static calculateBuildEfficiency(parts: CreepCapabilities['bodyParts']): number {
    // Good builder: balanced WORK/CARRY/MOVE
    const workPower = Math.min(parts[WORK] / 4, 1); // Diminishing returns after 4
    const carryRatio = Math.min(parts[CARRY] / parts[WORK], 1); // Want at least 1:1
    const mobility = Math.min(parts[MOVE] / (parts[WORK] + parts[CARRY]) * 2, 1);
    
    return workPower * carryRatio * mobility * 0.9 + 0.1; // Minimum 0.1 if capable
  }
  
  private static calculateHaulEfficiency(parts: CreepCapabilities['bodyParts']): number {
    // Good hauler: high CARRY to MOVE ratio
    const carryPower = parts[CARRY] / 10; // Normalize to reasonable max
    const moveRatio = Math.min(parts[MOVE] / Math.ceil(parts[CARRY] / 2), 1); // 1 MOVE per 2 CARRY
    
    return Math.min(carryPower * moveRatio, 1);
  }
  
  private static calculateUpgradeEfficiency(parts: CreepCapabilities['bodyParts']): number {
    // Good upgrader: lots of WORK, some CARRY, minimal MOVE
    const workPower = parts[WORK] / 10; // Normalize
    const hasCarry = Math.min(parts[CARRY] / 2, 1); // Need some carry
    const notTooMobile = parts[MOVE] <= parts[WORK] ? 1 : 0.8; // Penalty for excess MOVE
    
    return Math.min(workPower * hasCarry * notTooMobile, 1);
  }
}