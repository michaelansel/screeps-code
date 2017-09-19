var helpers = require('helpers');

var roleBuilder = {

  selectTarget: function(creep) {
    var target = null, targets = [], room = creep.room;

    // Prioritize critical repairs/fortification
    targets = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        if (structure.structureType == STRUCTURE_RAMPART ||
            structure.structureType == STRUCTURE_WALL) {
          return structure.hits < Math.min(room.memory.fortifyLevel, structure.hitsMax);
        } else {
          return structure.hits < room.memory.repairLevel*structure.hitsMax;
        }
      }
    });
    target = creep.pos.findClosestByPath(targets);
    if (target) {
      room.memory.fortifyLevel = Math.max(room.memory.fortifyLevel, 150000);
      room.memory.repairLevel = Math.max(room.memory.repairLevel, 0.75);
      return target;
    } else {
      room.memory.fortifyLevel = Math.min(room.memory.fortifyLevel, 50000);
      room.memory.repairLevel = Math.min(room.memory.repairLevel, 0.5);
    }

    targets = creep.room.find(FIND_CONSTRUCTION_SITES);
    target = creep.pos.findClosestByPath(targets);
    if (target) {
      return target;
    }

    return null;
  },

  isValidTarget: function(target) {
    if (target instanceof ConstructionSite) return true;
    if (target instanceof StructureRampart ||
        target instanceof StructureWall) return target.energy < target.room.memory.fortifyLevel;
    if (target instanceof OwnedStructure) return target.hits < target.room.memory.repairLevel * target.hitsMax;

    return false;
  },

  workTarget: function(creep, target) {
    var act;
    if (target instanceof ConstructionSite) act = function(){return creep.build(target);};
    if (target instanceof OwnedStructure) act = function(){return creep.repair(target);};
    if (act() == ERR_NOT_IN_RANGE) {
      creep.moveTo(target, {
        visualizePathStyle: {
          stroke: '#ffffff'
        }
      });
    }
  },

  /** @param {Creep} creep **/
  run: function(creep) {
    if (creep.carry.energy == creep.carryCapacity) {
      if (!creep.memory.working) creep.say('🚧 build');
      // Full of energy
      creep.memory.working = true;
      creep.memory.target = null;
    }

    if (creep.carry.energy == 0) {
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
        console.log(creep.name, "has nothing to build or repair");
        creep.room.memory.desiredCreepCounts['builder'] = 0;
        creep.memory.role = 'upgrader';
        creep.room.memory.desiredCreepCounts['upgrader'] = Math.min(creep.room.memory.desiredCreepCounts['upgrader'] + 1, 2);
      }
    } else {
      helpers.getEnergy(creep);
    }
  }
};

module.exports = roleBuilder;
