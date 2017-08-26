var helpers = require('helpers');

function allCreeps() {
  return Object.keys(Game.creeps).map(function(creepName){return Game.creeps[creepName];});
}
function creepsWithRole(role) {
  return allCreeps().filter(function(creep){return creep.memory.role == role;});
}

var roleLinker = {
  locateStorageLink: function(room) {
    if(!room.storage) return;
    var link = room.storage.pos.findInRange(FIND_STRUCTURES, 5, {filter: function(structure) {
        return structure.structureType == STRUCTURE_LINK;
    }})[0];
    if(!Memory.storageLink) Memory.storageLink = {};
    Memory.storageLink[room.name] = link.id;
  },

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
          if(c != creep && c.pos.inRangeTo(l, 5)) {
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
    if(!Memory.storageLink) {
      this.locateStorageLink(creep.room);
    }
    if(creep.memory.link == Memory.storageLink[creep.room.name]) {
      // Core link
      if(link.energy > 0) {
        if (creep.withdraw(link, RESOURCE_ENERGY) != 0) {
          creep.moveTo(link, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      } else {
        // Find the nearest link without a linker nearby
        var links = creep.room.find(FIND_STRUCTURES, {filter: function(structure) {
            return structure.structureType == STRUCTURE_LINK;
        }});
        for (var li in links) {
          var l = links[li];
          if (l.energy >= creep.carryCapacity) {
            l.transferEnergy(link);
          }
          if (l.energy == l.energyCapacity) break;
        }
      }
      if (creep.carry.energy > 0) {
        if (creep.transfer(creep.room.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      }
    } else {
      // Remote links
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
  }
};

module.exports = roleLinker;
