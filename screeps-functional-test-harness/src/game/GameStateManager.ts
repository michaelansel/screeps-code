/**
 * Game state management for Screeps server
 */

import { ServerManager } from '../server/ServerManager';
import { GameObjects, MemoryStats, UserInfo } from '../types';

export class GameStateManager {
  private serverManager: ServerManager;

  constructor(serverManager: ServerManager) {
    this.serverManager = serverManager;
  }

  /**
   * Get memory state for a specific user
   */
  async getMemoryState(userId: string): Promise<any> {
    try {
      const result = this.serverManager.curlCli(`storage.env.get('memory:${userId}').then(data => JSON.stringify(data, null, 2))`);
      
      // Handle various forms of empty/undefined results
      if (!result || 
          result === "null" || 
          result === '""' || 
          result === "undefined" || 
          result.trim() === "undefined" ||
          result.trim() === "") {
        return null;
      }
      
      // Parse the memory data
      const parsed = JSON.parse(result);
      if (typeof parsed === "string") {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch (error) {
      console.warn(`Failed to get memory for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Set memory state for a user
   */
  async setMemoryState(userId: string, memory: any): Promise<{ success: boolean; error?: string }> {
    try {
      const memoryJson = JSON.stringify(memory);
      const result = this.serverManager.curlCli(`storage.env.set('memory:${userId}', '${memoryJson}').then(r => JSON.stringify({success: true}))`);
      
      if (result.includes('"success":true')) {
        return { success: true };
      } else {
        return { success: false, error: result };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Preload memory state for a user
   */
  async preloadMemory(userId: string, memory: any): Promise<{ success: boolean; error?: string }> {
    return this.setMemoryState(userId, memory);
  }

  /**
   * Merge memory state for a user
   */
  async mergeMemory(userId: string, memoryUpdate: any): Promise<{ success: boolean; error?: string }> {
    try {
      const currentMemory = await this.getMemoryState(userId) || {};
      const mergedMemory = { ...currentMemory, ...memoryUpdate };
      return this.setMemoryState(userId, mergedMemory);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Check memory patterns for validation
   */
  async checkMemoryPatterns(userId: string, patterns: Record<string, any>): Promise<Record<string, boolean>> {
    const memory = await this.getMemoryState(userId);
    const results: Record<string, boolean> = {};

    if (!memory) {
      // If no memory, all patterns fail
      Object.keys(patterns).forEach(key => {
        results[key] = false;
      });
      return results;
    }

    for (const [key, expectedValue] of Object.entries(patterns)) {
      if (key.includes('.')) {
        // Handle nested properties like 'creeps.Worker1.project'
        const parts = key.split('.');
        let current = memory;
        let found = true;

        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            found = false;
            break;
          }
        }

        if (found) {
          results[key] = expectedValue === null ? current !== undefined : current === expectedValue;
        } else {
          results[key] = false;
        }
      } else {
        // Handle top-level properties
        results[key] = expectedValue === null ? key in memory : memory[key] === expectedValue;
      }
    }

    return results;
  }

  /**
   * Get memory statistics for analysis
   */
  async getMemoryStats(userId: string): Promise<MemoryStats> {
    const memory = await this.getMemoryState(userId);

    if (!memory) {
      return {
        exists: false,
        size: 0,
        hasCreeps: false,
        creepCount: 0,
        hasCreepCounter: false,
        memoryStructure: []
      };
    }

    const memoryString = JSON.stringify(memory);
    const creeps = memory.creeps || {};

    return {
      exists: true,
      size: memoryString.length,
      hasCreeps: Object.keys(creeps).length > 0,
      creepCount: Object.keys(creeps).length,
      hasCreepCounter: 'creepCounter' in memory,
      memoryStructure: Object.keys(memory)
    };
  }

  /**
   * Get all users with their memory data
   */
  async getAllUsersWithMemory(): Promise<UserInfo[]> {
    try {
      const result = this.serverManager.curlCli("storage.db['users.memory'].find({}).then(users => JSON.stringify(users))");
      const users = JSON.parse(result);
      
      return users.map((user: any) => ({
        userId: user._id,
        memory: user.data
      }));
    } catch (error) {
      console.warn('Failed to get all users with memory:', error);
      return [];
    }
  }

  /**
   * Get game objects for a user
   */
  async getGameObjects(userId: string): Promise<GameObjects> {
    try {
      const objects = this.serverManager.curlCli(
        `storage.db['rooms.objects'].find({user: '${userId}'}).then(objs => JSON.stringify(objs))`
      );
      const parsed = JSON.parse(objects);

      return {
        spawns: parsed
          .filter((o: any) => o.type === "spawn")
          .map((s: any) => ({
            name: s.name,
            energy: s.store?.energy || 0
          })),
        creeps: parsed
          .filter((o: any) => o.type === "creep")
          .map((c: any) => ({
            name: c.name,
            memory: c.memory || {}
          })),
        sources: parsed
          .filter((o: any) => o.type === "source")
          .map((s: any) => ({
            id: s._id,
            energy: s.energy || 0
          })),
        total: parsed.length
      };
    } catch (error) {
      console.warn('Failed to get game objects:', error);
      return { spawns: [], creeps: [], sources: [], total: 0 };
    }
  }

  /**
   * Generate a room for testing
   */
  async generateRoom(roomName: string): Promise<void> {
    this.serverManager.curlCli(`map.generateRoom('${roomName}')`);
    this.serverManager.curlCli(`map.openRoom('${roomName}')`);
  }

  /**
   * Get CPU usage for a user
   */
  getCpuUsage(userId: string): number {
    try {
      const result = this.serverManager.curlCli(
        `storage.db.users.findOne({_id: '${userId}'}).then(u => JSON.stringify(u ? u.lastUsedCpu : 0))`
      );
      return parseInt(result.replace(/[^0-9]/g, '')) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get spawn status for a user
   */
  getSpawnStatus(userId: string): boolean {
    try {
      const result = this.serverManager.curlCli(
        `storage.db['rooms.objects'].findOne({user: '${userId}', type: 'spawn'}).then(s => JSON.stringify(s ? s.off === false : false))`
      );
      return result.includes("true");
    } catch {
      return false;
    }
  }

  /**
   * Get console logs for a user
   */
  getConsoleLogs(userId: string): string[] {
    try {
      const result = this.serverManager.curlCli(
        `storage.db['users.console'].find({user: '${userId}'}).then(logs => JSON.stringify(logs.map(l => l.log)))`
      );
      return JSON.parse(result);
    } catch {
      return [];
    }
  }
}