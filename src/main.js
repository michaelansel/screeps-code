var roleHarvester = require('role.harvester');
var roleHauler = require('role.hauler');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleLinker = require('role.linker');

var behaviors = {
  builder: roleBuilder,
  harvester: roleHarvester,
  hauler: roleHauler,
  linker: roleLinker,
  upgrader: roleUpgrader,
};

module.exports.loop = function() {
  for (var name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
      console.log('Clearing non-existing creep memory:', name);
    }
  }

  Memory.creepCounts = Object.keys(Game.creeps).map(function(creepName){
    return Game.creeps[creepName];
  }).reduce(function(counts,creep){
    if(!counts[creep.memory.role]){
      counts[creep.memory.role]=0
    };
    counts[creep.memory.role]+=1;
    return counts;
  },{});
  if (!Memory.desiredCreepCounts) {
    Memory.desiredCreepCounts = {
      harvester: 3,
      hauler: 1,
      upgrader: 1,
      builder: 3,
      linker: 2,
    };
  }

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
  if(Game.rooms["W28N29"].find(FIND_CONSTRUCTION_SITES).length > 0) {
    Memory.desiredCreepCounts['builder'] = Math.max(Memory.desiredCreepCounts['builder'], 3);
  }
  var targets = Game.rooms["W28N29"].find(FIND_STRUCTURES, {
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

  function allCreeps() {
    return Object.keys(Game.creeps).map(function(creepName){return Game.creeps[creepName];});
  }
  function creepsWithRole(role) {
    return allCreeps().filter(function(creep){return creep.memory.role == role;});
  }

  // Convert harvester to upgrader if controller is at risk of downgrading
  if (Game.rooms["W28N29"].controller.ticksToDowngrade < 4000) {
    if(creepsWithRole('upgrader').length == 0) {
      var harvesters = creepsWithRole('harvester');
      if(harvesters.length > 0) {
        harvesters[0].memory.role = 'upgrader';
      } else {
        Game.notify("No harvestors available to convert into upgraders", 30);
      }
    }
  }

  if(!Memory.fortifyLevel) Memory.fortifyLevel = 20000;
  if(!Memory.repairLevel) Memory.repairLevel = 0.75;


  if (creepsWithRole('harvester').length < 2) {
    console.log('Ensuring at least 2 harvesters before anything else');
    Game.spawns['Spawn1'].createCreep(creepConfig['harvester'], undefined, {
      role: 'harvester'
    });
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
    if (creepsWithRole('builder').length == 0 && extensions.length == 0) {
      console.log('Bootstrapping building with a recovery builder');
      Game.notify('Bootstrapping building with a recovery builder', 10);
      Game.spawns['Spawn1'].createCreep(creepConfig['recovery'], undefined, {
        role: 'builder'
      });
    }
  }

  var tower = Game.getObjectById('598eacc5cc9f9c73282f8c76');
  if(tower) {
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
      Memory.underAttack = true;
      Game.notify("Hostiles detected at tick " + Game.time, 10);
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

  for (var name in Game.creeps) {
    var creep = Game.creeps[name];

    var droppedEnergy = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
      filter: function (resource) {
        return resource.resourceType == RESOURCE_ENERGY;
      }});
    if (droppedEnergy.length > 0) {
      for (var ei in droppedEnergy) {
        creep.pickup(droppedEnergy[ei]);
      }
    }

    if (Object.keys(behaviors).includes(creep.memory.role)) {
      behaviors[creep.memory.role].run(creep);
    } else {
      console.log(creep.name, "unknown role", creep.memory.role);
    }
  }
}
