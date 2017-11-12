var _ = require('lodash');
var helpers = require('helpers');

var roleLongHauler = {
  /** @param {Creep} creep **/
  run: function(creep) {
    if (!creep.memory.haulSourceRoom) creep.memory.haulSourceRoom = creep.room.name;
    if (!creep.memory.haulTargetRoom) {
      const room = creep.room;
      const terminals = Object.keys(Game.rooms).filter(r => Game.rooms[r].terminal && Game.rooms[r].terminal.my);
      const market = terminals.sort(function(a,b){
        return Game.map.findRoute(room, Game.rooms[a]).length - Game.map.findRoute(room, Game.rooms[b]).length;
      })[0];
      creep.memory.haulTargetRoom = market;
    }
    if (!creep.memory.transitTime) creep.memory.transitTime = 0;


    // About to move into work mode
    if (
      !creep.memory.working &&
      _.sum(creep.carry) == creep.carryCapacity
    ) {
      // Just filled up on resources
      creep.memory.room = creep.memory.haulTargetRoom;
      creep.memory.pickupTime = Game.time;

      if (creep.memory.transitTime > 0) {
        if (creep.ticksToLive < 1.1*creep.memory.transitTime) {
          // We won't make it in time; recycle instead
          creep.memory.role = 'recycle;'
          for (let k in creep.carry) {
            creep.transfer(creep.room.storage, k);
          }
        }
      }

      creep.memory.working = true;
    }

    // About to move out of work mode
    if (
      creep.memory.working &&
      _.sum(creep.carry) == 0
    ) {
      creep.memory.dropoffTime = Game.time;
      let transitTime = creep.memory.dropoffTime - creep.memory.pickupTime;
      if (transitTime > 10) {
        creep.memory.transitTime = transitTime;
      }

      creep.memory.room = creep.memory.haulSourceRoom;
      creep.memory.working = false;
    }


    if (creep.memory.working) {
      let storage = Game.rooms[creep.memory.haulTargetRoom].storage;
      for (let k in creep.carry) {
        if (creep.transfer(storage, k) == ERR_NOT_IN_RANGE) {
          creep.moveTo(storage, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
          break;
        }
      }
    } else {
      let storage = Game.rooms[creep.memory.haulSourceRoom].storage;

      // Suicide if storage isn't holding many resources
      if (_.sum(storage.store) < 10000) {
        creep.memory.role = 'recycle';
        return;
      }

      let maxKey = _.max(Object.keys(storage.store).filter(o => o != RESOURCE_ENERGY), function (o) { return storage.store[o]; });
      if (creep.withdraw(storage, maxKey) == ERR_NOT_IN_RANGE) {
        creep.moveTo(storage, {
          visualizePathStyle: {
            stroke: '#ffffff'
          }
        });
      }
    }
  },
};

module.exports = roleLongHauler;
