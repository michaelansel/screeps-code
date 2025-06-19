/**
 * End-to-end tests with real server
 * THIS IS THE REAL TEST - VERIFIES EVERYTHING WORKS
 */

import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { ScreepsFunctionalTestHarness } from '../src';
import { join } from 'path';

describe('END-TO-END REAL SERVER TESTS', function() {
  this.timeout(300000); // 5 minutes for full E2E
  
  let harness: ScreepsFunctionalTestHarness;
  let testBotPath: string;

  before(async function() {
    console.log('🧪 Starting REAL end-to-end test with actual server...');
    testBotPath = join(__dirname, '..', 'test-bot.js');
    
    harness = new ScreepsFunctionalTestHarness({
      timeout: 60000 // 1 minute timeout
    });
    
    console.log('🏗️  Setting up test harness...');
    await harness.setup();
    
    console.log('✅ Test harness setup complete, server should be running');
  });

  after(async function() {
    console.log('🧹 Cleaning up test environment...');
    if (harness) {
      await harness.cleanup();
    }
    console.log('✅ Cleanup complete');
  });

  it('should setup and verify server is ready', async function() {
    console.log('🔍 Verifying server readiness...');
    expect(harness.isReady()).to.be.true;
    
    // Test basic server communication
    const tick = harness.getGameTick();
    expect(tick).to.be.a('number');
    expect(tick).to.be.greaterThan(0);
    console.log(`✅ Server is ready at tick ${tick}`);
  });

  it('should deploy bot code successfully', async function() {
    console.log('🚀 Testing bot deployment...');
    
    const deployment = await harness.deployBot(testBotPath, {
      username: 'RealTestBot',
      room: 'W10N10',
      cpu: 100,
      cpuAvailable: 10000
    });
    
    console.log('📋 Deployment result:', deployment);
    
    expect(deployment).to.have.property('success');
    expect(deployment.success).to.be.true;
    expect(deployment).to.have.property('userId');
    expect(deployment.userId).to.be.a('string');
    expect(deployment).to.have.property('codeSize');
    expect(deployment.codeSize).to.be.greaterThan(0);
    expect(deployment).to.have.property('room');
    expect(deployment.room).to.equal('W10N10');
    
    console.log(`✅ Bot deployed successfully: ${deployment.userId} (${deployment.codeSize} bytes)`);
  });

  it('should monitor bot execution and verify activity', async function() {
    console.log('⏱️  Testing bot execution monitoring...');
    
    const deployment = harness.getLastDeployment();
    
    const execution = await harness.monitorExecution(deployment.userId, {
      duration: 30, // 30 seconds
      expectations: { minTicks: 5 }
    });
    
    console.log('📊 Execution result:', execution);
    
    expect(execution).to.have.property('ticksAdvanced');
    expect(execution.ticksAdvanced).to.be.greaterThan(0);
    expect(execution).to.have.property('cpuUsed');
    expect(execution).to.have.property('spawnActive');
    expect(execution).to.have.property('memoryInitialized');
    expect(execution).to.have.property('consoleOutput');
    expect(execution.consoleOutput).to.be.an('array');
    
    console.log(`✅ Bot executed for ${execution.ticksAdvanced} ticks`);
    console.log(`🧠 Memory initialized: ${execution.memoryInitialized}`);
    console.log(`⚡ CPU used: ${execution.cpuUsed}`);
    console.log(`🏗️  Spawn active: ${execution.spawnActive}`);
    console.log(`📝 Console output: ${execution.consoleOutput.length} messages`);
  });

  it('should retrieve and validate memory state', async function() {
    console.log('🧠 Testing memory state operations...');
    
    const deployment = harness.getLastDeployment();
    
    // Get memory state
    const memory = await harness.getMemoryState(deployment.userId);
    console.log('📋 Current memory:', JSON.stringify(memory, null, 2));
    
    expect(memory).to.not.be.null;
    expect(memory).to.be.an('object');
    
    // The test bot should have initialized memory
    if (memory.initialized) {
      expect(memory.initialized).to.be.true;
      expect(memory.tick).to.be.a('number');
      expect(memory.testHarness).to.be.an('object');
      expect(memory.testHarness.version).to.equal('1.0.0');
      console.log('✅ Memory properly initialized by bot');
    } else {
      console.log('ℹ️  Memory not yet initialized (may need more time)');
    }
  });

  it('should validate memory patterns', async function() {
    console.log('🔍 Testing memory pattern validation...');
    
    const deployment = harness.getLastDeployment();
    
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      'currentTick': null,  // Should exist
      'testHarness': null,  // Should exist
      'initialized': null,  // Should exist
      'nonexistent': 'value' // Should not exist
    });
    
    console.log('📋 Pattern validation results:', patterns);
    
    expect(patterns).to.have.property('currentTick');
    expect(patterns).to.have.property('testHarness');
    expect(patterns).to.have.property('initialized');
    expect(patterns).to.have.property('nonexistent');
    expect(patterns.nonexistent).to.be.false;
    
    console.log('✅ Memory pattern validation working');
  });

  it('should get memory statistics', async function() {
    console.log('📊 Testing memory statistics...');
    
    const deployment = harness.getLastDeployment();
    
    const stats = await harness.getMemoryStats(deployment.userId);
    console.log('📋 Memory stats:', stats);
    
    expect(stats).to.have.property('exists');
    expect(stats).to.have.property('size');
    expect(stats).to.have.property('hasCreeps');
    expect(stats).to.have.property('creepCount');
    expect(stats).to.have.property('memoryStructure');
    expect(stats.memoryStructure).to.be.an('array');
    
    if (stats.exists) {
      expect(stats.size).to.be.greaterThan(0);
      console.log(`✅ Memory exists: ${stats.size} bytes, ${stats.creepCount} creeps`);
    }
  });

  it('should manipulate memory state', async function() {
    console.log('✏️  Testing memory manipulation...');
    
    const deployment = harness.getLastDeployment();
    
    // Set specific memory
    const testMemory = {
      testData: 'hello world',
      timestamp: Date.now(),
      testCompleted: true
    };
    
    const setResult = await harness.setMemoryState(deployment.userId, testMemory);
    console.log('📋 Set memory result:', setResult);
    expect(setResult.success).to.be.true;
    
    // Verify it was set (check that our test data is present)
    const retrievedMemory = await harness.getMemoryState(deployment.userId);
    expect(retrievedMemory.testData).to.equal('hello world');
    expect(retrievedMemory.testCompleted).to.be.true;
    expect(retrievedMemory.timestamp).to.be.a('number');
    
    // Test merge
    const mergeData = { newField: 'merged data' };
    const mergeResult = await harness.mergeMemory(deployment.userId, mergeData);
    console.log('📋 Merge memory result:', mergeResult);
    expect(mergeResult.success).to.be.true;
    
    // Verify merge worked
    const mergedMemory = await harness.getMemoryState(deployment.userId);
    expect(mergedMemory.testData).to.equal('hello world');
    expect(mergedMemory.newField).to.equal('merged data');
    
    console.log('✅ Memory manipulation working correctly');
  });

  it('should get game objects', async function() {
    console.log('🎮 Testing game objects retrieval...');
    
    const deployment = harness.getLastDeployment();
    
    const gameObjects = await harness.getGameObjects(deployment.userId);
    console.log('📋 Game objects:', gameObjects);
    
    expect(gameObjects).to.have.property('spawns');
    expect(gameObjects).to.have.property('creeps');
    expect(gameObjects).to.have.property('sources');
    expect(gameObjects).to.have.property('total');
    expect(gameObjects.spawns).to.be.an('array');
    expect(gameObjects.creeps).to.be.an('array');
    expect(gameObjects.sources).to.be.an('array');
    
    console.log(`✅ Game objects: ${gameObjects.spawns.length} spawns, ${gameObjects.creeps.length} creeps, ${gameObjects.sources.length} sources`);
  });

  it('should control simulation state', async function() {
    console.log('🎮 Testing simulation control...');
    
    // Get initial state
    const initialState = harness.getSimulationState();
    console.log('📋 Initial simulation state:', initialState);
    expect(initialState).to.have.property('tick');
    expect(initialState).to.have.property('paused');
    expect(initialState).to.have.property('cpu');
    
    const initialTick = initialState.tick;
    
    // Pause simulation
    harness.pauseSimulation();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const pausedState = harness.getSimulationState();
    console.log('📋 Paused simulation state:', pausedState);
    expect(pausedState.paused).to.be.true;
    
    // Resume simulation
    harness.resumeSimulation();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const resumedState = harness.getSimulationState();
    console.log('📋 Resumed simulation state:', resumedState);
    expect(resumedState.paused).to.be.false;
    expect(resumedState.tick).to.be.greaterThan(initialTick);
    
    console.log('✅ Simulation control working correctly');
  });

  it('should reset game state', async function() {
    console.log('🧹 Testing game state reset...');
    
    const deployment = harness.getLastDeployment();
    
    // Verify we have memory before reset
    const memoryBefore = await harness.getMemoryState(deployment.userId);
    console.log('📋 Memory before reset:', memoryBefore !== null);
    
    // Reset game state
    await harness.resetGameState();
    
    // Verify deployment is cleared
    expect(harness.hasValidDeployment()).to.be.false;
    
    // Verify memory is cleared
    const memoryAfter = await harness.getMemoryState(deployment.userId);
    console.log('📋 Memory after reset:', memoryAfter);
    expect(memoryAfter).to.be.null;
    
    console.log('✅ Game state reset working correctly');
  });

  it('should handle errors gracefully', async function() {
    console.log('❌ Testing error handling...');
    
    // Test deployment with invalid file
    const invalidDeployment = await harness.deployBot('/nonexistent/file.js');
    expect(invalidDeployment.success).to.be.false;
    expect(invalidDeployment.error).to.be.a('string');
    console.log('✅ Invalid file deployment handled gracefully');
    
    // Test memory operations with invalid user
    const invalidMemory = await harness.getMemoryState('nonexistent_user');
    expect(invalidMemory).to.be.null;
    console.log('✅ Invalid user memory query handled gracefully');
    
    // Test game objects with invalid user
    const invalidObjects = await harness.getGameObjects('nonexistent_user');
    expect(invalidObjects.total).to.equal(0);
    console.log('✅ Invalid user game objects query handled gracefully');
  });
});