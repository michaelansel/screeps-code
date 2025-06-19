/**
 * Integration tests for ScreepsFunctionalTestHarness
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ScreepsFunctionalTestHarness } from '../src/ScreepsFunctionalTestHarness';
import { ServerManager } from '../src/server/ServerManager';
import { GameStateManager } from '../src/game/GameStateManager';
import { BotManager } from '../src/bot/BotManager';

describe('ScreepsFunctionalTestHarness', () => {
  let harness: ScreepsFunctionalTestHarness;
  let serverManagerStub: sinon.SinonStubbedInstance<ServerManager>;
  let gameStateManagerStub: sinon.SinonStubbedInstance<GameStateManager>;
  let botManagerStub: sinon.SinonStubbedInstance<BotManager>;

  beforeEach(() => {
    // Create the harness instance
    harness = new ScreepsFunctionalTestHarness();
    
    // Replace internal managers with stubs
    serverManagerStub = sinon.createStubInstance(ServerManager);
    gameStateManagerStub = sinon.createStubInstance(GameStateManager);
    botManagerStub = sinon.createStubInstance(BotManager);
    
    // Replace private properties using any type
    (harness as any).serverManager = serverManagerStub;
    (harness as any).gameStateManager = gameStateManagerStub;
    (harness as any).botManager = botManagerStub;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const newHarness = new ScreepsFunctionalTestHarness();
      expect(newHarness).to.be.instanceOf(ScreepsFunctionalTestHarness);
    });

    it('should create with custom config', () => {
      const config = {
        containerImage: 'custom-image',
        timeout: 60000
      };
      const newHarness = new ScreepsFunctionalTestHarness(config);
      expect(newHarness).to.be.instanceOf(ScreepsFunctionalTestHarness);
    });
  });

  describe('lifecycle management', () => {
    it('should setup once and track state', async () => {
      serverManagerStub.setup.resolves();
      serverManagerStub.isServerReady.returns(false); // Server not ready initially
      
      await harness.setup();
      expect(harness.isReady()).to.be.false; // Server not marked ready yet
      
      // Mark server as ready
      serverManagerStub.isServerReady.returns(true);
      expect(harness.isReady()).to.be.true;
      
      // Second setup should not call server setup again
      await harness.setup();
      expect(serverManagerStub.setup.calledOnce).to.be.true;
    });

    it('should cleanup and reset state', async () => {
      serverManagerStub.setup.resolves();
      serverManagerStub.cleanup.resolves();
      
      await harness.setup();
      await harness.cleanup();
      
      expect(serverManagerStub.cleanup.calledWith(false)).to.be.true;
      expect(harness.isReady()).to.be.false;
    });

    it('should cleanup with preservation option', async () => {
      serverManagerStub.cleanup.resolves();
      
      await harness.cleanup(true);
      
      expect(serverManagerStub.cleanup.calledWith(true)).to.be.true;
    });

    it('should reset game state and clear bot deployment', async () => {
      serverManagerStub.resetGameState.resolves();
      
      await harness.resetGameState();
      
      expect(serverManagerStub.resetGameState.called).to.be.true;
      expect(botManagerStub.clearDeployment.called).to.be.true;
    });

    it('should check readiness correctly', () => {
      serverManagerStub.isServerReady.returns(true);
      (harness as any).isSetup = true;
      
      expect(harness.isReady()).to.be.true;
      
      serverManagerStub.isServerReady.returns(false);
      expect(harness.isReady()).to.be.false;
      
      (harness as any).isSetup = false;
      serverManagerStub.isServerReady.returns(true);
      expect(harness.isReady()).to.be.false;
    });
  });

  describe('bot deployment and monitoring', () => {
    it('should deploy bot with options', async () => {
      const deploymentResult = {
        success: true,
        userId: 'test_user',
        codeSize: 1000,
        room: 'W10N10'
      };
      botManagerStub.deployBot.resolves(deploymentResult);
      
      const result = await harness.deployBot('/path/to/bot.js', {
        username: 'TestBot',
        room: 'W10N10'
      });
      
      expect(result).to.deep.equal(deploymentResult);
      expect(botManagerStub.deployBot.calledWith('/path/to/bot.js', {
        username: 'TestBot',
        room: 'W10N10'
      })).to.be.true;
    });

    it('should monitor execution', async () => {
      const executionResult = {
        ticksAdvanced: 10,
        cpuUsed: true,
        spawnActive: true,
        memoryInitialized: true,
        consoleOutput: ['test log']
      };
      botManagerStub.monitorExecution.resolves(executionResult);
      
      const options = {
        duration: 30,
        expectations: { minTicks: 5 }
      };
      
      const result = await harness.monitorExecution('test_user', options);
      
      expect(result).to.deep.equal(executionResult);
      expect(botManagerStub.monitorExecution.calledWith('test_user', options)).to.be.true;
    });

    it('should get last deployment', () => {
      const deployment = {
        success: true,
        userId: 'test_user',
        codeSize: 1000,
        room: 'W10N10'
      };
      botManagerStub.getLastDeployment.returns(deployment);
      
      const result = harness.getLastDeployment();
      
      expect(result).to.deep.equal(deployment);
    });

    it('should check for valid deployment', () => {
      botManagerStub.hasValidDeployment.returns(true);
      
      const result = harness.hasValidDeployment();
      
      expect(result).to.be.true;
    });
  });

  describe('simulation control', () => {
    it('should get simulation state', () => {
      const state = { tick: 100, paused: false, cpu: 15 };
      serverManagerStub.getSimulationState.returns(state);
      
      const result = harness.getSimulationState();
      
      expect(result).to.deep.equal(state);
    });

    it('should pause simulation', () => {
      harness.pauseSimulation();
      expect(serverManagerStub.pauseSimulation.called).to.be.true;
    });

    it('should resume simulation', () => {
      harness.resumeSimulation();
      expect(serverManagerStub.resumeSimulation.called).to.be.true;
    });

    it('should wait for ticks', async () => {
      serverManagerStub.waitForTicks.resolves();
      
      await harness.waitForTicks(10);
      
      expect(serverManagerStub.waitForTicks.calledWith(10)).to.be.true;
    });

    it('should get current game tick', () => {
      serverManagerStub.getGameTick.returns(123);
      
      const result = harness.getGameTick();
      
      expect(result).to.equal(123);
    });
  });

  describe('memory management', () => {
    it('should get memory state', async () => {
      const memory = { creeps: {}, projects: [] };
      gameStateManagerStub.getMemoryState.resolves(memory);
      
      const result = await harness.getMemoryState('user123');
      
      expect(result).to.deep.equal(memory);
      expect(gameStateManagerStub.getMemoryState.calledWith('user123')).to.be.true;
    });

    it('should set memory state', async () => {
      const memory = { creeps: { worker1: {} } };
      const setResult = { success: true };
      gameStateManagerStub.setMemoryState.resolves(setResult);
      
      const result = await harness.setMemoryState('user123', memory);
      
      expect(result).to.deep.equal(setResult);
      expect(gameStateManagerStub.setMemoryState.calledWith('user123', memory)).to.be.true;
    });

    it('should preload memory', async () => {
      const memory = { initial: 'state' };
      const preloadResult = { success: true };
      gameStateManagerStub.preloadMemory.resolves(preloadResult);
      
      const result = await harness.preloadMemory('user123', memory);
      
      expect(result).to.deep.equal(preloadResult);
      expect(gameStateManagerStub.preloadMemory.calledWith('user123', memory)).to.be.true;
    });

    it('should merge memory', async () => {
      const memoryUpdate = { newField: 'value' };
      const mergeResult = { success: true };
      gameStateManagerStub.mergeMemory.resolves(mergeResult);
      
      const result = await harness.mergeMemory('user123', memoryUpdate);
      
      expect(result).to.deep.equal(mergeResult);
      expect(gameStateManagerStub.mergeMemory.calledWith('user123', memoryUpdate)).to.be.true;
    });

    it('should check memory patterns', async () => {
      const patterns = { 'creeps.worker1': 'exists' };
      const checkResult = { 'creeps.worker1': true };
      gameStateManagerStub.checkMemoryPatterns.resolves(checkResult);
      
      const result = await harness.checkMemoryPatterns('user123', patterns);
      
      expect(result).to.deep.equal(checkResult);
      expect(gameStateManagerStub.checkMemoryPatterns.calledWith('user123', patterns)).to.be.true;
    });

    it('should get memory stats', async () => {
      const stats = {
        exists: true,
        size: 1000,
        hasCreeps: true,
        creepCount: 2,
        hasCreepCounter: true,
        memoryStructure: ['creeps', 'projects']
      };
      gameStateManagerStub.getMemoryStats.resolves(stats);
      
      const result = await harness.getMemoryStats('user123');
      
      expect(result).to.deep.equal(stats);
    });

    it('should get all users with memory', async () => {
      const users = [
        { userId: 'user1', memory: { creeps: {} } },
        { userId: 'user2', memory: { projects: [] } }
      ];
      gameStateManagerStub.getAllUsersWithMemory.resolves(users);
      
      const result = await harness.getAllUsersWithMemory();
      
      expect(result).to.deep.equal(users);
    });
  });

  describe('game objects and state', () => {
    it('should get game objects', async () => {
      const gameObjects = {
        spawns: [{ name: 'Spawn1', energy: 300 }],
        creeps: [{ name: 'Worker1', memory: {} }],
        sources: [{ id: 'source1', energy: 3000 }],
        total: 3
      };
      gameStateManagerStub.getGameObjects.resolves(gameObjects);
      
      const result = await harness.getGameObjects('user123');
      
      expect(result).to.deep.equal(gameObjects);
    });

    it('should generate room', async () => {
      gameStateManagerStub.generateRoom.resolves();
      
      await harness.generateRoom('W15N15');
      
      expect(gameStateManagerStub.generateRoom.calledWith('W15N15')).to.be.true;
    });

    it('should get CPU usage', () => {
      gameStateManagerStub.getCpuUsage.returns(25);
      
      const result = harness.getCpuUsage('user123');
      
      expect(result).to.equal(25);
    });

    it('should get spawn status', () => {
      gameStateManagerStub.getSpawnStatus.returns(true);
      
      const result = harness.getSpawnStatus('user123');
      
      expect(result).to.be.true;
    });

    it('should get console logs', () => {
      // Set harness as ready for this test
      (harness as any).isSetup = true;
      serverManagerStub.isServerReady.returns(true);
      
      const logs = ['Log 1', 'Log 2'];
      gameStateManagerStub.getConsoleLogs.returns(logs);
      
      const result = harness.getConsoleLogs('user123');
      
      expect(result).to.deep.equal(logs);
    });
  });

  describe('configuration', () => {
    it('should set and get test room', () => {
      harness.setTestRoom('W20N20');
      
      expect(botManagerStub.setTestRoom.calledWith('W20N20')).to.be.true;
      
      botManagerStub.getTestRoom.returns('W20N20');
      const result = harness.getTestRoom();
      
      expect(result).to.equal('W20N20');
    });
  });

  describe('utilities', () => {
    it('should execute raw CLI command', () => {
      serverManagerStub.curlCli.returns('command result');
      
      const result = harness.executeCli('storage.env.get("gameTime")');
      
      expect(result).to.equal('command result');
      expect(serverManagerStub.curlCli.calledWith('storage.env.get("gameTime")')).to.be.true;
    });
  });
});