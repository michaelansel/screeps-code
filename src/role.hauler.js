var _ = require('lodash');
var helpers = require('helpers');

var roleHauler = {
  selectTarget: function(creep) {
    var structureSelectors = [
      function() {
        if (creep.room.state.underAttack) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
            return tower.energy < tower.energyCapacity/10;
          });
        } else {
          return [];
        }
      },
      function() {
        if (creep.room.state.underAttack) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
            return tower.energy < tower.energyCapacity*9/10;
          });
        } else {
          return [];
        }
      },
      function() {
        if (creep.room.state.underAttack) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
            return tower.energy < tower.energyCapacity;
          });
        } else {
          return [];
        }
      },
      function() {
        return helpers.structuresInRoom(creep.room, [STRUCTURE_SPAWN, STRUCTURE_EXTENSION]).filter(function(structure){
          return structure.energy < structure.energyCapacity;
        });
      },
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
          return tower.energy < tower.energyCapacity/10;
        });
      },
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
          return tower.energy < tower.energyCapacity*9/10;
        });
      },
      function() {
        if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 100000) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_POWER_SPAWN).filter(function(structure){
            return structure.energy < structure.energyCapacity;
          });
        } else {
          return [];
        }
      },
      function() {
        if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 100000) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_NUKER).filter(function(structure){
            return structure.energy < structure.energyCapacity;
          });
        } else {
          return [];
        }
      },
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_LAB).filter(function(lab){
          return lab.energy < lab.energyCapacity;
        });
      },
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_TOWER).filter(function(tower){
          return tower.energy < tower.energyCapacity;
        });
      },
      function() {
        if (creep.memory.rebalancing) {
          return helpers.structuresInRoom(creep.room, STRUCTURE_STORAGE).filter(function(structure){
            return _.sum(structure.store) < structure.storeCapacity;
          });
        } else {
          return [];
        }
      },
      function() {
        if (creep.memory.rebalancing) {
          let sorted = helpers.structuresInRoom(creep.room, STRUCTURE_CONTAINER).filter(function(structure){
            return _.sum(structure.store) < structure.storeCapacity;
          }).sort(function(a,b){
            return _.sum(a.store) - _.sum(b.store);
          });
          // Pull all empty containers or the emptiest non-empty
          let candidates = [];
          for (let c of sorted) {
            if (_.sum(c.store) == 0) {
              candidates.push(c);
            } else {
              if (candidates.length == 0) candidates.push(c);
              break;
            }
          }
          return candidates;
        } else {
          return [];
        }
      },
    ];
    var targets = [];
    var i = 0;
    while(!targets.length && i<structureSelectors.length) {
      targets = structureSelectors[i++]();
    }
    if (targets.length > 0) {
      return creep.pos.findClosestByPath(targets);
    }
    return null;
  },

  isValidTarget: function(target) {
    const validTargets = [
      STRUCTURE_CONTAINER,
      STRUCTURE_STORAGE,
      STRUCTURE_TOWER,
      STRUCTURE_EXTENSION,
      STRUCTURE_SPAWN,
      STRUCTURE_POWER_SPAWN,
      STRUCTURE_NUKER,
      STRUCTURE_LAB,
    ];

    if (!validTargets.includes(target.structureType)) return false;
    if (target.energyCapacity) return target.energy < target.energyCapacity;
    if (target.storeCapacity) return _.sum(target.store) < target.storeCapacity;
  },

  workTarget: function(creep, target) {
    if (
      creep.memory.rebalancing &&
      !(
        target instanceof StructureStorage ||
        target instanceof StructureContainer
      )
    ) {
      console.log(creep.name, 'non-storage/container wants energy; disabling rebalancing');
      creep.memory.rebalancing = false;
    }
    if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
      creep.moveTo(target, {
        visualizePathStyle: {
          stroke: '#ffffff'
        }
      });
    }
  },

  /** @param {Creep} creep **/
  run: function(creep) {
    if (
      !creep.memory.working &&
      creep.carry[RESOURCE_ENERGY] == creep.carryCapacity &&
      creep.memory.rebalancing
    ) {
      // Just picked up from the most-full container
      if (creep.pos.getRangeTo(creep.room.storage) == 1) {
        console.log(creep.name, "fully balanced; taking a nap");
        creep.memory.rebalancing = false;
        creep.memory.sleep = 10;
        // Game.notify([creep.name, creep.room.name, 'fully balanced, sleeping'].join(' '), 10);
      }
    }

    if (creep.carry.energy == creep.carryCapacity) {
      // Full of energy
      creep.memory.working = true;
      creep.memory.target = null;
    }

    if (creep.carry.energy == 0) {
      // Out of energy
      creep.memory.working = false;
      creep.memory.target = null;
    }

    if (creep.memory.working) {
      var target = Game.getObjectById(creep.memory.target);
      if (!target || !this.isValidTarget(target)) {
        target = this.selectTarget(creep);
      }
      if(target && this.isValidTarget(target)) {
        creep.memory.target = target.id;
        this.workTarget(creep, target);
      } else {
        console.log(creep.name, "lots of energy and nowhere to use it; entering rebalance mode");
        creep.memory.rebalancing = true;
      }
    } else {
      if (creep.memory.sleep > 0) {
        creep.memory.sleep--;
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
      } else {
        helpers.getEnergy(creep, creep.memory.rebalancing);
      }
    }
  },
};

module.exports = roleHauler;
