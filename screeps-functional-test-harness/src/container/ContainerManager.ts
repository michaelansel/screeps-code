/**
 * Container runtime management for Screeps server
 */

import { execSync } from 'child_process';
import { ContainerRuntime, ServerConfig } from '../types';

export class ContainerManager {
  private runtime: ContainerRuntime;
  private config: ServerConfig;

  constructor(config: ServerConfig = {}) {
    this.config = {
      containerImage: 'screepers/screeps-launcher:functional',
      composeFile: './docker-compose.functional.yml',
      ports: { game: 21025, cli: 21026 },
      timeout: 120000,
      ...config
    };
    this.runtime = this.detectRuntime();
  }

  /**
   * Detect available container runtime (Docker or Finch)
   */
  private detectRuntime(): ContainerRuntime {
    try {
      execSync('finch --version', { stdio: 'pipe' });
      return { name: 'finch', available: true };
    } catch {
      try {
        execSync('docker --version', { stdio: 'pipe' });
        return { name: 'docker', available: true };
      } catch {
        throw new Error('No container runtime found. Install Docker or Finch.');
      }
    }
  }

  /**
   * Get container runtime info
   */
  getRuntime(): ContainerRuntime {
    return this.runtime;
  }

  /**
   * Execute container command with proper runtime
   */
  exec(command: string, timeout: number = this.config.timeout!): string {
    const fullCommand = `${this.runtime.name} ${command}`;
    return execSync(fullCommand, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout
    });
  }

  /**
   * Execute compose command
   */
  compose(command: string, timeout: number = this.config.timeout!): string {
    return this.exec(`compose -f ${this.config.composeFile} ${command}`, timeout);
  }

  /**
   * Execute command inside container
   */
  execContainer(containerName: string, command: string, timeout: number = this.config.timeout!): string {
    return this.compose(`exec -T ${containerName} ${command}`, timeout);
  }

  /**
   * Build container if needed
   */
  async buildContainer(): Promise<void> {
    console.log('🔨 Building Screeps server container...');
    try {
      this.compose('build screeps');
      console.log('✅ Container built successfully');
    } catch (error) {
      throw new Error(`Failed to build container: ${error}`);
    }
  }

  /**
   * Start containers
   */
  async startContainers(): Promise<void> {
    console.log('🚀 Starting Screeps server...');
    try {
      this.compose('up -d');
      console.log('✅ Containers started');
    } catch (error) {
      throw new Error(`Failed to start containers: ${error}`);
    }
  }

  /**
   * Stop containers
   */
  async stopContainers(): Promise<void> {
    console.log('🛑 Stopping containers...');
    try {
      this.compose('down -v');
      console.log('✅ Containers stopped');
    } catch (error) {
      console.warn('Failed to stop containers:', error);
    }
  }

  /**
   * Check if containers are running
   */
  isRunning(): boolean {
    try {
      const result = this.compose('ps -q');
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get container logs
   */
  getLogs(containerName: string, lines: number = 50): string {
    try {
      return this.compose(`logs --tail ${lines} ${containerName}`);
    } catch (error) {
      return `Failed to get logs: ${error}`;
    }
  }

  /**
   * Copy file to container
   */
  copyToContainer(containerName: string, hostPath: string, containerPath: string): void {
    // Create directory first
    const dir = containerPath.substring(0, containerPath.lastIndexOf('/'));
    this.execContainer(containerName, `mkdir -p ${dir}`);
    // Then copy the file
    this.compose(`cp "${hostPath}" ${containerName}:${containerPath}`);
  }
}