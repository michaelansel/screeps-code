const helpers = require('helpers');

const SpawnConstants = {
  // Sort order for body parts
  BODYPART_ORDER: [
    TOUGH,
    WORK,
    RANGED_ATTACK,
    ATTACK,
    MOVE,
    HEAL,
    CLAIM,
    CARRY,
  ],

  // Prevent runaway creep scaling until auto-scaling is well understood
  MAX_CREEP_COST: 2000,
}

const SpawnHelpers = {
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

  creepConfig: {
    recovery: function(maxCost) {
      // Cheap and versatile
      // Max cost of 300, smaller is better
      return [WORK, CARRY, MOVE];
    },
    harvester: function(maxCost) {
      // Move fast when empty; don't care when full; maximize work speed
      // Max of 6x WORK per harvester (enough to single-handedly drain a source)
      var maxCost = Math.min(3*SpawnHelpers.creepCost([WORK, WORK, MOVE]), maxCost - BODYPART_COST[CARRY], SpawnConstants.MAX_CREEP_COST);
      return SpawnHelpers.sortCreep(SpawnHelpers.scaleCreep([WORK, WORK, MOVE], maxCost, true).concat([CARRY]));
    },
    hauler: function(maxCost) {
      // Move fast when full; never work
      // Max carry of 500 (10x CARRY parts)
      var maxCost = Math.min(5*SpawnHelpers.creepCost([CARRY, CARRY, MOVE]), maxCost, SpawnConstants.MAX_CREEP_COST);
      return SpawnHelpers.sortCreep(SpawnHelpers.scaleCreep([CARRY, CARRY, MOVE], maxCost, true));
    },
    minhauler: function(maxCost) {
      // Move fast when full; never work
      // Max carry of 500 (10x CARRY parts)
      var maxCost = Math.min(5*SpawnHelpers.creepCost([CARRY, CARRY, MOVE]), maxCost, SpawnConstants.MAX_CREEP_COST);
      return SpawnHelpers.sortCreep(SpawnHelpers.scaleCreep([CARRY, CARRY, MOVE], maxCost, true));
    },
    longhauler: function(maxCost) {
      // Move fast when full; never work
      // Max carry of 500 (10x CARRY parts)
      var maxCost = Math.min(5*SpawnHelpers.creepCost([CARRY, CARRY, MOVE]), maxCost, SpawnConstants.MAX_CREEP_COST);
      return SpawnHelpers.sortCreep(SpawnHelpers.scaleCreep([CARRY, CARRY, MOVE], maxCost, true));
    },
    upgrader: function(maxCost) {
      // Move fast when full on roads; maximize work speed
      var minimalCarryParts = [CARRY, MOVE];
      var maxCost = Math.min(maxCost, SpawnConstants.MAX_CREEP_COST);
      var workParts = SpawnHelpers.scaleCreep([WORK, WORK, MOVE], maxCost - SpawnHelpers.creepCost(minimalCarryParts), true);
      var carryParts = SpawnHelpers.scaleCreep([CARRY, CARRY, MOVE], maxCost - SpawnHelpers.creepCost(workParts), false);
      if(carryParts.length == 0) carryParts = minimalCarryParts;
      return SpawnHelpers.sortCreep(workParts.concat(carryParts));
    },
    builder: function(maxCost) {
      // Move fast when full off roads; maximize work speed
      // TODO think about this some more; ending up with not enough carry (can expend all energy in single tick)
      // Looks like build is 2 energy per WORK per tick -- BUILD_POWER? But that is 5...
      var minimalCarryParts = [CARRY, MOVE];
      var maxCost = Math.min(maxCost, SpawnConstants.MAX_CREEP_COST);
      var workParts = SpawnHelpers.scaleCreep([WORK, MOVE], maxCost - SpawnHelpers.creepCost(minimalCarryParts), true);
      var carryParts = SpawnHelpers.scaleCreep([CARRY, MOVE], maxCost - SpawnHelpers.creepCost(workParts), false);
      if(carryParts.length == 0) carryParts = minimalCarryParts;
      return SpawnHelpers.sortCreep(workParts.concat(carryParts));
    },
    miner: function(maxCost) {
      // Like harvester, but maximum WORK parts
      // Ignore MAX_CREEP_COST and make the biggest miner possible
      var maxCost = maxCost - BODYPART_COST[CARRY];
      return SpawnHelpers.sortCreep(SpawnHelpers.scaleCreep([WORK, WORK, MOVE], maxCost, true).concat([CARRY]));
    },
    linker: function(maxCost) {
      // Move fast when empty; maximize carry
      // Max carry 400 energy (8x CARRY), derived from size of link (800 energy)
      var maxCost = Math.min(4*SpawnHelpers.creepCost([CARRY, CARRY, MOVE]), maxCost, SpawnConstants.MAX_CREEP_COST);
      return SpawnHelpers.sortCreep(SpawnHelpers.scaleCreep([CARRY, CARRY, MOVE], maxCost, true));
    },
    claimer: function(maxCost) {
      return [CLAIM, MOVE];
    },
  },

  creepCost: function (body) {
    return body.reduce(function(total, part){
      if (!_.isString(part)) part = part.type; // creep.body is objects
      return total + BODYPART_COST[part];
    }, 0);
  },

  doSpawn: function (room, body, memory) {
    console.log('Attempting to spawn', memory.role, helpers.runLengthEncoding(body), SpawnHelpers.creepCost(body));
    if (!Memory.roleCounts) Memory.roleCounts = {};
    if (Memory.roleCounts[memory.role] == undefined) Memory.roleCounts[memory.role] = 0;
    const spawns = helpers.structuresInRoom(room, STRUCTURE_SPAWN).filter(function(spawn){return !spawn.spawning;});
    if (spawns.length == 0) return false;
    const name = spawns[0].createCreep(body, (memory.role + Memory.roleCounts[memory.role]++), memory);
    return !!Game.creeps[name];
  },

  scaleCreep: function (body, maxCost, ensureNonEmpty) {
    var copies = Math.floor(maxCost / SpawnHelpers.creepCost(body));
    // don't attempt impossibly large creeps
    copies = Math.min(Math.floor(MAX_CREEP_SIZE / body.length), copies);
    if (ensureNonEmpty) copies = Math.max(1,copies);
    if (copies == 0) return [];
    return Array(copies).fill(body).reduce(
      function(a, b) { return a.concat(b); },
      []
    );
  },

  sortCreep: function (body) {
    let sorted = body.sort(function(a,b){
      return SpawnConstants.BODYPART_ORDER.indexOf(a) - SpawnConstants.BODYPART_ORDER.indexOf(b);
    });

    // Ensure there is always at least one MOVE part remaining on the creep
    sorted.splice(sorted.indexOf(MOVE), 1);
    sorted.push(MOVE);

    return sorted;
  },
};

