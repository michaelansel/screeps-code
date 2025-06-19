/**
 * Simple test bot for validating the test harness
 */

module.exports.loop = function() {
  // Initialize memory on first run
  if (!Memory.initialized) {
    Memory.initialized = true;
    Memory.tick = Game.time;
    Memory.creepCounter = 0;
    Memory.testHarness = {
      started: Game.time,
      version: '1.0.0'
    };
    console.log(`Test bot initialized at tick ${Game.time}`);
  }
  
  // Update current tick
  Memory.currentTick = Game.time;
  Memory.testHarness.lastTick = Game.time;
  
  // Log every 10 ticks to prove we're running
  if (Game.time % 10 === 0) {
    console.log(`Test bot running: tick ${Game.time}, creeps: ${Object.keys(Game.creeps).length}`);
  }
  
  // Simple spawn logic
  const spawns = Object.values(Game.spawns);
  if (spawns.length > 0) {
    const spawn = spawns[0];
    
    // Count creeps
    const creepCount = Object.keys(Game.creeps).length;
    
    // Spawn a creep if we have less than 2 and enough energy
    if (creepCount < 2 && spawn.store.energy >= 200 && !spawn.spawning) {
      const creepName = `TestWorker${Memory.creepCounter}`;
      const result = spawn.spawnCreep([WORK, CARRY, MOVE], creepName, {
        memory: { 
          role: 'worker',
          born: Game.time,
          id: Memory.creepCounter
        }
      });
      
      if (result === OK) {
        Memory.creepCounter++;
        console.log(`Spawned creep: ${creepName}`);
      } else {
        console.log(`Failed to spawn creep: ${result}`);
      }
    }
    
    // Update spawn status in memory
    Memory.spawn = {
      name: spawn.name,
      energy: spawn.store.energy,
      spawning: spawn.spawning ? spawn.spawning.name : null
    };
  }
  
  // Simple creep AI
  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName];
    
    if (creep.store.energy === 0) {
      // Find and harvest from source
      const sources = creep.room.find(FIND_SOURCES);
      if (sources.length > 0) {
        if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
          creep.moveTo(sources[0]);
        }
      }
    } else {
      // Find and upgrade controller
      if (creep.room.controller) {
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.controller);
        }
      }
    }
  }
  
  // Clean up dead creeps
  for (const name in Memory.creeps) {
    if (!Game.creeps[name]) {
      delete Memory.creeps[name];
      console.log(`Cleaned up dead creep: ${name}`);
    }
  }
  
  // Update statistics
  Memory.stats = {
    tick: Game.time,
    creeps: Object.keys(Game.creeps).length,
    spawns: Object.keys(Game.spawns).length,
    cpu: Game.cpu.getUsed(),
    bucket: Game.cpu.bucket
  };
};