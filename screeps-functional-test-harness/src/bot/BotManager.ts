/**
 * Bot code deployment and management
 */

import { readFileSync } from 'fs';
import { ServerManager } from '../server/ServerManager';
import { GameStateManager } from '../game/GameStateManager';
import { DeploymentResult, ExecutionResult, MonitorOptions } from '../types';

export class BotManager {
  private serverManager: ServerManager;
  private gameStateManager: GameStateManager;
  private testRoom: string = 'W12N12';
  private lastDeployment: DeploymentResult | null = null;

  constructor(serverManager: ServerManager, gameStateManager: GameStateManager) {
    this.serverManager = serverManager;
    this.gameStateManager = gameStateManager;
  }

  /**
   * Deploy bot code to the server
   */
  async deployBot(codePath: string, options: {
    username?: string;
    room?: string;
    cpu?: number;
    cpuAvailable?: number;
  } = {}): Promise<DeploymentResult> {
    if (!this.serverManager.isServerReady()) {
      throw new Error('Server not ready. Call ServerManager.setup() first');
    }

    try {
      // Load bot code
      const botCode = readFileSync(codePath, 'utf-8');
      
      const config = {
        username: 'TestBot',
        room: this.testRoom,
        cpu: 100,
        cpuAvailable: 10000,
        ...options
      };

      // Pause simulation for controlled setup
      this.serverManager.pauseSimulation();

      // Generate room
      await this.gameStateManager.generateRoom(config.room);

      // Deploy via FileBot
      const userId = `test_bot_${Date.now()}`;
      // For container environments, we need to use container paths
      // Check if codePath is already a container path
      const containerPath = codePath.startsWith('/') ? codePath : '/tmp/test-bot.js';
      if (!codePath.startsWith('/')) {
        // Only copy if it's a host path
        this.serverManager.copyFileToContainer(codePath, containerPath);
      }
      const injectionResult = this.serverManager.curlCli(`filebot.inject('${containerPath}', '${userId}', {
        username: '${config.username}',
        room: '${config.room}',
        cpu: ${config.cpu},
        cpuAvailable: ${config.cpuAvailable}
      })`);

      // Resume simulation
      this.serverManager.resumeSimulation();

      // Parse the injection result
      try {
        const result = JSON.parse(injectionResult);
        if (result.success) {
          const actualUserId = result.userId || userId;
          
          this.lastDeployment = {
            success: true,
            userId: actualUserId,
            codeSize: result.codeSize || botCode.length,
            room: result.room || config.room
          };

          console.log(`✅ Bot deployed: ${actualUserId} (${this.lastDeployment.codeSize} bytes)`);
          return this.lastDeployment;
        } else {
          throw new Error(`Deployment failed: ${result.error || 'Unknown error'}`);
        }
      } catch (e) {
        // Fallback for non-JSON responses
        if (injectionResult.includes('"success":true') || injectionResult.includes('success: true')) {
          // Try to extract userId from response string
          const userIdMatch = injectionResult.match(/(?:userId:\s*'([^']+)'|"userId":"([^"]+)")/);
          const actualUserId = userIdMatch ? (userIdMatch[1] || userIdMatch[2]) : userId;
          
          this.lastDeployment = {
            success: true,
            userId: actualUserId,
            codeSize: botCode.length,
            room: config.room
          };

          console.log(`✅ Bot deployed: ${actualUserId} (${botCode.length} bytes)`);
          return this.lastDeployment;
        } else {
          throw new Error(`Deployment failed: ${injectionResult}`);
        }
      }
    } catch (error: any) {
      const result = {
        success: false,
        userId: "",
        codeSize: 0,
        room: this.testRoom,
        error: error.message
      };
      this.lastDeployment = result;
      return result;
    }
  }

  /**
   * Monitor bot execution and collect evidence
   */
  async monitorExecution(userId: string, options: MonitorOptions): Promise<ExecutionResult> {
    console.log(`⏱️  Monitoring execution for ${options.duration} seconds...`);

    const startTick = this.serverManager.getGameTick();
    const checkInterval = 10; // seconds
    const checks = Math.floor(options.duration / checkInterval);

    let cpuUsed = false;
    let spawnActive = false;
    let memoryInitialized = false;
    const consoleOutput: string[] = [];

    for (let i = 1; i <= checks; i++) {
      await this.sleep(checkInterval * 1000);

      const currentTick = this.serverManager.getGameTick();
      const cpu = this.gameStateManager.getCpuUsage(userId);
      const spawn = this.gameStateManager.getSpawnStatus(userId);
      const memory = await this.gameStateManager.getMemoryState(userId);
      const logs = this.gameStateManager.getConsoleLogs(userId);

      console.log(`   Check ${i}/${checks}: Tick ${currentTick} (+${currentTick - startTick}), CPU: ${cpu}`);

      if (cpu > 0) cpuUsed = true;
      if (spawn) spawnActive = true;
      if (memory && Object.keys(memory).length > 0) memoryInitialized = true;
      consoleOutput.push(...logs);

      // Early exit if all expectations are met
      if (cpuUsed && spawnActive && memoryInitialized && 
          (currentTick - startTick) >= options.expectations.minTicks) {
        break;
      }
    }

    const finalTick = this.serverManager.getGameTick();
    const ticksAdvanced = finalTick - startTick;

    return {
      ticksAdvanced,
      cpuUsed,
      spawnActive,
      memoryInitialized,
      consoleOutput: [...new Set(consoleOutput)] // Remove duplicates
    };
  }

  /**
   * Get the last deployment info
   */
  getLastDeployment(): DeploymentResult {
    if (!this.lastDeployment) {
      throw new Error('No deployment has been made yet');
    }
    return this.lastDeployment;
  }

  /**
   * Check if there's a valid deployment without throwing
   */
  hasValidDeployment(): boolean {
    return this.lastDeployment !== null && this.lastDeployment.success;
  }

  /**
   * Clear deployment state (useful after server reset)
   */
  clearDeployment(): void {
    this.lastDeployment = null;
  }

  /**
   * Set test room for deployments
   */
  setTestRoom(roomName: string): void {
    this.testRoom = roomName;
  }

  /**
   * Get current test room
   */
  getTestRoom(): string {
    return this.testRoom;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}