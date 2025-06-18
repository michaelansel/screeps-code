import { discover as discoverExtendables, use as useExtensions } from "./extensions";
import { Console } from "./utils/Console.js";
import { ErrorMapper } from "./utils/ErrorMapper.js";
import { HarvestEnergyProject, UpgradeControllerProject } from "./projects/index.js";
import { Logger } from "./utils/Logger.js";
import { RoleManager } from "./utils/RoleManager.js";
import { SourcePlanner } from "./planners/SourcePlanner.js";

// @ts-expect-error Expose in the game console
global.C = Console;

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // Dunno if this is the right way to achieve the goal of "extend at runtime, not loadtime"
  useExtensions(discoverExtendables(global as object));

  const logger = Logger.get("main");
  logger.info(`Current game tick is ${Game.time}`);

  if (Memory.creepCounter === undefined) Memory.creepCounter = 0;

  // Run all creeps
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    creep.run();
  }

  // Run room-specific logic
  for (const room of Object.values(Game.rooms)) {
    SourcePlanner.instance.assignSources(room);
  }

  // Role-based spawning system
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName];
    
    if (spawn.spawning) continue;

    const room = spawn.room;
    const nextRole = RoleManager.getNextRoleToSpawn(room);
    
    if (nextRole) {
      const bodyParts = RoleManager.getBodyPartsForRole(nextRole.projectId, spawn.store[RESOURCE_ENERGY]);
      
      if (bodyParts.length > 0) {
        const memory: CreepMemory = {
          project: {
            id: nextRole.projectId,
            config: nextRole.config
          }
        };
        
        spawn.spawnCreep(bodyParts, `${nextRole.roleName}${(++Memory.creepCounter).toString()}`, { memory });
      }
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});
