var helpers = require('helpers');

function allCreeps() {
  return Object.keys(Game.creeps).map(function(creepName){return Game.creeps[creepName];});
}
function creepsWithRole(role) {
  return allCreeps().filter(function(creep){return creep.memory.role == role;});
}

var roleLinker = {

  /** @param {Creep} creep **/
  run: function(creep) {
    var link = Game.getObjectById(creep.memory.link);
    if(!link) {
      // Find the nearest link without a linker nearby
      var links = creep.room.find(FIND_STRUCTURES, {filter: function(structure) {
          return structure.structureType == STRUCTURE_LINK;
      }});
      for (var li in links) {
        var l = links[li];
        var skip = false;
        var linkers = creepsWithRole('linker');
        for (var ci in linkers) {
          var c = linkers[ci];
          if(c != creep && c.pos.inRangeTo(l, 2)) {
            console.log(creep.name, c.name, l.id, "occupied");
            skip = true;
            break;
          } else {
            console.log(creep.name, c.name, l.id, "available");
          }
        }
        if (skip) continue;
        creep.memory.link = l.id;
        break;
      }
    }
    link = Game.getObjectById(creep.memory.link);
    if(!link) {
      console.log(creep.name, "unable to find a link to associate with", creep.memory.link);
      return;
    }
    // Remote link
    if(creep.memory.link == "59939e142780f21a69f38533") {
      if (creep.carry.energy < creep.carryCapacity) {
        var containers = link.pos.findInRange(FIND_STRUCTURES, 5, {filter: function(structure) {
            return structure.structureType == STRUCTURE_CONTAINER &&
                   structure.store[RESOURCE_ENERGY] > 0;
        }});
        var container = creep.pos.findClosestByPath(containers);
        if(containers.length > 0 && !container) {
          console.log(creep.name, "unable to reach a container", containers);
          creep.moveTo(Game.flags["RallyWhenLost"]);
          return;
        }
        if (creep.withdraw(container, RESOURCE_ENERGY) != 0) {
          creep.moveTo(container, {
            visualizePathStyle: {
              stroke: '#ffaa00'
            }
          });
        }
      } else {
        if (creep.transfer(link, RESOURCE_ENERGY) != 0) {
          creep.moveTo(link, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      }
    }
    // Core link
    if(creep.memory.link == "599487796e119e65e2cc65f1") {
      if(link.energy > 0) {
        if (creep.withdraw(link, RESOURCE_ENERGY) != 0) {
          creep.moveTo(link, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      } else {
        var remoteLink = Game.getObjectById("59939e142780f21a69f38533");
        if (remoteLink.energy >= creep.carryCapacity) {
          remoteLink.transferEnergy(link);
        }
      }
      if (creep.carry.energy > 0) {
        var storage = Game.getObjectById("598f921ba3729f14af2b5c9a");
        if (creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(storage, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      }
    }
  }
};

module.exports = roleLinker;
