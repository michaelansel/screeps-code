"use strict";
/**
 * Screeps server lifecycle management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerManager = void 0;
const ContainerManager_1 = require("../container/ContainerManager");
class ServerManager {
    containerManager;
    config;
    isReady = false;
    constructor(config = {}) {
        this.config = config;
        this.containerManager = new ContainerManager_1.ContainerManager(config);
    }
    /**
     * Setup server environment (build and start)
     */
    async setup() {
        console.log('🧪 Setting up Screeps server environment...');
        if (!this.containerManager.isRunning()) {
            await this.containerManager.buildContainer();
            await this.containerManager.startContainers();
        }
        await this.waitForServer();
        await this.ensureFileBot();
        this.isReady = true;
        console.log('✅ Server environment ready');
    }
    /**
     * Cleanup server environment
     */
    async cleanup(preserveForInspection = false) {
        if (preserveForInspection) {
            this.enableLiveInspection();
            return;
        }
        console.log('🧹 Cleaning up server environment...');
        await this.containerManager.stopContainers();
        this.isReady = false;
    }
    /**
     * Reset game state for fresh test
     */
    async resetGameState() {
        console.log('🧹 Resetting game state...');
        this.curlCli('system.resetAllData()');
        await this.sleep(2000); // Wait for reset to complete
        console.log('✅ Game state reset');
    }
    /**
     * Execute CLI command on server
     */
    curlCli(script) {
        const escapedScript = script.replace(/"/g, '\\"');
        return this.containerManager.execContainer('screeps', `curl -s http://localhost:21026/cli -d "${escapedScript}"`);
    }
    /**
     * Wait for server to be ready
     */
    async waitForServer(maxAttempts = 30) {
        console.log('⏳ Waiting for server to start...');
        for (let i = 0; i < maxAttempts; i++) {
            try {
                this.curlCli("storage.env.get('gameTime').then(t => JSON.stringify(t))");
                console.log('✅ Server is ready');
                return;
            }
            catch {
                await this.sleep(2000);
            }
        }
        throw new Error('Server failed to start within timeout');
    }
    /**
     * Ensure FileBot mod is installed and working
     */
    async ensureFileBot() {
        console.log('⏳ Checking FileBot mod...');
        // Check if already loaded
        for (let i = 0; i < 5; i++) {
            try {
                const result = this.curlCli('typeof filebot');
                if (result.includes('object')) {
                    console.log('✅ FileBot mod ready');
                    return;
                }
            }
            catch {
                // Continue checking
            }
            await this.sleep(1000);
        }
        // Install FileBot mod if not loaded
        await this.installFileBot();
    }
    /**
     * Install FileBot mod
     */
    async installFileBot() {
        console.log('🔧 Installing FileBot mod...');
        // Wait for mods directory
        console.log('⏳ Waiting for mods directory...');
        for (let i = 0; i < 60; i++) {
            try {
                this.containerManager.execContainer('screeps', 'ls /screeps/mods/ > /dev/null 2>&1');
                break;
            }
            catch {
                if (i === 59) {
                    throw new Error('Mods directory never created');
                }
                await this.sleep(1000);
            }
        }
        // Copy FileBot mod (assuming it's already in container)
        this.containerManager.execContainer('screeps', 'cp /tmp/filebot-mod.js /screeps/mods/filebot-mod.js');
        // Restart server to load mod
        console.log('🔄 Restarting server to load FileBot mod...');
        this.containerManager.compose('restart screeps');
        // Wait for server to come back up
        await this.waitForServer();
        // Verify FileBot is loaded
        for (let i = 0; i < 20; i++) {
            try {
                const result = this.curlCli('typeof filebot');
                if (result.includes('object')) {
                    console.log('✅ FileBot mod installed and ready');
                    return;
                }
            }
            catch {
                // Continue waiting
            }
            await this.sleep(1000);
        }
        throw new Error('FileBot mod failed to load after installation');
    }
    /**
     * Get current simulation state
     */
    getSimulationState() {
        try {
            const tick = this.getGameTick();
            const paused = this.isSimulationPaused();
            const cpu = this.getSystemCpu();
            return { tick, paused, cpu };
        }
        catch (error) {
            throw new Error(`Failed to get simulation state: ${error}`);
        }
    }
    /**
     * Get current game tick
     */
    getGameTick() {
        try {
            const result = this.curlCli("storage.env.get('gameTime').then(t => JSON.stringify(t))");
            return parseInt(result.replace(/[^0-9]/g, '')) || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Check if simulation is paused
     */
    isSimulationPaused() {
        try {
            const result = this.curlCli("storage.env.get('paused').then(p => JSON.stringify(p))");
            return result.includes('true');
        }
        catch {
            return false;
        }
    }
    /**
     * Get system CPU usage
     */
    getSystemCpu() {
        try {
            const result = this.curlCli("storage.env.get('lastCpu').then(c => JSON.stringify(c))");
            return parseInt(result.replace(/[^0-9]/g, '')) || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Pause simulation
     */
    pauseSimulation() {
        this.curlCli('system.pauseSimulation()');
    }
    /**
     * Resume simulation
     */
    resumeSimulation() {
        this.curlCli('system.resumeSimulation()');
    }
    /**
     * Wait for specific number of ticks
     */
    async waitForTicks(ticks) {
        const startTick = this.getGameTick();
        const targetTick = startTick + ticks;
        console.log(`⏳ Waiting for ${ticks} ticks (${startTick} -> ${targetTick})...`);
        for (let i = 0; i < 120; i++) { // Max 2 minutes
            const currentTick = this.getGameTick();
            if (currentTick >= targetTick) {
                console.log(`✅ Reached tick ${currentTick} (waited ${currentTick - startTick} ticks)`);
                return;
            }
            await this.sleep(1000);
        }
        const finalTick = this.getGameTick();
        console.log(`⏰ Timeout waiting for ticks. Final tick: ${finalTick} (advanced ${finalTick - startTick})`);
    }
    /**
     * Check if server is ready
     */
    isServerReady() {
        return this.isReady;
    }
    /**
     * Enable live inspection mode
     */
    enableLiveInspection() {
        console.log('🔍 LIVE INSPECTION MODE ENABLED');
        console.log('🌐 Server running at: http://localhost:21025');
        console.log('⚡ CLI available at: http://localhost:21026/cli');
        console.log('🤖 FileBot commands: curl -s http://localhost:21026/cli -d "filebot.help()"');
        console.log('📊 Game state: curl -s http://localhost:21026/cli -d "storage.env.get(\'gameTime\')"');
        console.log('🗄️  Memory check: curl -s http://localhost:21026/cli -d "storage.db[\'users.memory\'].find({})"');
        console.log('⚠️  Server will remain running - use container manager to clean up');
    }
    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ServerManager = ServerManager;
//# sourceMappingURL=ServerManager.js.map