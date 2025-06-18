import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Functional Test Harness for Screeps
 * 
 * Handles all container management, bot deployment, and server interaction.
 * Tests should only need to specify what they're testing, not how to set up the environment.
 */

export interface DeploymentResult {
  success: boolean;
  userId: string;
  codeSize: number;
  room: string;
  error?: string;
}

export interface ExecutionResult {
  ticksAdvanced: number;
  cpuUsed: boolean;
  spawnActive: boolean;
  memoryInitialized: boolean;
  consoleOutput: string[];
}

export interface MonitorOptions {
  duration: number; // seconds
  expectations: {
    minTicks: number;
    cpuUsed: boolean;
    spawnActive: boolean;
  };
}

export interface GameObjects {
  spawns: Array<{ name: string; energy: number }>;
  creeps: Array<{ name: string; memory: any }>;
  sources: Array<{ id: string; energy: number }>;
  total: number;
}

export class FunctionalTestHarness {
  private containerCmd: string;
  private composeFile = join(process.cwd(), "test/config/docker-compose.functional.yml");
  private testRoom = "W12N12";
  private lastDeployment: DeploymentResult | null = null;
  private botCode: string | null = null;
  private serverReady = false;
  private environmentReady = false;

  constructor() {
    this.containerCmd = this.detectContainerRuntime();
  }

  /**
   * One-time environment setup (expensive - build container, install FileBot mod)
   */
  async setupEnvironment(): Promise<void> {
    if (this.environmentReady) {
      console.log("✅ Environment already set up");
      return;
    }

    console.log("🧪 Setting up test environment (one-time)...");
    
    // Clean up any existing environment
    await this.cleanup();
    
    // Build container
    console.log("🔨 Building Screeps server container...");
    execSync(`${this.containerCmd} compose -f ${this.composeFile} build`, { stdio: "inherit" });
    
    // Start server
    console.log("🚀 Starting Screeps server...");
    execSync(`${this.containerCmd} compose -f ${this.composeFile} up -d`, { stdio: "pipe" });
    
    // Wait for server and FileBot mod
    await this.waitForServer();
    await this.waitForFileBot();
    
    this.environmentReady = true;
    this.serverReady = true;
    console.log("✅ Environment setup complete - ready for tests");
  }

  /**
   * Prepare for a test case (fast - reset game state, don't rebuild)
   */
  async prepareTestCase(): Promise<void> {
    if (!this.environmentReady) {
      await this.setupEnvironment();
    }

    console.log("🔄 Preparing test case...");
    
    // Reset all game data instead of rebuilding
    console.log("🧹 Resetting game state...");
    this.curlCli("system.resetAllData()");
    
    // Wait a moment for reset to complete
    await this.sleep(2000);
    
    console.log("✅ Test case ready");
  }

