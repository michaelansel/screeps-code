/**
 * Unit tests for ContainerManager
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { execSync } from 'child_process';
import { ContainerManager } from '../src/container/ContainerManager';

describe('ContainerManager', () => {
  let containerManager: ContainerManager;
  let execSyncStub: sinon.SinonStub;

  beforeEach(() => {
    execSyncStub = sinon.stub(require('child_process'), 'execSync');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should detect Docker runtime when available', () => {
      execSyncStub.onFirstCall().throws(new Error('Finch not found'));
      execSyncStub.onSecondCall().returns('Docker version 20.10.0');
      
      containerManager = new ContainerManager();
      const runtime = containerManager.getRuntime();
      
      expect(runtime.name).to.equal('docker');
      expect(runtime.available).to.be.true;
    });

    it('should detect Finch runtime when available', () => {
      execSyncStub.onFirstCall().returns('finch version 0.5.0');
      
      containerManager = new ContainerManager();
      const runtime = containerManager.getRuntime();
      
      expect(runtime.name).to.equal('finch');
      expect(runtime.available).to.be.true;
    });

    it('should throw error when no runtime available', () => {
      execSyncStub.throws(new Error('Command not found'));
      
      expect(() => new ContainerManager()).to.throw('No container runtime found');
    });

    it('should use default config values', () => {
      execSyncStub.onFirstCall().returns('docker version');
      
      containerManager = new ContainerManager();
      
      // Test that defaults are applied by checking exec command formation
      execSyncStub.resetHistory();
      execSyncStub.returns('');
      
      try {
        containerManager.compose('ps');
      } catch (e) {
        // Expected to fail, we just want to check the command format
      }
      
      const runtime = containerManager.getRuntime().name;
      expect(execSyncStub.calledWith(
        sinon.match(new RegExp(`${runtime} compose -f \\./docker-compose\\.functional\\.yml ps`))
      )).to.be.true;
    });

    it('should override default config', () => {
      execSyncStub.onFirstCall().returns('docker version');
      
      containerManager = new ContainerManager({
        composeFile: './custom-compose.yml',
        timeout: 60000
      });
      
      execSyncStub.resetHistory();
      execSyncStub.returns('');
      
      try {
        containerManager.compose('ps');
      } catch (e) {
        // Expected to fail, we just want to check the command format
      }
      
      const runtime = containerManager.getRuntime().name;
      expect(execSyncStub.calledWith(
        sinon.match(new RegExp(`${runtime} compose -f \\./custom-compose\\.yml ps`))
      )).to.be.true;
    });
  });

  describe('exec', () => {
    beforeEach(() => {
      execSyncStub.reset();
      execSyncStub.onFirstCall().returns('docker version');
      containerManager = new ContainerManager();
      execSyncStub.reset();
    });

    it('should execute docker command with proper format', () => {
      execSyncStub.returns('command output');
      
      const result = containerManager.exec('ps -a');
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(`${runtime} ps -a`, sinon.match.object)).to.be.true;
      expect(result).to.equal('command output');
    });

    it('should use custom timeout', () => {
      execSyncStub.returns('output');
      
      containerManager.exec('ps -a', 30000);
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(`${runtime} ps -a`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000
      })).to.be.true;
    });
  });

  describe('compose', () => {
    beforeEach(() => {
      execSyncStub.reset();
      execSyncStub.onFirstCall().returns('docker version');
      containerManager = new ContainerManager();
      execSyncStub.reset();
    });

    it('should execute compose command with proper format', () => {
      execSyncStub.returns('compose output');
      
      const result = containerManager.compose('up -d');
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml up -d`,
        sinon.match.object
      )).to.be.true;
      expect(result).to.equal('compose output');
    });
  });

  describe('execContainer', () => {
    beforeEach(() => {
      execSyncStub.reset();
      execSyncStub.onFirstCall().returns('docker version');
      containerManager = new ContainerManager();
      execSyncStub.reset();
    });

    it('should execute command inside container', () => {
      execSyncStub.returns('container output');
      
      const result = containerManager.execContainer('screeps', 'ls /tmp');
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml exec -T screeps ls /tmp`,
        sinon.match.object
      )).to.be.true;
      expect(result).to.equal('container output');
    });
  });

  describe('buildContainer', () => {
    beforeEach(() => {
      execSyncStub.reset();
      execSyncStub.onFirstCall().returns('docker version');
      containerManager = new ContainerManager();
      execSyncStub.reset();
    });

    it('should build container successfully', async () => {
      execSyncStub.returns('build output');
      
      await containerManager.buildContainer();
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml build screeps`,
        sinon.match.object
      )).to.be.true;
    });

    it('should throw error on build failure', async () => {
      execSyncStub.throws(new Error('Build failed'));
      
      try {
        await containerManager.buildContainer();
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to build container');
      }
    });
  });

  describe('startContainers', () => {
    beforeEach(() => {
      execSyncStub.reset();
      execSyncStub.onFirstCall().returns('docker version');
      containerManager = new ContainerManager();
      execSyncStub.reset();
    });

    it('should start containers successfully', async () => {
      execSyncStub.returns('start output');
      
      await containerManager.startContainers();
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml up -d`,
        sinon.match.object
      )).to.be.true;
    });

    it('should throw error on start failure', async () => {
      execSyncStub.throws(new Error('Start failed'));
      
      try {
        await containerManager.startContainers();
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('Failed to start containers');
      }
    });
  });

  describe('stopContainers', () => {
    beforeEach(() => {
      execSyncStub.reset();
      execSyncStub.onFirstCall().returns('docker version');
      containerManager = new ContainerManager();
      execSyncStub.reset();
    });

    it('should stop containers successfully', async () => {
      execSyncStub.returns('stop output');
      
      await containerManager.stopContainers();
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml down -v`,
        sinon.match.object
      )).to.be.true;
    });

    it('should handle stop failure gracefully', async () => {
      execSyncStub.throws(new Error('Stop failed'));
      
      // Should not throw, just warn
      await containerManager.stopContainers();
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml down -v`,
        sinon.match.object
      )).to.be.true;
    });
  });

  describe('isRunning', () => {
    beforeEach(() => {
      execSyncStub.reset();
      execSyncStub.onFirstCall().returns('docker version');
      containerManager = new ContainerManager();
      execSyncStub.reset();
    });

    it('should return true when containers are running', () => {
      execSyncStub.returns('container_id_123\ncontainer_id_456\n');
      
      const result = containerManager.isRunning();
      const runtime = containerManager.getRuntime().name;
      
      expect(result).to.be.true;
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml ps -q`,
        sinon.match.object
      )).to.be.true;
    });

    it('should return false when no containers running', () => {
      execSyncStub.returns('');
      
      const result = containerManager.isRunning();
      
      expect(result).to.be.false;
    });

    it('should return false on command failure', () => {
      execSyncStub.throws(new Error('Command failed'));
      
      const result = containerManager.isRunning();
      
      expect(result).to.be.false;
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      execSyncStub.reset();
      execSyncStub.onFirstCall().returns('docker version');
      containerManager = new ContainerManager();
      execSyncStub.reset();
    });

    it('should get container logs successfully', () => {
      execSyncStub.returns('log line 1\nlog line 2\n');
      
      const result = containerManager.getLogs('screeps');
      const runtime = containerManager.getRuntime().name;
      
      expect(result).to.equal('log line 1\nlog line 2\n');
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml logs --tail 50 screeps`,
        sinon.match.object
      )).to.be.true;
    });

    it('should use custom line count', () => {
      execSyncStub.returns('logs');
      
      containerManager.getLogs('screeps', 100);
      const runtime = containerManager.getRuntime().name;
      
      expect(execSyncStub.calledWith(
        `${runtime} compose -f ./docker-compose.functional.yml logs --tail 100 screeps`,
        sinon.match.object
      )).to.be.true;
    });

    it('should handle log failure gracefully', () => {
      execSyncStub.throws(new Error('Log failed'));
      
      const result = containerManager.getLogs('screeps');
      
      expect(result).to.include('Failed to get logs');
    });
  });
});