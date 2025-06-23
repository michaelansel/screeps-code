import { discover as discoverExtendables, use as useExtensions } from "./extensions";
import { Console } from "./utils/Console.js";
import { ErrorMapper } from "./utils/ErrorMapper.js";
import { HarvestEnergyProject, UpgradeControllerProject, DoNothingProject, BuilderProject, HaulerProject } from "./projects/index.js";
import { ProjectId } from "./projects/Project.js";
import { Logger } from "./utils/Logger.js";
import { CapabilityManager } from "./utils/CapabilityManager.js";
import { CreepCapabilityAnalyzer } from "./utils/CreepCapabilities.js";
import { SourcePlanner } from "./planners/SourcePlanner.js";
import { EmergencyManager } from "./utils/EmergencyManager.js";
import { SpawnManager } from "./utils/SpawnManager.js";

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
  console.log(`\n🎮 === TICK ${Game.time} START (Capability-Based) ===`);
  console.log(`⚡ Energy: ${Object.values(Game.spawns).reduce((total, spawn) => total + spawn.store[RESOURCE_ENERGY], 0)}`);
  console.log(`🤖 Creeps: ${Object.keys(Game.creeps).length}`);
  console.log(`🏭 Spawns: ${Object.keys(Game.spawns).length} | 🏠 Rooms: ${Object.keys(Game.rooms).length}`);

  // ========== CREEP MANAGEMENT ==========
  const creepStats = { 
    withProject: 0, 
    withoutProject: 0, 
    byProject: {} as Record<string, number>,
    byCapability: {} as Record<string, number>
  };

  // Clear capability cache at start of tick
  CreepCapabilityAnalyzer.clearCache();

  for (const name in Game.creeps) {
    const creep = Game.creeps[name];

    // Analyze creep capabilities
    const capabilities = CreepCapabilityAnalyzer.analyzeCapabilities(creep);
    
    // Track capability distribution
    if (capabilities.canHarvest) creepStats.byCapability['harvest'] = (creepStats.byCapability['harvest'] || 0) + capabilities.workPower;
    if (capabilities.canBuild) creepStats.byCapability['build'] = (creepStats.byCapability['build'] || 0) + capabilities.workPower;
    if (capabilities.canHaul) creepStats.byCapability['haul'] = (creepStats.byCapability['haul'] || 0) + capabilities.carryCapacity / CARRY_CAPACITY;
    if (capabilities.canUpgrade) creepStats.byCapability['upgrade'] = (creepStats.byCapability['upgrade'] || 0) + capabilities.workPower;

    // Dynamic project assignment based on capabilities and room needs
    if (!creep.memory.project || !creep.memory.project.id) {
      const assignedProject = CapabilityManager.assignProjectToCreep(creep);
      if (assignedProject) {
        console.log(`📋 Assigning ${name} (${capabilities.workPower}W ${capabilities.carryCapacity/CARRY_CAPACITY}C) to ${assignedProject}`);
        creep.memory.project = {
          id: assignedProject as ProjectId,
          config: assignedProject === 'UpgradeControllerProject' && creep.room.controller 
            ? { controller: creep.room.controller.id } 
            : undefined
        };
      } else {
        // Fallback if no suitable project
        creep.memory.project = {
          id: "DoNothingProject" as ProjectId
        };
      }
      creepStats.withoutProject++;
    } else {
      creepStats.withProject++;
      const projectId = creep.memory.project.id;
      creepStats.byProject[projectId] = (creepStats.byProject[projectId] || 0) + 1;
    }

    console.log(`🤖 ${name}: ${creep.memory.project?.id || 'NO PROJECT'} | Body: ${capabilities.workPower}W ${capabilities.carryCapacity/CARRY_CAPACITY}C ${capabilities.bodyParts[MOVE]}M | Energy: ${creep.store[RESOURCE_ENERGY]}/${creep.store.getCapacity()}`);
    creep.run();
  }

  // Log statistics
  console.log(`📊 Projects:`, creepStats.byProject);
  console.log(`🔧 Capabilities:`, creepStats.byCapability);

  // ========== ROOM MANAGEMENT ==========
  console.log(`\n🏠 === ROOM OPERATIONS ===`);
  for (const room of Object.values(Game.rooms)) {
    console.log(`🏠 Room ${room.name}: RCL ${room.controller?.level || 0} | Sources: ${room.find(FIND_SOURCES).length}`);
    
    // Analyze room capability needs
    const needs = CapabilityManager.analyzeRoomNeeds(room);
    console.log(`📊 Capability needs:`, {
      harvest: `${needs.harvest.current.toFixed(1)}/${needs.harvest.required}`,
      build: `${needs.build.current.toFixed(1)}/${needs.build.required}`,
      haul: `${needs.haul.current.toFixed(1)}/${needs.haul.required}`,
      upgrade: `${needs.upgrade.current.toFixed(1)}/${needs.upgrade.required}`
    });
    
    SourcePlanner.instance.assignSources(room);
    EmergencyManager.updateEmergencyState(room);
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
    const spawnRequest = CapabilityManager.getNextSpawnRequest(room);

    if (spawnRequest) {
      const roomEnergy = spawn.store[RESOURCE_ENERGY];
      const bodyCost = spawnRequest.body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
      
      // Check if we should spawn now or wait
      const spawnDecision = SpawnManager.getSpawnDecision(room, spawnRequest.purpose, bodyCost);

      if (spawnDecision.shouldSpawn && roomEnergy >= bodyCost) {
        const newName = `Worker${(++Memory.creepCounter).toString()}`;
        const result = spawn.spawnCreep(spawnRequest.body, newName, { 
          memory: spawnRequest.memory 
        });

        if (result === OK) {
          console.log(`🏭 ${spawnName}: Spawning ${newName} for ${spawnRequest.purpose} - Body: [${spawnRequest.body.join(',')}] (${bodyCost} energy) - ${spawnDecision.reason}`);
          SpawnManager.recordSpawn(room, bodyCost);
          spawnActivity = true;
        } else {
          console.log(`🏭 ${spawnName}: Failed to spawn - Error: ${result}`);
        }
      } else if (!spawnDecision.shouldSpawn) {
        console.log(`🏭 ${spawnName}: ${spawnDecision.reason}`);
      } else {
        console.log(`🏭 ${spawnName}: Not enough energy (${roomEnergy}/${bodyCost})`);
      }
    } else {
      console.log(`🏭 ${spawnName}: All capability needs met`);
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
