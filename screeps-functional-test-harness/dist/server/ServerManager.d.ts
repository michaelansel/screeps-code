/**
 * Screeps server lifecycle management
 */
import { ServerConfig, SimulationState } from '../types';
export declare class ServerManager {
    private containerManager;
    private config;
    private isReady;
    constructor(config?: ServerConfig);
    /**
     * Setup server environment (build and start)
     */
    setup(): Promise<void>;
    /**
     * Cleanup server environment
     */
    cleanup(preserveForInspection?: boolean): Promise<void>;
    /**
     * Reset game state for fresh test
     */
    resetGameState(): Promise<void>;
    /**
     * Execute CLI command on server
     */
    curlCli(script: string): string;
    /**
     * Wait for server to be ready
     */
    private waitForServer;
    /**
     * Ensure FileBot mod is installed and working
     */
    private ensureFileBot;
    /**
     * Install FileBot mod
     */
    private installFileBot;
    /**
     * Get current simulation state
     */
    getSimulationState(): SimulationState;
    /**
     * Get current game tick
     */
    getGameTick(): number;
    /**
     * Check if simulation is paused
     */
    private isSimulationPaused;
    /**
     * Get system CPU usage
     */
    private getSystemCpu;
    /**
     * Copy file to container
     */
    copyFileToContainer(hostPath: string, containerPath: string): void;
    /**
     * Pause simulation
     */
    pauseSimulation(): void;
    /**
     * Resume simulation
     */
    resumeSimulation(): void;
    /**
     * Wait for specific number of ticks
     */
    waitForTicks(ticks: number): Promise<void>;
    /**
     * Check if server is ready
     */
    isServerReady(): boolean;
    /**
     * Enable live inspection mode
     */
    private enableLiveInspection;
    /**
     * Utility sleep function
     */
    private sleep;
}
//# sourceMappingURL=ServerManager.d.ts.map