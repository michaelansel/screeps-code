var _ = require('lodash');

function allCreeps() {
  return Object.keys(Game.creeps).map(function(creepName){return Game.creeps[creepName];});
}
function creepsWithRole(role) {
  return allCreeps().filter(function(creep){return creep.memory.role == role;});
}

var roleHarvester = {

  /** @param {Creep} creep **/
  run: function(creep) {
    if (creep.carry.energy < creep.carryCapacity) {
      var source = Game.getObjectById(creep.memory.target);
      if(!source) {
        source = creep.pos.findClosestByPath(FIND_SOURCES);
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
      creep.memory.target = null;
      var structureSelectors = [
        // function(structure) {
        //   return structure.structureType == STRUCTURE_TOWER && structure.energy < structure.energyCapacity;
        // },
        function(structure) {
          return (structure.structureType == STRUCTURE_CONTAINER ||
                  structure.structureType == STRUCTURE_STORAGE) &&
                 _.sum(structure.store) < structure.storeCapacity &&
                 creep.pos.getRangeTo(structure) < 10;
        },
        function(structure) {
          return (structure.structureType == STRUCTURE_CONTAINER ||
                  structure.structureType == STRUCTURE_STORAGE) &&
                 _.sum(structure.store) < structure.storeCapacity &&
                 creep.pos.getRangeTo(structure) < 20;
        },
        // Emergency mode: no haulers available and local containers full
        function(structure) {
          return creepsWithRole('hauler').length == 0 && structure.structureType == STRUCTURE_SPAWN && structure.energy < structure.energyCapacity;
        },
        function(structure) {
          return creepsWithRole('hauler').length == 0 && structure.structureType == STRUCTURE_EXTENSION && structure.energy < structure.energyCapacity;
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
        creep.moveTo(Game.flags['RallyWhenLost']);
      }
    }
  }
};

module.exports = roleHarvester;
