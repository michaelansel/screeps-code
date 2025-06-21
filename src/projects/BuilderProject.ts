import { ProjectBehavior, ProjectBehaviorSymbol, ProjectConfig, ProjectHelpers, ProjectId } from "./Project";
import { HarvestEnergyTask, HarvestEnergyTaskConfig } from "../tasks/HarvestEnergyTask";
import { BuildTask } from "../tasks/BuildTask";
import { RepairTask, RepairTaskConfig } from "../tasks/RepairTask";

export const BuilderProjectId = "BuilderProject" as ProjectId;

export interface BuilderProjectConfig extends ProjectConfig<typeof BuilderProjectId> {
  repairThreshold?: number;
}

/**
 * Find positions where roads should exist but are missing
 * This includes paths between key structures and frequently used routes
 */
export function findMissingRoads(room: Room): RoomPosition[] {
  const missingRoads: RoomPosition[] = [];
  
  // Get key structures that should be connected by roads
  const spawns = room.find(FIND_MY_SPAWNS);
  const sources = room.find(FIND_SOURCES);
  const controller = room.controller;
  const extensions = room.find(FIND_MY_STRUCTURES, {
    filter: { structureType: STRUCTURE_EXTENSION }
  });
  
  // Check paths from spawns to sources
  spawns.forEach(spawn => {
    sources.forEach(source => {
      const path = spawn.pos.findPathTo(source.pos, { 
        ignoreCreeps: true,
        maxOps: 2000
      });
      
      path.forEach(step => {
        const pos = new RoomPosition(step.x, step.y, room.name);
        if (shouldHaveRoad(pos) && !hasRoadOrConstructionSite(pos)) {
          missingRoads.push(pos);
        }
      });
    });
  });
  
  // Check paths from spawns to controller
  if (controller && controller.my) {
    spawns.forEach(spawn => {
      const path = spawn.pos.findPathTo(controller.pos, {
        ignoreCreeps: true,
        maxOps: 2000
      });
      
      path.forEach(step => {
        const pos = new RoomPosition(step.x, step.y, room.name);
        if (shouldHaveRoad(pos) && !hasRoadOrConstructionSite(pos)) {
          missingRoads.push(pos);
        }
      });
    });
  }
  
  // Check paths between spawn and extension clusters
  if (extensions.length > 0) {
    spawns.forEach(spawn => {
      // Find average position of extensions for cluster center
      const avgX = extensions.reduce((sum, ext) => sum + ext.pos.x, 0) / extensions.length;
      const avgY = extensions.reduce((sum, ext) => sum + ext.pos.y, 0) / extensions.length;
      const clusterCenter = new RoomPosition(Math.round(avgX), Math.round(avgY), room.name);
      
      const path = spawn.pos.findPathTo(clusterCenter, {
        ignoreCreeps: true,
        maxOps: 1000
      });
      
      path.forEach(step => {
        const pos = new RoomPosition(step.x, step.y, room.name);
        if (shouldHaveRoad(pos) && !hasRoadOrConstructionSite(pos)) {
          missingRoads.push(pos);
        }
      });
    });
  }
  
  // Remove duplicates
  const uniqueRoads = missingRoads.filter((pos, index) => 
    missingRoads.findIndex(p => p.x === pos.x && p.y === pos.y) === index
  );
  
  return uniqueRoads.slice(0, 5); // Limit to 5 roads per check to avoid overwhelming
}

/**
 * Check if a position should have a road based on terrain and existing structures
 */
export function shouldHaveRoad(pos: RoomPosition): boolean {
  // Don't build roads on walls
  const terrain = pos.lookFor(LOOK_TERRAIN);
  if (terrain.includes('wall')) {
    return false;
  }
  
  // Don't build roads on existing structures (except roads)
  const structures = pos.lookFor(LOOK_STRUCTURES);
  const hasNonRoadStructure = structures.some(s => s.structureType !== STRUCTURE_ROAD);
  if (hasNonRoadStructure) {
    return false;
  }
  
  // Don't build on room edges
  if (pos.x <= 1 || pos.x >= 48 || pos.y <= 1 || pos.y >= 48) {
    return false;
  }
  
  return true;
}

