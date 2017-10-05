if (!Memory.cpuCanary) Memory.cpuCanary = Game.time;
function sleepLogic() {
  if (Memory.sleepTimer > 0) {
    console.log('Sleeping');
    Memory.sleepTimer--;
    Memory.cpuCanary = Game.time + 1;
    return true;
  }
  if (Memory.cpuCanary != Game.time) {
    Memory.sleepTimer = Math.min(10, Math.max(1, 2*(Game.time-Memory.cpuCanary)));
    console.log("CPU timed out; sleeping for a bit", Memory.sleepTimer);
    console.log(Game.time, Memory.cpuCanary, Memory.sleepTimer);
    return true;
  }
  return false;
}
if(sleepLogic()) return;

var profiler = require('screeps-profiler');
var creepManager = require('creep_manager');
var helpers = require('helpers');
var roleBuilder = require('role.builder');
var roleClaimer = require('role.claimer');
var roleHarvester = require('role.harvester');
var roleHauler = require('role.hauler');
var roleUpgrader = require('role.upgrader');
var roleLinker = require('role.linker');
var roomManager = require('room_manager');
var towerLogic = require('tower');
var spawnLogic = require('spawn');

profiler.registerObject(helpers,       'helpers');
profiler.registerObject(roleBuilder,   'roleBuilder');
profiler.registerObject(roleClaimer,   'roleClaimer');
profiler.registerObject(roleHarvester, 'roleHarvester');
profiler.registerObject(roleHauler,    'roleHauler');
profiler.registerObject(roleUpgrader,  'roleUpgrader');
profiler.registerObject(roleLinker,    'roleLinker');
profiler.registerObject(roomManager,   'roomManager');
profiler.registerObject(towerLogic,    'towerLogic');
profiler.registerObject(spawnLogic,    'spawnLogic');

var ConsoleHelpers = {
  buildMode: function(roomname) {
    const room = Game.rooms[roomname];
    room.memory.desiredCreepCounts.builder = Math.max(room.memory.desiredCreepCounts.builder, room.memory.desiredCreepCounts.upgrader);
    room.memory.desiredCreepCounts.upgrader = 0;
    for (var creep of helpers.creepsInRoomWithRole(room, 'upgrader')) {
      console.log('converting', creep.name, 'to builder');
      creep.memory.role = 'builder';
    }
  },
  claim: function(targetRoom) {
    const lifesaver = Object.keys(Game.spawns).map(function(k){return Game.spawns[k];}).sort(function(a,b){
      return Game.map.findRoute(a.room.name, targetRoom).length - Game.map.findRoute(b.room.name, targetRoom).length;
    })[0];
    const sourceRoom = lifesaver.room;
    if(!sourceRoom.memory.roomsToClaim) sourceRoom.memory.roomsToClaim = [];
    sourceRoom.memory.roomsToClaim.push(targetRoom);
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
    console.log("Bucket: ", Game.cpu.bucket);
    for (var rn in Game.rooms) {
      const room = Game.rooms[rn];
      if (!room.controller) continue;
      if (room.controller.my) {
        console.log();
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

        const containers = helpers.structuresInRoom(room, STRUCTURE_CONTAINER);
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

        const towers = helpers.structuresInRoom(room, STRUCTURE_TOWER);
        if (towers.length > 0) {
          var towerStats = [];
          for (var tower of towers) {
            towerStats.push(tower.energy);
          }
          console.log("Towers: ", towerStats.join(", "));
        }

        const constructionSites = room.find(FIND_CONSTRUCTION_SITES).sort();
        if (constructionSites.length > 0) {
          var constructionStats = constructionSites.map(function(cs){return cs.structureType;});
          var totalConstructionEnergy = constructionSites.reduce(function(total, cs){return total + (cs.progressTotal-cs.progress);}, 0);
          console.log("Construction Sites: ", helpers.runLengthEncoding(constructionStats));
          console.log("Energy to complete construction: ", totalConstructionEnergy);
        }

        console.log("Build Config: ", (100*room.memory.repairLevel)+"%", ConsoleHelpers.largeNumberToString(room.memory.fortifyLevel));
        console.log("Desired: ", JSON.stringify(room.memory.desiredCreepCounts));

        var creepCounts = helpers.allCreepsInRoom(room).reduce(function(counts,creep){
          if(!counts[creep.memory.role]){
            counts[creep.memory.role]=0
          };
          counts[creep.memory.role]+=1;
          return counts;
        },{});
        console.log("Current: ", JSON.stringify(creepCounts));
      }
    }
    console.log();
    console.log("Total: ", Object.keys(Game.creeps).length, JSON.stringify(Memory.creepCounts));
    console.log();
  },
};

var Main = {
  _maintenance: function() {
    helpers.initializeCache();

    if (Game.time % 10 == 0) {
      Main._periodic_maintenance();
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

    for (var name in Memory.rooms) {
      if (
        !Memory.rooms[name].expiration ||
        Memory.rooms[name].expiration < Game.time
      ) {
        delete Memory.rooms[name];
        console.log('Clearing old room memory:', name);
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

      if (room.controller && room.controller.my) {
        // Periodically scan for non-empty sources nearing regeneration
        for (const source of sources) {
          if (source.ticksToRegeneration <= 10 && source.energy > 0) {
            Memory.inefficientSources[source.id] = true;
          }
        }

        roomManager.runPeriodic(room);
      }
    }

    // Tidy up leftover memory values (delete anything not protected)
    const protected = [
      "cpuCanary",
      "creepCounts",
      "creeps",
      "flags",
      "inefficientSources",
      "profiler",
      "roleCounts",
      "rooms",
    ];
    for (var k in Memory) {
      if (protected.includes(k)) continue;
      console.log("cleaning up unexpected memory value", k);
      delete Memory[k];
    }
  },

  loop: function() {
    if(sleepLogic()) return;

    Main._maintenance();

    for (var rn in Game.rooms) {
      var room = Game.rooms[rn];

      // Room memory evicted after 100 ticks
      room.memory.expiration = Game.time + 100;

      if(room.controller && room.controller.my) {
        roomManager.run(room);
      }
    }

    // Process creeps in unowned rooms
    for (const creep of helpers.allCreeps()) {
      creepManager.run(creep);
    }

    // Update the CPU timeout canary
    Memory.cpuCanary = Game.time + 1;
  },
};

profiler.registerObject(ConsoleHelpers, 'ConsoleHelpers');
profiler.registerObject(Main,           'Main');

Object.assign(Main, ConsoleHelpers);
module.exports = Main;

profiler.enable();
module.exports._loop = module.exports.loop;
module.exports.loop = function(){profiler.wrap(module.exports._loop)}.bind(module.exports);
