var helpers = require('helpers');
var towerLogic = require('tower');
var spawnLogic = require('spawn');
var creepManager = require('creep_manager');

const RoomManager = {
  run: function (room) {
    room.state = {};
    // Independent state
    room.state.underAttack = (room.find(FIND_HOSTILE_CREEPS).length > 0);
    room.state.atRiskOfDowngrading = (room.controller.ticksToDowngrade < 3000);
    room.state.workerEnergyAvailable = (
      helpers.structuresInRoom(room, [STRUCTURE_CONTAINER, STRUCTURE_STORAGE]).reduce(function(total, structure){
        return total + structure.store[RESOURCE_ENERGY];
      }, 0) +
      room.find(FIND_DROPPED_RESOURCES, {
        filter: (resource) => {
          return resource.resourceType == RESOURCE_ENERGY;
        },
      }).reduce(function(total, resource){
        return total + resource.amount;
      }, 0)
    );

    // Dependent state
    room.state.workerEnergyReserved = 0; // initialize; updated by refreshEnergyReservations
    room.state.workersWithEnergyReserved = []; // initialize; updated by refreshEnergyReservations
    helpers.refreshEnergyReservations(room);

    // Notify on underAttack rising edge
    if (room.state.underAttack && !room.memory.underAttack) Game.notify("Hostiles detected at tick " + Game.time, 10);
    room.memory.underAttack = room.state.underAttack;

    var spawns = helpers.structuresInRoom(room, STRUCTURE_SPAWN);
    // Only run spawn logic if we aren't already occupied spawning things
    if(!spawns.every(function(spawn){return spawn.spawning;})) {
      spawnLogic.run(room);
    }
    for(var spawn of spawns) {
      spawnLogic.runAlways(spawn);
    }

    if(room.controller.level > 2) {
      var towers = helpers.structuresInRoom(room, STRUCTURE_TOWER);
      for (var ti in towers) {
        var tower = towers[ti];
        if (tower.isActive()) towerLogic.run(tower);
      }
    }

    for (const creep of helpers.allCreepsInRoom(room)) {
      creepManager.run(creep);
    }
  },

  runPeriodic: function(room) {
    if (!room.controller || !room.controller.my) return;

    if (!room.memory.desiredCreepCounts) {
      room.memory.desiredCreepCounts = {
        hauler: 1,
        upgrader: 0,
        builder: 0,
        linker: 0,
      };
    }
    if(!room.memory.fortifyLevel) room.memory.fortifyLevel = 150000;
    if(!room.memory.repairLevel) room.memory.repairLevel = 0.75;

    // Update desired number of linkers
    const links = helpers.structuresInRoom(room, STRUCTURE_LINK).filter(function(link){
      // Keep it if there is not a source nearby
      return !(link.pos.findInRange(FIND_SOURCES, 3).length > 0);
    });
    room.memory.desiredCreepCounts.linker = links.length;

    if(!room.memory.roomsToClaim) room.memory.roomsToClaim = [];
    room.memory.roomsToClaim = room.memory.roomsToClaim.filter(function(rn){return !(Game.rooms[rn] && Game.rooms[rn].controller.my);});
    room.memory.desiredCreepCounts.claimer = room.memory.roomsToClaim.length;

    // Remove reservations from dead creeps
    room.memory.energyReservations = room.memory.energyReservations.filter(function(res){
      return !!Game.creeps[res.name];
    });

    spawnLogic.bootstrap(room);
  },
};

module.exports = RoomManager;
