module.exports = {
  getEnergy: function(creep, prioritizeFull=false) {
    var target = Game.getObjectById(creep.memory.target);
    // console.log(creep.name, 'looking for energy', creep.memory.target, target);
    if (!target) {
      target = this.findAvailableEnergy(creep, prioritizeFull);
    }
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

    if (target instanceof Source) {
      if (target.energy == 0) {
        console.log(creep.name, "giving up on previous source", creep.memory.target);
        creep.memory.target = null;
        return;
      }
      if (creep.harvest(target) != 0) {
        moveToTarget();
      }
    }

    if (target instanceof Structure) {
      if (target.structureType == STRUCTURE_CONTAINER ||
          target.structureType == STRUCTURE_STORAGE) {
        if (target.store[RESOURCE_ENERGY] == 0) {
          console.log(creep.name, "giving up on previous storage/container", creep.memory.target);
          creep.memory.target = null;
          return;
        }
        if (creep.withdraw(target, RESOURCE_ENERGY) != 0) {
          moveToTarget();
        }
      }
    }

    if (target instanceof Resource) {
      if (target.resourceType == RESOURCE_ENERGY) {
        if (target.energy == 0) {
          console.log(creep.name, "giving up on previous resource", creep.memory.target);
          creep.memory.target = null;
          return;
        }
        if (creep.pickup(target) != 0) {
          moveToTarget();
        }
      }
    }
  },

  findAvailableEnergy: function(creep, prioritizeFull) {
    var targets;

    targets = creep.room.find(FIND_DROPPED_RESOURCES, {
      filter: (resource) => {
        return resource.resourceType == RESOURCE_ENERGY &&
               resource.energy >= (creep.carryCapacity - creep.carry[RESOURCE_ENERGY]);
      },
    });
    if (targets.length > 0) {
      targets = targets.sort(function(a,b){return a.energy - b.energy}).reverse();
      for (t of targets) {
        if (creep.pos.findPathTo(t)) {
          console.log(creep.name, 'picking up dropped resource', t, t.energy);
          return t;
        }
      }
    }

    targets = creep.room.find(FIND_STRUCTURES, {
      filter: (structure) => {
        return (structure.structureType == STRUCTURE_CONTAINER ||
                structure.structureType == STRUCTURE_STORAGE ) && structure.store[RESOURCE_ENERGY] >= Math.min(200, creep.carryCapacity - creep.carry.energy);
      }
    });
    if (targets.length > 0) {
      var target;
      if (prioritizeFull) {
        // select highest energy percentage
        target = targets.sort(function(a,b){return a.store[RESOURCE_ENERGY]/a.storeCapacity-b.store[RESOURCE_ENERGY]/b.storeCapacity;}).reverse()[0];
      } else {
        target = creep.pos.findClosestByPath(targets);
      }
      if (target) {
        console.log(creep.name, 'collecting from storage/container', target, target.store[RESOURCE_ENERGY]);
        return target;
      }
    }

    targets = creep.room.find(FIND_DROPPED_RESOURCES, {
      filter: (resource) => {
        return resource.resourceType == RESOURCE_ENERGY;
      },
    });
    if (targets.length > 0) {
      targets = targets.sort(function(a,b){return a.energy - b.energy}).reverse();
      for (t of targets) {
        if (creep.pos.findPathTo(t)) {
          if (t.energy >= 50) console.log(creep.name, 'picking up dropped resource', t, t.energy);
          return t;
        }
      }
    }

    console.log(creep.name, "Unable to find any available energy");
    return null;
  },
};
