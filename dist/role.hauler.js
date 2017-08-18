var _ = require('lodash');
var helpers = require('helpers');

var roleHauler = {

  /** @param {Creep} creep **/
  run: function(creep) {
    if (!creep.memory.hauling && creep.memory.rebalancing && creep.carry.energy == creep.carryCapacity) {
      // Just picked up from a max-full container; double check where it needs to go
      creep.memory.rebalancing = false;
    }
    if (creep.carry.energy == creep.carryCapacity) {
      creep.memory.hauling = true;
    }
    if (creep.carry.energy == 0) {
      creep.memory.hauling = false;
    }
    // if (Game.time % 20 == 0) {
    //   creep.memory.rebalancing = false;
    // }

    if (!creep.memory.hauling) {
      if(creep.memory.rebalancing) {
        // now that link is active, instead of rebalancing, move to the flag
        creep.moveTo(Game.flags['RallyWhenLost']);
        // always be checking for a need
        creep.memory.rebalancing = false;
      } else {
        helpers.getEnergy(creep, creep.memory.rebalancing);
      }
    } else {
      creep.memory.target = null;
      var structureSelectors = [
        function(structure) {
          return Memory.underAttack &&
                 structure.structureType == STRUCTURE_TOWER &&
                 structure.energy < structure.energyCapacity;
        },
        function(structure) {
          return (structure.structureType == STRUCTURE_SPAWN ||
                  structure.structureType == STRUCTURE_EXTENSION) &&
                 structure.energy < structure.energyCapacity;
        },
        function(structure) {
          return structure.structureType == STRUCTURE_TOWER && structure.energy < structure.energyCapacity;
        },
        function(structure) {
          return creep.memory.rebalancing &&
                 (structure.structureType == STRUCTURE_CONTAINER ||
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
        var target;
        // Turn off rebalancing logic if we found a non-container that needs energy
        if (i<3) {
          target = creep.pos.findClosestByPath(targets);
          if (target) {
            console.log(creep.name, "disable rebalancing in favor of", target);
            creep.memory.rebalancing = false;
          } else {
            console.log(creep.name, "would like to go to targets, but no path", targets);
            // Find a container to dump into instead
            targets = creep.room.find(FIND_STRUCTURES, {filter: function(structure) {
              return creep.memory.rebalancing &&
                     (structure.structureType == STRUCTURE_CONTAINER ||
                      structure.structureType == STRUCTURE_STORAGE) &&
                     _.sum(structure.store) < structure.storeCapacity;
            }});
          }
        }
        if (creep.memory.rebalancing) {
          creep.moveTo(Game.flags['RallyWhenLost']); // ignore this now that we have a link
          return;
          console.log(creep.name, "rebalancing energy", targets);
          var t2 = targets.filter(function(t){
            if ([STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER].includes(t.structureType)) {
              return t.energy < 500;
            } else if ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(t.structureType)) {
              return t.store[RESOURCE_ENERGY] < 500;
            } else {
              console.log('unsortable object', a);
              return true;
            }
          });
          if (t2.length > 0) {
            target = creep.pos.findClosestByPath(t2);
          } else {
            targets = targets.sort(function(a,b){
              var aE, aC, bE, bC;
              if ([STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER].includes(a.structureType)) {
                aE = a.energy;
                aC = a.energyCapacity;
              } else if ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(a.structureType)) {
                aE = a.store[RESOURCE_ENERGY];
                aC = a.storeCapacity;
              } else {
                console.log('unsortable object', a);
              }
              if ([STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER].includes(b.structureType)) {
                bE = b.energy;
                bC = b.energyCapacity;
              } else if ([STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(b.structureType)) {
                bE = b.store[RESOURCE_ENERGY];
                bC = b.storeCapacity;
              } else {
                console.log('unsortable object', b);
              }
              return aE/aC - bE/bC;
            });
            target = targets[0]; // Lowest energy percentage
          }
          console.log(creep.name, "rebalancing into", target);
        } else {
          target = creep.pos.findClosestByPath(targets);
        }
        if (!target) {
          if (!creep.memory.rebalancing) {
            console.log(creep.name, "no path to targets, rebalancing instead", targets);
            creep.memory.rebalancing = true;
          }
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
        console.log(creep.name, "lots of energy and nowhere to use it; entering rebalance mode");
        creep.memory.rebalancing = true;
      }
    }
  }
};

module.exports = roleHauler;
