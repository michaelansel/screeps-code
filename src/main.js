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

var ConsoleHelpers = {
  buildMode: function(roomname) {
    const room = Game.rooms[roomname];
    room.memory.desiredCreepCounts.builder = Math.max(room.memory.desiredCreepCounts.builder, room.memory.desiredCreepCounts.upgrader);
    room.memory.desiredCreepCounts.upgrader = 0;
    for (var name in Game.creeps) {
      if (Game.creeps[name].memory.role == 'upgrader') {
        Game.creeps[name].memory.role = 'builder';
      }
    }
  },
  largeNumberToString: function(num) {
    var exp = 0;
    while(num > 1000) {
      num /= 1000;
      exp += 3;
    }
    const suffixes = {0: "", 3: "K", 6: "M", 9: "G"};
    return Math.round(10*num)/10+suffixes[exp];
  },
  stats: function() {
    console.log("Game: ", "GCL"+Game.gcl.level, ConsoleHelpers.largeNumberToString(Game.gcl.progress)+"/"+ConsoleHelpers.largeNumberToString(Game.gcl.progressTotal));
    for (var rn in Game.rooms) {
      const room = Game.rooms[rn];
      if (room.controller.my) {
        console.log("Room: ", room.name);

        console.log("Controller: ", "RCL"+room.controller.level, ConsoleHelpers.largeNumberToString(room.controller.progress)+"/"+ConsoleHelpers.largeNumberToString(room.controller.progressTotal));
        console.log("Energy: ", room.energyAvailable+"/"+room.energyCapacityAvailable);

        const sources = room.find(FIND_SOURCES);
        var sourceStats = [];
        for (var source of sources) {
          var stat = [source.energy,source.ticksToRegeneration].join("/");
          if (source.ticksToRegeneration/ENERGY_REGEN_TIME < source.energy/SOURCE_ENERGY_CAPACITY) {
            stat += "!";
          }
          sourceStats.push(stat);
        }
        console.log("Sources: ", sourceStats.join(", "));

        const containers = room.find(FIND_STRUCTURES, {filter: function(s){return s.structureType == STRUCTURE_CONTAINER;}});
        var containerStats = [];
        for (var container of containers) {
          var stat = container.store[RESOURCE_ENERGY];
          if (container.store[RESOURCE_ENERGY] == container.storeCapacity) {
            stat += "!";
          }
          containerStats.push(stat);
        }
        console.log("Containers: ", containerStats.join(", "));

        if (room.storage) {
          console.log("Storage: ", ConsoleHelpers.largeNumberToString(room.storage.store[RESOURCE_ENERGY]));
        }

        const towers = room.find(FIND_STRUCTURES, {filter: function(s){return s.structureType == STRUCTURE_TOWER;}});
        var towerStats = [];
        for (var tower of towers) {
          towerStats.push(tower.energy);
        }
        console.log("Towers: ", towerStats.join(", "));

        console.log("Build Config: ", (100*room.memory.repairLevel)+"%", ConsoleHelpers.largeNumberToString(room.memory.fortifyLevel));
        console.log("Desired: ", JSON.stringify(room.memory.desiredCreepCounts));
      }
    }
    console.log(JSON.stringify(Memory.creepCounts));
  },
};

var Main = {
  _maintenance: function() {
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

    // Report harvesting inefficiency
    if (Memory.inefficientSources) {
      for (const si in Memory.inefficientSources) {
        const source = Game.getObjectById(si);
        if (source.ticksToRegeneration == 1) {
          delete Memory.inefficientSources[si];
          if(source.energy > 0) {
            var message = [Game.time, source.id, "leaving some energy uncollected", source.energy].join(" ");
            console.log(message);
            Game.notify(message, 60);
          }
        }
      }
    }

    // Initialize defaults
    if(!Memory.inefficientSources) Memory.inefficientSources = {};
  },

  _periodic_maintenance: function() {
    ConsoleHelpers.stats();

    for (var name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
        console.log('Clearing non-existing creep memory:', name);
      }
    }

    for (var name in Game.rooms) {
      room = Game.rooms[name];
      const sources = room.find(FIND_SOURCES);
      if (!room.memory.scanned) {

        // Count spaces per source
        room.memory.sources = {};
        for (const source of sources) {
          var sourceMemory = room.memory.sources[source.id] = {};
          var spaces = 8;
          for (const dx of [-1,0,1]) {
            for (const dy of [-1,0,1]) {
              const objs = room.lookAt(source.pos.x+dx, source.pos.y+dy);
              if (objs.length == 1 && objs[0].type == 'terrain' && objs[0].terrain == 'wall') {
                spaces--;
              }
            }
          }
          sourceMemory.spaces = spaces;
        }

        room.memory.scanned = true;
      }

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
    }

    // Tidy up leftover memory values (delete anything not protected)
    const protected = [
      "creepCounts",
      "creeps",
      "inefficientSources",
      "rooms",
    ];
    for (var k in Memory) {
      if (protected.includes(k)) continue;
      delete Memory[k];
    }
  },

  loop: function() {
    this._maintenance();

    for (var rn in Game.rooms) {
      var room = Game.rooms[rn];
      if(room.controller.my) {
        var spawns = room.find(FIND_STRUCTURES, {filter:function(structure){return structure.structureType == STRUCTURE_SPAWN;}});
        // Only run spawn logic if we aren't already occupied spawning things
        if(!spawns.every(function(spawn){return spawn.spawning;})) {
          spawnLogic.run(room);
        }
        for(var spawn of spawns) {
          spawnLogic.runAlways(spawn);
        }
      }

      if(room.controller.my && room.controller.level > 2) {
        var towers = room.find(FIND_STRUCTURES, {filter:function(structure){return structure.structureType == STRUCTURE_TOWER;}});
        for (var ti in towers) {
          var tower = towers[ti];
          if (tower.isActive()) towerLogic.run(tower);
        }
      }
    }

    for (var name in Game.creeps) {
      var creep = Game.creeps[name];
      if (creep.spawning) return; // no logic when spawning

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
  },
};

Object.assign(Main, ConsoleHelpers);
module.exports = Main;
