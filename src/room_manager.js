const RoomManager = {
  runPeriodic: function(room) {
    if (!room.controller || !room.controller.my) continue;

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

    // Periodically scan for non-empty sources nearing regeneration
    for (const source of sources) {
      if (source.ticksToRegeneration <= 10 && source.energy > 0) {
        Memory.inefficientSources[source.id] = true;
      }
    }

    // Update desired number of linkers
    const links = room.find(FIND_STRUCTURES, {filter: function(structure){return structure.structureType == STRUCTURE_LINK;}});
    room.memory.desiredCreepCounts.linker = links.length;

    if(!room.memory.roomsToClaim) room.memory.roomsToClaim = [];
    room.memory.roomsToClaim = room.memory.roomsToClaim.filter(function(rn){return !(Game.rooms[rn] && Game.rooms[rn].controller.my);});
    room.memory.desiredCreepCounts.claimer = room.memory.roomsToClaim.length;

    spawnLogic.bootstrap(room);
  },
};

module.exports = RoomManager;
