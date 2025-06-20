"use strict";
/**
 * Main Screeps Functional Test Harness
 *
 * This is the primary interface for functional testing of Screeps bots.
 * It orchestrates container management, server lifecycle, game state, and bot deployment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreepsFunctionalTestHarness = void 0;
const ServerManager_1 = require("./server/ServerManager");
const GameStateManager_1 = require("./game/GameStateManager");
const BotManager_1 = require("./bot/BotManager");
class ScreepsFunctionalTestHarness {
    serverManager;
    gameStateManager;
    botManager;
    isSetup = false;
    constructor(config = {}) {
        this.serverManager = new ServerManager_1.ServerManager(config);
        this.gameStateManager = new GameStateManager_1.GameStateManager(this.serverManager);
        this.botManager = new BotManager_1.BotManager(this.serverManager, this.gameStateManager);
    }
    // ========================================
    // LIFECYCLE MANAGEMENT
    // ========================================
    /**
     * Setup the test environment (one-time expensive operation)
     */
    async setup() {
        if (this.isSetup) {
            return;
        }
        await this.serverManager.setup();
        this.isSetup = true;
    }
    /**
     * Cleanup the test environment
     */
    async cleanup(preserveForInspection = false) {
        await this.serverManager.cleanup(preserveForInspection);
        this.isSetup = false;
    }
    /**
     * Reset game state for a fresh test (fast operation)
     */
    async resetGameState() {
        await this.serverManager.resetGameState();
        this.botManager.clearDeployment();
    }
    /**
     * Check if harness is ready
     */
    isReady() {
        return this.isSetup && this.serverManager.isServerReady();
    }
    // ========================================
    // BOT DEPLOYMENT & MONITORING
    // ========================================
    /**
     * Deploy bot code to the server
     */
    async deployBot(codePath, options = {}) {
        return this.botManager.deployBot(codePath, options);
    }
    /**
     * Monitor bot execution for specified duration
     */
    async monitorExecution(userId, options) {
        return this.botManager.monitorExecution(userId, options);
    }
    /**
     * Get the last deployment result
     */
    getLastDeployment() {
        return this.botManager.getLastDeployment();
    }
    /**
     * Check if there's a valid deployment
     */
    hasValidDeployment() {
        return this.botManager.hasValidDeployment();
    }
    // ========================================
    // SIMULATION CONTROL
    // ========================================
    /**
     * Get current simulation state
     */
    getSimulationState() {
        return this.serverManager.getSimulationState();
    }
    /**
     * Pause the simulation
     */
    pauseSimulation() {
        this.serverManager.pauseSimulation();
    }
    /**
     * Resume the simulation
     */
    resumeSimulation() {
        this.serverManager.resumeSimulation();
    }
    /**
     * Wait for a specific number of game ticks
     */
    async waitForTicks(ticks) {
        await this.serverManager.waitForTicks(ticks);
    }
    /**
     * Get current game tick
     */
    getGameTick() {
        return this.serverManager.getGameTick();
    }
    // ========================================
    // MEMORY MANAGEMENT
    // ========================================
    /**
     * Get memory state for a user
     */
    async getMemoryState(userId) {
        return this.gameStateManager.getMemoryState(userId);
    }
    /**
     * Set memory state for a user
     */
    async setMemoryState(userId, memory) {
        return this.gameStateManager.setMemoryState(userId, memory);
    }
    /**
     * Preload memory state for scenario testing
     */
    async preloadMemory(userId, memory) {
        return this.gameStateManager.preloadMemory(userId, memory);
    }
    /**
     * Merge memory state with existing data
     */
    async mergeMemory(userId, memoryUpdate) {
        return this.gameStateManager.mergeMemory(userId, memoryUpdate);
    }
    /**
     * Check memory patterns for validation
     */
    async checkMemoryPatterns(userId, patterns) {
        return this.gameStateManager.checkMemoryPatterns(userId, patterns);
    }
    /**
     * Get memory statistics
     */
    async getMemoryStats(userId) {
        return this.gameStateManager.getMemoryStats(userId);
    }
    /**
     * Get all users with memory data
     */
    async getAllUsersWithMemory() {
        return this.gameStateManager.getAllUsersWithMemory();
    }
    // ========================================
    // GAME OBJECTS & STATE
    // ========================================
    /**
     * Get game objects for a user
     */
    async getGameObjects(userId) {
        return this.gameStateManager.getGameObjects(userId);
    }
    /**
     * Generate a room for testing
     */
    async generateRoom(roomName, options = {}) {
        return this.gameStateManager.generateRoom(roomName, options);
    }
    /**
     * Open a room to make it available for players
     */
    async openRoom(roomName) {
        return this.gameStateManager.openRoom(roomName);
    }
    /**
     * Create construction sites for testing
     */
    async createConstructionSite(roomName, x, y, structureType, userId) {
        return this.gameStateManager.createConstructionSite(roomName, x, y, structureType, userId);
    }
    /**
     * Create damaged structures for repair testing
     */
    async createDamagedStructure(roomName, x, y, structureType, userId, damagePct = 0.5) {
        return this.gameStateManager.createDamagedStructure(roomName, x, y, structureType, userId, damagePct);
    }
    /**
     * Set up a complete test room with spawn, sources, and controller
     */
    async setupTestRoom(roomName, userId, options = {}) {
        return this.gameStateManager.setupTestRoom(roomName, userId, options);
    }
    /**
     * Get CPU usage for a user
     */
    getCpuUsage(userId) {
        return this.gameStateManager.getCpuUsage(userId);
    }
    /**
     * Get spawn status for a user
     */
    getSpawnStatus(userId) {
        return this.gameStateManager.getSpawnStatus(userId);
    }
    /**
     * Get console logs for a user
     */
    getConsoleLogs(userId) {
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
    setTestRoom(roomName) {
        this.botManager.setTestRoom(roomName);
    }
    /**
     * Get current test room
     */
    getTestRoom() {
        return this.botManager.getTestRoom();
    }
    // ========================================
    // UTILITIES
    // ========================================
    /**
     * Execute raw CLI command (for advanced usage)
     */
    executeCli(command) {
        return this.serverManager.curlCli(command);
    }
}
exports.ScreepsFunctionalTestHarness = ScreepsFunctionalTestHarness;
//# sourceMappingURL=ScreepsFunctionalTestHarness.js.map