var _ = require('lodash');
var helpers = require('helpers');

var roleBuilder = {
  isBlacklisted: function(creep, target) {
    if (!creep.memory.blacklist) creep.memory.blacklist = {};
    return creep.memory.blacklist[target.id] >= Game.time;
  },
  blacklistTarget: function(creep, target, ttl=10) {
    if (!creep.memory.blacklist) creep.memory.blacklist = {};
    creep.memory.blacklist[target.id] = Game.time + ttl;
    creep.memory.target = null;
  },
  pruneBlacklist: function(creep) {
    if (!creep.memory.blacklist) creep.memory.blacklist = {};
    for (let tid in creep.memory.blacklist) {
      if (!this.isBlacklisted(creep, Game.getObjectById(tid))) delete creep.memory.blacklist[tid];
    }
  },

  selectTarget: function(creep) {
    var target = null, targets = [], room = creep.room;

    // Prioritize critical repairs/fortification
    targets = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        // Ignore blacklisted targets
        if (this.isBlacklisted(creep, structure)) return false;
        // Don't repair if there are towers that could be doing that instead
        if (helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).length > 0) return false;
        if (structure.structureType == STRUCTURE_RAMPART ||
            structure.structureType == STRUCTURE_WALL) {
          return structure.hits < Math.min(room.memory.fortifyLevel, structure.hitsMax);
        } else {
          return structure.hits < room.memory.repairLevel*structure.hitsMax;
        }
      }
    });
    target = creep.pos.findClosestByPath(targets);
    // room.memory.fortifyLevel = 50000;
    // room.memory.repairLevel = 0.5;
    if (target) {
      // room.memory.fortifyLevel = Math.max(room.memory.fortifyLevel, 150000);
      // room.memory.repairLevel = Math.max(room.memory.repairLevel, 0.75);
      return target;
    // } else {
    //   room.memory.fortifyLevel = Math.min(room.memory.fortifyLevel, 50000);
    //   room.memory.repairLevel = Math.min(room.memory.repairLevel, 0.5);
    }
    
    const constructionFlags = Object.values(Game.flags).filter(function(flag){
      return (
        flag.room &&
        flag.room.name == creep.room.name &&
        flag.color == COLOR_GREEN &&
        flag.secondaryColor == COLOR_BROWN
      );
    });
    if (constructionFlags.length > 0) {
        const flag = creep.pos.findClosestByRange(constructionFlags);
        target = flag.pos.lookFor(LOOK_CONSTRUCTION_SITES)[0];
        if (!target) return flag.remove();
    }
    if (target) {
      return target;
    }

    targets = creep.room.find(FIND_CONSTRUCTION_SITES, {
      filter: (site) => {
        // Ignore blacklisted targets
        if (this.isBlacklisted(creep, site)) return false;
        return true;
      },
    });
    target = creep.pos.findClosestByPath(targets);
    if (target) {
      return target;
    }

    return null;
  },

  isValidTarget: function(target) {
    if (target instanceof ConstructionSite) return true;
    if ((target instanceof StructureRampart) ||
        (target instanceof StructureWall)) return target.hits < target.room.memory.fortifyLevel;
    if (target instanceof Structure) return target.hits < target.room.memory.repairLevel * target.hitsMax;

    return false;
  },

  workTarget: function(creep, target) {
    var act;
    if (target instanceof ConstructionSite) act = function(){return creep.build(target);};
    if (target instanceof Structure) act = function(){return creep.repair(target);};
    let ret = act();
    if (ret == ERR_NOT_IN_RANGE) {
      creep.moveTo(target, {
        visualizePathStyle: {
          stroke: '#ffffff'
        }
      });
    } else if (ret == ERR_RCL_NOT_ENOUGH) {
      this.blacklistTarget(creep, target);
    }
  },

  /** @param {Creep} creep **/
  construct: function(creep) {
    if (!creep.memory.working && creep.carry.energy == creep.carryCapacity) {
      if (!creep.memory.working) creep.say('🚧 build');
      // Full of energy
      creep.memory.working = true;
      creep.memory.target = null;
    }

    if (creep.memory.working && creep.carry.energy == 0) {
      if (creep.memory.working) creep.say('🔄 harvest');
      // Out of energy
      creep.memory.working = false;
      creep.memory.target = null;
    }

    if (creep.memory.working) {
      var target = Game.getObjectById(creep.memory.target);
      if (!target || !this.isValidTarget(target)) {
        target = this.selectTarget(creep);
      }
      if(target && this.isValidTarget(target)) {
        creep.memory.target = target.id;
        this.workTarget(creep, target);
      } else {
        console.log(creep.name, "has nothing to build or repair", target);
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
      }
    } else {
      helpers.getEnergy(creep);
    }
    this.pruneBlacklist(creep);
  },

  destruct: function (creep, flag) {
    const structure = flag.pos.lookFor(LOOK_STRUCTURES)[0];
    if (!structure) return flag.remove();
    console.log(creep.name, 'dismantling', structure);

    if (creep.carry.energy == creep.carryCapacity) {
      if (!creep.memory.working) creep.say('🔄 deposit');
      // Full of energy
      creep.memory.working = false;
      creep.memory.target = null;
    }

    if (creep.carry.energy == 0) {
      if (creep.memory.working) creep.say('🚧 dismantle');
      // Out of energy
      creep.memory.working = true;
      creep.memory.target = null;
    }

    if (creep.memory.working) {
      if (creep.dismantle(structure) == ERR_NOT_IN_RANGE) {
        creep.moveTo(structure, {
          visualizePathStyle: {
            stroke: '#ff0000'
          }
        });
      }
    } else {
      let target = Game.getObjectById(creep.memory.target);
      if (!target) {
        let targets = helpers.structuresInRoom(creep.room, [STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK]).filter(function(struct){
          return (
            // Don't deposit in the structure we are dismantling
            struct.id != structure.id &&
            (
              (
                // storage/container
                struct.storeCapacity &&
                // Don't pick storage/container that is full
                _.sum(struct.store) < struct.storeCapacity
              ) ||
              (
                // link
                struct.energyCapacity &&
                // Don't pick link that is full
                struct.energy < struct.energyCapacity
              )
            )
          );
        });
        target = creep.pos.findClosestByPath(targets);
      }
      if (target) {
        if (_.sum(target.store) >= target.storeCapacity) {
          creep.memory.target = null;
          return;
        }
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      }
    }
  },

  run: function (creep) {
    const destructionFlags = Object.values(Game.flags).filter(function(flag){
      return (
        flag.room &&
        flag.room.name == creep.room.name &&
        flag.color == COLOR_RED &&
        flag.secondaryColor == COLOR_BROWN
      );
    });
    if (destructionFlags.length > 0) {
      this.destruct(creep, creep.pos.findClosestByRange(destructionFlags));
    } else {
      this.construct(creep);
    }
  }
};

module.exports = roleBuilder;
