var helpers = require('helpers');

function allCreeps() {
  return Object.keys(Game.creeps).map(function(creepName){return Game.creeps[creepName];});
}
function creepsWithRole(role) {
  return allCreeps().filter(function(creep){return creep.memory.role == role;});
}

var roleClaimer = {

  /** @param {Creep} creep **/
  run: function(creep) {
    if (!creep.memory.initalized) {
      const assignedRooms = creepsWithRole('claimer').map(function(c){return c.memory.room;});
      for(var rn of creep.room.memory.roomsToClaim) {
        if (!assignedRooms.includes(rn)) {
          creep.memory.room = rn;
          break;
        }
      }
      creep.memory.initalized = true;
      return;
    }

    if (creep.room.controller.my) {
      creep.suicide();
    } else {
      if (creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {
          visualizePathStyle: {
            stroke: '#ffffff'
          },
        });
      }
    }
  }
};

module.exports = roleClaimer;
