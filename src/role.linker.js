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
    if(link.energy > 0) {
      if (creep.withdraw(link, RESOURCE_ENERGY) != 0) {
        creep.moveTo(link, {
          visualizePathStyle: {
            stroke: '#ffffff'
          }
        });
      }
    } else {
      var links = helpers.structuresInRoom(creep.room, STRUCTURE_LINK);
      for (var li in links) {
        if (link.id == li) continue;
        var l = links[li];
        if (l.energy >= Math.min(l.energyCapacity, creep.carryCapacity)) {
          l.transferEnergy(link);
        }
        // If my link is full, stop trying
        if (link.energy == link.energyCapacity) break;
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
