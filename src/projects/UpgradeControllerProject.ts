import { ProjectBehavior, ProjectBehaviorSymbol, ProjectConfig, ProjectHelpers, ProjectId } from "./Project";
import { HarvestEnergyTask } from "../tasks/HarvestEnergyTask";
import { UpgradeControllerTask } from "../tasks/UpgradeControllerTask";

export const UpgradeControllerProjectId = "UpgradeControllerProject" as ProjectId;

export interface UpgradeControllerProjectConfig extends ProjectConfig<typeof UpgradeControllerProjectId> {
  controller: Id<StructureController>;
}

export const UpgradeControllerProject: ProjectBehavior<typeof UpgradeControllerProjectId> = {
  id: UpgradeControllerProjectId,
  type: ProjectBehaviorSymbol,

  start(creep: Creep, config?: UpgradeControllerProjectConfig): void {
    ProjectHelpers.start(creep, UpgradeControllerProject, config);
  },

  run(creep: Creep, config?: UpgradeControllerProjectConfig): void {
    // Determine what task the creep should be doing
    if (creep.store[RESOURCE_ENERGY] === 0) {
      // Creep needs energy - find a source to harvest from
      const room = Game.rooms[creep.room.name];
      const sources = room.find(FIND_SOURCES);
      
      if (sources.length > 0) {
        // Just pick the first available source for now
        // TODO: Integrate with SourcePlanner for better assignment
        const source = sources[0];
        creep.startTask(HarvestEnergyTask, { source: source.id });
      } else {
        // No sources available, stay idle
        console.log(`${creep.name}: No sources available for energy`);
      }
    } else {
      // Creep has energy - upgrade the controller
      if (config?.controller) {
        const controller = Game.getObjectById(config.controller);
        if (controller) {
          creep.startTask(UpgradeControllerTask, { controller: config.controller });
        } else {
          console.log(`${creep.name}: Controller ${config.controller} not found`);
          // Could fall back to harvesting or idle behavior
        }
      } else {
        // No controller specified in config, try to find room controller
        const controller = creep.room.controller;
        if (controller && controller.my) {
          creep.startTask(UpgradeControllerTask, { controller: controller.id });
        } else {
          console.log(`${creep.name}: No controller available to upgrade`);
        }
      }
    }
  },

  stop(creep: Creep): void {
    ProjectHelpers.stop(creep);
  }
};