var Spawn = {
  bootstrap: function(room) {
    if(helpers.structuresInRoom(room, STRUCTURE_SPAWN).length == 0) {
      function emergencySpawn(params) {
        console.log('EMERGENCY', room.name, 'is out of '+params.role+'s and spawns');
        const helperSpawns = Object.keys(Game.spawns).map(function(k){return Game.spawns[k];}).filter(function(s){return !s.spawning;});
        if (helperSpawns.length > 0) {
          const lifesaver = helperSpawns.sort(function(a,b){
            return Game.map.findRoute(a.room.name, room).length - Game.map.findRoute(b.room.name, room).length;
          })[0];
          console.log(room.name, "requesting spawn assistance from", lifesaver);
          lifesaver.room.memory.emergencySpawn = params;
        } else {
          console.log("No spawns available to help", room.name);
        }
      }
      const totalSourceSlots = Object.keys(room.memory.sources).reduce(function(total, source){return total + room.memory.sources[source].spaces;}, 0);
      // TODO this should just be the same spawn logic, but with emergencySpawn instead of doSpawn
      // This requires a refactor of the spawn logic to isolate the decision-making process

      if (
        helpers.creepsInRoomWithRole(room, 'harvester').length == 0 &&
        (
          helpers.creepsInRoomWithRole(room, 'harvester').length +
          helpers.creepsWithRoleAssignedToRoom(room, 'harvester').length
        ) < totalSourceSlots
      ) {
        emergencySpawn({
          config: 'harvester',
          room: room.name,
          role: 'harvester',
        });
      } else if (
          helpers.creepsInRoomWithRole(room, 'builder').length == 0 &&
          helpers.creepsWithRoleAssignedToRoom(room, 'builder').length < 2 &&
          helpers.structuresInRoom(room, STRUCTURE_CONTAINER).length > 0 &&
          room.find(FIND_CONSTRUCTION_SITES).length > 0
      ) {
        emergencySpawn({
          config: 'builder',
          room: room.name,
          role: 'builder',
        });
      }
    }
  },

  run: function(room) {
    // Scale up builders if there is construction to do or damage to repair
    if(room.find(FIND_CONSTRUCTION_SITES).length > 0) {
      // At least one builder per construction site
      let minBuilders = Math.min(3, room.find(FIND_CONSTRUCTION_SITES).length);
      console.log(room.name, 'ensuring at least', minBuilders, 'builders');
      // Only increase number of builders until all construction is done
      room.memory.desiredCreepCounts['builder'] = Math.max(room.memory.desiredCreepCounts['builder'], minBuilders);
    } else {
      room.memory.desiredCreepCounts['builder'] = 0;
    }
    if (helpers.structuresInRoom(room, STRUCTURE_TOWER).length == 0) {
      var targets = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          if (structure.structureType == STRUCTURE_RAMPART ||
              structure.structureType == STRUCTURE_WALL) {
            return structure.hits < Math.min(room.memory.fortifyLevel, structure.hitsMax);
          } else {
            return structure.hits < room.memory.repairLevel*structure.hitsMax;
          }
        }
      });
      if(targets.length > 0) {
        room.memory.desiredCreepCounts['builder'] = Math.max(room.memory.desiredCreepCounts['builder'], Math.min(3,targets.length));
      }
    }
    if (room.memory.desiredCreepCounts['builder'] == 0) {
      console.log(room.name, 'recycling unneeded builders');
      for (const creep of helpers.creepsInRoomWithRole(room, 'builder')) {
        console.log('recycling', creep.name, creep.room.name);
        creep.memory.role = 'recycle';
      }
    }
    // Recycle miners if no more minerals to mine in creep's lifetime
    const mineral = room.find(FIND_MINERALS)[0];
    if (mineral && mineral.mineralAmount == 0) {
      for (const creep of helpers.creepsInRoomWithRole(room, 'miner')) {
        if (mineral.ticksToRegeneration > creep.ticksToLive) {
          console.log('Recycling miner', creep.name);
          creep.memory.role = 'recycle';
        }
      }
    }

    // Convert harvester to upgrader if controller is at risk of downgrading
    if (room.controller.ticksToDowngrade < 3000) {
      if(helpers.creepsInRoomWithRole(room, 'upgrader').length == 0) {
        var harvesters = helpers.creepsInRoomWithRole(room, 'harvester');
        if(harvesters.length > 0) {
          harvesters[0].memory.role = 'upgrader';
        } else {
          console.log("No harvesters available to convert into upgraders");
          Game.notify("No harvesters available to convert into upgraders", 30);
        }
      }
    }

    var available = room.energyAvailable,
        capacity = room.energyCapacityAvailable;

    var harvesterWorkParts = helpers.creepsInRoomWithRole(room, 'harvester').reduce(function(total, creep){
      return total + creep.body.reduce(function(sum, bp){
        if (bp.type == WORK) {
          return sum + 1;
        } else {
          return sum;
        }
      }, 0)
    }, 0);

    if(room.memory.emergencySpawn) {
      console.log("Emergency Spawn: ", JSON.stringify(room.memory.emergencySpawn));
      const success = SpawnHelpers.doSpawn(
        room,
        SpawnHelpers.creepConfig[room.memory.emergencySpawn.config](capacity),
        {
          role: room.memory.emergencySpawn.role,
          room: room.memory.emergencySpawn.room,
        }
      );
      if (success) delete room.memory.emergencySpawn;
      if (success) console.log("successfully spawned emergency creep!");
    }

    if (helpers.creepsInRoomWithRole(room, 'hauler').length < 1) {
      console.log('Ensuring at least one hauler at all times');
      SpawnHelpers.doSpawn(
        room,
        SpawnHelpers.creepConfig['hauler'](available),
        {role: 'hauler'}
      );
    } else if (harvesterWorkParts < 2) {
      console.log('Ensuring at least 2 harvesters before anything else');
      SpawnHelpers.doSpawn(
        room,
        SpawnHelpers.creepConfig['harvester'](available),
        {role: 'harvester'}
      );
    } else {
      // Harvest 2 energy per WORK per tick
      // Source has 3000 energy every 300 ticks
      // Max 5 WORK per source (plus 20% buffer to ensure 100% harvest)
      if (
        harvesterWorkParts / 5 < room.find(FIND_SOURCES).length &&
        helpers.creepsInRoomWithRole(room, 'harvester').length < Object.keys(room.memory.sources).reduce(function(total, source){return total + room.memory.sources[source].spaces;}, 0)
      ) {
        SpawnHelpers.doSpawn(
          room,
          SpawnHelpers.creepConfig['harvester'](capacity),
          {role: 'harvester'}
        )
      }
      // Upgrade/Build 2 energy per WORK per tick
      // Energy production == 2x harvesterWorkParts
      // Max harvesterWorkParts for both upgrader and builder
      // If too many consumption WORK parts, re-role to higher priority
      for (var role in room.memory.desiredCreepCounts) {
        if (role == 'harvester') continue; // handled separately
        var roleCreeps = helpers.creepsInRoomWithRole(room, role);
        if (roleCreeps.length < room.memory.desiredCreepCounts[role]) {
          SpawnHelpers.doSpawn(
            room,
            SpawnHelpers.creepConfig[role](capacity),
            {role: role}
          );
        }
      }
    }
  },

  runAlways: function(spawn) {
    if(spawn.spawning) {
      var spawningCreep = Game.creeps[spawn.spawning.name];
      spawn.room.visual.text(
        '🛠️' + spawningCreep.memory.role,
        spawn.pos.x + 1,
        spawn.pos.y, {
          align: 'left',
          opacity: 0.8
        });
      var bodyParts = spawningCreep.body.map(function(bp){return bp.type;});
      console.log('Spawning', spawningCreep.memory.role, spawningCreep.name,
                  helpers.runLengthEncoding(bodyParts), SpawnHelpers.creepCost(bodyParts));
    }
  },
};

Object.assign(Spawn, SpawnConstants, SpawnHelpers);
module.exports = Spawn;
