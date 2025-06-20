/**
 * Main Screeps Functional Test Harness
 *
 * This is the primary interface for functional testing of Screeps bots.
 * It orchestrates container management, server lifecycle, game state, and bot deployment.
 */
import { ServerConfig, DeploymentResult, ExecutionResult, MonitorOptions, GameObjects, MemoryStats, UserInfo, SimulationState } from './types';
export declare class ScreepsFunctionalTestHarness {
    private serverManager;
    private gameStateManager;
    private botManager;
    private isSetup;
    constructor(config?: ServerConfig);
    /**
     * Setup the test environment (one-time expensive operation)
     */
    setup(): Promise<void>;
    /**
     * Cleanup the test environment
     */
    cleanup(preserveForInspection?: boolean): Promise<void>;
    /**
     * Reset game state for a fresh test (fast operation)
     */
    resetGameState(): Promise<void>;
    /**
     * Check if harness is ready
     */
    isReady(): boolean;
    /**
     * Deploy bot code to the server
     */
    deployBot(codePath: string, options?: {
        username?: string;
        room?: string;
        cpu?: number;
        cpuAvailable?: number;
    }): Promise<DeploymentResult>;
    /**
     * Monitor bot execution for specified duration
     */
    monitorExecution(userId: string, options: MonitorOptions): Promise<ExecutionResult>;
    /**
     * Get the last deployment result
     */
    getLastDeployment(): DeploymentResult;
    /**
     * Check if there's a valid deployment
     */
    hasValidDeployment(): boolean;
    /**
     * Get current simulation state
     */
    getSimulationState(): SimulationState;
    /**
     * Pause the simulation
     */
    pauseSimulation(): void;
    /**
     * Resume the simulation
     */
    resumeSimulation(): void;
    /**
     * Wait for a specific number of game ticks
     */
    waitForTicks(ticks: number): Promise<void>;
    /**
     * Get current game tick
     */
    getGameTick(): number;
    /**
     * Get memory state for a user
     */
    getMemoryState(userId: string): Promise<any>;
    /**
     * Set memory state for a user
     */
    setMemoryState(userId: string, memory: any): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Preload memory state for scenario testing
     */
    preloadMemory(userId: string, memory: any): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Merge memory state with existing data
     */
    mergeMemory(userId: string, memoryUpdate: any): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Check memory patterns for validation
     */
    checkMemoryPatterns(userId: string, patterns: Record<string, any>): Promise<Record<string, boolean>>;
    /**
     * Get memory statistics
     */
    getMemoryStats(userId: string): Promise<MemoryStats>;
    /**
     * Get all users with memory data
     */
    getAllUsersWithMemory(): Promise<UserInfo[]>;
    /**
     * Get game objects for a user
     */
    getGameObjects(userId: string): Promise<GameObjects>;
    /**
     * Generate a room for testing
     */
    generateRoom(roomName: string, options?: {
        sources?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Open a room to make it available for players
     */
    openRoom(roomName: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Create construction sites for testing
     */
    createConstructionSite(roomName: string, x: number, y: number, structureType: string, userId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Create damaged structures for repair testing
     */
    createDamagedStructure(roomName: string, x: number, y: number, structureType: string, userId: string, damagePct?: number): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Set up a complete test room with spawn, sources, and controller
     */
    setupTestRoom(roomName: string, userId: string, options?: {
        sources?: number;
        constructionSites?: Array<{
            x: number;
            y: number;
            structureType: string;
        }>;
        damagedStructures?: Array<{
            x: number;
            y: number;
            structureType: string;
            damagePct?: number;
        }>;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get CPU usage for a user
     */
    getCpuUsage(userId: string): number;
    /**
     * Get spawn status for a user
     */
    getSpawnStatus(userId: string): boolean;
    /**
     * Get console logs for a user
     */
    getConsoleLogs(userId: string): string[];
    /**
     * Set test room for bot deployments
     */
    setTestRoom(roomName: string): void;
    /**
     * Get current test room
     */
    getTestRoom(): string;
    /**
     * Execute raw CLI command (for advanced usage)
     */
    executeCli(command: string): string;
}
//# sourceMappingURL=ScreepsFunctionalTestHarness.d.ts.map