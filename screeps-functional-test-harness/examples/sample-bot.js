/**
 * Sample bot for testing the functional test harness
 */

module.exports.loop = function() {
  // Initialize memory
  if (!Memory.initialized) {
    Memory.initialized = true;
    Memory.creepCounter = 0;
    Memory.projects = ['upgrade'];
    Memory.resources = { energy: 0 };
    console.log('Sample bot initialized - memory setup complete');
  }

  // Update tick counter
  Memory.currentTick = Game.time;

  // Simple spawn management
  const spawns = Object.values(Game.spawns);
  if (spawns.length > 0) {
    const spawn = spawns[0];
    
    // Count existing creeps
    const creepCount = Object.keys(Game.creeps).length;
    
    // Spawn new creep if we have room and energy
    if (creepCount < 2 && spawn.spawning === null && spawn.store.energy >= 200) {
      const creepName = 'Worker' + Memory.creepCounter;
      const result = spawn.spawnCreep([WORK, CARRY, MOVE], creepName, {
        memory: { 
          role: 'worker',
          project: 'upgrade',
          born: Game.time
        }
      });
      
      if (result === OK) {
        Memory.creepCounter++;
        console.log('Spawning new worker:', creepName);
      }
    }
    
    // Update spawn info in memory
    if (!Memory.spawns) Memory.spawns = {};
    Memory.spawns[spawn.name] = {
      energy: spawn.store.energy,
      spawning: spawn.spawning ? spawn.spawning.name : null
    };
  }

  // Simple creep AI
  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName];
    
    // Initialize creep memory if needed
    if (!creep.memory.role) {
      creep.memory.role = 'worker';
      creep.memory.project = 'upgrade';
    }
    
    // Simple state machine
    if (creep.store.energy === 0) {
      // Go harvest
      creep.memory.action = 'harvesting';
      const sources = creep.room.find(FIND_SOURCES);
      if (sources.length > 0) {
        if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
          creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
      }
    } else {
      // Go upgrade controller
      creep.memory.action = 'upgrading';
      const controller = creep.room.controller;
      if (controller) {
        if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
          creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}});
        }
      }
    }
  }

  // Clean up dead creeps from memory
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
      console.log('Cleaning up dead creep memory:', name);
    }
  }

  // Update resource tracking
  Memory.resources.energy = 0;
  for (const creepName in Game.creeps) {
    Memory.resources.energy += Game.creeps[creepName].store.energy;
  }
  for (const spawn of Object.values(Game.spawns)) {
    Memory.resources.energy += spawn.store.energy;
  }

  // Log periodic status
  if (Game.time % 10 === 0) {
    console.log(`Tick ${Game.time}: ${Object.keys(Game.creeps).length} creeps, ${Memory.resources.energy} energy`);
  }
};