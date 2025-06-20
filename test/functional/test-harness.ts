import { ScreepsFunctionalTestHarness, DeploymentResult, ExecutionResult, MonitorOptions, GameObjects } from "screeps-functional-test-harness";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Functional Test Harness for Screeps
 *
 * This is a compatibility wrapper around the new ScreepsFunctionalTestHarness library.
 * It maintains the same API as the previous implementation while delegating to the new library.
 */

// Re-export types for backwards compatibility

// Re-export types from the library for backwards compatibility
export { DeploymentResult, ExecutionResult, MonitorOptions, GameObjects } from "screeps-functional-test-harness";

export class FunctionalTestHarness {
  private harness: ScreepsFunctionalTestHarness;
  private testRoom = "W12N12";
  private lastDeployment: DeploymentResult | null = null;
  private botCode: string | null = null;

  constructor() {
    this.harness = new ScreepsFunctionalTestHarness({
      composeFile: join(process.cwd(), "test/config/docker-compose.functional.yml")
    });
  }

  /**
   * One-time environment setup (expensive - build container, install FileBot mod)
   */
  async setupEnvironment(): Promise<void> {
    await this.harness.setup();
  }

  /**
   * Prepare for a test case (fast - reset game state, don't rebuild)
   */
  async prepareTestCase(): Promise<void> {
    if (!this.harness.isReady()) {
      await this.setupEnvironment();
    }

    await this.harness.resetGameState();
    this.lastDeployment = null;
  }

