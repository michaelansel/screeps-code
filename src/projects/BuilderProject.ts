import { ProjectBehavior, ProjectBehaviorSymbol, ProjectConfig, ProjectHelpers, ProjectId } from "./Project";
import { HarvestEnergyTask } from "../tasks/HarvestEnergyTask";
import { BuildTask } from "../tasks/BuildTask";
import { RepairTask } from "../tasks/RepairTask";

export const BuilderProjectId = "BuilderProject" as ProjectId;

export interface BuilderProjectConfig extends ProjectConfig<typeof BuilderProjectId> {
  repairThreshold?: number;
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
          creep.startTask(HarvestEnergyTask, { source: source.id });
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
        // No construction sites, check for repairs
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
          creep.startTask(RepairTask, { repairThreshold: config?.repairThreshold });
        } else {
          // Nothing to build or repair, harvest energy to be ready
          const source = creep.pos.findClosestByPath(FIND_SOURCES);
          if (source) {
            creep.startTask(HarvestEnergyTask, { source: source.id });
          }
        }
      }
    }
  },

  stop(creep: Creep): void {
    ProjectHelpers.stop(creep);
  }
};