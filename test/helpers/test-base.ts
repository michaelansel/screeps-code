import { expect } from "chai";

// Import types for proper typing
interface CreepMemory {
  task?: { id: string; config?: any };
  project?: { id: string; config?: any };
  [key: string]: any;
}

/**
 * Base class for integration tests
 *
 * For now, this provides utilities for container-based testing.
 * Once screeps-server-mockup is properly set up, this will be enhanced
 * with full Screeps server simulation capabilities.
 */
export class IntegrationTestBase {
  protected testStartTime: number;

  constructor() {
    this.testStartTime = Date.now();
  }

  async setup(): Promise<void> {
    // Initialize test environment
    console.log("Setting up integration test environment...");

    // TODO: Once screeps-server-mockup is working, initialize:
    // - Screeps server instance
    // - Clean world state
    // - Test room configuration
  }

  async teardown(): Promise<void> {
    // Clean up test environment
    console.log("Tearing down integration test environment...");

    // TODO: Stop servers and clean up resources
  }

  /**
   * Utility to verify that code builds and can be loaded
   */
  async validateCodeCompilation(): Promise<boolean> {
    try {
      // Import main module to verify it loads without errors
      const mainModule = await import("../../src/main.js");

      // Verify the main export exists
      expect(mainModule.loop).to.be.a("function");

      return true;
    } catch (error) {
      console.error("Code compilation validation failed:", error);
      return false;
    }
  }

  /**
   * Utility to validate that all extensions load correctly
   */
  async validateExtensionsLoad(): Promise<boolean> {
    try {
      const extensionsModule = await import("../../src/extensions/index.js");

      // Verify extensions can be discovered and applied
      expect(extensionsModule.discover).to.be.a("function");
      expect(extensionsModule.use).to.be.a("function");

      return true;
    } catch (error) {
      console.error("Extensions validation failed:", error);
      return false;
    }
  }

  /**
   * Utility to validate Projects and Tasks can be imported
   */
  async validateProjectsTasksFramework(): Promise<boolean> {
    try {
      const projectsModule = await import("../../src/projects/index.js");
      const tasksModule = await import("../../src/tasks/index.js");

      // Verify key exports exist
      expect(projectsModule.HarvestEnergyProject).to.exist;
      expect(projectsModule.DoNothingProject).to.exist;
      expect(tasksModule.HarvestEnergyTask).to.exist;
      expect(tasksModule.DepositEnergyTask).to.exist;
      expect(tasksModule.DoNothingTask).to.exist;

      return true;
    } catch (error) {
      console.error("Projects/Tasks framework validation failed:", error);
      return false;
    }
  }

  /**
   * Simulate a minimal game environment for basic validation
   */
  createMockGameEnvironment() {
    // Create minimal mock Game object for basic testing
    const mockGame = {
      time: 1,
      cpu: { getUsed: () => 0, limit: 20 },
      creeps: {},
      spawns: {},
      rooms: {}
    };

    const mockMemory = {
      creeps: {},
      creepCounter: 0
    };

    return { game: mockGame, memory: mockMemory };
  }

  /**
   * Test helper to measure execution time
   */
  measureExecutionTime<T>(fn: () => T): { result: T; executionTime: number } {
    const start = process.hrtime.bigint();
    const result = fn();
    const end = process.hrtime.bigint();

    const executionTime = Number(end - start) / 1_000_000; // Convert to milliseconds

    return { result, executionTime };
  }

