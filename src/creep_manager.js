var _ = require('lodash');
var roleBuilder = require('role.builder');
var roleClaimer = require('role.claimer');
var roleHarvester = require('role.harvester');
var roleHauler = require('role.hauler');
var roleUpgrader = require('role.upgrader');
var roleLinker = require('role.linker');
var roleRecycle = require('role.recycle');

var CreepManager = {
  creepBehaviors: {
    builder: roleBuilder,
    claimer: roleClaimer,
    harvester: roleHarvester,
    hauler: roleHauler,
    linker: roleLinker,
    recycle: roleRecycle,
    upgrader: roleUpgrader,
  },

  run: function(creep) {
    if (_.sum(creep.carry) < creep.carryCapacity) {
      var droppedEnergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
        filter: function (resource) {
          return resource.resourceType == RESOURCE_ENERGY;
        }});
      if (droppedEnergy.length > 0) {
        const closestEnergy = creep.pos.findClosestByPath(droppedEnergy);
        if(creep.pickup(closestEnergy) != OK) {
          creep.moveTo(closestEnergy);
        }
      }
    }

    if (creep.memory.room) {
      creep.moveTo(new RoomPosition(25, 25, creep.memory.room));
      if (creep.room.name != creep.memory.room) return;
    }
    delete creep.memory.room;

    if (Object.keys(CreepManager.creepBehaviors).includes(creep.memory.role)) {
      CreepManager.creepBehaviors[creep.memory.role].run(creep);
    } else {
      console.log(creep.name, "unknown role", creep.memory.role);
    }
  },
}

module.exports = CreepManager;
