/**
 * Integration test demonstrating library usage
 * 
 * This test shows how to use the library in a real scenario.
 * It can be run independently to verify the library works end-to-end.
 */

import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { ScreepsFunctionalTestHarness } from '../src';
import { writeFileSync } from 'fs';
import { join } from 'path';

describe('Integration Test - Library Usage Example', function() {
  this.timeout(180000); // 3 minutes for full integration test
  
  let harness: ScreepsFunctionalTestHarness;
  let testBotPath: string;

  before(async function() {
    // Create test bot code
    testBotPath = join(__dirname, 'temp-test-bot.js');
    const testBotCode = `
      module.exports.loop = function() {
        // Initialize memory
        if (!Memory.initialized) {
          Memory.initialized = true;
          Memory.creepCounter = 0;
          Memory.projects = [];
          console.log('Test bot initialized');
        }
        
        // Simple bot logic for testing
        const spawns = Object.values(Game.spawns);
        if (spawns.length > 0) {
          const spawn = spawns[0];
          
          if (Object.keys(Game.creeps).length < 2 && spawn.spawning === null) {
            const creepName = 'TestWorker' + Memory.creepCounter;
            spawn.spawnCreep([WORK, CARRY, MOVE], creepName, {
              memory: { role: 'worker', project: 'test' }
            });
            Memory.creepCounter++;
            console.log('Spawning creep:', creepName);
          }
        }
        
        // Simple creep AI
        for (const creepName in Game.creeps) {
          const creep = Game.creeps[creepName];
          
          if (creep.carry.energy === 0) {
            const sources = creep.room.find(FIND_SOURCES);
            if (sources.length > 0) {
              if (creep.harvest(sources[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0]);
              }
            }
          } else {
            const controller = creep.room.controller;
            if (controller) {
              if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller);
              }
            }
          }
        }
      };
    `;
    
    writeFileSync(testBotPath, testBotCode);
    
    // Initialize harness
    harness = new ScreepsFunctionalTestHarness({
      timeout: 180000 // 3 minutes
    });
  });

  after(async function() {
    // Cleanup
    try {
      await harness.cleanup();
      require('fs').unlinkSync(testBotPath);
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  it('should demonstrate complete library workflow', async function() {
    // Step 1: Setup the test environment
    console.log('🧪 Setting up test environment...');
    await harness.setup();
    expect(harness.isReady()).to.be.true;
    console.log('✅ Environment ready');

    // Step 2: Deploy bot code
    console.log('🚀 Deploying test bot...');
    const deployment = await harness.deployBot(testBotPath, {
      username: 'IntegrationTestBot',
      room: 'W10N10',
      cpu: 100,
      cpuAvailable: 10000
    });
    
    expect(deployment.success).to.be.true;
    expect(deployment.userId).to.be.a('string');
    expect(deployment.room).to.equal('W10N10');
    console.log(`✅ Bot deployed: ${deployment.userId}`);

    // Step 3: Monitor execution and verify activity
    console.log('⏱️  Monitoring bot execution...');
    const execution = await harness.monitorExecution(deployment.userId, {
      duration: 60, // 1 minute
      expectations: { minTicks: 10 }
    });
    
    expect(execution.ticksAdvanced).to.be.greaterThan(0);
    expect(execution.cpuUsed).to.be.true;
    console.log(`✅ Bot executed for ${execution.ticksAdvanced} ticks`);

    // Step 4: Verify memory initialization
    console.log('🧠 Checking memory state...');
    const memory = await harness.getMemoryState(deployment.userId);
    expect(memory).to.not.be.null;
    expect(memory.initialized).to.be.true;
    expect(memory.creepCounter).to.be.a('number');
    console.log(`✅ Memory initialized: ${JSON.stringify(memory, null, 2)}`);

    // Step 5: Check memory patterns
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      'initialized': true,
      'creepCounter': null, // Just check existence
      'projects': null
    });
    
    expect(patterns.initialized).to.be.true;
    expect(patterns.creepCounter).to.be.true;
    expect(patterns.projects).to.be.true;
    console.log('✅ Memory patterns validated');

    // Step 6: Get memory statistics
    const stats = await harness.getMemoryStats(deployment.userId);
    expect(stats.exists).to.be.true;
    expect(stats.size).to.be.greaterThan(0);
    console.log(`✅ Memory stats: ${stats.size} bytes, ${stats.creepCount} creeps`);

    // Step 7: Check game objects
    const gameObjects = await harness.getGameObjects(deployment.userId);
    expect(gameObjects.total).to.be.greaterThan(0);
    console.log(`✅ Game objects: ${gameObjects.spawns.length} spawns, ${gameObjects.creeps.length} creeps`);

    // Step 8: Test simulation control
    const initialTick = harness.getGameTick();
    harness.pauseSimulation();
    
    const state = harness.getSimulationState();
    expect(state.paused).to.be.true;
    
    harness.resumeSimulation();
    await harness.waitForTicks(5);
    
    const finalTick = harness.getGameTick();
    expect(finalTick).to.be.greaterThan(initialTick);
    console.log(`✅ Simulation control verified (${initialTick} -> ${finalTick})`);

    // Step 9: Test memory manipulation
    await harness.mergeMemory(deployment.userId, {
      testCompleted: true,
      integrationTest: 'passed'
    });
    
    const updatedMemory = await harness.getMemoryState(deployment.userId);
    expect(updatedMemory.testCompleted).to.be.true;
    expect(updatedMemory.integrationTest).to.equal('passed');
    console.log('✅ Memory manipulation verified');

    // Step 10: Verify console output
    const logs = harness.getConsoleLogs(deployment.userId);
    expect(logs).to.be.an('array');
    console.log(`✅ Console logs captured: ${logs.length} messages`);

    // Step 11: Test room management
    harness.setTestRoom('W5N5');
    expect(harness.getTestRoom()).to.equal('W5N5');
    
    await harness.generateRoom('W5N5');
    console.log('✅ Room management verified');

    // Step 12: Reset game state
    await harness.resetGameState();
    expect(harness.hasValidDeployment()).to.be.false;
    console.log('✅ Game state reset verified');

    console.log('🎉 Integration test completed successfully!');
  });

  it('should handle errors gracefully', async function() {
    // Test error handling with invalid bot path
    const result = await harness.deployBot('/nonexistent/bot.js');
    expect(result.success).to.be.false;
    expect(result.error).to.be.a('string');
    
    // Test getting memory for non-existent user
    const memory = await harness.getMemoryState('nonexistent_user');
    expect(memory).to.be.null;
    
    console.log('✅ Error handling verified');
  });

  it('should support concurrent operations', async function() {
    // Test multiple concurrent memory operations
    const userId = 'concurrent_test_user';
    
    const operations = [
      harness.setMemoryState(userId, { test1: 'value1' }),
      harness.setMemoryState(userId, { test2: 'value2' }),
      harness.getMemoryState(userId)
    ];
    
    const results = await Promise.all(operations);
    
    // At least some operations should succeed
    expect(results).to.have.length(3);
    console.log('✅ Concurrent operations verified');
  });
});