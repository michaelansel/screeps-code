import './extensions';
import { ErrorMapper } from "utils/ErrorMapper";

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  if (Memory.creepCounter == undefined) Memory.creepCounter = 0;

  // Run all creeps
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    creep.run();
  }

  // TODO filler for testing
  for (const spawnName in Game.spawns) {
    const spawn = Game.spawns[spawnName];

    // Keep draining the spawn so we have a place to put energy
    const cost = BODYPART_COST.work + BODYPART_COST.carry + BODYPART_COST.move;
    if (spawn.store[RESOURCE_ENERGY] > cost) {
      spawn.spawnCreep([WORK, CARRY, MOVE], `Worker${(++Memory.creepCounter).toString()}`);
    }
  }

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});
