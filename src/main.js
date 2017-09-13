var roleHarvester = require('role.harvester');
var roleHauler = require('role.hauler');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleLinker = require('role.linker');
var towerLogic = require('tower');
var spawnLogic = require('spawn');

var behaviors = {
  builder: roleBuilder,
  harvester: roleHarvester,
  hauler: roleHauler,
  linker: roleLinker,
  upgrader: roleUpgrader,
};

module.exports.buildMode = function() {
  Memory.desiredCreepCounts.builder = Math.max(Memory.desiredCreepCounts.builder, Memory.desiredCreepCounts.upgrader);
  Memory.desiredCreepCounts.upgrader = 0;
  for (var name in Game.creeps) {
    if (Game.creeps[name].memory.role == 'upgrader') {
      Game.creeps[name].memory.role = 'builder';
    }
  }
}

module.exports._periodic_maintenance = function() {
  for (var name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
      console.log('Clearing non-existing creep memory:', name);
    }
  }

  for (var name in Game.rooms) {
    room = Game.rooms[name];
    if (!room.memory.scanned) {
      room.memory.sources = {};
      const sources = room.find(FIND_SOURCES);
      for (const source of sources) {
        var sourceMemory = room.memory.sources[source.id] = {};
        var spaces = 0;
        for (const dx of [-1,0,1]) {
          for (const dy of [-1,0,1]) {
            const objs = room.lookAt(source.pos.x+dx, source.pos.y+dy);
            if (!(objs.length == 1 && objs[0].type == 'terrain' && objs[0].terrain == 'wall')) {
              spaces++;
            }
          }
        }
        sourceMemory.spaces = spaces;
      }
      room.memory.scanned = true;
    }
  }
}

module.exports._maintenance = function() {
  if (Game.time % 10 == 0) {
    this._periodic_maintenance();
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

  // Initialize defaults
  if (!Memory.desiredCreepCounts) {
    Memory.desiredCreepCounts = {
      harvester: 3,
      hauler: 1,
      upgrader: 0,
      builder: 0,
      linker: 0,
    };
  }
  if(!Memory.fortifyLevel) Memory.fortifyLevel = 150000;
  if(!Memory.repairLevel) Memory.repairLevel = 0.75;
}

module.exports.loop = function() {
  var room = Game.spawns[Object.keys(Game.spawns)[0]].room;

  this._maintenance();
  spawnLogic.run(room);

  // Report harvesting inefficiency
  room.find(FIND_SOURCES, {
    filter: function(source) {
      return source.ticksToRegeneration == 1 && source.energy > 0;
    },
  }).forEach(function(source){
    var message = [Game.time, source.id, "leaving some energy uncollected", source.energy].join(" ");
    console.log(message);
    Game.notify(message, 60);
  })

  var towers = room.find(FIND_STRUCTURES, {filter:function(structure){return structure.structureType == STRUCTURE_TOWER;}});
  for (var ti in towers) {
    var tower = towers[ti];
    towerLogic.run(tower);
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
