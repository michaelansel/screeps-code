function allCreeps() {
  return Object.keys(Game.creeps).map(function(creepName){return Game.creeps[creepName];});
}
function creepsWithRole(role) {
  return allCreeps().filter(function(creep){return creep.memory.role == role;});
}

function creepCost(body) {
  return body.reduce(function(total, part){
    return total + BODYPART_COST[part];
  }, 0);
}

module.exports.run = function(room) {
  // BODYPART_COST: {
  //   "move": 50,
  //   "work": 100,
  //   "attack": 80,
  //   "carry": 50,
  //   "heal": 250,
  //   "ranged_attack": 150,
  //   "tough": 10,
  //   "claim": 600
  // },
  var creepConfig = {
    // Cheap and versatile
    recovery: [WORK, CARRY, MOVE], // Max cost of 300, smaller is better
    // Move fast when empty; don't care when full; maximize work speed
    harvester: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
    // Move fast when full; never work
    hauler: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE], // Max cost of 300, smaller is better
    // Move fast when full; maximize work speed
    upgrader: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
    // Move fast when full and off roads; maximize work speed
    builder: [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
    // Move fast when empty; maximize carry
    linker: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
  };

  // Scale up builders if there is construction to do or damage to repair
  if(room.find(FIND_CONSTRUCTION_SITES).length > 0) {
    Memory.desiredCreepCounts['builder'] = Math.max(Memory.desiredCreepCounts['builder'], 3);
  }
  var targets = room.find(FIND_STRUCTURES, {
    filter: (structure) => {
      if (structure.structureType == STRUCTURE_RAMPART ||
          structure.structureType == STRUCTURE_WALL) {
        return structure.hits < Math.min(Memory.fortifyLevel, structure.hitsMax);
      } else {
        return structure.hits < Memory.repairLevel*structure.hitsMax;
      }
    }
  });
  if(targets.length > 0) {
    Memory.desiredCreepCounts['builder'] = Math.max(Memory.desiredCreepCounts['builder'], Math.min(3,targets.length));
  }

  // Convert harvester to upgrader if controller is at risk of downgrading
  if (room.controller.ticksToDowngrade < 4000) {
    if(creepsWithRole('upgrader').length == 0) {
      var harvesters = creepsWithRole('harvester');
      if(harvesters.length > 0) {
        harvesters[0].memory.role = 'upgrader';
      } else {
        Game.notify("No harvestors available to convert into upgraders", 30);
      }
    }
  }


  if (creepsWithRole('hauler').length < 1) {
    Game.spawns['Spawn1'].createCreep(creepConfig['hauler'], undefined, {
      role: 'hauler'
    });
  } else if (creepsWithRole('harvester').length < 2) {
    console.log('Ensuring at least 2 harvesters before anything else');
    if (creepCost(creepConfig['harvester']) <= room.energyCapacityAvailable) {
      Game.spawns['Spawn1'].createCreep(creepConfig['harvester'], undefined, {
        role: 'harvester'
      });
    } else {
      console.log('Normal harvester too expensive; spawning recovery harvester instead');
      Game.spawns['Spawn1'].createCreep(creepConfig['recovery'], undefined, {
        role: 'harvester'
      });
    }
  } else {
    Object.keys(Memory.desiredCreepCounts).forEach(function(role) {
      var roleCreeps = _.filter(Game.creeps, (creep) => creep.memory.role == role);
      if (roleCreeps.length < Memory.desiredCreepCounts[role]) {
        Game.spawns['Spawn1'].createCreep(creepConfig[role], undefined, {
          role: role
        });
      }
    });
  }

  if (Game.spawns['Spawn1'].spawning) {
    var spawningCreep = Game.creeps[Game.spawns['Spawn1'].spawning.name];
    Game.spawns['Spawn1'].room.visual.text(
      '🛠️' + spawningCreep.memory.role,
      Game.spawns['Spawn1'].pos.x + 1,
      Game.spawns['Spawn1'].pos.y, {
        align: 'left',
        opacity: 0.8
      });
  } else {
    if (creepsWithRole('harvester').length == 0) {
      console.log('All harvester creeps died! Spawing a recovery creep');
      Game.notify('All harvester creeps died! Spawing a recovery creep', 10);
      Game.spawns['Spawn1'].createCreep(creepConfig['recovery'], undefined, {
        role: 'harvester'
      });
    }
    var extensions = room.find(FIND_STRUCTURES, {filter:function(structure){return structure.structureType == STRUCTURE_EXTENSION;}});
    if (creepsWithRole('builder').length == 0 && creepCost(creepConfig['builder']) > room.energyCapacityAvailable) {
      console.log('Bootstrapping building with a recovery builder');
      Game.notify('Bootstrapping building with a recovery builder', 10);
      Game.spawns['Spawn1'].createCreep(creepConfig['recovery'], undefined, {
        role: 'builder'
      });
    }
  }
}
