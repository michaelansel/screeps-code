var helpers = require('helpers');

var roleUpgrader = {

  /** @param {Creep} creep **/
  run: function(creep) {

    if (creep.memory.upgrading && creep.carry.energy == 0) {
      creep.memory.upgrading = false;
      creep.memory.target = null;
      creep.say('🔄 harvest');
    }
    if (!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
      creep.memory.upgrading = true;
      creep.memory.target = null;
      creep.say('⚡ upgrade');
    }

    if (creep.memory.upgrading) {
      if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {
          visualizePathStyle: {
            stroke: '#ffffff'
          }
        });
      }
    } else {
      helpers.getEnergy(creep);
    }
  }
};

module.exports = roleUpgrader;
