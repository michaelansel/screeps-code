/**
 * Unit tests for BotManager
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { readFileSync } from 'fs';
import { BotManager } from '../src/bot/BotManager';
import { ServerManager } from '../src/server/ServerManager';
import { GameStateManager } from '../src/game/GameStateManager';

describe('BotManager', () => {
  let botManager: BotManager;
  let serverManagerStub: sinon.SinonStubbedInstance<ServerManager>;
  let gameStateManagerStub: sinon.SinonStubbedInstance<GameStateManager>;
  let readFileSyncStub: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    serverManagerStub = sinon.createStubInstance(ServerManager);
    gameStateManagerStub = sinon.createStubInstance(GameStateManager);
    readFileSyncStub = sinon.stub(require('fs'), 'readFileSync');
    clock = sinon.useFakeTimers();
    
    botManager = new BotManager(serverManagerStub, gameStateManagerStub);
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('deployBot', () => {
    it('should deploy bot successfully', async () => {
      const botCode = 'module.exports.loop = function() { console.log("test"); };';
      readFileSyncStub.returns(botCode);
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true,"userId":"actual_user_123"}');
      
      const result = await botManager.deployBot('/path/to/bot.js');
      
      expect(result.success).to.be.true;
      expect(result.userId).to.equal('actual_user_123');
      expect(result.codeSize).to.equal(botCode.length);
      expect(result.room).to.equal('W12N12');
      
      // Verify sequence of operations
      expect(serverManagerStub.pauseSimulation.called).to.be.true;
      expect(gameStateManagerStub.generateRoom.calledWith('W12N12')).to.be.true;
      expect(serverManagerStub.resumeSimulation.called).to.be.true;
    });

    it('should use custom deployment options', async () => {
      const botCode = 'test code';
      readFileSyncStub.returns(botCode);
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true,"userId":"custom_user"}');
      
      const options = {
        username: 'CustomBot',
        room: 'W5N5',
        cpu: 200,
        cpuAvailable: 20000
      };
      
      const result = await botManager.deployBot('/path/to/bot.js', options);
      
      expect(result.success).to.be.true;
      expect(result.room).to.equal('W5N5');
      expect(gameStateManagerStub.generateRoom.calledWith('W5N5')).to.be.true;
      
      // Check that CLI command includes custom options
      const cliCall = serverManagerStub.curlCli.getCall(0);
      expect(cliCall.args[0]).to.include('CustomBot');
      expect(cliCall.args[0]).to.include('W5N5');
      expect(cliCall.args[0]).to.include('200');
      expect(cliCall.args[0]).to.include('20000');
    });

    it('should throw error if server not ready', async () => {
      serverManagerStub.isServerReady.returns(false);
      
      try {
        await botManager.deployBot('/path/to/bot.js');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('Server not ready');
      }
    });

    it('should handle file read errors', async () => {
      readFileSyncStub.throws(new Error('File not found'));
      serverManagerStub.isServerReady.returns(true);
      
      const result = await botManager.deployBot('/nonexistent/bot.js');
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('File not found');
    });

    it('should handle deployment failures', async () => {
      readFileSyncStub.returns('test code');
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":false,"error":"deployment failed"}');
      
      const result = await botManager.deployBot('/path/to/bot.js');
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Deployment failed');
    });

    it('should extract actual user ID from injection result', async () => {
      readFileSyncStub.returns('test code');
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true,"userId":"extracted_user_456"}');
      
      const result = await botManager.deployBot('/path/to/bot.js');
      
      expect(result.success).to.be.true;
      expect(result.userId).to.equal('extracted_user_456');
    });

    it('should use generated user ID if extraction fails', async () => {
      readFileSyncStub.returns('test code');
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true}');
      
      const result = await botManager.deployBot('/path/to/bot.js');
      
      expect(result.success).to.be.true;
      expect(result.userId).to.match(/test_bot_\d+/);
    });
  });

  describe('monitorExecution', () => {
    beforeEach(() => {
      // Setup a successful deployment first
      const botCode = 'test code';
      readFileSyncStub.returns(botCode);
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true,"userId":"monitor_user"}');
    });

    it('should monitor execution and collect evidence', async () => {
      serverManagerStub.getGameTick
        .onFirstCall().returns(100)   // Start tick
        .onSecondCall().returns(101)  // First check
        .onThirdCall().returns(102);  // Final tick
      
      gameStateManagerStub.getCpuUsage.returns(5);
      gameStateManagerStub.getSpawnStatus.returns(true);
      gameStateManagerStub.getMemoryState.resolves({ creeps: {} });
      gameStateManagerStub.getConsoleLogs.returns(['Log message']);
      
      const options = {
        duration: 20, // 20 seconds = 2 checks (10s each)
        expectations: { minTicks: 1 }
      };
      
      const monitorPromise = botManager.monitorExecution('monitor_user', options);
      
      // Advance time for two check intervals
      await clock.tickAsync(10000); // First check
      await clock.tickAsync(10000); // Second check
      
      const result = await monitorPromise;
      
      expect(result.ticksAdvanced).to.equal(2);
      expect(result.cpuUsed).to.be.true;
      expect(result.spawnActive).to.be.true;
      expect(result.memoryInitialized).to.be.true;
      expect(result.consoleOutput).to.include('Log message');
    });

    it('should early exit when all expectations met', async () => {
      serverManagerStub.getGameTick
        .onFirstCall().returns(100)  // Start tick
        .onSecondCall().returns(105)  // First check - meets minTicks
        .onThirdCall().returns(105);  // Final tick
      
      gameStateManagerStub.getCpuUsage.returns(10);
      gameStateManagerStub.getSpawnStatus.returns(true);
      gameStateManagerStub.getMemoryState.resolves({ creeps: { worker1: {} } });
      gameStateManagerStub.getConsoleLogs.returns(['Early log']);
      
      const options = {
        duration: 60, // Would be 6 checks normally
        expectations: { minTicks: 5 }
      };
      
      const monitorPromise = botManager.monitorExecution('monitor_user', options);
      
      // Only advance one check interval
      await clock.tickAsync(10000);
      
      const result = await monitorPromise;
      
      expect(result.ticksAdvanced).to.equal(5);
      expect(result.cpuUsed).to.be.true;
      expect(result.spawnActive).to.be.true;
      expect(result.memoryInitialized).to.be.true;
    });

    it('should handle no activity during monitoring', async () => {
      serverManagerStub.getGameTick.returns(100); // No tick advancement
      gameStateManagerStub.getCpuUsage.returns(0);
      gameStateManagerStub.getSpawnStatus.returns(false);
      gameStateManagerStub.getMemoryState.resolves(null);
      gameStateManagerStub.getConsoleLogs.returns([]);
      
      const options = {
        duration: 20,
        expectations: { minTicks: 10 }
      };
      
      const monitorPromise = botManager.monitorExecution('monitor_user', options);
      
      await clock.tickAsync(20000);
      
      const result = await monitorPromise;
      
      expect(result.ticksAdvanced).to.equal(0);
      expect(result.cpuUsed).to.be.false;
      expect(result.spawnActive).to.be.false;
      expect(result.memoryInitialized).to.be.false;
      expect(result.consoleOutput).to.be.empty;
    });

    it('should deduplicate console output', async () => {
      serverManagerStub.getGameTick.returns(100);
      gameStateManagerStub.getCpuUsage.returns(0);
      gameStateManagerStub.getSpawnStatus.returns(false);
      gameStateManagerStub.getMemoryState.resolves(null);
      gameStateManagerStub.getConsoleLogs
        .onFirstCall().returns(['message1', 'message2'])
        .onSecondCall().returns(['message2', 'message3']);
      
      const options = {
        duration: 20,
        expectations: { minTicks: 1 }
      };
      
      const monitorPromise = botManager.monitorExecution('monitor_user', options);
      
      await clock.tickAsync(20000);
      
      const result = await monitorPromise;
      
      expect(result.consoleOutput).to.have.length(3);
      expect(result.consoleOutput).to.include.members(['message1', 'message2', 'message3']);
    });
  });

  describe('getLastDeployment', () => {
    it('should return last deployment info', async () => {
      // First deploy a bot
      readFileSyncStub.returns('test code');
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true,"userId":"test_user"}');
      
      await botManager.deployBot('/path/to/bot.js');
      
      const deployment = botManager.getLastDeployment();
      
      expect(deployment.success).to.be.true;
      expect(deployment.userId).to.equal('test_user');
    });

    it('should throw error if no deployment made', () => {
      expect(() => botManager.getLastDeployment()).to.throw('No deployment has been made yet');
    });
  });

  describe('hasValidDeployment', () => {
    it('should return true for successful deployment', async () => {
      readFileSyncStub.returns('test code');
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true,"userId":"test_user"}');
      
      await botManager.deployBot('/path/to/bot.js');
      
      expect(botManager.hasValidDeployment()).to.be.true;
    });

    it('should return false for failed deployment', async () => {
      readFileSyncStub.returns('test code');
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":false,"error":"failed"}');
      
      await botManager.deployBot('/path/to/bot.js');
      
      expect(botManager.hasValidDeployment()).to.be.false;
    });

    it('should return false for no deployment', () => {
      expect(botManager.hasValidDeployment()).to.be.false;
    });
  });

  describe('clearDeployment', () => {
    it('should clear deployment state', async () => {
      // First deploy a bot
      readFileSyncStub.returns('test code');
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true,"userId":"test_user"}');
      
      await botManager.deployBot('/path/to/bot.js');
      expect(botManager.hasValidDeployment()).to.be.true;
      
      botManager.clearDeployment();
      expect(botManager.hasValidDeployment()).to.be.false;
    });
  });

  describe('room management', () => {
    it('should set and get test room', () => {
      botManager.setTestRoom('W5N5');
      expect(botManager.getTestRoom()).to.equal('W5N5');
    });

    it('should use custom room in deployment', async () => {
      botManager.setTestRoom('W20N20');
      
      readFileSyncStub.returns('test code');
      serverManagerStub.isServerReady.returns(true);
      serverManagerStub.curlCli.returns('{"success":true,"userId":"test_user"}');
      
      const result = await botManager.deployBot('/path/to/bot.js');
      
      expect(result.room).to.equal('W20N20');
      expect(gameStateManagerStub.generateRoom.calledWith('W20N20')).to.be.true;
    });
  });
});