var helpers = require('helpers');

var roleRecycle = {

  /** @param {Creep} creep **/
  run: function(creep) {
    // Unload resources if possible
    if (
      _.sum(creep.carry) > 0 &&
      helpers.structuresInRoom(creep.room, [STRUCTURE_STORAGE, STRUCTURE_CONTAINER]).length > 0
    ) {
      let dump = creep.pos.findClosestByPath(helpers.structuresInRoom(creep.room, [STRUCTURE_STORAGE, STRUCTURE_CONTAINER]));
      for (let k in creep.carry) {
        if (creep.transfer(dump, k) == ERR_NOT_IN_RANGE) {
          creep.moveTo(dump);
        }
      }
      return;
    }

    let target = Game.getObjectById(creep.memory.target);
    if (!(target instanceof StructureSpawn)) target = null;
    if (!target) {
      target = creep.pos.findClosestByPath(helpers.structuresInRoom(creep.room, STRUCTURE_SPAWN));
      creep.memory.target = target.id;
    }
    if (!target) {
      // TODO find an owned room to die in
      console.log(creep.name, 'wants to die, but can\'t');
      return;
    }
    if (target.recycleCreep(creep) == ERR_NOT_IN_RANGE) {
      creep.moveTo(target);
    }
  }
};

module.exports = roleRecycle;
