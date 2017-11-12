var helpers = require('helpers');

var roleLinker = {
  locateStorageLink: function(room) {
    if(!room.storage) return;
    var link = room.storage.pos.findInRange(FIND_STRUCTURES, 5, {filter: function(structure) {
        return structure.structureType == STRUCTURE_LINK;
    }})[0];
    room.memory.storageLink = link.id;
  },

  selectLink: function (creep) {
    // Find the nearest link that wants a linker, but without one assigned
    const links = helpers.structuresInRoom(creep.room, STRUCTURE_LINK).filter(function(link){
      // Keep it if there is not a source nearby
      return !(link.pos.findInRange(FIND_SOURCES, 3).length > 0);
    });
    console.log(creep.name, 'selecting a link from', links);
    for (var l of links) {
      var done = true;
      var linkers = helpers.creepsInRoomWithRole(creep.room, 'linker');
      for (var c of linkers) {
        if (c.id == creep.id) continue;
        if (c.memory.link == l.id) {
          console.log(creep.name, c.name, l.id, "occupied");
          done = false;
          continue;
        } else {
          console.log(creep.name, c.name, l.id, "available");
          done = true;
          break;
        }
      }
      if (done) {
        creep.memory.link = l.id;
        break;
      }
    }
  },

  collectFromLink: function(creep, link) {
    helpers.optimizePosition(creep, [
      link, creep.room.storage, creep.room.terminal
    ]);

    let onlyDepositEnergy = false;
    if(link.energy > 0) {
      if (creep.withdraw(link, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(link, {
          visualizePathStyle: {
            stroke: '#ffffff'
          }
        });
      }
    } else {
      var links = helpers.structuresInRoom(creep.room, STRUCTURE_LINK);
      let newUtilization = link.energy;
      for (var li in links) {
        if (link.id == li) continue;
        var l = links[li];
        if (l.energy >= Math.min(l.energyCapacity, creep.carryCapacity)) {
          l.transferEnergy(link);
          newUtilization += l.energy;
        }
        // If my link is about to be full, stop trying
        if (newUtilization == link.energyCapacity) break;
      }
      if (link.energy == 0 && newUtilization == 0) onlyDepositEnergy = this.populateTerminal(creep);
    }
    // Fill storage to 10000, then fill terminal to 10000, then put the rest in storage
    if (
      creep.room.terminal &&
      creep.carry[RESOURCE_ENERGY] > 0 &&
      creep.room.storage.store[RESOURCE_ENERGY] > 10000 &&
      creep.room.terminal.store[RESOURCE_ENERGY] < 10000
    ) {
      // console.log(creep.room.name, creep.name, "energizing terminal");
      if (creep.transfer(creep.room.terminal, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.terminal);
      }
      return;
    }
    if (_.sum(creep.carry) > 0) {
      for (const x in creep.carry) {
        if (onlyDepositEnergy && x != RESOURCE_ENERGY) continue;
        if (creep.transfer(creep.room.storage, x) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage, {
            visualizePathStyle: {
              stroke: '#ffffff'
            }
          });
        }
      }
    }
  },

  populateTerminal: function(creep) {
    if (!creep.room.terminal) return false;

    // Stop if we only have room left for energy
    let mineralAmount = Object.keys(creep.room.terminal.store).reduce(function(sum, key){
      if (key == RESOURCE_ENERGY) {
        return sum;
      } else {
        return sum + creep.room.terminal.store[key];
      }
    }, 0);
    if (creep.room.terminal.storeCapacity - mineralAmount < 10000) return false;

    if (_.sum(creep.carry) < creep.carryCapacity) {
      let maxKey = _.max(Object.keys(creep.room.storage.store).filter(o => o != RESOURCE_ENERGY), function (o) { return creep.room.storage.store[o]; });
      if (
        creep.room.storage.store[maxKey] > 10000 &&
        _.sum(creep.room.terminal.store) < creep.room.terminal.storeCapacity - 10000
      ) {
        // console.log(creep.name, "withdrawing", maxKey, "from storage");
        if (creep.withdraw(creep.room.storage, maxKey) == ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.storage);
        }
        return true;
      }
    } else {
      let maxKey = _.max(Object.keys(creep.carry).filter(o => o != RESOURCE_ENERGY), function (o) { return creep.carry[o]; });
      // console.log(creep.name, "transferring", maxKey, "to terminal");
      if (creep.transfer(creep.room.terminal, maxKey) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.terminal);
      }
      // Only block deposit-to-storage if the creep is full-up on the desired resource
      // The idea here is to burn a tick to clear out anything that might be in the bag
      // so that all future transfers are optimal
      return (creep.carry[maxKey] == creep.carryCapacity);
    }
  },

  populateLink: function(creep, link) {
    if (creep.carry.energy < Math.min(link.energyCapacity-link.energy, creep.carryCapacity)) {
      var containers = link.pos.findInRange(FIND_STRUCTURES, 5, {filter: function(structure) {
          return structure.structureType == STRUCTURE_CONTAINER &&
                 structure.store[RESOURCE_ENERGY] > 500;
      }});
      var container = creep.pos.findClosestByPath(containers);
      if(containers.length > 0 && !container) {
        console.log(creep.name, "unable to reach a container", containers);
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
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
  },

  /** @param {Creep} creep **/
  run: function(creep) {
    var link = Game.getObjectById(creep.memory.link);
    if(!link) {
      console.log(creep.name, "locating a link for", creep.room.name);
      this.selectLink(creep);
    }
    link = Game.getObjectById(creep.memory.link);
    if(!link) {
      console.log(creep.name, "unable to find a link to associate with", creep.memory.link);
      return;
    }
    if(!creep.room.memory.storageLink || !Game.getObjectById(creep.room.memory.storageLink)) {
      console.log(creep.name, "locating the storage link for", creep.room.name);
      this.locateStorageLink(creep.room);
    }
    if(creep.memory.link == creep.room.memory.storageLink) {
      // console.log(creep.name, "withdrawing from link");
      this.collectFromLink(creep, link);
    } else {
      // console.log(creep.name, "collecting for link");
      this.populateLink(creep, link);
    }
  }
};

module.exports = roleLinker;
