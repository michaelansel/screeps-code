module.exports = {
  run: function(tower) {
    if(tower.energy == 0) return;

    const room = tower.room;
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
      if (!room.memory.underAttack) Game.notify("Hostiles detected at tick " + Game.time, 10);
      room.memory.underAttack = true;
      var hostile = tower.pos.findClosestByRange(hostiles);
      tower.attack(hostile);
      console.log(tower, "attacking", hostile);
    } else {
      room.memory.underAttack = false;

      var closestDamagedCreep = tower.pos.findClosestByRange(FIND_CREEPS, {filter:function(creep){return creep.hits < creep.hitsMax;}});
      if (closestDamagedCreep) {
        tower.heal(creep);
        return;
      }

      var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
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
}
