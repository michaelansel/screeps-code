var _ = require('lodash');
var helpers = require('helpers');

var roleMineralHauler = {
  findReaction: function(compound) {
    for (const a in REACTIONS) {
      for (const b in REACTIONS[a]) {
        if (REACTIONS[a][b] == compound) return [a,b];
      }
    }
    return [];
  },
  chooseInputs: function(output) {
    const room = output.room;
    const reagents = this.findReaction(room.memory.labs[output.id].resource);

    let inputs = [];
    for (let reagent of reagents) {
      const unassignedLabs = helpers.structuresInRoom(room, STRUCTURE_LAB).filter(function(lab){
        return (
          // Not assigned
          !room.memory.labs[lab.id].resource &&
          // In Range
          output.pos.getRangeTo(lab) <= 2
        );
      });

      const input = output.pos.findClosestByRange(unassignedLabs);
      if (input) {
        room.memory.labs[input.id].resource = reagent;
        inputs.push(input);
      }
    }
    return inputs;
  },
  assignLabs: function(room, desiredCompound = 'G') {
    // Reset all labs
    if (!room.memory.labs) room.memory.labs = {};
    for (let lab of helpers.structuresInRoom(room, STRUCTURE_LAB)) {
      room.memory.labs[lab.id] = {};
    }

    if (!Game.flags['LabOutput-'+room.name]) {
      room.createFlag(helpers.structuresInRoom(room, STRUCTURE_LAB)[0].pos, 'LabOutput-'+room.name);
    }

    let output = Game.flags['LabOutput-'+room.name].pos.lookFor(LOOK_STRUCTURES, {filter: (s)=>s.structureType == STRUCTURE_LAB})[0];
    room.memory.labs[output.id].resource = desiredCompound;

    let outputs = [output];
    let inputs = [];
    while (true) {
      for (let lab of outputs) {
        inputs = inputs.concat(this.chooseInputs(lab));
      }
      if (inputs.length > 0) {
        outputs = inputs;
        inputs = [];
      } else {
        break;
      }
    }
  },
  selectPickup: function(creep) {
    var structureSelectors = [
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_CONTAINER).filter(function(structure){
          return _.sum(structure.store)-structure.store[RESOURCE_ENERGY] > 0;
        });
      },
    ];
    var targets = [];
    var i = 0;
    while(!targets.length && i<structureSelectors.length) {
      targets = structureSelectors[i++]();
    }
    if (targets.length > 0) {
      return creep.pos.findClosestByPath(targets);
    }
    return null;
  },
  isValidPickup: function(target) {
    const validTargets = [
      STRUCTURE_CONTAINER,
      STRUCTURE_STORAGE,
    ];

    if (!validTargets.includes(target.structureType)) return false;
    if (target.storeCapacity) return _.sum(target.store)-target.store[RESOURCE_ENERGY] > 0;
  },
  workPickup: function(creep, target) {
    for (let resource of Object.keys(target.store)) {
      if (resource == RESOURCE_ENERGY) continue;
      if (creep.withdraw(target, resource) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {
          visualizePathStyle: {
            stroke: '#ffffff'
          }
        });
        break;
      }
    }
  },
  getMinerals: function(creep) {
    var target = Game.getObjectById(creep.memory.target);
    if (!target || !this.isValidPickup(target)) {
      target = this.selectPickup(creep);
    }
    if(target && this.isValidPickup(target)) {
      creep.memory.target = target.id;
      this.workPickup(creep, target);
    } else {
      console.log(creep.name, "unable to find any resources to haul");
      creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
    }
  },
  selectTarget: function(creep) {
    var structureSelectors = [
      function() {
        return helpers.structuresInRoom(creep.room, STRUCTURE_STORAGE).filter(function(structure){
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
      return creep.pos.findClosestByPath(targets);
    }
    return null;
  },

  isValidTarget: function(target) {
    const validTargets = [
      STRUCTURE_CONTAINER,
      STRUCTURE_STORAGE,
    ];

    if (!validTargets.includes(target.structureType)) return false;
    if (target.storeCapacity) return _.sum(target.store) < target.storeCapacity;
  },

  workTarget: function(creep, target) {
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
  },

  /** @param {Creep} creep **/
  run: function(creep) {
    if (!creep.memory.working && _.sum(creep.carry) == creep.carryCapacity) {
      // Full of energy
      creep.memory.working = true;
      creep.memory.target = null;
    }

    if (creep.memory.working && _.sum(creep.carry) == 0) {
      // Out of energy
      creep.memory.working = false;
      creep.memory.target = null;
    }

    if (creep.memory.working) {
      var target = Game.getObjectById(creep.memory.target);
      if (!target || !this.isValidTarget(target)) {
        target = this.selectTarget(creep);
      }
      if(target && this.isValidTarget(target)) {
        creep.memory.target = target.id;
        this.workTarget(creep, target);
      } else {
        console.log(creep.name, "lots of resources and nowhere to put them");
        creep.moveTo(Game.flags['RallyWhenLost-'+creep.room.name]);
      }
    } else {
      this.getMinerals(creep);
    }
  },
};

module.exports = roleMineralHauler;
