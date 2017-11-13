var helpers = require('helpers');
var towerLogic = require('tower');
var spawnLogic = require('spawn');
var creepManager = require('creep_manager');

const RoomManager = {
  marketSell: function (room) {
    if (_.isString(room)) room = Game.rooms[room];
    // Terminal busy; try again later
    if (room.terminal.cooldown > 0) return;

    const maxKey = _.max(Object.keys(room.terminal.store).filter(o => o != RESOURCE_ENERGY), function (o) { return room.terminal.store[o]; });
    let orders = Game.market.getAllOrders({type: ORDER_BUY, resourceType: maxKey});
    if (orders.length == 0) {
      console.log('No open buy orders to deal with');
      return;
    }
    orders = _.sortBy(orders, ['price'])
    const bestPrice = orders[orders.length-1].price;

    // Hardcoded minimum price to prevent massive loss
    if (bestPrice < 0.25) return;

    orders = _.filter(orders, {price: bestPrice});
    for (let order of orders) {
      order.energyCost = Game.market.calcTransactionCost(
        Math.min(order.remainingAmount, room.terminal.store[maxKey]),
        room.name,
        order.roomName
      );
      order.energyRate = order.energyCost / order.remainingAmount;
    }
    orders = _.sortBy(orders, ['energyRate']);
    const order = orders[0];
    const dealAmount = Math.min(
      order.remainingAmount,
      room.terminal.store[maxKey],
      Math.floor(room.terminal.store[RESOURCE_ENERGY] / order.energyRate)
    );
    if (dealAmount > 1000) {
      console.log("Selected order:", JSON.stringify(order));
      console.log("Deal amount:", dealAmount);
      let ret = Game.market.deal(order.id, dealAmount, room.name);
      if (ret != OK) console.log("Unable to deal: " + ret);
    }
  },

  run: function (room) {
    room.state = {};
    // Independent state
    room.state.underAttack = (room.find(FIND_HOSTILE_CREEPS).length > 0);
    room.state.atRiskOfDowngrading = (room.controller.ticksToDowngrade < 3000);
    room.state.workerEnergyAvailable = (
      helpers.structuresInRoom(room, [STRUCTURE_CONTAINER, STRUCTURE_STORAGE]).reduce(function(total, structure){
        return total + structure.store[RESOURCE_ENERGY];
      }, 0) +
      room.find(FIND_DROPPED_RESOURCES, {
        filter: (resource) => {
          return resource.resourceType == RESOURCE_ENERGY;
        },
      }).reduce(function(total, resource){
        return total + resource.amount;
      }, 0)
    );

    // Dependent state
    room.state.workerEnergyReserved = 0; // initialize; updated by refreshEnergyReservations
    room.state.workersWithEnergyReserved = []; // initialize; updated by refreshEnergyReservations
    helpers.refreshEnergyReservations(room);

    // Notify on underAttack rising edge
    // if (room.state.underAttack && !room.memory.underAttack) Game.notify("Hostiles detected at tick " + Game.time, 10);
    room.memory.underAttack = room.state.underAttack;

    if (!Memory.stats.roomSummary[room.name]) Memory.stats.roomSummary[room.name] = {};
    let stats = Memory.stats.roomSummary[room.name];
    stats.num_creeps = helpers.allCreepsInRoom(room).length;

    if (
      room.terminal &&
      _.sum(room.terminal.store) > 0.9 * room.terminal.storeCapacity &&
      room.storage &&
      _.sum(room.storage.store) > 0.5 * room.storage.storeCapacity
    ) {
      console.log(room.name, "terminal over 90% full; performing a market sale")
      RoomManager.marketSell(room);
    }

    var spawns = helpers.structuresInRoom(room, STRUCTURE_SPAWN);
    // Only run spawn logic if we aren't already occupied spawning things
    if(!spawns.every(function(spawn){return spawn.spawning;})) {
      spawnLogic.run(room);
    }
    for(var spawn of spawns) {
      spawnLogic.runAlways(spawn);
    }

    if(room.controller.level > 2) {
      var towers = helpers.structuresInRoom(room, STRUCTURE_TOWER);
      for (var ti in towers) {
        var tower = towers[ti];
        if (tower.isActive()) towerLogic.run(tower);
      }
    }

    for (const creep of helpers.allCreepsInRoom(room)) {
      creepManager.run(creep);
    }
  },

  runPeriodic: function(room) {
    if (!room.controller || !room.controller.my) return;

    if (!room.memory.desiredCreepCounts) {
      room.memory.desiredCreepCounts = {
        hauler: 1,
        upgrader: 0,
        builder: 0,
        linker: 0,
      };
    }
    if(!room.memory.fortifyLevel) room.memory.fortifyLevel = 150000;
    if(!room.memory.repairLevel) room.memory.repairLevel = 0.75;

    // Update desired number of upgraders
    if (room.controller.level < 4) {
      // If low RCL, upgrade freely
      room.memory.desiredCreepCounts.upgrader = 1;
    } else {
      // If energy is bountiful, upgrade freely
      if (room.storage && room.storage.store[RESOURCE_ENERGY] > 10000) {
        room.memory.desiredCreepCounts.upgrader = 1;
      } else {
        // If controller is getting a bit low, upgrade it
        if (room.controller.ticksToDowngrade < 0.5 * CONTROLLER_DOWNGRADE[room.controller.level]) {
          room.memory.desiredCreepCounts.upgrader = 1;
        } else {
          // Energy is constrained, the controller is fine for at least 10k ticks (RCL4+), don't upgrade it
          room.memory.desiredCreepCounts.upgrader = 0;
          // Controller is full; recycle all upgraders until resources are unconstrained
          if (room.controller.ticksToDowngrade >= 0.99 * CONTROLLER_DOWNGRADE[room.controller.level]) {
            console.log(room.name, 'recycling unneeded upgraders');
            for (let creep of helpers.creepsInRoomWithRole(room, 'upgrader')) {
              creep.memory.role = 'recycle';
            }
          }
        }
      }
    }

    // Update desired number of linkers
    const links = helpers.structuresInRoom(room, STRUCTURE_LINK).filter(function(link){
      // Keep it if there is not a source nearby
      return !(link.pos.findInRange(FIND_SOURCES, 3).length > 0);
    });
    room.memory.desiredCreepCounts.linker = links.length;

    // Update desired number of miners
    const extractors = helpers.structuresInRoom(room, STRUCTURE_EXTRACTOR).filter(function(extractor){
      const mineral = extractor.pos.lookFor(LOOK_MINERALS)[0];
      // Only spawn miners when there are resources to mine
      return mineral && mineral.mineralAmount > 0;
    });
    room.memory.desiredCreepCounts.miner = extractors.length;
    room.memory.desiredCreepCounts.minhauler = Math.min(
      1,
      // miner to populate container
      helpers.creepsInRoomWithRole(room, 'miner').length,
      // container near extractor
      helpers.structuresInRoom(room, STRUCTURE_CONTAINER).filter(s => s.pos.findInRange(extractors, 3).length > 0).length
    );

    if(!room.memory.roomsToClaim) room.memory.roomsToClaim = [];
    room.memory.roomsToClaim = room.memory.roomsToClaim.filter(function(rn){return !(Game.rooms[rn] && Game.rooms[rn].controller.my);});
    room.memory.desiredCreepCounts.claimer = room.memory.roomsToClaim.length;

    // Update desired number of longhaulers
    if(
      room.storage &&
      _.sum(room.storage.store) > 50000 &&
      !room.terminal &&
      room.find(FIND_CONSTRUCTION_SITES, {filter: cs => cs.structureType == STRUCTURE_TERMINAL}).length == 0
    ) {
      const terminals = Object.keys(Game.rooms).filter(r => Game.rooms[r].terminal && Game.rooms[r].terminal.my);
      const nearestMarket = terminals.sort(function(a,b){
        return Game.map.findRoute(room, Game.rooms[a]).length - Game.map.findRoute(room, Game.rooms[b]).length;
      })[0];
      let desiredLongHaulers = 2 * Game.map.findRoute(room, nearestMarket).length;
      // Account for all longhaulers assigned to this room
      room.memory.desiredCreepCounts.longhauler = Math.max(
        0,
        desiredLongHaulers - helpers.creepsWithRole('longhauler').filter(c => c.memory.haulSourceRoom == room.name).length
      );
    } else {
      room.memory.desiredCreepCounts.longhauler = 0;
    }

    // Remove reservations from dead creeps
    room.memory.energyReservations = room.memory.energyReservations.filter(function(res){
      return !!Game.creeps[res.name];
    });

    spawnLogic.bootstrap(room);
  },
};

module.exports = RoomManager;
