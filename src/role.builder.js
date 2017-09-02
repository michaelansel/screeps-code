var helpers = require('helpers');

var roleBuilder = {

  /** @param {Creep} creep **/
  run: function(creep) {
    if (creep.memory.working && creep.carry.energy == 0) {
      creep.memory.working = false;
      creep.memory.target = null;
      creep.say('🔄 harvest');
    }
    if (!creep.memory.working && creep.carry.energy == creep.carryCapacity) {
      creep.memory.working = true;
      creep.memory.target = null;
      creep.say('🚧 build');
    }

    var targets = [];
    if (creep.memory.working) {
      // Prioritize critical repairs/fortification
      targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          if (structure.structureType == STRUCTURE_RAMPART ||
              structure.structureType == STRUCTURE_WALL) {
            return structure.hits < Math.min(Memory.fortifyLevel, structure.hitsMax);
          } else {
            return structure.hits < Memory.repairLevel*structure.hitsMax;
          }
        }
      });
      if (targets.length) {
        Memory.fortifyLevel = Math.max(Memory.fortifyLevel, 150000);
        Memory.repairLevel = Math.max(Memory.repairLevel, 0.75);
        var target = creep.pos.findClosestByPath(targets);
        if (!target) {
          // console.log(creep.name, "Unable to find a path?", target, targets);
          return;
        }
        if (creep.repair(target) == ERR_NOT_IN_RANGE) {
          creep.moveTo(target, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      } else {
        Memory.fortifyLevel = Math.min(Memory.fortifyLevel, 50000);
        Memory.repairLevel = Math.min(Memory.repairLevel, 0.5);
        targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        if (targets.length) {
          var target = creep.pos.findClosestByPath(targets);
          if (!target) {
            // console.log(creep.name, "Unable to find a path?", target, targets);
            return;
          }
          if (creep.build(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {
              visualizePathStyle: {
                stroke: '#ffffff'
              }
            });
          }
        } else {
          // Repair/Fortify anything left
          // targets = creep.room.find(FIND_STRUCTURES, {
          //   filter: (structure) => {
          //     if (structure.structureType == STRUCTURE_RAMPART ||
          //         structure.structureType == STRUCTURE_WALL) {
          //       return structure.hits < Math.min(300*1000, structure.hitsMax);
          //     } else {
          //       return structure.hits < Math.min(0.9*structure.hitsMax);
          //     }
          //   }
          // });
          if (targets.length) {
            var target = creep.pos.findClosestByPath(targets);
            if (!target) {
              // console.log(creep.name, "Unable to find a path?", target, targets);
              return;
            }
            if (creep.repair(target) == ERR_NOT_IN_RANGE) {
              creep.moveTo(target, {
                visualizePathStyle: {
                  stroke: '#ffffff'
                }
              });
            }
          } else {
            // Builders are idle; notify every 60m
            // Game.notify("Builder is idle: "+creep.name, 60);
            console.log(creep.name, "has nothing to build or repair");
            Memory.desiredCreepCounts['builder'] = 0;
            creep.memory.role = 'upgrader';
            Memory.desiredCreepCounts['upgrader'] = Math.min(Memory.desiredCreepCounts['upgrader'] + 1, 5);
          }
        }
      }
    } else {
      helpers.getEnergy(creep);
    }
  }
};

module.exports = roleBuilder;
