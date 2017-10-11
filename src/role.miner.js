var _ = require('lodash');
const helpers = require('helpers');

var roleMiner = {
  mineral: function (creep) {
    let mineral = Game.getObjectById(creep.memory.target);
    if (mineral && mineral instanceof Mineral) return mineral;

    mineral = creep.room.find(FIND_MINERALS)[0];
    if (mineral && mineral instanceof Mineral) {
      creep.memory.target = mineral.id;
      return mineral;
    }

    return null;
  },

  /** @param {Creep} creep **/
  run: function(creep) {
    if (_.sum(creep.carry) < creep.carryCapacity) {
      let mineral = this.mineral(creep);
      if (!mineral) {
        console.log(creep.name, "Unable to locate mineral");
        return;
      }
      if (creep.harvest(mineral) == ERR_NOT_IN_RANGE) {
        var res = creep.moveTo(mineral, {
          visualizePathStyle: {
            stroke: '#ffaa00'
          }
        });
        if (res == ERR_NO_PATH) creep.memory.target = null;
      }
    } else {
      var structureSelectors = [
        // Look nearby
        function() {
          return helpers.structuresInRoom(creep.room, [STRUCTURE_CONTAINER, STRUCTURE_STORAGE]).filter(function(structure){
            return _.sum(structure.store) < structure.storeCapacity &&
            creep.pos.getRangeTo(structure) <= 2;
          });
        },
        // Look everywhere
        function() {
          return helpers.structuresInRoom(creep.room, [STRUCTURE_CONTAINER, STRUCTURE_STORAGE]).filter(function(structure){
            return _.sum(structure.store) < structure.storeCapacity;
          });
        },
      ];
      var targets = [];
      var i = 0;
      while(!targets.length && i<structureSelectors.length) {
        targets = structureSelectors[i++]();
      }
      if (targets.length > 0) {
        var target = creep.pos.findClosestByPath(targets);
        if (!target) {
          // console.log(creep.name, "Unable to find a path?", target, targets);
          return;
        }
        for (let resource of Object.keys(creep.carry)) {
          if (creep.transfer(target, resource) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {
              visualizePathStyle: {
                stroke: '#ffffff'
              }
            });
            break;
          }
        }
      } else {
        console.log(creep.name, "lots of resources and nowhere to put them");
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
      }
    }
  }
};

module.exports = roleMiner;
