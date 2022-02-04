import * as Roles from "roles";
import { ErrorMapper } from "utils/ErrorMapper";

declare global {
  /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
    creepCounter: number;
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
  }

  // Syntax for adding properties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}

class CreepManager {
  static run(creeps: { [creepName: string]: Creep }) : void {
    for (const name in creeps) {
      const creep = creeps[name];
      console.log(`Loading ${name}`);
      this.matchAndExecute(creep);
    }
  }

  static matchAndExecute(creep: Creep) : void {
    const matchingRoles = Roles.registeredCreepRoles.filter((role) => role.matchesRole(creep));
    switch (matchingRoles.length) {
      case 0:
        console.log(`No matching roles for creep: ${creep.name}`);
        // TODO filler for testing
        creep.memory.role = Roles.registeredCreepRoles[0].RoleName;
        console.log(`Assigning ${creep.memory.role} role to ${creep.name}`);
        break;
      case 1:
        new (matchingRoles[0])(creep).run();
        break;
      default:
        console.log(`Creep matches multiple roles: ${creep.name} ; roles: ${matchingRoles.join(', ')}`);
        break;
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  if (Memory.creepCounter == undefined) Memory.creepCounter = 0;

  CreepManager.run(Game.creeps);

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