  /**
   * Deploy the bot code to the server
   */
  async deployBot(): Promise<DeploymentResult> {
    if (!this.serverReady) {
      throw new Error("Server not ready. Call prepareTestEnvironment() first");
    }

    try {
      // Build bot if needed
      if (!this.botCode) {
        console.log("📦 Building bot code...");
        execSync("npm run build", { stdio: "pipe" });
        const distPath = join(process.cwd(), "dist/main.js");
        this.botCode = readFileSync(distPath, "utf8");
      }

      // Copy to container
      const distPath = join(process.cwd(), "dist/main.js");
      this.execContainer(`mkdir -p /screeps`);
      execSync(`${this.containerCmd} compose -f ${this.composeFile} cp "${distPath}" screeps:/screeps/main.js`, { stdio: "pipe" });

      // Pause simulation for controlled setup
      this.curlCli("system.pauseSimulation()");
      
      // Generate room
      this.curlCli(`map.generateRoom('${this.testRoom}')`);
      this.curlCli(`map.openRoom('${this.testRoom}')`);

      // Deploy via FileBot
      const userId = `test_bot_${Date.now()}`;
      const injectionResult = this.curlCli(`filebot.inject('/screeps/main.js', '${userId}', {
        username: 'TestBot',
        room: '${this.testRoom}',
        cpu: 100,
        cpuAvailable: 10000
      })`);

      // Resume simulation
      this.curlCli("system.resumeSimulation()");

      if (injectionResult.includes("success: true")) {
        // Extract actual user ID
        const userIdMatch = injectionResult.match(/userId: '([^']+)'/);
        const actualUserId = userIdMatch ? userIdMatch[1] : userId;
        
        this.lastDeployment = {
          success: true,
          userId: actualUserId,
          codeSize: this.botCode.length,
          room: this.testRoom
        };
        
        console.log(`✅ Bot deployed: ${actualUserId} (${this.botCode.length} bytes)`);
        return this.lastDeployment;
      } else {
        throw new Error(`Deployment failed: ${injectionResult}`);
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
    
    const startTick = this.getGameTick();
    const checkInterval = 10; // seconds
    const checks = Math.floor(options.duration / checkInterval);
    
    // Monitor with periodic checks
    for (let i = 1; i <= checks; i++) {
      await this.sleep(checkInterval * 1000);
      
      const currentTick = this.getGameTick();
      const cpuUsage = this.getCpuUsage(userId);
      
      console.log(`   Check ${i}/${checks}: Tick ${currentTick} (+${currentTick - startTick}), CPU: ${cpuUsage}`);
    }
    
    // Collect final evidence
    const endTick = this.getGameTick();
    const ticksAdvanced = endTick - startTick;
    const cpuUsage = this.getCpuUsage(userId);
    const spawnStatus = this.getSpawnStatus(userId);
    const memory = await this.getMemoryState(userId);
    const consoleLogs = this.getConsoleLogs(userId);
    
    return {
      ticksAdvanced,
      cpuUsed: cpuUsage > 0,
      spawnActive: spawnStatus,
      memoryInitialized: memory !== null && Object.keys(memory).length > 0,
      consoleOutput: consoleLogs
    };
  }

  /**
   * Get memory state for a user
   */
  async getMemoryState(userId: string): Promise<any> {
    try {
      const result = this.curlCli(`storage.db['users.memory'].findOne({user: '${userId}'}).then(m => JSON.stringify(m ? m.memory : null))`);
      return JSON.parse(result.replace(/^"|"$/g, ''));
    } catch {
      return null;
    }
  }

  /**
   * Get game objects for a user
   */
  async getGameObjects(userId: string): Promise<GameObjects> {
    try {
      const objects = this.curlCli(`storage.db['rooms.objects'].find({user: '${userId}'}).then(objs => JSON.stringify(objs))`);
      const parsed = JSON.parse(objects);
      
      return {
        spawns: parsed.filter((o: any) => o.type === 'spawn').map((s: any) => ({
          name: s.name,
          energy: s.store?.energy || 0
        })),
        creeps: parsed.filter((o: any) => o.type === 'creep').map((c: any) => ({
          name: c.name,
          memory: c.memory || {}
        })),
        sources: parsed.filter((o: any) => o.type === 'source').map((s: any) => ({
          id: s._id,
          energy: s.energy || 0
        })),
        total: parsed.length
      };
    } catch {
      return { spawns: [], creeps: [], sources: [], total: 0 };
    }
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
   * Clean up test environment
   */
  /**
   * Enable live inspection mode (keep server running for debugging)
   */
  enableLiveInspection(): void {
    console.log("🔍 LIVE INSPECTION MODE ENABLED");
    console.log("🌐 Server running at: http://localhost:21025");
    console.log("⚡ CLI available at: http://localhost:21026/cli");
    console.log("🤖 FileBot commands: curl -s http://localhost:21026/cli -d \"filebot.help()\"");
    console.log("📊 Game state: curl -s http://localhost:21026/cli -d \"storage.env.get('gameTime')\"");
    console.log("🗄️  Memory check: curl -s http://localhost:21026/cli -d \"storage.db['users.memory'].find({})\"");
    console.log("⚠️  Server will remain running - use 'finch compose -f test/config/docker-compose.functional.yml down -v' to clean up");
  }

  async cleanup(preserveForInspection: boolean = false): Promise<void> {
    if (preserveForInspection) {
      this.enableLiveInspection();
      return;
    }

    console.log("🧹 Cleaning up test environment...");
    try {
      execSync(`${this.containerCmd} compose -f ${this.composeFile} down -v`, { stdio: "pipe" });
    } catch {
      // Ignore cleanup errors
    }
    this.serverReady = false;
    this.lastDeployment = null;
    this.environmentReady = false;
  }

  // Private helper methods

  private detectContainerRuntime(): string {
    try {
      execSync("finch --version", { stdio: "pipe" });
      return "finch";
    } catch {
      try {
        execSync("docker --version", { stdio: "pipe" });
        return "docker";
      } catch {
        throw new Error("No container runtime found. Install Docker or Finch.");
      }
    }
  }

  private execContainer(command: string, timeout: number = 60000): string {
    return execSync(`${this.containerCmd} compose -f ${this.composeFile} exec -T screeps ${command}`, { 
      encoding: "utf8", 
      stdio: "pipe",
      timeout 
    });
  }

  private curlCli(script: string): string {
    return this.execContainer(`curl -s http://localhost:21026/cli -d "${script}"`);
  }

  private async waitForServer(): Promise<void> {
    console.log("⏳ Waiting for server to start...");
    for (let i = 0; i < 30; i++) {
      try {
        this.curlCli("storage.env.get('gameTime').then(t => JSON.stringify(t))");
        console.log("✅ Server is ready");
        return;
      } catch {
        await this.sleep(2000);
      }
    }
    throw new Error("Server failed to start within timeout");
  }

  private async waitForFileBot(): Promise<void> {
    console.log("⏳ Waiting for FileBot mod...");
    
    // First check if FileBot mod is already loaded
    for (let i = 0; i < 5; i++) {
      try {
        const result = this.curlCli("typeof filebot");
        if (result.includes("object")) {
          console.log("✅ FileBot mod is already ready");
          return;
        }
      } catch {
        // Continue waiting
      }
      await this.sleep(1000);
    }
    
    // FileBot mod not loaded, need to install it manually
    console.log("🔧 Installing FileBot mod...");
    
    // Wait for mods directory to be created by server
    console.log("⏳ Waiting for mods directory...");
    for (let i = 0; i < 60; i++) {
      try {
        this.execContainer("ls /screeps/mods/ > /dev/null 2>&1");
        console.log("✅ Mods directory found");
        break;
      } catch {
        if (i === 59) {
          throw new Error("Mods directory never created");
        }
        await this.sleep(1000);
      }
    }
    
    // Copy FileBot mod
    console.log("📁 Copying FileBot mod...");
    this.execContainer("cp /tmp/filebot-mod.js /screeps/mods/filebot-mod.js");
    
    // Restart server to load the mod
    console.log("🔄 Restarting server to load FileBot mod...");
    execSync(`${this.containerCmd} compose -f ${this.composeFile} restart screeps`, { 
      stdio: "pipe",
      timeout: 120000 
    });
    
    // Wait for server to come back up
    await this.waitForServer();
    
    // Verify FileBot mod is now loaded
    console.log("✅ Verifying FileBot mod...");
    for (let i = 0; i < 20; i++) {
      try {
        const result = this.curlCli("typeof filebot");
        if (result.includes("object")) {
          console.log("✅ FileBot mod is ready");
          return;
        }
      } catch {
        // Continue waiting
      }
      await this.sleep(1000);
    }
    throw new Error("FileBot mod failed to load after installation");
  }

  private getGameTick(): number {
    try {
      const result = this.curlCli("storage.env.get('gameTime').then(t => JSON.stringify(t))");
      return parseInt(result.replace(/[^0-9]/g, '')) || 0;
    } catch {
      return 0;
    }
  }

  private getCpuUsage(userId: string): number {
    try {
      const result = this.curlCli(`storage.db.users.findOne({_id: '${userId}'}).then(u => JSON.stringify(u ? u.lastUsedCpu : 0))`);
      return parseInt(result.replace(/[^0-9]/g, '')) || 0;
    } catch {
      return 0;
    }
  }

  private getSpawnStatus(userId: string): boolean {
    try {
      const result = this.curlCli(`storage.db['rooms.objects'].findOne({user: '${userId}', type: 'spawn'}).then(s => JSON.stringify(s ? s.off === false : false))`);
      return result.includes("true");
    } catch {
      return false;
    }
  }

  private getConsoleLogs(userId: string): string[] {
    try {
      const result = this.curlCli(`storage.db['users.console'].find({user: '${userId}'}).then(logs => JSON.stringify(logs.map(l => l.log)))`);
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

