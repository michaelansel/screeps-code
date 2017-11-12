const _ = require('lodash');
var creepCache, structureCache;

var Helpers = {
  initializeCache: function() {
    creepCache = {
      allCreeps: null,
      creepsWithRole: {},
      allCreepsInRoom: {},
      creepsInRoomWithRole: {},
    };

    structureCache = {
      byRoomStructureType: {},
    };
  },

  allCreeps: function() {
    if (!creepCache.allCreeps) creepCache.allCreeps =
      Object.keys(Game.creeps).map(function(creepName){return Game.creeps[creepName];});
    return creepCache.allCreeps;
  },

  creepsWithRole: function(role) {
    if (!creepCache.creepsWithRole[role]) creepCache.creepsWithRole[role] =
      Helpers.allCreeps().filter(function(creep){return creep.memory.role == role;});
    return creepCache.creepsWithRole[role];
  },

  allCreepsInRoom: function (room) {
    if (room instanceof Room) room = room.name;
    if (!creepCache.allCreepsInRoom[room]) creepCache.allCreepsInRoom[room] =
      Helpers.allCreeps().filter(function(creep){return creep.room.name == room && !creep.memory.room;});
    return creepCache.allCreepsInRoom[room];
  },

  creepsInRoomWithRole: function (room, role) {
    if (room instanceof Room) room = room.name;
    var key = [room,role].join(',');
    if (!creepCache.creepsInRoomWithRole[key]) creepCache.creepsInRoomWithRole[key] =
      Helpers.allCreepsInRoom(room).filter(function(creep){return creep.memory.role == role && !creep.memory.room;});
    return creepCache.creepsInRoomWithRole[key];
  },

  creepsWithRoleAssignedToRoom: function (room, role) {
    if (room instanceof Room) room = room.name;
    return Helpers.creepsWithRole(role).filter(function(creep){return creep.memory.room == room});
  },

  structuresInRoom: function (room, type) {
    if (room instanceof Room) room = room.name;
    if (type instanceof Array) types = type; else types = [type];
    var result = [];
    for (const type of types) {
      var key = [room,type].join(',');
      if (!structureCache.byRoomStructureType[key]) structureCache.byRoomStructureType[key] =
        Game.rooms[room].find(FIND_STRUCTURES, {filter:function(s){return s.structureType == type;}});
      // TODO verify the semantics of concat
      result = result.concat(structureCache.byRoomStructureType[key]);
    }
    return result;
  },

  addEnergyReservation: function(creep) {
    let room = creep.room;
    if (!room.memory.energyReservations) room.memory.energyReservations = [];
    let reservations = room.memory.energyReservations;

    for (let res of room.memory.energyReservations) {
      if (res.name == creep.name) return;
    }

    let reservation = {
      role: creep.memory.role,
      name: creep.name,
      amount: Math.min(200, creep.carryCapacity - _.sum(creep.carry)),
    };

    console.log(
      reservation.name, '('+reservation.role+') reserving', reservation.amount, 'energy',
      '('+creep.room.state.workerEnergyReserved+'/'+creep.room.state.workerEnergyAvailable+' already reserved)'
    );
    reservations.push(reservation);
  },

  energyReservedForCreep: function(creep) {
    return creep.room.state.workersWithEnergyReserved.includes(creep.name);
  },

  refreshEnergyReservations: function (room) {
    let priority = [
      "hauler",
      "builder",
      "linker",
      "upgrader",
    ];

    if (!room.memory.energyReservations) room.memory.energyReservations = [];

    // Priority sort reservations
    room.memory.energyReservations.sort(function(resA, resB){
      if (resA.role != resB.role) {
        return priority.indexOf(resA.role) - priority.indexOf(resB.role);
      } else {
        return resA.amount - resB.amount;
      }
    });

    if (room.state.atRiskOfDowngrading) {
      // Move an upgrader to the front
      let upRes = _.find(room.memory.energyReservations, function(res){ return res.role == 'upgrader';});
      if (upRes) {
        console.log(room.name, 'prioritizing upgrader', upRes.name);
        room.memory.energyReservations.splice(room.memory.energyReservations.indexOf(upRes), 1);
        room.memory.energyReservations.splice(0, 0, upRes);
      }
    }

    if (room.memory.energyReservations.length > 0) console.log(room.name, 'sorted reservations', room.memory.energyReservations.map(function(res){return [res.role, res.name,res.amount].join('-');}).join(', '));

    // Pull the max number of reservations we can fit in the available energy
    let i=0;
    while (
      i < room.memory.energyReservations.length &&
      (
        room.state.workerEnergyReserved +
        room.memory.energyReservations[i].amount
      ) <= room.state.workerEnergyAvailable
    ) {
      let res = room.memory.energyReservations[i];
      room.state.workerEnergyReserved += res.amount;
      room.state.workersWithEnergyReserved.push(res.name);
      i++;
    }

    if (i<room.memory.energyReservations.length) {
      // not enough energy to fill all reservations
      room.state.workerEnergyReserved = room.state.workerEnergyAvailable;
    }

    if (room.state.workersWithEnergyReserved.length > 0) {
      console.log('workersWithEnergyReserved', JSON.stringify(room.state.workersWithEnergyReserved), room.state.workerEnergyReserved, room.state.workerEnergyAvailable);
    }
    console.log(
      room.name,
      'energy',
      room.state.workerEnergyReserved,
      room.state.workerEnergyAvailable
    );
  },

  allowedToGetEnergy: function (creep) {
    return (
      !creep.room.controller ||
      !creep.room.controller.my ||
      (
        (
          // energy available
          creep.room.state.workerEnergyAvailable >=
          Math.min(200, creep.carryCapacity - _.sum(creep.carry))
        ) && (
          // not all energy reserved
          creep.room.state.workerEnergyReserved < creep.room.state.workerEnergyAvailable ||
          // energy already reserved for this creep
          this.energyReservedForCreep(creep)
        )
      )
    );
  },

  getEnergy: function(creep, prioritizeFull=false) {
    var target = Game.getObjectById(creep.memory.target);
    if (!target) {
      if (this.allowedToGetEnergy(creep)) {
        if (creep.room.controller && creep.room.controller.my) console.log(creep.name, 'looking for energy', creep.room.state.workerEnergyAvailable, creep.room.state.workerEnergyReserved, this.energyReservedForCreep(creep));
        target = this.findAvailableEnergy(creep, prioritizeFull);
      } else {
        this.addEnergyReservation(creep);
      }
    }
    if (target) {
      this.getEnergyFromTarget(creep, target);
    } else {
      var containers = this.structuresInRoom(creep.room, STRUCTURE_CONTAINER);
      if (containers.length == 0 && creep.body.includes(WORK)) {
        creep.memory.returnToRole = creep.memory.role;
        creep.memory.role = 'harvester';
        console.log(creep.name, 'No containers to pull from, harvesting instead');
      } else {
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
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

    const gotEnergyFromTarget = function() {
      // Remove all reservations for this creep
      if (!creep.room.memory.energyReservations) creep.room.memory.energyReservations = [];
      creep.room.memory.energyReservations = creep.room.memory.energyReservations.filter(function(res){
        return res.name != creep.name;
      });
    }

    if (target instanceof Source) {
      if (target.energy == 0) {
        console.log(creep.name, "giving up on previous source", creep.memory.target);
        creep.memory.target = null;
        return;
      }
      if (creep.harvest(target) == OK) {
        gotEnergyFromTarget();
      } else {
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
        if (creep.withdraw(target, RESOURCE_ENERGY) == OK) {
          gotEnergyFromTarget();
        } else {
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
        if (creep.pickup(target) == OK) {
          gotEnergyFromTarget();
        } else {
          moveToTarget();
        }
      }
    }
  },

  findAvailableEnergy: function(creep, prioritizeFull) {
    var targets;

    if (creep.room.memory.outOfEnergy > Game.time) {
      console.log(creep.room.name, 'blacklisted');
      return null;
    }

    targets = creep.room.find(FIND_DROPPED_RESOURCES, {
      filter: (resource) => {
        if (resource.resourceType != RESOURCE_ENERGY) return false;
        if (prioritizeFull) {
          // Pick up any energy when in rebalancing mode
          return resource.energy >= 0;
        } else {
          // Normally, only pick up dropped energy if it will fill us up
          return resource.energy >= (creep.carryCapacity - _.sum(creep.carry));
        }
      },
    });
    if (targets.length > 0) {
      targets = targets.sort(function(a,b){return a.energy - b.energy}).reverse();
      for (t of targets) {
        const endOfPath = creep.pos.findPathTo(t).reverse()[0];
        if (endOfPath && endOfPath.x == t.pos.x && endOfPath.y == t.pos.y) {
          console.log(creep.name, 'picking up dropped resource', t, t.energy);
          return t;
        }
      }
    }

    targets = this.structuresInRoom(creep.room, [STRUCTURE_CONTAINER, STRUCTURE_STORAGE]).filter(function(structure){
      return structure.store[RESOURCE_ENERGY] >= Math.min(200, creep.carryCapacity - _.sum(creep.carry));
    });
    if (targets.length == 0) {
      targets = this.structuresInRoom(creep.room, [STRUCTURE_CONTAINER, STRUCTURE_STORAGE]).filter(function(structure){
        return structure.store[RESOURCE_ENERGY] >= 0;
      });
    }
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

    console.log(creep.name, "unable to find any available energy.", creep.room.name, 'blacklisted for 5 ticks');
    creep.room.memory.outOfEnergy = Game.time+5;
    return null;
  },

  runLengthEncoding: function (data) {
    return data.reduce(function(rle, element){
      if (rle[rle.length-1][0] == element) {
        rle[rle.length-1][1] += 1;
      } else {
        rle.push([element, 1]);
      }
      return rle;
    }, [[null, 0]]).slice(1).map(function(entry){
      return entry.reverse().join('x ');
    }).join(',');
  },

  optimizePosition: function (creep, objects) {
    // Filter out undefined entries
    objects = objects.filter(o => !!o);
    // Stable key for cache invalidation
    objectsKey = objects.map(o => o.id).sort().join(',');

    if (
      !creep.memory.hasOwnProperty('optimalPosition') ||
      creep.memory.optimalPosition.objects != objectsKey
    ) {
      // Get all potential optimal positions (within 1 space of each target)
      let candidates = {};
      let excluded = [];
      for (const obj of objects) {
        candidates[obj.id] = [];
        if ( // exclude non-walkable structures
          !(obj instanceof StructureContainer)
        ) {
          excluded.push([obj.pos.x, obj.pos.y].join(','));
        }
        for (const dx of [-1,0,1]) {
          for (const dy of [-1,0,1]) {
            let x = obj.pos.x+dx, y = obj.pos.y+dy;
            let objs = creep.room.lookAt(x,y).filter(function(look){
              // Filter out ramparts and containers (walkable structures)
              return !(
                (look.type == 'structure' && look.structure.structureType == STRUCTURE_RAMPART) ||
                (look.type == 'structure' && look.structure.structureType == STRUCTURE_CONTAINER) ||
                (look.type == 'creep' && look.creep.id == creep.id)
              );
            });
            if (
              objs.length == 1 &&
              objs[0].type == 'terrain' &&
              objs[0].terrain == 'plain'
            ) {
              candidates[obj.id].push([x, y].join(','));
            }
          }
        }
      }
      console.log("Candidates:", JSON.stringify(_.values(candidates)));
      console.log("Excluded:", JSON.stringify(excluded));
      let optimal = _.difference(_.intersection( ...(_.values(candidates)) ), excluded);
      console.log("Optimal:", JSON.stringify(optimal));

      if (optimal.length > 0) {
        console.log("Found optimal position(s): ", optimal.join(';'))
        let pos = optimal[0].split(',');
        creep.memory.optimalPosition = {
          valid: true,
          objects: objectsKey,
          x: parseInt(pos[0]),
          y: parseInt(pos[1]),
        };
      } else {
        console.log("Unable to locate optimal position");
        creep.memory.optimalPosition = {
          valid: false,
          objects: objectsKey,
        };
      }
    }

    if (
      creep.memory.optimalPosition.valid &&
      !(
        creep.pos.x == creep.memory.optimalPosition.x &&
        creep.pos.y == creep.memory.optimalPosition.y
      )
    ) {
      creep.moveTo(
        creep.memory.optimalPosition.x,
        creep.memory.optimalPosition.y
      );
    }
  }
};

module.exports = Helpers;
