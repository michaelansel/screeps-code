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

const registeredCreepRoles: Array<typeof CreepRole> = [];
function registerCreepRole<T extends typeof CreepRole>(target: T) {
  registeredCreepRoles.push(target);
  return target;
}

class CreepManager {
  constructor() { }

  run(creeps: { [creepName: string]: Creep }) {
    for (const name in creeps) {
      const creep = creeps[name];
      console.log(`Loading ${name}`);
      this.matchAndExecute(creep);
    }
  }

  matchAndExecute(creep: Creep) {
    const matchingRoles = registeredCreepRoles.filter((role) => role.matchesRole(creep));
    switch (matchingRoles.length) {
      case 0:
        console.log(`No matching roles for creep: ${creep.name}`);
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



class CreepRole {
  static readonly RoleName: string;
  creep: Creep;

  constructor(creep: Creep) {
    this.matchRoleOrThrow(creep, Harvester.RoleName);
    this.creep = creep;
  }

  private matchRoleOrThrow(creep: Creep, roleName: string) {
    if (creep.memory.role != roleName) throw Error(`Unable to create creep with mismatched role (expected: ${roleName}; got: ${creep.memory.role})`);
  }

  static matchesRole(creep: Creep): boolean {
    return creep.memory.role == this.RoleName;
  }

  run(): any {
    console.log(`Executing CreepRole default logic for ${this.creep.name}`);
  };
}


interface HarvesterMemory extends CreepMemory {
  source: Id<Source>;
}

@registerCreepRole
class Harvester extends CreepRole {
  static readonly RoleName = "harvester";
  memory: HarvesterMemory;
  source: Source | null;

  constructor(creep: Creep) {
    super(creep);

    this.memory = creep.memory as HarvesterMemory;
    this.source = Game.getObjectById(this.memory.source);
  }

  run(): any {
    console.log(`Executing Harvester logic for ${this.creep.name}`);
    this.moveToSource();
    this.harvestFromSource();
  }

  moveToSource() {
    if (this.source) {
      if (this.creep.pos.getRangeTo(this.source) > 1) {
        this.creep.moveTo(this.source);
      }
    }
  }

  harvestFromSource() {
    if (this.source && this.creep.pos.getRangeTo(this.source) <= 1) {
      this.creep.harvest(this.source);
    }
  }
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  console.log(`Current game tick is ${Game.time}`);

  new CreepManager().run(Game.creeps);

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }
});
