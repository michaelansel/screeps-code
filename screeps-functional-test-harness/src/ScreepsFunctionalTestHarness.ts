/**
 * Main Screeps Functional Test Harness
 * 
 * This is the primary interface for functional testing of Screeps bots.
 * It orchestrates container management, server lifecycle, game state, and bot deployment.
 */

import { ContainerManager } from './container/ContainerManager';
import { ServerManager } from './server/ServerManager';
import { GameStateManager } from './game/GameStateManager';
import { BotManager } from './bot/BotManager';
import { 
  ServerConfig, 
  DeploymentResult, 
  ExecutionResult, 
  MonitorOptions, 
  GameObjects, 
  MemoryStats, 
  UserInfo,
  SimulationState
} from './types';

export class ScreepsFunctionalTestHarness {
  private serverManager: ServerManager;
  private gameStateManager: GameStateManager;
  private botManager: BotManager;
  private isSetup: boolean = false;

  constructor(config: ServerConfig = {}) {
    this.serverManager = new ServerManager(config);
    this.gameStateManager = new GameStateManager(this.serverManager);
    this.botManager = new BotManager(this.serverManager, this.gameStateManager);
  }

  // ========================================
  // LIFECYCLE MANAGEMENT
  // ========================================

  /**
   * Setup the test environment (one-time expensive operation)
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    await this.serverManager.setup();
    this.isSetup = true;
  }

  /**
   * Cleanup the test environment
   */
  async cleanup(preserveForInspection: boolean = false): Promise<void> {
    await this.serverManager.cleanup(preserveForInspection);
    this.isSetup = false;
  }

  /**
   * Reset game state for a fresh test (fast operation)
   */
  async resetGameState(): Promise<void> {
    await this.serverManager.resetGameState();
    this.botManager.clearDeployment();
  }

  /**
   * Check if harness is ready
   */
  isReady(): boolean {
    return this.isSetup && this.serverManager.isServerReady();
  }

  // ========================================
  // BOT DEPLOYMENT & MONITORING
  // ========================================

  /**
   * Deploy bot code to the server
   */
  async deployBot(codePath: string, options: {
    username?: string;
    room?: string;
    cpu?: number;
    cpuAvailable?: number;
  } = {}): Promise<DeploymentResult> {
    return this.botManager.deployBot(codePath, options);
  }

  /**
   * Monitor bot execution for specified duration
   */
  async monitorExecution(userId: string, options: MonitorOptions): Promise<ExecutionResult> {
    return this.botManager.monitorExecution(userId, options);
  }

  /**
   * Get the last deployment result
   */
  getLastDeployment(): DeploymentResult {
    return this.botManager.getLastDeployment();
  }

  /**
   * Check if there's a valid deployment
   */
  hasValidDeployment(): boolean {
    return this.botManager.hasValidDeployment();
  }

  // ========================================
  // SIMULATION CONTROL
  // ========================================

  /**
   * Get current simulation state
   */
  getSimulationState(): SimulationState {
    return this.serverManager.getSimulationState();
  }

  /**
   * Pause the simulation
   */
  pauseSimulation(): void {
    this.serverManager.pauseSimulation();
  }

  /**
   * Resume the simulation
   */
  resumeSimulation(): void {
    this.serverManager.resumeSimulation();
  }

  /**
   * Wait for a specific number of game ticks
   */
  async waitForTicks(ticks: number): Promise<void> {
    await this.serverManager.waitForTicks(ticks);
  }

  /**
   * Get current game tick
   */
  getGameTick(): number {
    return this.serverManager.getGameTick();
  }

  // ========================================
  // MEMORY MANAGEMENT
  // ========================================

  /**
   * Get memory state for a user
   */
  async getMemoryState(userId: string): Promise<any> {
    return this.gameStateManager.getMemoryState(userId);
  }

  /**
   * Set memory state for a user
   */
  async setMemoryState(userId: string, memory: any): Promise<{ success: boolean; error?: string }> {
    return this.gameStateManager.setMemoryState(userId, memory);
  }

