/**
 * Game state management for Screeps server
 */
import { ServerManager } from '../server/ServerManager';
import { GameObjects, MemoryStats, UserInfo } from '../types';
export declare class GameStateManager {
    private serverManager;
    constructor(serverManager: ServerManager);
    /**
     * Get memory state for a specific user
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
     * Preload memory state for a user
     */
    preloadMemory(userId: string, memory: any): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Merge memory state for a user
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
     * Get memory statistics for analysis
     */
    getMemoryStats(userId: string): Promise<MemoryStats>;
    /**
     * Get all users with their memory data
     */
    getAllUsersWithMemory(): Promise<UserInfo[]>;
    /**
     * Get game objects for a user
     */
    getGameObjects(userId: string): Promise<GameObjects>;
    /**
     * Generate a room for testing
     */
    generateRoom(roomName: string): Promise<void>;
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
}
//# sourceMappingURL=GameStateManager.d.ts.map