module.exports = {
  getEnergy: function(creep, prioritizeFull=false) {
    var target = Game.getObjectById(creep.memory.target);
    // TODO optimize search
    // Find all sources, containers, storage
    // Filter out all that are empty
    // Lock on to the closest one
    // Release lock if it becomes non-viable
    if (!target) {
      targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
          return (structure.structureType == STRUCTURE_CONTAINER ||
                  structure.structureType == STRUCTURE_STORAGE ) && structure.store[RESOURCE_ENERGY] >= (creep.carryCapacity - creep.carry.energy);
        }
      });
      // if (targets.length == 0) {
      //   targets = creep.room.find(FIND_STRUCTURES, {
      //     filter: (structure) => {
      //       return (structure.structureType == STRUCTURE_CONTAINER ||
      //               structure.structureType == STRUCTURE_STORAGE ) && structure.store[RESOURCE_ENERGY] >= 0;
      //     }
      //   });
      // }
      // if (!targets.length) {
      //   var source = creep.pos.findClosestByPath(FIND_SOURCES);
      //   if (source) targets.push(source);
      // }
      // console.log(creep.name, targets);
      if (targets.length > 0) {
        if (prioritizeFull) {
          target = targets.sort(function(a,b){return a.store[RESOURCE_ENERGY]/a.storeCapacity-b.store[RESOURCE_ENERGY]/b.storeCapacity;}).reverse()[0]; // highest energy
        } else {
          target = creep.pos.findClosestByPath(targets);
        }
        if (!target) {
          console.log(creep.name, "Unable to find a path to energy", target, targets);
          return;
        }
      // } else {
      //   target = creep.pos.findClosestByPath(FIND_SOURCES);
      //   if (!target) {
      //     console.log(creep.name, "No available sources");
      //     return;
      //   }
        creep.memory.target = target.id;
      }
    }
    if (!target) {
      console.log(creep.name, "no energy available");
      creep.moveTo(Game.flags['RallyWhenLost']);
      return;
    }

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
  }
};