  /**
   * Deploy the bot code to the server
   */
  async deployBot(): Promise<DeploymentResult> {
    if (!this.harness.isReady()) {
      throw new Error("Server not ready. Call setupEnvironment() first");
    }

    try {
      // Build bot code if needed
      const { execSync } = await import("child_process");
      console.log("📦 Building bot code...");
      execSync("npm run build", { stdio: "pipe" });
      
      // Use a relative path to ensure it's treated as a host path
      const distPath = "dist/main.js";  // Relative path
      console.log(`🐳 Using built bot code: ${distPath}`);
      
      const result = await this.harness.deployBot(distPath, {
        username: 'TestBot',
        room: this.testRoom,
        cpu: 100,
        cpuAvailable: 10000
      });

      this.lastDeployment = result;
      return result;
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
    return await this.harness.monitorExecution(userId, options);
  }

  /**
   * Get memory state for a user using the new memory access pattern
   */
  async getMemoryState(userId: string): Promise<any> {
    return await this.harness.getMemoryState(userId);
  }

  /**
   * Get all users with their memory data
   */
  async getAllUsersWithMemory(): Promise<{ userId: string; username: string; memory: any }[]> {
    const users = await this.harness.getAllUsersWithMemory();
    return users.map(u => ({ userId: u.userId, username: u.userId, memory: u.memory })); // Note: API slightly different
  }

  /**
   * Get all users (without memory)
   */
  async getAllUsers(): Promise<{ id: string; username: string }[]> {
    const users = await this.harness.getAllUsersWithMemory();
    return users.map(u => ({ id: u.userId, username: u.userId }));
  }

  /**
   * Check if user memory contains specific data patterns
   */
  async checkMemoryPatterns(userId: string, patterns: { [key: string]: any }): Promise<{ [key: string]: boolean }> {
    return await this.harness.checkMemoryPatterns(userId, patterns);
  }

  /**
   * Get memory statistics for analysis
   */
  async getMemoryStats(userId: string): Promise<{
    exists: boolean;
    size: number;
    hasCreeps: boolean;
    creepCount: number;
    hasCreepCounter: boolean;
    memoryStructure: string[];
  }> {
    return await this.harness.getMemoryStats(userId);
  }

  /**
   * Preload memory state for a user
   */
  async preloadMemory(userId: string, memoryState: any): Promise<{ success: boolean; error?: string }> {
    return await this.harness.preloadMemory(userId, memoryState);
  }

  /**
   * Clear/reset memory for a user
   */
  async clearMemory(userId: string): Promise<boolean> {
    const result = await this.harness.setMemoryState(userId, {});
    return result.success;
  }

  /**
   * Merge new data with existing memory
   */
  async mergeMemory(userId: string, newData: any): Promise<{ success: boolean; error?: string }> {
    return await this.harness.mergeMemory(userId, newData);
  }

  /**
   * Bulk clear memory for all test users
   */
  async bulkClearTestUserMemory(): Promise<number> {
    // This method isn't in the new API, so we'll implement it using the new methods
    const users = await this.harness.getAllUsersWithMemory();
    let cleared = 0;
    for (const user of users) {
      if (user.userId.includes('Test') || user.userId.includes('test')) {
        const result = await this.harness.setMemoryState(user.userId, {});
        if (result.success) cleared++;
      }
    }
    return cleared;
  }

  /**
   * Load complex memory from file using FileBot pattern
   */
  async loadMemoryFromFile(
    userId: string,
    filePath: string
  ): Promise<{ success: boolean; size?: number; error?: string }> {
    try {
      const memoryData = JSON.parse(readFileSync(filePath, 'utf8'));
      const result = await this.harness.setMemoryState(userId, memoryData);
      return {
        success: result.success,
        size: JSON.stringify(memoryData).length,
        error: result.error
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get game objects for a user
   */
  async getGameObjects(userId: string): Promise<GameObjects> {
    return await this.harness.getGameObjects(userId);
  }

  /**
   * Generate a room for testing
   */
  async generateRoom(roomName: string, options: { sources?: number } = {}): Promise<{ success: boolean; error?: string }> {
    return await this.harness.generateRoom(roomName, options);
  }

  /**
   * Open a room to make it available for players
   */
  async openRoom(roomName: string): Promise<{ success: boolean; error?: string }> {
    return await this.harness.openRoom(roomName);
  }

  /**
   * Create construction sites for testing
   */
  async createConstructionSite(roomName: string, x: number, y: number, structureType: string, userId: string): Promise<{ success: boolean; error?: string }> {
    return await this.harness.createConstructionSite(roomName, x, y, structureType, userId);
  }

  /**
   * Create damaged structures for repair testing
   */
  async createDamagedStructure(roomName: string, x: number, y: number, structureType: string, userId: string, damagePct: number = 0.5): Promise<{ success: boolean; error?: string }> {
    return await this.harness.createDamagedStructure(roomName, x, y, structureType, userId, damagePct);
  }

  /**
   * Set up a complete test room with spawn, sources, and controller
   */
  async setupTestRoom(roomName: string, userId: string, options: {
    sources?: number;
    constructionSites?: Array<{ x: number; y: number; structureType: string }>;
    damagedStructures?: Array<{ x: number; y: number; structureType: string; damagePct?: number }>;
  } = {}): Promise<{ success: boolean; error?: string }> {
    return await this.harness.setupTestRoom(roomName, userId, options);
  }

  /**
   * Get the last deployment info
   */
  getLastDeployment(): DeploymentResult {
    if (!this.lastDeployment) {
      throw new Error("No deployment has been made yet");
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
   * Wait for a specific number of game ticks to pass
   */
  async waitForTicks(userId: string, ticksToWait: number): Promise<void> {
    await this.harness.waitForTicks(ticksToWait);
  }

  /**
   * Clean up test environment
   */
  /**
   * Enable live inspection mode (keep server running for debugging)
   */
  enableLiveInspection(): void {
    // This method is called by cleanup when preserveForInspection is true
    // The new harness handles this internally, so we don't need to do anything here
    console.log("🔍 Live inspection mode - server will remain running for debugging");
  }

  async cleanup(preserveForInspection: boolean = false): Promise<void> {
    await this.harness.cleanup(preserveForInspection);
    this.lastDeployment = null;
  }

  // Helper methods for backwards compatibility

  public curlCli(script: string): string {
    return this.harness.executeCli(script);
  }
}
