/**
 * Core library functionality tests
 * Tests the main interfaces and integration points without complex mocking
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { ScreepsFunctionalTestHarness } from '../src';

describe('Library Core Functionality', () => {
  describe('ScreepsFunctionalTestHarness', () => {
    it('should instantiate with default config', () => {
      const harness = new ScreepsFunctionalTestHarness();
      expect(harness).to.be.instanceOf(ScreepsFunctionalTestHarness);
    });

    it('should instantiate with custom config', () => {
      const config = {
        containerImage: 'custom-image',
        timeout: 60000
      };
      const harness = new ScreepsFunctionalTestHarness(config);
      expect(harness).to.be.instanceOf(ScreepsFunctionalTestHarness);
    });

    it('should have all expected methods', () => {
      const harness = new ScreepsFunctionalTestHarness();
      
      // Lifecycle management
      expect(harness.setup).to.be.a('function');
      expect(harness.cleanup).to.be.a('function');
      expect(harness.resetGameState).to.be.a('function');
      expect(harness.isReady).to.be.a('function');
      
      // Bot deployment & monitoring
      expect(harness.deployBot).to.be.a('function');
      expect(harness.monitorExecution).to.be.a('function');
      expect(harness.getLastDeployment).to.be.a('function');
      expect(harness.hasValidDeployment).to.be.a('function');
      
      // Simulation control
      expect(harness.getSimulationState).to.be.a('function');
      expect(harness.pauseSimulation).to.be.a('function');
      expect(harness.resumeSimulation).to.be.a('function');
      expect(harness.waitForTicks).to.be.a('function');
      expect(harness.getGameTick).to.be.a('function');
      
      // Memory management
      expect(harness.getMemoryState).to.be.a('function');
      expect(harness.setMemoryState).to.be.a('function');
      expect(harness.preloadMemory).to.be.a('function');
      expect(harness.mergeMemory).to.be.a('function');
      expect(harness.checkMemoryPatterns).to.be.a('function');
      expect(harness.getMemoryStats).to.be.a('function');
      
      // Game objects & state
      expect(harness.getGameObjects).to.be.a('function');
      expect(harness.generateRoom).to.be.a('function');
      expect(harness.getCpuUsage).to.be.a('function');
      expect(harness.getSpawnStatus).to.be.a('function');
      expect(harness.getConsoleLogs).to.be.a('function');
      
      // Configuration
      expect(harness.setTestRoom).to.be.a('function');
      expect(harness.getTestRoom).to.be.a('function');
      
      // Utilities
      expect(harness.executeCli).to.be.a('function');
    });

    it('should report not ready initially', () => {
      const harness = new ScreepsFunctionalTestHarness();
      expect(harness.isReady()).to.be.false;
    });

    it('should have no valid deployment initially', () => {
      const harness = new ScreepsFunctionalTestHarness();
      expect(harness.hasValidDeployment()).to.be.false;
    });

    it('should throw when getting deployment before any deployment', () => {
      const harness = new ScreepsFunctionalTestHarness();
      expect(() => harness.getLastDeployment()).to.throw('No deployment has been made yet');
    });

    it('should have default test room', () => {
      const harness = new ScreepsFunctionalTestHarness();
      expect(harness.getTestRoom()).to.be.a('string');
    });

    it('should allow setting test room', () => {
      const harness = new ScreepsFunctionalTestHarness();
      harness.setTestRoom('W5N5');
      expect(harness.getTestRoom()).to.equal('W5N5');
    });
  });

  describe('Type Exports', () => {
    it('should export all required types', () => {
      const exports = require('../src/index');
      
      expect(exports.ScreepsFunctionalTestHarness).to.be.a('function');
      expect(exports.ContainerManager).to.be.a('function');
      expect(exports.ServerManager).to.be.a('function');
      expect(exports.GameStateManager).to.be.a('function');
      expect(exports.BotManager).to.be.a('function');
      expect(exports.default).to.be.a('function');
    });
  });

  describe('Container Runtime Detection', () => {
    it('should create ContainerManager', () => {
      const { ContainerManager } = require('../src');
      
      // This should either work or throw a clear error about runtime
      try {
        const cm = new ContainerManager();
        expect(cm).to.be.instanceOf(ContainerManager);
        expect(cm.getRuntime).to.be.a('function');
        
        const runtime = cm.getRuntime();
        expect(runtime).to.have.property('name');
        expect(runtime).to.have.property('available');
        expect(['docker', 'finch']).to.include(runtime.name);
      } catch (error: any) {
        // This is acceptable - means no container runtime available
        expect(error.message).to.include('No container runtime found');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle deployment errors gracefully', async () => {
      const harness = new ScreepsFunctionalTestHarness();
      
      // Should throw clear error when server not ready
      try {
        await harness.deployBot('/nonexistent/path.js');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('Server not ready');
      }
    });

    it('should handle memory operations when not ready', async () => {
      const harness = new ScreepsFunctionalTestHarness();
      
      // These should not throw, should return null/empty results
      const memory = await harness.getMemoryState('test_user');
      expect(memory).to.be.null;
      
      const gameObjects = await harness.getGameObjects('test_user');
      expect(gameObjects).to.have.property('total', 0);
      
      const logs = harness.getConsoleLogs('test_user');
      expect(logs).to.be.an('array').that.is.empty;
    });
  });
});