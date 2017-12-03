module.exports = {
  run: function(tower) {
    if(tower.energy == 0) return;

    // Priorities
    // - attack hostiles
    // - repair "nearly dead" fortifications
    // - heal creeps
    // - repair nearest structure (including medium fortification)
    // - fortify weakest fortification (up to high level of fortification)

    const room = tower.room;

    // Attack hostile creeps
    var hostiles = [];
    var hostileSelectors = [
      function (hostile) {
        return hostile.body.some(function(part){
          return part.type == HEAL;
        });
      },
      function () {return true;},
    ];
    var i=0;
    while(!hostiles.length && i<hostileSelectors.length) {
      hostiles = tower.room.find(FIND_HOSTILE_CREEPS, {filter: hostileSelectors[i++]});
    }
    if (hostiles.length > 0) {
      var hostile = tower.pos.findClosestByRange(hostiles);
      tower.attack(hostile);
      console.log(tower, "attacking", hostile);
      return;
    }

    // Repair structures about to be destroyed
    let closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (structure) => {
        const flags = structure.pos.lookFor(LOOK_FLAGS);
        if (flags.some(function(flag){
          return (
            flag.color == COLOR_RED &&
            flag.secondaryColor == COLOR_BROWN
          );
        })) {
          // Ignore structures being dismantled
          return false;
        }

        if (structure.structureType == STRUCTURE_RAMPART ||
            structure.structureType == STRUCTURE_WALL) {
          return structure.hits < Math.min(room.memory.fortifyLevel, structure.hitsMax) / 10;
        } else {
          return structure.hits < structure.hitsMax / 10;
        }
      }
    });
    if (closestDamagedStructure) {
      tower.repair(closestDamagedStructure);
      return;
    }

    // Heal damaged creeps
    var closestDamagedCreep = tower.pos.findClosestByRange(FIND_CREEPS, {filter:function(creep){return creep.hits < creep.hitsMax;}});
    if (closestDamagedCreep) {
      tower.heal(closestDamagedCreep);
      return;
    }

    // Reserve some energy for the above actions
    if (tower.energy < 0.25 * tower.energyCapacity) return;

    // Repair/Fortify all structures
    closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (structure) => {
        const flags = structure.pos.lookFor(LOOK_FLAGS);
        if (flags.some(function(flag){
          return (
            flag.color == COLOR_RED &&
            flag.secondaryColor == COLOR_BROWN
          );
        })) {
          // Ignore structures being dismantled
          return false;
        }

        if (structure.structureType == STRUCTURE_RAMPART ||
            structure.structureType == STRUCTURE_WALL) {
          return structure.hits < Math.min(room.memory.fortifyLevel, structure.hitsMax);
        } else {
          return structure.hits < room.memory.repairLevel*structure.hitsMax;
        }
      }
    });
    if(closestDamagedStructure) {
      tower.repair(closestDamagedStructure);
      return;
    }
  }
}
