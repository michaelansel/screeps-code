"use strict";
/**
 * Game state management for Screeps server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStateManager = void 0;
class GameStateManager {
    serverManager;
    constructor(serverManager) {
        this.serverManager = serverManager;
    }
    /**
     * Generate a room with proper game world setup
     */
    async generateRoom(roomName, options = {}) {
        try {
            const sources = options.sources || 2;
            const result = this.serverManager.curlCli(`map.generateRoom('${roomName}', { sources: ${sources} })`);
            if (result && result.startsWith('Error:')) {
                return { success: false, error: result };
            }
            console.log(`✅ Generated room ${roomName} with ${sources} sources`);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Open a room to make it available for players
     */
    async openRoom(roomName) {
        try {
            const result = this.serverManager.curlCli(`map.openRoom('${roomName}')`);
            if (result && result.startsWith('Error:')) {
                return { success: false, error: result };
            }
            console.log(`✅ Opened room ${roomName}`);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Create construction sites for testing
     */
    async createConstructionSite(roomName, x, y, structureType, userId) {
        try {
            const result = this.serverManager.curlCli(`storage.db['rooms.objects'].insert({
          room: '${roomName}',
          x: ${x},
          y: ${y},
          type: 'constructionSite',
          structureType: '${structureType}',
          user: '${userId}',
          progress: 0,
          progressTotal: CONSTRUCTION_COST['${structureType}'] || 200
        })`);
            if (result && result.startsWith('Error:')) {
                return { success: false, error: result };
            }
            console.log(`✅ Created construction site: ${structureType} at ${roomName} (${x}, ${y})`);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Create damaged structures for repair testing
     */
    async createDamagedStructure(roomName, x, y, structureType, userId, damagePct = 0.5) {
        try {
            const maxHits = structureType === 'road' ? 300 :
                structureType === 'container' ? 250000 :
                    structureType === 'extension' ? 1000 : 3000;
            const hits = Math.floor(maxHits * damagePct);
            const result = this.serverManager.curlCli(`storage.db['rooms.objects'].insert({
          room: '${roomName}',
          x: ${x},
          y: ${y},
          type: '${structureType}',
          user: '${userId}',
          hits: ${hits},
          hitsMax: ${maxHits}
        })`);
            if (result && result.startsWith('Error:')) {
                return { success: false, error: result };
            }
            console.log(`✅ Created damaged structure: ${structureType} at ${roomName} (${x}, ${y}) - ${Math.round(damagePct * 100)}% health`);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Set up a complete test room with spawn, sources, and controller
     */
    async setupTestRoom(roomName, userId, options = {}) {
        try {
            // Generate the room (only if it doesn't exist)
            const roomResult = await this.generateRoom(roomName, { sources: options.sources });
            if (!roomResult.success && !roomResult.error?.includes("already exists")) {
                return roomResult;
            }
            // Open the room (this is idempotent)
            const openResult = await this.openRoom(roomName);
            if (!openResult.success && !openResult.error?.includes("already")) {
                return openResult;
            }
            // Wait a bit for room to be ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Create construction sites if requested
            if (options.constructionSites) {
                for (const site of options.constructionSites) {
                    const siteResult = await this.createConstructionSite(roomName, site.x, site.y, site.structureType, userId);
                    if (!siteResult.success) {
                        console.warn(`Failed to create construction site: ${siteResult.error}`);
                    }
                }
            }
            // Create damaged structures if requested
            if (options.damagedStructures) {
                for (const structure of options.damagedStructures) {
                    const structResult = await this.createDamagedStructure(roomName, structure.x, structure.y, structure.structureType, userId, structure.damagePct);
                    if (!structResult.success) {
                        console.warn(`Failed to create damaged structure: ${structResult.error}`);
                    }
                }
            }
            console.log(`✅ Test room ${roomName} setup complete`);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Get memory state for a specific user
     */
    async getMemoryState(userId) {
        try {
            const result = this.serverManager.curlCli(`storage.env.get('memory:${userId}').then(data => JSON.stringify(data, null, 2))`);
            // Check if the result is an error message instead of JSON
            if (!result || result.startsWith('Error:') || result.startsWith('error:')) {
                console.warn('CLI returned error for getMemoryState:', result);
                return null;
            }
            // Handle various forms of empty/undefined results
            if (result === "null" ||
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
        }
        catch (error) {
            console.warn(`Failed to get memory for user ${userId}:`, error);
            return null;
        }
    }
    /**
     * Set memory state for a user
     */
    async setMemoryState(userId, memory) {
        try {
            const memoryJson = JSON.stringify(memory);
            const result = this.serverManager.curlCli(`storage.env.set('memory:${userId}', '${memoryJson}').then(r => JSON.stringify({success: true}))`);
            if (result.includes('"success":true')) {
                return { success: true };
            }
            else {
                return { success: false, error: result };
            }
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Preload memory state for a user
     */
    async preloadMemory(userId, memory) {
        return this.setMemoryState(userId, memory);
    }
    /**
     * Merge memory state for a user
     */
    async mergeMemory(userId, memoryUpdate) {
        try {
            const currentMemory = await this.getMemoryState(userId) || {};
            const mergedMemory = { ...currentMemory, ...memoryUpdate };
            return this.setMemoryState(userId, mergedMemory);
        }
        catch (error) {
            return { success: false, error: String(error) };
        }
    }
    /**
     * Check memory patterns for validation
     */
    async checkMemoryPatterns(userId, patterns) {
        const memory = await this.getMemoryState(userId);
        const results = {};
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
                    }
                    else {
                        found = false;
                        break;
                    }
                }
                if (found) {
                    results[key] = expectedValue === null ? current !== undefined : current === expectedValue;
                }
                else {
                    results[key] = false;
                }
            }
            else {
                // Handle top-level properties
                results[key] = expectedValue === null ? key in memory : memory[key] === expectedValue;
            }
        }
        return results;
    }
    /**
     * Get memory statistics for analysis
     */
    async getMemoryStats(userId) {
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
    async getAllUsersWithMemory() {
        try {
            // First, get all users from the users collection
            const usersResult = this.serverManager.curlCli("storage.db.users.find({}).then(users => JSON.stringify(users))");
            // Check if the result is an error message instead of JSON
            if (!usersResult || usersResult.startsWith('Error:') || usersResult.startsWith('error:')) {
                console.warn('CLI returned error when fetching users:', usersResult);
                return [];
            }
            // Handle various forms of empty/undefined results
            if (usersResult === "null" ||
                usersResult === '""' ||
                usersResult === "undefined" ||
                usersResult.trim() === "undefined" ||
                usersResult.trim() === "" ||
                usersResult.trim() === "[]") {
                return [];
            }
            const users = JSON.parse(usersResult);
            // Ensure users is an array
            if (!Array.isArray(users)) {
                console.warn('getAllUsersWithMemory: Expected array but got:', typeof users);
                return [];
            }
            // Get memory for each user
            const usersWithMemory = [];
            for (const user of users) {
                try {
                    const memory = await this.getMemoryState(user._id);
                    usersWithMemory.push({
                        userId: user._id,
                        memory: memory
                    });
                }
                catch (error) {
                    console.warn(`Failed to get memory for user ${user._id}:`, error);
                    // Still include user but with null memory
                    usersWithMemory.push({
                        userId: user._id,
                        memory: null
                    });
                }
            }
            return usersWithMemory;
        }
        catch (error) {
            console.warn('Failed to get all users with memory:', error);
            return [];
        }
    }
    /**
     * Get game objects for a user
     */
    async getGameObjects(userId) {
        try {
            // First get user's room by finding their spawn
            const roomResult = this.serverManager.curlCli(`storage.db['rooms.objects'].findOne({user: '${userId}', type: 'spawn'}).then(spawn => spawn ? spawn.room : null).then(r => JSON.stringify(r))`);
            let userRoom = null;
            try {
                userRoom = JSON.parse(roomResult);
            }
            catch {
                console.warn('Could not determine user room');
                return { spawns: [], creeps: [], sources: [], total: 0 };
            }
            if (!userRoom) {
                console.warn('User has no spawn, cannot determine room');
                return { spawns: [], creeps: [], sources: [], total: 0 };
            }
            // Now get all objects in the user's room
            const objects = this.serverManager.curlCli(`storage.db['rooms.objects'].find({room: '${userRoom}'}).then(objs => JSON.stringify(objs))`);
            // Check if the result is an error message instead of JSON
            if (!objects || objects.startsWith('Error:') || objects.startsWith('error:')) {
                console.warn('CLI returned error for getGameObjects:', objects);
                return { spawns: [], creeps: [], sources: [], total: 0 };
            }
            // Handle various forms of empty/undefined results
            if (objects === "null" ||
                objects === '""' ||
                objects === "undefined" ||
                objects.trim() === "undefined" ||
                objects.trim() === "" ||
                objects.trim() === "[]") {
                return { spawns: [], creeps: [], sources: [], total: 0 };
            }
            const parsed = JSON.parse(objects);
            // Ensure parsed is an array
            if (!Array.isArray(parsed)) {
                console.warn('getGameObjects: Expected array but got:', typeof parsed);
                return { spawns: [], creeps: [], sources: [], total: 0 };
            }
            return {
                spawns: parsed
                    .filter((o) => o.type === "spawn" && o.user === userId)
                    .map((s) => ({
                    name: s.name,
                    energy: s.store?.energy || 0
                })),
                creeps: parsed
                    .filter((o) => o.type === "creep" && o.user === userId)
                    .map((c) => ({
                    name: c.name,
                    memory: c.memory || {}
                })),
                sources: parsed
                    .filter((o) => o.type === "source")
                    .map((s) => ({
                    id: s._id,
                    energy: s.energy || 0
                })),
                total: parsed.length
            };
        }
        catch (error) {
            console.warn('Failed to get game objects:', error);
            return { spawns: [], creeps: [], sources: [], total: 0 };
        }
    }
    /**
     * Get CPU usage for a user
     */
    getCpuUsage(userId) {
        try {
            const result = this.serverManager.curlCli(`storage.db.users.findOne({_id: '${userId}'}).then(u => JSON.stringify(u ? u.lastUsedCpu : 0))`);
            return parseInt(result.replace(/[^0-9]/g, '')) || 0;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get spawn status for a user
     */
    getSpawnStatus(userId) {
        try {
            const result = this.serverManager.curlCli(`storage.db['rooms.objects'].findOne({user: '${userId}', type: 'spawn'}).then(s => JSON.stringify(s ? s.off === false : false))`);
            return result.includes("true");
        }
        catch {
            return false;
        }
    }
    /**
     * Get console logs for a user
     */
    getConsoleLogs(userId) {
        try {
            const result = this.serverManager.curlCli(`storage.db['users.console'].find({user: '${userId}'}).then(logs => JSON.stringify(logs.map(l => l.log)))`);
            return JSON.parse(result);
        }
        catch {
            return [];
        }
    }
}
exports.GameStateManager = GameStateManager;
//# sourceMappingURL=GameStateManager.js.map