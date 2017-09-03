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

var BODYPART_ORDER = [
  TOUGH,
  WORK,
  RANGED_ATTACK,
  ATTACK,
  MOVE,
  HEAL,
  CLAIM,
  CARRY,
];

function scaleCreep(body, maxCost) {
  var copies = Math.floor(maxCost / creepCost(body));
  return Array(copies).fill(body).reduce(
    function(a, b) { return a.concat(b); },
    []
  );
}

function sortCreep(body) {
  return body.sort(function(a,b){
    return BODYPART_ORDER.indexOf(a) - BODYPART_ORDER.indexOf(b);
  });
}

var roleCounts = {};

function doSpawn(body, memory) {
  console.log('Attempting to spawn', memory.role, body, creepCost(body));
  if (roleCounts[memory.role] == undefined) roleCounts[memory.role] = 0;
  Game.spawns['Spawn1'].createCreep(body, (memory.role + roleCounts[memory.role]++), memory);
}

var MAX_CREEP_COST = 3000;

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
    recovery: function(available, capacity) {
      // Cheap and versatile
      // Max cost of 300, smaller is better
      return [WORK, CARRY, MOVE];
    },
    harvester: function(available, capacity) {
      // Move fast when empty; don't care when full; maximize work speed
      // Max of 8x WORK per harvester (enough to single handedly drain a source)
      var maxCost = Math.min(4*creepCost([WORK, WORK, MOVE]), capacity - BODYPART_COST[CARRY], MAX_CREEP_COST);
      return sortCreep(scaleCreep([WORK, WORK, MOVE], maxCost).concat([CARRY]));
    },
    hauler: function(available, capacity) {
      // Move fast when full; never work
      // Max carry of 500 (10x CARRY parts)
      var maxCost = Math.min(5*creepCost([CARRY, CARRY, MOVE]), capacity, MAX_CREEP_COST);
      return sortCreep(scaleCreep([CARRY, CARRY, MOVE], maxCost));
    },
    upgrader: function(available, capacity) {
      // Move fast when full on roads; maximize work speed
      var minimalCarryParts = [CARRY, MOVE];
      var maxCost = Math.min(capacity, MAX_CREEP_COST);
      var workParts = scaleCreep([WORK, WORK, MOVE], maxCost - creepCost(minimalCarryParts));
      var carryParts = scaleCreep([CARRY, CARRY, MOVE], maxCost - creepCost(workParts));
      if(carryParts.length == 0) carryParts = minimalCarryParts;
      return sortCreep(workParts.concat(carryParts));
    },
    builder: function(available, capacity) {
      // Move fast when full off roads; maximize work speed
      // TODO think about this some more; ending up with not enough carry (can expend all energy in single tick)
      // Looks like build is 2 energy per WORK per tick
      var minimalCarryParts = [CARRY, MOVE];
      var maxCost = Math.min(capacity, MAX_CREEP_COST);
      var workParts = scaleCreep([WORK, MOVE], maxCost - creepCost(minimalCarryParts));
      var carryParts = scaleCreep([CARRY, MOVE], maxCost - creepCost(workParts));
      if(carryParts.length == 0) carryParts = minimalCarryParts;
      return sortCreep(workParts.concat(carryParts));
    },
    linker: function(available, capacity) {
      // Move fast when empty; maximize carry
      // Max carry 400 energy (8x CARRY), derived from size of link (800 energy)
      var maxCost = Math.min(4*creepCost([CARRY, CARRY, MOVE]), capacity, MAX_CREEP_COST);
      return sortCreep(scaleCreep([CARRY, CARRY, MOVE], maxCost));
    },
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

  var available = room.energyAvailable,
      capacity = room.energyCapacityAvailable;

  var harvesterWorkParts = creepsWithRole('harvester').reduce(function(total, creep){
    return total + creep.body.reduce(function(sum, bp){
      if (bp.type == WORK) {
        return sum + 1;
      } else {
        return sum;
      }
    }, 0)
  }, 0);

  if (creepsWithRole('hauler').length < 1) {
    console.log('Ensuring at least one hauler at all times');
    doSpawn(
      creepConfig['hauler'](available, available),
      {role: 'hauler'}
    );
  } else if (harvesterWorkParts < 2) {
    console.log('Ensuring at least 2 harvesters before anything else');
    doSpawn(
      creepConfig['harvester'](available, available),
      {role: 'harvester'}
    );
  } else {
    // Harvest 2 energy per WORK per tick
    // Source has 3000 energy every 300 ticks
    // Max 5 WORK per source (plus 20% buffer to ensure 100% harvest)
    if (harvesterWorkParts / 8 < room.find(FIND_SOURCES).length) {
      doSpawn(
        creepConfig['harvester'](available, capacity),
        {role: 'harvester'}
      )
    }
    // Upgrade/Build 2 energy per WORK per tick
    // Energy production == 2x harvesterWorkParts
    // Max harvesterWorkParts for both upgrader and builder
    // If too many consumption WORK parts, re-role to higher priority
    for (var role in Memory.desiredCreepCounts) {
      if (role == 'harvester') continue; // handled separately
      var roleCreeps = _.filter(Game.creeps, (creep) => creep.memory.role == role);
      if (roleCreeps.length < Memory.desiredCreepCounts[role]) {
        doSpawn(
          creepConfig[role](available, capacity),
          {role: role}
        );
      }
    }
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
    var bodyParts = spawningCreep.body.map(function(bp){return bp.type;});
    console.log('Spawning', spawningCreep.memory.role, spawningCreep.name,
                bodyParts, creepCost(bodyParts));
  } else {
    if (harvesterWorkParts == 0) {
      console.log('All harvester creeps died! Spawing a recovery creep');
      Game.notify('All harvester creeps died! Spawing a recovery creep', 10);
      Game.spawns['Spawn1'].createCreep(creepConfig['harvester'](available, available), undefined, {
        role: 'harvester'
      });
    }
    var extensions = room.find(FIND_STRUCTURES, {filter:function(structure){return structure.structureType == STRUCTURE_EXTENSION;}});
    if (creepsWithRole('builder').length == 0 && creepCost(creepConfig['builder'](available, capacity)) > room.energyCapacityAvailable) {
      console.log('Bootstrapping building with a recovery builder');
      Game.notify('Bootstrapping building with a recovery builder', 10);
      Game.spawns['Spawn1'].createCreep(creepConfig['builder'](available, available), undefined, {
        role: 'builder'
      });
    }
  }
}
