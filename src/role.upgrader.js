var helpers = require('helpers');

var roleUpgrader = {

  /** @param {Creep} creep **/
  run: function(creep) {
    if (creep.room.memory.underAttack) {
      // Stop upgrading when hostiles present so all energy can go to towers
      creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
      return;
    }

    if (creep.memory.working && creep.carry.energy == 0) {
      creep.memory.working = false;
      creep.memory.target = null;
      creep.say('🔄 harvest');
    }
    if (!creep.memory.working && creep.carry.energy == creep.carryCapacity) {
      creep.memory.working = true;
      creep.memory.target = null;
      creep.say('⚡ upgrade');
    }

    if (creep.memory.working) {
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
