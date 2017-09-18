var helpers = require('helpers');

var roleBuilder = {

  /** @param {Creep} creep **/
  run: function(creep) {
    const room = creep.room;

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
            return structure.hits < Math.min(room.memory.fortifyLevel, structure.hitsMax);
          } else {
            return structure.hits < room.memory.repairLevel*structure.hitsMax;
          }
        }
      });
      if (targets.length) {
        room.memory.fortifyLevel = Math.max(room.memory.fortifyLevel, 150000);
        room.memory.repairLevel = Math.max(room.memory.repairLevel, 0.75);
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
        room.memory.fortifyLevel = Math.min(room.memory.fortifyLevel, 50000);
        room.memory.repairLevel = Math.min(room.memory.repairLevel, 0.5);
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
            room.memory.desiredCreepCounts['builder'] = 0;
            creep.memory.role = 'upgrader';
            room.memory.desiredCreepCounts['upgrader'] = Math.min(room.memory.desiredCreepCounts['upgrader'] + 1, 2);
          }
        }
      }
    } else {
      helpers.getEnergy(creep);
    }
  }
};

module.exports = roleBuilder;
