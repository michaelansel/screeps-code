var _ = require('lodash');
var helpers = require('helpers');

var roleHauler = {
  selectTarget: function(creep) {
    var structureSelectors = [
      function(structure) {
        return Memory.underAttack &&
               structure.structureType == STRUCTURE_TOWER &&
               structure.energy < structure.energyCapacity/10;
      },
      function(structure) {
        return Memory.underAttack &&
               structure.structureType == STRUCTURE_TOWER &&
               structure.energy < structure.energyCapacity;
      },
      function(structure) {
        return (structure.structureType == STRUCTURE_SPAWN ||
                structure.structureType == STRUCTURE_EXTENSION) &&
               structure.energy < structure.energyCapacity;
      },
      function(structure) {
        return structure.structureType == STRUCTURE_TOWER &&
               structure.energy < structure.energyCapacity/10;
      },
      function(structure) {
        return structure.structureType == STRUCTURE_TOWER &&
               structure.energy < structure.energyCapacity;
      },
      function(structure) {
        return creep.memory.rebalancing &&
               (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE) &&
               _.sum(structure.store) < structure.storeCapacity;
      },
    ];
    var targets = [];
    var i = 0;
    while(!targets.length && i<structureSelectors.length) {
      targets = creep.room.find(FIND_STRUCTURES, {filter: structureSelectors[i++]});
    }
    if (targets.length > 0) {
      return creep.pos.findClosestByPath(targets);
    }
    return null;
  },

  isValidTarget: function(target) {
    const validTargets = [
      STRUCTURE_CONTAINER,
      STRUCTURE_STORAGE,
      STRUCTURE_TOWER,
      STRUCTURE_EXTENSION,
      STRUCTURE_SPAWN,
    ];

    if (!validTargets.includes(target.structureType)) return false;
    if (target.energyCapacity) return target.energy < target.energyCapacity;
    if (target.storeCapacity) return _.sum(target.store) < target.storeCapacity;
  },

  workTarget: function(creep, target) {
    if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
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
      // Full of energy
      if (!creep.memory.working && creep.memory.rebalancing) {
        // Just picked up from a max-full container; double check where it needs to go
        creep.memory.rebalancing = false;
      }
      creep.memory.working = true;
      creep.memory.target = null;
    }

    if (creep.carry.energy == 0) {
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
        console.log(creep.name, "lots of energy and nowhere to use it; entering rebalance mode");
        // creep.memory.rebalancing = true;
      }
    } else {
      helpers.getEnergy(creep, creep.memory.rebalancing);
    }
  },
};

module.exports = roleHauler;
