var _ = require('lodash');
var helpers = require('helpers');

var roleHauler = {
  selectTarget: function(creep) {
    var structureSelectors = [
      function() {
        if (creep.room.memory.underAttack) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
            return tower.energy < tower.energyCapacity/10;
          });
        } else {
          return [];
        }
      },
      function() {
        if (creep.room.memory.underAttack) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
            return tower.energy < tower.energyCapacity;
          });
        } else {
          return [];
        }
      },
      function() {
        return helpers.structuresInRoom(creep.room, [STRUCTURE_SPAWN, STRUCTURE_EXTENSION]).filter(function(structure){
          return structure.energy < structure.energyCapacity;
        });
      },
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
          return tower.energy < tower.energyCapacity/10;
        });
      },
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
          return tower.energy < tower.energyCapacity;
        });
      },
      function() {
        if (creep.memory.rebalancing) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_STORAGE).filter(function(structure){
            return _.sum(structure.store) < structure.storeCapacity;
          });
        } else {
          return [];
        }
      },
    ];
    var targets = [];
    var i = 0;
    while(!targets.length && i<structureSelectors.length) {
      targets = structureSelectors[i++]();
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
        creep.memory.rebalancing = true;
      }
    } else {
      if (creep.memory.sleep > 0) {
        creep.memory.sleep--;
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
      } else {
        helpers.getEnergy(creep, creep.memory.rebalancing);
        if (
          creep.carry[RESOURCE_ENERGY] == creep.carryCapacity &&
          creep.memory.rebalancing
        ) {
          // Just picked up from the most-full container
          if (creep.pos.getRangeTo(creep.room.storage) == 1) {
            console.log(creep.name, "fully balanced; taking a nap");
            creep.memory.rebalancing = false;
            creep.memory.sleep = 10;
          }
        }
      }
    }
  },
};

module.exports = roleHauler;
