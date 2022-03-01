import './extensions';
import { ErrorMapper } from "utils/ErrorMapper";
import { HarvestEnergyProject } from 'projects';
import { SourcePlanner } from 'planners/SourcePlanner';
import { Console } from 'utils/Console';
import { Logger } from 'utils/Logger';

// @ts-ignore Expose in the game console
global.C = Console;

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  const logger = Logger.get("main");
  logger.info(`Current game tick is ${Game.time}`);

  if (Memory.creepCounter == undefined) Memory.creepCounter = 0;

  // Run all creeps
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    // TODO this is an ugly workaround to address the mock object not having all the methods on it
    creep.run && creep.run();
  }

  // Run room-specific logic
  for (const room of Object.values(Game.rooms)) {
    SourcePlanner.instance.assignSources(room);
  }

  // TODO filler for testing
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName];

    // Keep draining the spawn so we have a place to put energy
    const cost = BODYPART_COST.work + BODYPART_COST.carry + BODYPART_COST.move;
    if (spawn.store[RESOURCE_ENERGY] > cost) {
      const memory: CreepMemory = {
        project: HarvestEnergyProject.id, // TODO assign projects more dynamically
      };
      spawn.spawnCreep([WORK, CARRY, MOVE], `Worker${(++Memory.creepCounter).toString()}`, { memory: memory });
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});
