module.exports = {
  getEnergy: function(creep, prioritizeFull=false) {
    var target = Game.getObjectById(creep.memory.target);
    if (target) {
      this.getEnergyFromTarget(creep, target);
    } else {
      target = this.findAvailableEnergy(creep, prioritizeFull);
      if (target) {
        this.getEnergyFromTarget(creep, target);
      } else {
        var containers = creep.room.find(FIND_STRUCTURES, {filter:function(structure){return structure.structureType == STRUCTURE_CONTAINER;}});
        if (containers.length == 0 && creep.body.includes(WORK)) {
          creep.memory.returnToRole = creep.memory.role;
          creep.memory.role = 'harvester';
          console.log(creep.name, 'No containers to pull from, harvesting instead');
        } else {
          creep.moveTo(Game.flags['RallyWhenLost']);
        }
      }
    }
  },

  getEnergyFromTarget: function(creep, target) {
    creep.memory.target = target.id;

    var moveToTarget = function() {
      var ret = creep.moveTo(target, {
        visualizePathStyle: {
          stroke: '#ffaa00'
        }
      });
      if (ret != 0) {
        // console.log(creep.name, "forgetting target");
        creep.memory.target = null;
      }
    }

    if (target.energy) {
      if (target.energy == 0) {
        console.log(creep.name, "giving up on previous source", creep.memory.target);
        creep.memory.target = null;
        return;
      }
      if (creep.harvest(target) != 0) {
        moveToTarget();
      }
    }

    if (target.structureType) {
      if (target.structureType == STRUCTURE_CONTAINER ||
          target.structureType == STRUCTURE_STORAGE) {
        if (target.store[RESOURCE_ENERGY] == 0) {
          console.log(creep.name, "giving up on previous structure", creep.memory.target);
          creep.memory.target = null;
          return;
        }
        if (creep.withdraw(target, RESOURCE_ENERGY) != 0) {
          moveToTarget();
        }
      }
    }
  },

  findAvailableEnergy: function(creep, prioritizeFull) {
    targets = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE ) && structure.store[RESOURCE_ENERGY] >= (creep.carryCapacity - creep.carry.energy);
      }
    });
    if (targets.length > 0) {
      if (prioritizeFull) {
        // select highest energy percentage
        target = targets.sort(function(a,b){return a.store[RESOURCE_ENERGY]/a.storeCapacity-b.store[RESOURCE_ENERGY]/b.storeCapacity;}).reverse()[0];
      } else {
        target = creep.pos.findClosestByPath(targets);
      }
      if (!target) {
        console.log(creep.name, "Unable to find a path to energy", target, targets);
        return null;
      }
    } else {
      console.log(creep.name, "Unable to find any available energy");
      return null;
    }

    return target;
  },
};