  /**
   * Preload memory state for scenario testing
   */
  async preloadMemory(userId: string, memory: any): Promise<{ success: boolean; error?: string }> {
    return this.gameStateManager.preloadMemory(userId, memory);
  }

  /**
   * Merge memory state with existing data
   */
  async mergeMemory(userId: string, memoryUpdate: any): Promise<{ success: boolean; error?: string }> {
    return this.gameStateManager.mergeMemory(userId, memoryUpdate);
  }

  /**
   * Check memory patterns for validation
   */
  async checkMemoryPatterns(userId: string, patterns: Record<string, any>): Promise<Record<string, boolean>> {
    return this.gameStateManager.checkMemoryPatterns(userId, patterns);
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(userId: string): Promise<MemoryStats> {
    return this.gameStateManager.getMemoryStats(userId);
  }

  /**
   * Get all users with memory data
   */
  async getAllUsersWithMemory(): Promise<UserInfo[]> {
    return this.gameStateManager.getAllUsersWithMemory();
  }

  // ========================================
  // GAME OBJECTS & STATE
  // ========================================

  /**
   * Get game objects for a user
   */
  async getGameObjects(userId: string): Promise<GameObjects> {
    return this.gameStateManager.getGameObjects(userId);
  }

  /**
   * Generate a room for testing
   */
  async generateRoom(roomName: string, options: { sources?: number } = {}): Promise<{ success: boolean; error?: string }> {
    return this.gameStateManager.generateRoom(roomName, options);
  }

  /**
   * Open a room to make it available for players
   */
  async openRoom(roomName: string): Promise<{ success: boolean; error?: string }> {
    return this.gameStateManager.openRoom(roomName);
  }

  /**
   * Create construction sites for testing
   */
  async createConstructionSite(roomName: string, x: number, y: number, structureType: string, userId: string): Promise<{ success: boolean; error?: string }> {
    return this.gameStateManager.createConstructionSite(roomName, x, y, structureType, userId);
  }

  /**
   * Create damaged structures for repair testing
   */
  async createDamagedStructure(roomName: string, x: number, y: number, structureType: string, userId: string, damagePct: number = 0.5): Promise<{ success: boolean; error?: string }> {
    return this.gameStateManager.createDamagedStructure(roomName, x, y, structureType, userId, damagePct);
  }

  /**
   * Set up a complete test room with spawn, sources, and controller
   */
  async setupTestRoom(roomName: string, userId: string, options: {
    sources?: number;
    constructionSites?: Array<{ x: number; y: number; structureType: string }>;
    damagedStructures?: Array<{ x: number; y: number; structureType: string; damagePct?: number }>;
  } = {}): Promise<{ success: boolean; error?: string }> {
    return this.gameStateManager.setupTestRoom(roomName, userId, options);
  }

  /**
   * Get CPU usage for a user
   */
  getCpuUsage(userId: string): number {
    return this.gameStateManager.getCpuUsage(userId);
  }

  /**
   * Get spawn status for a user
   */
  getSpawnStatus(userId: string): boolean {
    return this.gameStateManager.getSpawnStatus(userId);
  }

  /**
   * Get console logs for a user
   */
  getConsoleLogs(userId: string): string[] {
    if (!this.isReady()) {
      return [];
    }
    return this.gameStateManager.getConsoleLogs(userId);
  }

  // ========================================
  // CONFIGURATION
  // ========================================

  /**
   * Set test room for bot deployments
   */
  setTestRoom(roomName: string): void {
    this.botManager.setTestRoom(roomName);
  }

  /**
   * Get current test room
   */
  getTestRoom(): string {
    return this.botManager.getTestRoom();
  }

  // ========================================
  // UTILITIES
  // ========================================

  /**
   * Execute raw CLI command (for advanced usage)
   */
  executeCli(command: string): string {
    return this.serverManager.curlCli(command);
  }
}