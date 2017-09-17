var _ = require('lodash');

function allCreeps() {
  return Object.keys(Game.creeps).map(function(creepName){return Game.creeps[creepName];});
}
function creepsWithRole(role) {
  return allCreeps().filter(function(creep){return creep.memory.role == role;});
}

var roleHarvester = {
  selectSource: function (creep) {
    // Find the nearest source without enough WORK parts assigned and space available
    console.log(creep.name, 'selecting a source');

    // Compute the current state of the world
    var sources = creep.room.find(FIND_SOURCES, {filter: function(source) {
        return source.energy > 0;
    }});
    var workPartsPerSource = {};
    var workersPerSource = {};
    var harvesters = creepsWithRole('harvester');
    for (var ci in harvesters) {
      var c = harvesters[ci];
      if (c.id == creep.id) continue;
      if (!Game.getObjectById(c.memory.target)) continue;
      var parts = c.body.reduce(function(sum, bp){
        if (bp.type == WORK) {
          return sum + 1;
        } else {
          return sum;
        }
      }, 0);
      if (workPartsPerSource[c.memory.target] == undefined) {
        workPartsPerSource[c.memory.target] = 0;
      }
      if (workersPerSource[c.memory.target] == undefined) {
        workersPerSource[c.memory.target] = 0;
      }
      workPartsPerSource[c.memory.target] += parts;
      workersPerSource[c.memory.target]++;
      console.log(
        c.name,
        c.memory.target,
        parts,
        workPartsPerSource[c.memory.target],
        workersPerSource[c.memory.target]
      );
    }
    console.log(creep.name, 'workPartsPerSource', JSON.stringify(workPartsPerSource));
    console.log(creep.name, 'workersPerSource', JSON.stringify(workersPerSource));

    // Find all candidate sources (not enough WORK parts and space available)
    var candidates = [];
    for (var si in sources) {
      var s = sources[si];
      var parts, workers;
      if (workPartsPerSource[s.id] == undefined) {
        parts = 0;
      } else {
        parts = workPartsPerSource[s.id];
      }
      if (workersPerSource[s.id] == undefined) {
        workers = 0;
      } else {
        workers = workersPerSource[s.id];
      }
      if (parts < (SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME / HARVEST_POWER) &&
          workers < s.room.memory.sources[s.id].spaces) {
        candidates.push(s);
        console.log(creep.name, 'candidate source', s.id, parts);
      } else {
        console.log('source already full', s.id, parts, workersPerSource[s.id]);
      }
    }

    // Select the nearest candidate
    return creep.pos.findClosestByPath(candidates);
  },

  /** @param {Creep} creep **/
  run: function(creep) {
    if (creep.carry.energy < creep.carryCapacity) {
      var source = Game.getObjectById(creep.memory.target);
      if(!source) {
        // source = creep.pos.findClosestByPath(FIND_SOURCES, {filter: function(source){return source.energy > 0;}});
        source = this.selectSource(creep);
        if (!source) {
          console.log(creep.name, "No available sources");
          return;
        }
        creep.memory.target = source.id;
      }
      if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
        var res = creep.moveTo(source, {
          visualizePathStyle: {
            stroke: '#ffaa00'
          }
        });
        if (res == ERR_NO_PATH) creep.memory.target = null;
      }
    } else {
      if (creep.memory.returnToRole) {
        creep.memory.target = null;
        creep.memory.role = creep.memory.returnToRole;
        creep.memory.returnToRole = null;
        return;
      }

      // Bootstrap the per-source container
      // This isn't terribly efficient (doesn't latch-on), but good enough for bootstrap
      var constructionSites = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
        filter: function(site) {
          return site.structureType == STRUCTURE_CONTAINER;
        },
      });
      if (constructionSites.length > 0) {
        if(creep.build(constructionSites[0]) == OK) return;
      }

      var structureSelectors = [
        // function(structure) {
        //   return structure.structureType == STRUCTURE_TOWER && structure.energy < structure.energyCapacity;
        // },
        function(structure) {
          return (structure.structureType == STRUCTURE_CONTAINER ||
                  structure.structureType == STRUCTURE_STORAGE) &&
                 _.sum(structure.store) < structure.storeCapacity &&
                 creep.pos.getRangeTo(structure) < 5;
        },
        // Emergency mode: no haulers available and local containers full
        function(structure) {
          return creepsWithRole('hauler').length == 0 && structure.structureType == STRUCTURE_SPAWN && structure.energy < structure.energyCapacity;
        },
        function(structure) {
          return creepsWithRole('hauler').length == 0 && structure.structureType == STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity;
        },
        // Totally lost mode: just go to a container and deposit your energy
        function(structure) {
          return (structure.structureType == STRUCTURE_CONTAINER ||
                  structure.structureType == STRUCTURE_STORAGE) &&
                 _.sum(structure.store) < structure.storeCapacity;
        },
      ];
      var targets = [];
      var i = 0;
      while(!targets.length && i<structureSelectors.length) {
        targets = creep.room.find(FIND_STRUCTURES, {filter: structureSelectors[i++]});
      }
      if (targets.length > 0) {
        var target = creep.pos.findClosestByPath(targets);
        if (!target) {
          // console.log(creep.name, "Unable to find a path?", target, targets);
          return;
        }
        if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      } else {
        console.log(creep.name, "lots of energy and nowhere to use it");
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
      }
    }
  }
};

module.exports = roleHarvester;
