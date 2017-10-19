var _ = require('lodash');
var helpers = require('helpers');

var roleMineralHauler = {
  selectPickup: function(creep) {
    var structureSelectors = [
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_CONTAINER).filter(function(structure){
          return _.sum(structure.store)-structure.store[RESOURCE_ENERGY] > 0;
        });
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
  isValidPickup: function(target) {
    const validTargets = [
      STRUCTURE_CONTAINER,
      STRUCTURE_STORAGE,
    ];

    if (!validTargets.includes(target.structureType)) return false;
    if (target.storeCapacity) return _.sum(target.store)-target.store[RESOURCE_ENERGY] > 0;
  },
  workPickup: function(creep, target) {
    for (let resource of Object.keys(target.store)) {
      if (resource == RESOURCE_ENERGY) continue;
      if (creep.withdraw(target, resource) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {
          visualizePathStyle: {
            stroke: '#ffffff'
          }
        });
        break;
      }
    }
  },
  getMinerals: function(creep) {
    var target = Game.getObjectById(creep.memory.target);
    if (!target || !this.isValidPickup(target)) {
      target = this.selectPickup(creep);
    }
    if(target && this.isValidPickup(target)) {
      creep.memory.target = target.id;
      this.workPickup(creep, target);
    } else {
      console.log(creep.name, "unable to find any resources to haul");
      creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
    }
  },
  selectTarget: function(creep) {
    var structureSelectors = [
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_STORAGE).filter(function(structure){
          return _.sum(structure.store) < structure.storeCapacity;
        });
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
    ];

    if (!validTargets.includes(target.structureType)) return false;
    if (target.storeCapacity) return _.sum(target.store) < target.storeCapacity;
  },

  workTarget: function(creep, target) {
    for (let resource of Object.keys(creep.carry)) {
      if (creep.transfer(target, resource) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {
          visualizePathStyle: {
            stroke: '#ffffff'
          }
        });
        break;
      }
    }
  },

  /** @param {Creep} creep **/
  run: function(creep) {
    if (!creep.memory.working && _.sum(creep.carry) == creep.carryCapacity) {
      // Full of energy
      creep.memory.working = true;
      creep.memory.target = null;
    }

    if (creep.memory.working && _.sum(creep.carry) == 0) {
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
        console.log(creep.name, "lots of resources and nowhere to put them");
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
      }
    } else {
      this.getMinerals(creep);
    }
  },
};

module.exports = roleMineralHauler;
