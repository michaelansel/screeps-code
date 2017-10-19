var helpers = require('helpers');

var roleClaimer = {

  /** @param {Creep} creep **/
  run: function(creep) {
    if (!creep.memory.assignedRoom) {
      const assignedRooms = helpers.creepsWithRole('claimer').map(function(c){return c.memory.assignedRoom;});
      for(var rn of creep.room.memory.roomsToClaim) {
        if (!assignedRooms.includes(rn)) {
          creep.memory.assignedRoom = rn;
          break;
        }
      }
    }

    if (creep.room.name != creep.memory.assignedRoom) {
      if (creep.memory.targetController) {
        creep.moveTo(Game.getObjectById(creep.memory.targetController));
      } else {
        if (!creep.memory.room) creep.memory.room = creep.memory.assignedRoom;
      }
      return;
    }
    creep.memory.targetController = creep.room.controller.id;

    if (creep.room.controller.my) {
      creep.suicide();
    } else {
      if (creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {
          maxRooms: 1,
          visualizePathStyle: {
            stroke: '#ffffff'
          },
        });
      }
    }
  }
};

module.exports = roleClaimer;
