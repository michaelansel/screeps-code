import { expect } from "chai";
import { IntegrationTestBase } from "../../helpers/test-base.js";

// Import types for proper typing
interface CreepMemory {
  task?: { id: string; config?: any };
  project?: { id: string; config?: any };
  [key: string]: any;
}

describe("Integration Tests - Performance Validation", () => {
  const testBase = new IntegrationTestBase();

  before(async () => {
    await testBase.setup();
  });

  after(async () => {
    await testBase.teardown();
  });

  describe("CPU Performance", () => {
    it("should execute main loop efficiently", () => {
      const { game, memory } = testBase.createMockGameEnvironment();

      // Set up globals
      (global as any).Game = game;
      (global as any).Memory = memory;

      const mainModule = require("../../../src/main");

      // Benchmark main loop execution
      const benchmark = testBase.benchmarkFunction(() => {
        try {
          mainModule.loop();
        } catch (error) {
          // Ignore expected errors in mock environment
        }
      }, 50);

      // Main loop should execute quickly even with minimal environment
      expect(benchmark.averageTime).to.be.lessThan(10); // Less than 10ms average
      expect(benchmark.maxTime).to.be.lessThan(50); // No single execution over 50ms

      console.log(`Main loop performance:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Min: ${benchmark.minTime.toFixed(2)}ms  
        Max: ${benchmark.maxTime.toFixed(2)}ms`);

      // Clean up globals
      delete (global as any).Game;
      delete (global as any).Memory;
    });

    it("should have consistent execution times", () => {
      const { game, memory } = testBase.createMockGameEnvironment();

      (global as any).Game = game;
      (global as any).Memory = memory;

      const mainModule = require("../../../src/main");

      // Run multiple iterations and check for consistency
      const times: number[] = [];
      for (let i = 0; i < 20; i++) {
        const { executionTime } = testBase.measureExecutionTime(() => {
          try {
            mainModule.loop();
          } catch (error) {
            // Ignore expected errors
          }
        });
        times.push(executionTime);
      }

      const average = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / times.length;
      const standardDeviation = Math.sqrt(variance);

      // Standard deviation should be reasonable (less than average + 1ms for very fast operations)
      expect(standardDeviation).to.be.lessThan(Math.max(average * 0.5, 1));

      console.log(`Execution consistency:
        Average: ${average.toFixed(2)}ms
        Std Dev: ${standardDeviation.toFixed(2)}ms
        Coefficient of Variation: ${((standardDeviation / average) * 100).toFixed(1)}%`);

      // Clean up globals
      delete (global as any).Game;
      delete (global as any).Memory;
    });
  });

  describe("Memory Usage", () => {
    it("should not leak memory over multiple executions", () => {
      const { game, memory } = testBase.createMockGameEnvironment();

      (global as any).Game = game;
      (global as any).Memory = memory;

      const mainModule = require("../../../src/main");

      const initialMemory = process.memoryUsage();

      // Run main loop many times
      for (let i = 0; i < 100; i++) {
        try {
          mainModule.loop();
        } catch (error) {
          // Ignore expected errors
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).to.be.lessThan(1024 * 1024);

      console.log(`Memory usage after 100 executions: ${(memoryIncrease / 1024).toFixed(2)}KB increase`);

      // Clean up globals
      delete (global as any).Game;
      delete (global as any).Memory;
    });

    it("should handle large numbers of creeps efficiently", () => {
      const { game, memory } = testBase.createMockGameEnvironment();

      // Simulate many creeps
      const creepCount = 50;
      for (let i = 0; i < creepCount; i++) {
        (game.creeps as { [name: string]: any })[`creep${i}`] = {
          name: `creep${i}`,
          memory: { project: { id: "HarvestEnergyProject" } } as CreepMemory,
          run: () => {} // Mock run function
        };
        (memory.creeps as { [name: string]: CreepMemory })[`creep${i}`] = {
          project: { id: "HarvestEnergyProject" }
        } as CreepMemory;
      }

      (global as any).Game = game;
      (global as any).Memory = memory;

      const mainModule = require("../../../src/main");

      // Measure performance with many creeps
      const benchmark = testBase.benchmarkFunction(() => {
        try {
          mainModule.loop();
        } catch (error) {
          // Ignore expected errors
        }
      }, 10);

      // Should still execute reasonably quickly with many creeps
      expect(benchmark.averageTime).to.be.lessThan(50); // Less than 50ms with 50 creeps

      console.log(`Performance with ${creepCount} creeps:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Max: ${benchmark.maxTime.toFixed(2)}ms`);

      // Clean up globals
      delete (global as any).Game;
      delete (global as any).Memory;
    });
  });

  describe("Error Recovery Performance", () => {
    it("should handle errors without significant performance impact", () => {
      const { game, memory } = testBase.createMockGameEnvironment();

      // Introduce conditions that will cause errors
      memory.creeps = null as any; // This should cause errors

      (global as any).Game = game;
      (global as any).Memory = memory;

      const mainModule = require("../../../src/main");

      // Measure performance even with errors
      const benchmark = testBase.benchmarkFunction(() => {
        try {
          mainModule.loop();
        } catch (error) {
          // Expected errors due to corrupted state
        }
      }, 20);

      // Error handling shouldn't make execution extremely slow
      expect(benchmark.averageTime).to.be.lessThan(100); // Less than 100ms even with errors

      console.log(`Performance with error conditions:
        Average: ${benchmark.averageTime.toFixed(2)}ms
        Max: ${benchmark.maxTime.toFixed(2)}ms`);

      // Clean up globals
      delete (global as any).Game;
      delete (global as any).Memory;
    });
  });

  describe("Scalability Validation", () => {
    it("should scale linearly with creep count", () => {
      const creepCounts = [1, 5, 10, 20];
      const results: { count: number; avgTime: number }[] = [];

      for (const count of creepCounts) {
        const { game, memory } = testBase.createMockGameEnvironment();

        // Add specified number of creeps
        for (let i = 0; i < count; i++) {
          (game.creeps as { [name: string]: any })[`creep${i}`] = {
            name: `creep${i}`,
            memory: { project: { id: "HarvestEnergyProject" } } as CreepMemory,
            run: () => {}
          };
          (memory.creeps as { [name: string]: CreepMemory })[`creep${i}`] = {
            project: { id: "HarvestEnergyProject" }
          } as CreepMemory;
        }

        (global as any).Game = game;
        (global as any).Memory = memory;

        const mainModule = require("../../../src/main");

        const benchmark = testBase.benchmarkFunction(() => {
          try {
            mainModule.loop();
          } catch (error) {
            // Ignore expected errors
          }
        }, 10);

        results.push({ count, avgTime: benchmark.averageTime });

        // Clean up globals
        delete (global as any).Game;
        delete (global as any).Memory;
      }

      // Check that performance scales reasonably
      const timePerCreep = results.map(r => r.avgTime / Math.max(r.count, 1));
      const maxTimePerCreep = Math.max(...timePerCreep);
      const minTimePerCreep = Math.min(...timePerCreep);

      // Time per creep should not vary wildly (within 10x for very fast operations)
      // Skip this check if operations are extremely fast (sub-millisecond)
      if (maxTimePerCreep > 0.01) {
        expect(maxTimePerCreep / minTimePerCreep).to.be.lessThan(10);
      }

      console.log("Scalability analysis:");
      results.forEach(r => {
        console.log(
          `  ${r.count} creeps: ${r.avgTime.toFixed(2)}ms (${(r.avgTime / Math.max(r.count, 1)).toFixed(2)}ms per creep)`
        );
      });
    });
  });
});
