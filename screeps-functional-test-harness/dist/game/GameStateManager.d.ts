/**
 * Game state management for Screeps server
 */
import { ServerManager } from '../server/ServerManager';
import { GameObjects, MemoryStats, UserInfo } from '../types';
export declare class GameStateManager {
    private serverManager;
    constructor(serverManager: ServerManager);
    /**
     * Generate a room with proper game world setup
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