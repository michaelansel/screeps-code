/**
 * Unit tests for GameStateManager
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GameStateManager } from '../src/game/GameStateManager';
import { ServerManager } from '../src/server/ServerManager';

describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;
  let serverManagerStub: sinon.SinonStubbedInstance<ServerManager>;

  beforeEach(() => {
    serverManagerStub = sinon.createStubInstance(ServerManager);
    gameStateManager = new GameStateManager(serverManagerStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getMemoryState', () => {
    it('should return parsed memory state', async () => {
      const memoryData = { creeps: {}, projects: [] };
      serverManagerStub.curlCli.returns(JSON.stringify(memoryData));
      
      const result = await gameStateManager.getMemoryState('user123');
      
      expect(result).to.deep.equal(memoryData);
      expect(serverManagerStub.curlCli.calledWith(
        sinon.match(/storage\.env\.get\('memory:user123'\)/)
      )).to.be.true;
    });

    it('should handle double-stringified JSON', async () => {
      const memoryData = { creeps: {}, projects: [] };
      const doubleStringified = JSON.stringify(JSON.stringify(memoryData));
      serverManagerStub.curlCli.returns(doubleStringified);
      
      const result = await gameStateManager.getMemoryState('user123');
      
      expect(result).to.deep.equal(memoryData);
    });

    it('should return null for undefined result', async () => {
      serverManagerStub.curlCli.returns('undefined');
      
      const result = await gameStateManager.getMemoryState('user123');
      
      expect(result).to.be.null;
    });

    it('should return null for null result', async () => {
      serverManagerStub.curlCli.returns('null');
      
      const result = await gameStateManager.getMemoryState('user123');
      
      expect(result).to.be.null;
    });

    it('should return null for empty string result', async () => {
      serverManagerStub.curlCli.returns('""');
      
      const result = await gameStateManager.getMemoryState('user123');
      
      expect(result).to.be.null;
    });

    it('should return null for whitespace undefined', async () => {
      serverManagerStub.curlCli.returns('  undefined  ');
      
      const result = await gameStateManager.getMemoryState('user123');
      
      expect(result).to.be.null;
    });

    it('should handle JSON parse errors gracefully', async () => {
      serverManagerStub.curlCli.returns('invalid json');
      
      const result = await gameStateManager.getMemoryState('user123');
      
      expect(result).to.be.null;
    });

    it('should handle CLI errors gracefully', async () => {
      serverManagerStub.curlCli.throws(new Error('CLI failed'));
      
      const result = await gameStateManager.getMemoryState('user123');
      
      expect(result).to.be.null;
    });
  });

  describe('setMemoryState', () => {
    it('should set memory state successfully', async () => {
      const memoryData = { creeps: {}, projects: [] };
      serverManagerStub.curlCli.returns('{"success":true}');
      
      const result = await gameStateManager.setMemoryState('user123', memoryData);
      
      expect(result.success).to.be.true;
      expect(serverManagerStub.curlCli.calledWith(
        sinon.match(/storage\.env\.set\('memory:user123'/)
      )).to.be.true;
    });

    it('should handle set failure', async () => {
      const memoryData = { creeps: {} };
      serverManagerStub.curlCli.returns('error occurred');
      
      const result = await gameStateManager.setMemoryState('user123', memoryData);
      
      expect(result.success).to.be.false;
      expect(result.error).to.equal('error occurred');
    });

    it('should handle CLI errors', async () => {
      const memoryData = { creeps: {} };
      serverManagerStub.curlCli.throws(new Error('CLI failed'));
      
      const result = await gameStateManager.setMemoryState('user123', memoryData);
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('CLI failed');
    });
  });

  describe('mergeMemory', () => {
    it('should merge with existing memory', async () => {
      const existingMemory = { creeps: { worker1: {} }, counter: 1 };
      const memoryUpdate = { projects: ['upgrade'], counter: 2 };
      const expectedMerged = { creeps: { worker1: {} }, projects: ['upgrade'], counter: 2 };
      
      // First call to get existing memory
      serverManagerStub.curlCli.onFirstCall().returns(JSON.stringify(existingMemory));
      // Second call to set merged memory
      serverManagerStub.curlCli.onSecondCall().returns('{"success":true}');
      
      const result = await gameStateManager.mergeMemory('user123', memoryUpdate);
      
      expect(result.success).to.be.true;
      const actualCall = serverManagerStub.curlCli.secondCall.args[0];
      expect(actualCall).to.include('"creeps":{"worker1":{}}');
      expect(actualCall).to.include('"projects":["upgrade"]');
      expect(actualCall).to.include('"counter":2');
    });

    it('should handle no existing memory', async () => {
      const memoryUpdate = { projects: ['upgrade'] };
      
      // First call returns null (no existing memory)
      serverManagerStub.curlCli.onFirstCall().returns('null');
      // Second call to set memory
      serverManagerStub.curlCli.onSecondCall().returns('{"success":true}');
      
      const result = await gameStateManager.mergeMemory('user123', memoryUpdate);
      
      expect(result.success).to.be.true;
      expect(serverManagerStub.curlCli.secondCall.args[0]).to.include(
        JSON.stringify(memoryUpdate)
      );
    });

    it('should handle merge errors', async () => {
      serverManagerStub.curlCli.throws(new Error('Merge failed'));
      
      const result = await gameStateManager.mergeMemory('user123', {});
      
      expect(result.success).to.be.false;
      expect(result.error).to.include('Merge failed');
    });
  });

  describe('checkMemoryPatterns', () => {
    it('should check top-level patterns correctly', async () => {
      const memory = { creepCounter: 5, projects: ['upgrade'] };
      serverManagerStub.curlCli.returns(JSON.stringify(memory));
      
      const patterns = {
        'creepCounter': 5,
        'projects': null, // Check existence
        'nonexistent': 'value'
      };
      
      const result = await gameStateManager.checkMemoryPatterns('user123', patterns);
      
      expect(result).to.deep.equal({
        'creepCounter': true,
        'projects': true,
        'nonexistent': false
      });
    });

    it('should check nested patterns correctly', async () => {
      const memory = {
        creeps: {
          worker1: { project: 'upgrade', role: 'worker' },
          worker2: { project: 'harvest' }
        }
      };
      serverManagerStub.curlCli.returns(JSON.stringify(memory));
      
      const patterns = {
        'creeps.worker1.project': 'upgrade',
        'creeps.worker1.role': 'worker',
        'creeps.worker2.role': null, // Check existence
        'creeps.worker3.project': 'build' // Non-existent
      };
      
      const result = await gameStateManager.checkMemoryPatterns('user123', patterns);
      
      expect(result).to.deep.equal({
        'creeps.worker1.project': true,
        'creeps.worker1.role': true,
        'creeps.worker2.role': false, // Doesn't exist
        'creeps.worker3.project': false
      });
    });

    it('should handle no memory gracefully', async () => {
      serverManagerStub.curlCli.returns('null');
      
      const patterns = {
        'creepCounter': 5,
        'projects': null
      };
      
      const result = await gameStateManager.checkMemoryPatterns('user123', patterns);
      
      expect(result).to.deep.equal({
        'creepCounter': false,
        'projects': false
      });
    });
  });

  describe('getMemoryStats', () => {
    it('should return stats for existing memory', async () => {
      const memory = {
        creeps: { worker1: {}, worker2: {} },
        creepCounter: 2,
        projects: ['upgrade']
      };
      serverManagerStub.curlCli.returns(JSON.stringify(memory));
      
      const result = await gameStateManager.getMemoryStats('user123');
      
      expect(result).to.deep.equal({
        exists: true,
        size: JSON.stringify(memory).length,
        hasCreeps: true,
        creepCount: 2,
        hasCreepCounter: true,
        memoryStructure: ['creeps', 'creepCounter', 'projects']
      });
    });

    it('should return empty stats for no memory', async () => {
      serverManagerStub.curlCli.returns('null');
      
      const result = await gameStateManager.getMemoryStats('user123');
      
      expect(result).to.deep.equal({
        exists: false,
        size: 0,
        hasCreeps: false,
        creepCount: 0,
        hasCreepCounter: false,
        memoryStructure: []
      });
    });

    it('should handle memory without creeps', async () => {
      const memory = { projects: ['upgrade'] };
      serverManagerStub.curlCli.returns(JSON.stringify(memory));
      
      const result = await gameStateManager.getMemoryStats('user123');
      
      expect(result.hasCreeps).to.be.false;
      expect(result.creepCount).to.equal(0);
    });
  });

  describe('getGameObjects', () => {
    it('should parse game objects correctly', async () => {
      const objects = [
        { type: 'spawn', name: 'Spawn1', store: { energy: 300 }, user: 'user123' },
        { type: 'creep', name: 'Worker1', memory: { role: 'worker' }, user: 'user123' },
        { type: 'source', _id: 'source1', energy: 3000, user: 'user123' },
        { type: 'controller', user: 'user123' }
      ];
      serverManagerStub.curlCli.returns(JSON.stringify(objects));
      
      const result = await gameStateManager.getGameObjects('user123');
      
      expect(result).to.deep.equal({
        spawns: [{ name: 'Spawn1', energy: 300 }],
        creeps: [{ name: 'Worker1', memory: { role: 'worker' } }],
        sources: [{ id: 'source1', energy: 3000 }],
        total: 4
      });
    });

    it('should handle objects without optional properties', async () => {
      const objects = [
        { type: 'spawn', name: 'Spawn1', user: 'user123' },
        { type: 'creep', name: 'Worker1', user: 'user123' },
        { type: 'source', _id: 'source1', user: 'user123' }
      ];
      serverManagerStub.curlCli.returns(JSON.stringify(objects));
      
      const result = await gameStateManager.getGameObjects('user123');
      
      expect(result).to.deep.equal({
        spawns: [{ name: 'Spawn1', energy: 0 }],
        creeps: [{ name: 'Worker1', memory: {} }],
        sources: [{ id: 'source1', energy: 0 }],
        total: 3
      });
    });

    it('should handle CLI errors gracefully', async () => {
      serverManagerStub.curlCli.throws(new Error('CLI failed'));
      
      const result = await gameStateManager.getGameObjects('user123');
      
      expect(result).to.deep.equal({
        spawns: [],
        creeps: [],
        sources: [],
        total: 0
      });
    });
  });

  describe('generateRoom', () => {
    it('should generate and open room', async () => {
      serverManagerStub.curlCli.returns('OK');
      
      await gameStateManager.generateRoom('W10N10');
      
      expect(serverManagerStub.curlCli.calledWith("map.generateRoom('W10N10')")).to.be.true;
      expect(serverManagerStub.curlCli.calledWith("map.openRoom('W10N10')")).to.be.true;
    });
  });

  describe('getCpuUsage', () => {
    it('should return CPU usage for user', () => {
      serverManagerStub.curlCli.returns('"15"');
      
      const result = gameStateManager.getCpuUsage('user123');
      
      expect(result).to.equal(15);
      expect(serverManagerStub.curlCli.calledWith(
        sinon.match(/storage\.db\.users\.findOne\(\{_id: 'user123'\}\)/)
      )).to.be.true;
    });

    it('should return 0 for no CPU data', () => {
      serverManagerStub.curlCli.returns('null');
      
      const result = gameStateManager.getCpuUsage('user123');
      
      expect(result).to.equal(0);
    });

    it('should handle CLI errors', () => {
      serverManagerStub.curlCli.throws(new Error('CLI failed'));
      
      const result = gameStateManager.getCpuUsage('user123');
      
      expect(result).to.equal(0);
    });
  });

  describe('getSpawnStatus', () => {
    it('should return true for active spawn', () => {
      serverManagerStub.curlCli.returns('true');
      
      const result = gameStateManager.getSpawnStatus('user123');
      
      expect(result).to.be.true;
    });

    it('should return false for inactive spawn', () => {
      serverManagerStub.curlCli.returns('false');
      
      const result = gameStateManager.getSpawnStatus('user123');
      
      expect(result).to.be.false;
    });

    it('should handle CLI errors', () => {
      serverManagerStub.curlCli.throws(new Error('CLI failed'));
      
      const result = gameStateManager.getSpawnStatus('user123');
      
      expect(result).to.be.false;
    });
  });

  describe('getConsoleLogs', () => {
    it('should return console logs for user', () => {
      const logs = ['Log message 1', 'Log message 2'];
      serverManagerStub.curlCli.returns(JSON.stringify(logs));
      
      const result = gameStateManager.getConsoleLogs('user123');
      
      expect(result).to.deep.equal(logs);
    });

    it('should handle CLI errors', () => {
      serverManagerStub.curlCli.throws(new Error('CLI failed'));
      
      const result = gameStateManager.getConsoleLogs('user123');
      
      expect(result).to.deep.equal([]);
    });
  });
});