/**
 * Check if a position already has a road or a construction site for a road
 */
export function hasRoadOrConstructionSite(pos: RoomPosition): boolean {
  // Check for existing road
  const structures = pos.lookFor(LOOK_STRUCTURES);
  const hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
  if (hasRoad) {
    return true;
  }
  
  // Check for road construction site
  const constructionSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
  const hasRoadSite = constructionSites.some(cs => cs.structureType === STRUCTURE_ROAD);
  return hasRoadSite;
}

/**
 * Create construction sites for missing roads
 */
export function createRoadConstructionSites(room: Room, positions: RoomPosition[]): number {
  let created = 0;
  
  for (const pos of positions) {
    // Double-check the position is valid before creating construction site
    if (shouldHaveRoad(pos) && !hasRoadOrConstructionSite(pos)) {
      const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD);
      if (result === OK) {
        created++;
        console.log(`📍 Created road construction site at ${pos.x},${pos.y} in ${room.name}`);
      } else if (result !== ERR_FULL) {
        console.log(`⚠️ Failed to create road at ${pos.x},${pos.y}: ${result}`);
      }
      
      // Limit construction sites to avoid hitting the limit
      if (created >= 3) {
        break;
      }
    }
  }
  
  return created;
}

export const BuilderProject: ProjectBehavior<typeof BuilderProjectId> = {
  id: BuilderProjectId,
  type: ProjectBehaviorSymbol,

  start(creep: Creep, config?: BuilderProjectConfig): void {
    ProjectHelpers.start(creep, BuilderProject, config);
  },

  run(creep: Creep, config?: BuilderProjectConfig): void {
    // Determine what task the creep should be doing
    if (creep.store[RESOURCE_ENERGY] === 0) {
      // Creep needs energy - find a source to harvest from
      const sources = creep.room.find(FIND_SOURCES);
      
      if (sources.length > 0) {
        // Pick the closest source
        const source = creep.pos.findClosestByPath(FIND_SOURCES);
        if (source) {
          creep.startTask(HarvestEnergyTask, { source: source.id } as HarvestEnergyTaskConfig);
        }
      } else {
        // No sources available, stay idle
        console.log(`${creep.name}: No sources available for energy`);
      }
    } else {
      // Creep has energy - prioritize building over repairing
      const constructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
      
      if (constructionSites.length > 0) {
        // Build structures
        creep.startTask(BuildTask);
      } else {
        // No construction sites, check for missing/decayed roads first
        const missingRoads = findMissingRoads(creep.room);
        if (missingRoads.length > 0) {
          // Create construction sites for missing roads
          createRoadConstructionSites(creep.room, missingRoads);
          // Start building immediately if construction sites were created
          creep.startTask(BuildTask);
        } else {
          // Check for repairs
          const damagedStructures = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
              // Skip walls and ramparts for now
              if (structure.structureType === STRUCTURE_WALL || 
                  structure.structureType === STRUCTURE_RAMPART) {
                return false;
              }
              
              const threshold = config?.repairThreshold ?? 0.75;
              return structure.hits < structure.hitsMax * threshold;
            }
          });
          
          if (damagedStructures.length > 0) {
            // Repair structures
            creep.startTask(RepairTask, { repairThreshold: config?.repairThreshold } as RepairTaskConfig);
          } else {
            // Nothing to build or repair, harvest energy to be ready
            const source = creep.pos.findClosestByPath(FIND_SOURCES);
            if (source) {
              creep.startTask(HarvestEnergyTask, { source: source.id } as HarvestEnergyTaskConfig);
            }
          }
        }
      }
    }
  },

  stop(creep: Creep): void {
    ProjectHelpers.stop(creep);
  }
};