  /**
   * Test helper to run function multiple times and measure performance
   */
  benchmarkFunction<T>(
    fn: () => T,
    iterations: number = 100
  ): {
    averageTime: number;
    minTime: number;
    maxTime: number;
    results: T[];
  } {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, executionTime } = this.measureExecutionTime(fn);
      times.push(executionTime);
      results.push(result);
    }

    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      results
    };
  }

  /**
   * Create a persistent game environment that maintains state across ticks
   */
  createPersistentGameEnvironment() {
    let currentTick = 1;
    const gameObjects: { [key: string]: any } = {};
    const memoryState: { creeps: { [name: string]: CreepMemory }; creepCounter: number } = {
      creeps: {},
      creepCounter: 0
    };

    return {
      setCurrentTick(tick: number) {
        currentTick = tick;
      },

      setCreepMemory(name: string, memory: CreepMemory) {
        memoryState.creeps[name] = memory;
      },

      createCreep(
        name: string,
        pos: { x: number; y: number; roomName: string },
        stats: { energy: number; energyCapacity: number }
      ) {
        const creep = {
          name,
          pos: { ...pos },
          carry: { energy: stats.energy },
          carryCapacity: stats.energyCapacity,
          memory: {} as CreepMemory,
          harvest(target: any) {
            return 0;
          },
          moveTo(target: any) {
            return 0;
          },
          transfer(target: any, resourceType: any, amount?: number) {
            return 0;
          },
          run() {
            // This simulates the CreepTaskingExtension.run() method
            // In real code, this would be added by the extensions system
            console.log(`  Mock creep.run() called for ${this.name}`);

            // Basic implementation that tries to start HarvestEnergyProject if no task
            const creepMemory = this.memory;
            if (!creepMemory.task && creepMemory.project?.id === "HarvestEnergyProject") {
              console.log(`  Creep ${this.name} running HarvestEnergyProject`);
              // This simulates the project running and assigning a task

              // Determine what to do based on energy level
              if (this.carry.energy === 0) {
                // Need to harvest - start HarvestEnergyTask
                creepMemory.task = { id: "HarvestEnergyTask" };
                console.log(`  Started HarvestEnergyTask for ${this.name}`);
              } else if (this.carry.energy > 0) {
                // Have energy - start DepositEnergyTask
                creepMemory.task = { id: "DepositEnergyTask" };
                console.log(`  Started DepositEnergyTask for ${this.name}`);
              }
            }
          },
          startProject(projectId: string, config: any = {}) {
            const creepMemory = this.memory;
            creepMemory.project = { id: projectId as any, config };
            return true;
          },
          startTask(taskId: string, config: any = {}) {
            const creepMemory = this.memory;
            creepMemory.task = { id: taskId as any, config };
            return true;
          },
          stopTask() {
            const creepMemory = this.memory;
            delete creepMemory.task;
          },
          stopProject() {
            const creepMemory = this.memory;
            delete creepMemory.project;
          }
        };

        gameObjects[`creep_${name}`] = creep;
        memoryState.creeps[name] = {} as CreepMemory;
        return creep;
      },

      createSource(
        id: string,
        pos: { x: number; y: number; roomName: string },
        stats: { energy: number; energyCapacity: number }
      ) {
        const source = {
          id,
          pos: { ...pos },
          energy: stats.energy,
          energyCapacity: stats.energyCapacity
        };

        gameObjects[`source_${id}`] = source;
        return source;
      },

      createSpawn(
        name: string,
        pos: { x: number; y: number; roomName: string },
        stats: { energy: number; energyCapacity: number }
      ) {
        const spawn = {
          id: name,
          name,
          pos: { ...pos },
          energy: stats.energy,
          energyCapacity: stats.energyCapacity,
          store: { energy: stats.energy },
          spawnCreep(body: string[], name: string, opts?: any) {
            console.log(`  Spawn would create creep ${name} with body [${body.join(", ")}]`);
            return 0; // OK
          }
        };

        gameObjects[`spawn_${name}`] = spawn;
        return spawn;
      },

      getGameGlobals() {
        // Build Game object from current state
        const Game: any = {
          time: currentTick,
          cpu: { getUsed: () => 0, limit: 20 },
          creeps: {},
          spawns: {},
          rooms: {}
        };

        // Add creeps
        for (const [key, obj] of Object.entries(gameObjects)) {
          if (key.startsWith("creep_")) {
            const creepName = key.replace("creep_", "");
            Game.creeps[creepName] = obj;
            // Sync memory both ways
            const creepObj = obj;
            if (!memoryState.creeps[creepName]) {
              memoryState.creeps[creepName] = {} as CreepMemory;
            }
            // Use the memory state as the source of truth
            creepObj.memory = memoryState.creeps[creepName];
          }
        }

        // Add spawns
        for (const [key, obj] of Object.entries(gameObjects)) {
          if (key.startsWith("spawn_")) {
            const spawnName = key.replace("spawn_", "");
            Game.spawns[spawnName] = obj;
          }
        }

        // Add rooms with find functionality
        const roomsMap: { [roomName: string]: any } = {};
        for (const [key, obj] of Object.entries(gameObjects)) {
          const roomName = obj.pos?.roomName;
          if (roomName) {
            if (!roomsMap[roomName]) {
              roomsMap[roomName] = {
                name: roomName,
                find: (type: number) => {
                  const results: any[] = [];

                  if (type === 105) {
                    // FIND_SOURCES
                    for (const [objKey, objVal] of Object.entries(gameObjects)) {
                      if (objKey.startsWith("source_") && objVal.pos.roomName === roomName) {
                        results.push(objVal);
                      }
                    }
                  }

                  if (type === 106) {
                    // FIND_MY_SPAWNS
                    for (const [objKey, objVal] of Object.entries(gameObjects)) {
                      if (objKey.startsWith("spawn_") && objVal.pos.roomName === roomName) {
                        results.push(objVal);
                      }
                    }
                  }

                  return results;
                }
              };
            }
          }
        }
        Game.rooms = roomsMap;

        return { Game, Memory: memoryState };
      }
    };
  }
}
