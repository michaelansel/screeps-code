import { discover as discoverExtendables, use as useExtensions } from "./extensions";
import { Console } from "./utils/Console.js";
import { ErrorMapper } from "./utils/ErrorMapper.js";
import { HarvestEnergyProject, UpgradeControllerProject, DoNothingProject } from "./projects/index.js";
import { ProjectId } from "./projects/Project.js";
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

  if (Memory.creepCounter === undefined) Memory.creepCounter = 0;

  // ========== TICK START LOGGING ==========
  console.log(`\n🎮 === TICK ${Game.time} START ===`);
  console.log(`⚡ Energy: ${Object.values(Game.spawns).reduce((total, spawn) => total + spawn.store[RESOURCE_ENERGY], 0)}`);
  console.log(`🤖 Creeps: ${Object.keys(Game.creeps).length}`);
  console.log(`🏭 Spawns: ${Object.keys(Game.spawns).length} | 🏠 Rooms: ${Object.keys(Game.rooms).length}`);

  // ========== CREEP MANAGEMENT ==========
  const creepStats = { withProject: 0, withoutProject: 0, byProject: {} as Record<string, number> };

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];

    // Ensure every creep has a project - CRITICAL REQUIREMENT
    if (!creep.memory.project || !creep.memory.project.id) {
      console.log(`⚠️  FIXING: Creep ${name} has no project, assigning DoNothingProject`);
      creep.memory.project = {
        id: "DoNothingProject" as ProjectId,
        config: {}
      };
      creepStats.withoutProject++;
    } else {
      creepStats.withProject++;
      const projectId = creep.memory.project.id;
      creepStats.byProject[projectId] = (creepStats.byProject[projectId] || 0) + 1;
    }

    console.log(`🤖 ${name}: ${creep.memory.project.id} | Energy: ${creep.store[RESOURCE_ENERGY]}/${creep.store.getCapacity()}`);
    creep.run();
  }

  // Log project assignment statistics
  if (creepStats.withoutProject > 0) {
    console.log(`🚨 CRITICAL: ${creepStats.withoutProject} creeps were missing projects!`);
  }
  console.log(`📊 Project assignments:`, creepStats.byProject);

  // ========== ROOM MANAGEMENT ==========
  console.log(`\n🏠 === ROOM OPERATIONS ===`);
  for (const room of Object.values(Game.rooms)) {
    console.log(`🏠 Room ${room.name}: RCL ${room.controller?.level || 0} | Sources: ${room.find(FIND_SOURCES).length} | Structures: ${room.find(FIND_STRUCTURES).length}`);
    SourcePlanner.instance.assignSources(room);
  }

  // ========== SPAWNING SYSTEM ==========
  console.log(`\n🏭 === SPAWNING OPERATIONS ===`);
  let spawnActivity = false;

  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName];

    if (spawn.spawning) {
      console.log(`🏭 ${spawnName}: Spawning ${spawn.spawning.name} (${spawn.spawning.remainingTime} ticks left)`);
      spawnActivity = true;
      continue;
    }

    const room = spawn.room;
    const nextRole = RoleManager.getNextRoleToSpawn(room);

    if (nextRole) {
      const bodyParts = RoleManager.getBodyPartsForRole(nextRole.projectId, spawn.store[RESOURCE_ENERGY]);

      if (bodyParts.length > 0) {
        const memory: CreepMemory = {
          project: {
            id: nextRole.projectId as ProjectId,
            config: nextRole.config
          }
        };

        const newName = `${nextRole.roleName}${(++Memory.creepCounter).toString()}`;
        const result = spawn.spawnCreep(bodyParts, newName, { memory });

        if (result === OK) {
          console.log(`🏭 ${spawnName}: Spawning ${newName} (${nextRole.projectId}) - Cost: ${bodyParts.reduce((cost, part) => cost + BODYPART_COST[part], 0)}`);
          spawnActivity = true;
        } else {
          console.log(`🏭 ${spawnName}: Failed to spawn ${nextRole.projectId} - Error: ${result}`);
        }
      } else {
        console.log(`🏭 ${spawnName}: Not enough energy for ${nextRole.projectId} (need more than ${spawn.store[RESOURCE_ENERGY]})`);
      }
    } else {
      console.log(`🏭 ${spawnName}: No roles needed to spawn`);
    }
  }

  if (!spawnActivity) {
    console.log(`🏭 No spawning activity this tick`);
  }

  // ========== MEMORY CLEANUP ==========
  let cleanedCreeps = 0;
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
      cleanedCreeps++;
    }
  }

  if (cleanedCreeps > 0) {
    console.log(`🧹 Cleaned memory for ${cleanedCreeps} dead creeps`);
  }

  console.log(`🎮 === TICK ${Game.time} END ===\n`);
});
