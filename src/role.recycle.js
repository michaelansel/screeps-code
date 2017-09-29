var helpers = require('helpers');

var roleRecycle = {

  /** @param {Creep} creep **/
  run: function(creep) {
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
