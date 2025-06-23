import { Logger } from "./Logger";

const logger = Logger.get("BodyTemplates");

export interface BodyTemplate {
  name: string;
  parts: BodyPartConstant[];
  cost: number;
  purpose: string;
  minEnergy: number;
  capabilities: {
    harvest: number;
    build: number;
    haul: number;
    upgrade: number;
  };
}

export class BodyTemplateManager {
  // Core templates - ordered by energy cost
  private static getTemplates(): BodyTemplate[] {
    return [
      // Minimal templates (200 energy)
      {
        name: "MINIMAL_WORKER",
        parts: [WORK, CARRY, MOVE],
        cost: 200,
        purpose: "Basic bootstrap worker",
        minEnergy: 200,
        capabilities: { harvest: 0.2, build: 0.3, haul: 0.2, upgrade: 0.3 }
      },
    {
      name: "GENERAL_WORKER",
      parts: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
      cost: 300,
      purpose: "Balanced general-purpose worker",
      minEnergy: 300,
      capabilities: { harvest: 0.4, build: 0.6, haul: 0.4, upgrade: 0.5 }
    },
    {
      name: "TRANSPORT_SPECIALIST",
      parts: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
      cost: 300,
      purpose: "Optimized for resource transport",
      minEnergy: 300,
      capabilities: { harvest: 0, build: 0, haul: 0.8, upgrade: 0 }
    },
    
    // Specialized templates (550+ energy)
    {
      name: "ENERGY_SPECIALIST",
      parts: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
      cost: 550,
      purpose: "Optimized stationary harvester",
      minEnergy: 550,
      capabilities: { harvest: 1.0, build: 0.3, haul: 0.1, upgrade: 0.4 }
    },
    {
      name: "WORK_SPECIALIST",
      parts: [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
      cost: 650,
      purpose: "Heavy construction and upgrading",
      minEnergy: 650,
      capabilities: { harvest: 0.8, build: 0.9, haul: 0.3, upgrade: 0.9 }
    },
    {
      name: "FAST_TRANSPORT",
      parts: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
      cost: 600,
      purpose: "Fast long-distance transport",
      minEnergy: 600,
      capabilities: { harvest: 0, build: 0, haul: 1.0, upgrade: 0 }
    },
    
    // Advanced templates (800+ energy)
    {
      name: "HEAVY_WORKER",
      parts: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
      cost: 1000,
      purpose: "Maximum work output",
      minEnergy: 1000,
      capabilities: { harvest: 0.9, build: 1.0, haul: 0.4, upgrade: 1.0 }
    },
    {
      name: "MEGA_HAULER",
      parts: Array(10).fill(CARRY).concat(Array(5).fill(MOVE)),
      cost: 750,
      purpose: "Maximum carry capacity",
      minEnergy: 750,
      capabilities: { harvest: 0, build: 0, haul: 1.0, upgrade: 0 }
    }
    ];
  }
  
  /**
   * Get the best body template for the given energy and purpose
   */
  public static selectTemplate(
    availableEnergy: number,
    needs: {
      harvest?: number;
      build?: number;
      haul?: number;
      upgrade?: number;
    }
  ): BodyPartConstant[] {
    // Filter templates by energy
    const templates = this.getTemplates();
    const affordableTemplates = templates.filter(t => t.cost <= availableEnergy);
    
    if (affordableTemplates.length === 0) {
      logger.warn(`No templates affordable with ${availableEnergy} energy`);
      return []; // Cannot spawn anything
    }
    
    // Score each template based on needs
    let bestTemplate = affordableTemplates[0];
    let bestScore = -1;
    
    for (const template of affordableTemplates) {
      let score = 0;
      let totalWeight = 0;
      
      // Calculate weighted score based on needs
      if (needs.harvest !== undefined) {
        score += template.capabilities.harvest * needs.harvest;
        totalWeight += needs.harvest;
      }
      if (needs.build !== undefined) {
        score += template.capabilities.build * needs.build;
        totalWeight += needs.build;
      }
      if (needs.haul !== undefined) {
        score += template.capabilities.haul * needs.haul;
        totalWeight += needs.haul;
      }
      if (needs.upgrade !== undefined) {
        score += template.capabilities.upgrade * needs.upgrade;
        totalWeight += needs.upgrade;
      }
      
      // Normalize score
      if (totalWeight > 0) {
        score /= totalWeight;
      }
      
      // Prefer more expensive templates when scores are close
      score += template.cost / availableEnergy * 0.1;
      
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }
    
    logger.info(`Selected template: ${bestTemplate.name} (score: ${bestScore.toFixed(2)})`);
    return [...bestTemplate.parts]; // Return a copy
  }
  
  /**
   * Scale a body template up or down based on available energy
   */
  public static scaleTemplate(
    baseTemplate: BodyPartConstant[],
    availableEnergy: number,
    maxParts: number = 50
  ): BodyPartConstant[] {
    const baseCost = this.calculateCost(baseTemplate);
    
    if (baseCost > availableEnergy) {
      // Try to create a smaller version
      return this.downscaleTemplate(baseTemplate, availableEnergy);
    }
    
    if (baseCost < availableEnergy && baseTemplate.length < maxParts) {
      // Try to create a larger version
      return this.upscaleTemplate(baseTemplate, availableEnergy, maxParts);
    }
    
    return [...baseTemplate];
  }
  
  /**
   * Generate a custom body based on specific part requirements
   */
  public static generateCustomBody(
    requirements: {
      minWork?: number;
      minCarry?: number;
      minMove?: number;
      preferWork?: boolean;
      preferCarry?: boolean;
      fastMove?: boolean;
    },
    availableEnergy: number
  ): BodyPartConstant[] {
    const body: BodyPartConstant[] = [];
    let remainingEnergy = availableEnergy;
    
    // Add minimum requirements first
    const minWork = requirements.minWork || 0;
    const minCarry = requirements.minCarry || 0;
    const minMove = requirements.minMove || 0;
    
    // Add minimum parts
    for (let i = 0; i < minWork; i++) {
      if (remainingEnergy >= BODYPART_COST[WORK]) {
        body.push(WORK);
        remainingEnergy -= BODYPART_COST[WORK];
      }
    }
    
    for (let i = 0; i < minCarry; i++) {
      if (remainingEnergy >= BODYPART_COST[CARRY]) {
        body.push(CARRY);
        remainingEnergy -= BODYPART_COST[CARRY];
      }
    }
    
    for (let i = 0; i < minMove; i++) {
      if (remainingEnergy >= BODYPART_COST[MOVE]) {
        body.push(MOVE);
        remainingEnergy -= BODYPART_COST[MOVE];
      }
    }
    
    // Use remaining energy based on preferences
    while (remainingEnergy >= 50 && body.length < 50) {
      if (requirements.preferWork && remainingEnergy >= BODYPART_COST[WORK]) {
        body.push(WORK);
        remainingEnergy -= BODYPART_COST[WORK];
      } else if (requirements.preferCarry && remainingEnergy >= BODYPART_COST[CARRY]) {
        body.push(CARRY);
        remainingEnergy -= BODYPART_COST[CARRY];
      } else if (remainingEnergy >= BODYPART_COST[MOVE]) {
        body.push(MOVE);
        remainingEnergy -= BODYPART_COST[MOVE];
      } else {
        break;
      }
      
      // Ensure enough MOVE parts for mobility
      const nonMoveParts = body.filter(p => p !== MOVE).length;
      const moveParts = body.filter(p => p === MOVE).length;
      const moveRatio = requirements.fastMove ? 1 : 0.5;
      
      if (moveParts < nonMoveParts * moveRatio && remainingEnergy >= BODYPART_COST[MOVE]) {
        body.push(MOVE);
        remainingEnergy -= BODYPART_COST[MOVE];
      }
    }
    
    return body;
  }
  
  /**
   * Get an emergency worker body for the given energy
   * Prioritizes balanced functionality over specialization
   */
  public static getEmergencyWorker(availableEnergy: number): BodyPartConstant[] {
    // With 300 energy, use balanced worker
    if (availableEnergy >= 300) {
      return [WORK, WORK, CARRY, CARRY, MOVE, MOVE];
    }
    
    // With 200 energy, basic worker
    if (availableEnergy >= 200) {
      return [WORK, CARRY, MOVE];
    }
    
    // With 150 energy, minimal functionality
    if (availableEnergy >= 150) {
      return [WORK, CARRY, MOVE];
    }
    
    return [];
  }
  
  private static calculateCost(parts: BodyPartConstant[]): number {
    return parts.reduce((sum, part) => sum + BODYPART_COST[part], 0);
  }
  
  private static downscaleTemplate(
    template: BodyPartConstant[],
    maxEnergy: number
  ): BodyPartConstant[] {
    // Try to maintain ratios while reducing parts
    const workParts = template.filter(p => p === WORK).length;
    const carryParts = template.filter(p => p === CARRY).length;
    const moveParts = template.filter(p => p === MOVE).length;
    
    // Calculate ratios
    const total = template.length;
    const workRatio = workParts / total;
    const carryRatio = carryParts / total;
    const moveRatio = moveParts / total;
    
    // Build smaller version maintaining ratios
    const scaled: BodyPartConstant[] = [];
    let cost = 0;
    
    while (cost < maxEnergy && scaled.length < 50) {
      // Add parts maintaining ratio
      if (scaled.filter(p => p === WORK).length / (scaled.length + 1) < workRatio) {
        if (cost + BODYPART_COST[WORK] <= maxEnergy) {
          scaled.push(WORK);
          cost += BODYPART_COST[WORK];
        }
      } else if (scaled.filter(p => p === CARRY).length / (scaled.length + 1) < carryRatio) {
        if (cost + BODYPART_COST[CARRY] <= maxEnergy) {
          scaled.push(CARRY);
          cost += BODYPART_COST[CARRY];
        }
      } else if (scaled.filter(p => p === MOVE).length / (scaled.length + 1) < moveRatio) {
        if (cost + BODYPART_COST[MOVE] <= maxEnergy) {
          scaled.push(MOVE);
          cost += BODYPART_COST[MOVE];
        }
      } else {
        break;
      }
    }
    
    // Ensure at least one MOVE
    if (!scaled.includes(MOVE) && cost + BODYPART_COST[MOVE] <= maxEnergy) {
      scaled.push(MOVE);
    }
    
    return scaled;
  }
  
  private static upscaleTemplate(
    template: BodyPartConstant[],
    maxEnergy: number,
    maxParts: number
  ): BodyPartConstant[] {
    const scaled = [...template];
    let cost = this.calculateCost(scaled);
    
    // Get part counts
    const workParts = template.filter(p => p === WORK).length;
    const carryParts = template.filter(p => p === CARRY).length;
    const moveParts = template.filter(p => p === MOVE).length;
    
    // Determine pattern to repeat
    const pattern: BodyPartConstant[] = [];
    if (workParts > 0) pattern.push(WORK);
    if (carryParts > 0) pattern.push(CARRY);
    if (moveParts > 0) pattern.push(MOVE);
    
    // Add pattern repeatedly
    let patternIndex = 0;
    while (cost < maxEnergy && scaled.length < maxParts) {
      const nextPart = pattern[patternIndex % pattern.length];
      if (cost + BODYPART_COST[nextPart] <= maxEnergy) {
        scaled.push(nextPart);
        cost += BODYPART_COST[nextPart];
        patternIndex++;
      } else {
        break;
      }
    }
    
    return scaled;
  }
}