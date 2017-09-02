module.exports = {
  run: function(tower) {
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
      if (!Memory.underAttack) Game.notify("Hostiles detected at tick " + Game.time, 10);
      Memory.underAttack = true;
      var hostile = tower.pos.findClosestByRange(hostiles);
      tower.attack(hostile);
      console.log(tower, "attacking", hostile);
    // var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    // if(closestHostile) {
    //   tower.attack(closestHostile);
    //   Game.notify("Hostiles detected at tick " + Game.time, 10);
    } else {
      Memory.underAttack = false;
      var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (structure) => {
          if (structure.structureType == STRUCTURE_RAMPART ||
              structure.structureType == STRUCTURE_WALL) {
            return structure.hits < Math.min(Memory.fortifyLevel, structure.hitsMax);
          } else {
            return structure.hits < Memory.repairLevel*structure.hitsMax;
          }
        }
      });
      if(closestDamagedStructure) {
          tower.repair(closestDamagedStructure);
      }
    }
  }
}
