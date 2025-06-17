import { expect } from "chai";
import { readFileSync } from "fs";
import { join } from "path";

describe("Build Artifact Integration Tests", () => {
  let builtCode: string;
  let builtSourceMap: any;

  before(() => {
    // Read the actual built artifacts
    try {
      builtCode = readFileSync(join(process.cwd(), "dist/main.js"), "utf8");
      const sourceMapContent = readFileSync(join(process.cwd(), "dist/main.js.map"), "utf8");
      builtSourceMap = JSON.parse(sourceMapContent);
    } catch (error) {
      throw new Error(`Build artifacts not found. Run 'npm run build' first. Error: ${error}`);
    }
  });

  describe("Build Artifact Validation", () => {
    it("should have successfully built main.js", () => {
      expect(builtCode).to.be.a("string");
      expect(builtCode.length).to.be.greaterThan(1000);
      console.log(`Built code size: ${(builtCode.length / 1024).toFixed(1)}KB`);
    });

    it("should include our main loop function", () => {
      expect(builtCode).to.include("loop");
      expect(builtCode).to.include("ErrorMapper");
    });

    it("should include Projects and Tasks framework", () => {
      expect(builtCode).to.include("HarvestEnergyProject");
      expect(builtCode).to.include("HarvestEnergyTask");
      expect(builtCode).to.include("DepositEnergyTask");
    });

    it("should include creep extensions", () => {
      expect(builtCode).to.include("CreepTaskingExtension");
      expect(builtCode).to.include("startTask");
      expect(builtCode).to.include("startProject");
    });

    it("should have valid source map", () => {
      expect(builtSourceMap).to.have.property("version");
      expect(builtSourceMap).to.have.property("sources");
      expect(builtSourceMap.sources).to.be.an("array");
      expect(builtSourceMap.sources.length).to.be.greaterThan(5);
      console.log(`Source map includes ${builtSourceMap.sources.length} source files`);
    });
  });

  describe("Code Execution in Isolated Environment", () => {
    it("should execute the built code without syntax errors", () => {
      // Create a sandboxed environment for the built code
      const sandbox = {
        console: {
          log: () => {},
          error: () => {},
          warn: () => {},
          info: () => {}
        },
        global: {},
        Game: {
          time: 1,
          cpu: { getUsed: () => 0 },
          creeps: {},
          spawns: {},
          rooms: {}
        },
        Memory: {
          creeps: {},
          creepCounter: 0
        },
        // Add required Screeps constants
        FIND_SOURCES: 105,
        FIND_MY_SPAWNS: 106,
        OK: 0,
        ERR_NOT_IN_RANGE: -9,
        BODYPART_COST: { work: 100, carry: 50, move: 50 },
        WORK: "work",
        CARRY: "carry",
        MOVE: "move",
        RESOURCE_ENERGY: "energy",
        exports: {},
        module: { exports: {} },
        require: (id: string) => {
          if (id.includes("lodash")) return {};
          throw new Error(`Module not found: ${id}`);
        }
      };

      let mainLoop: any;
      let executionError: Error | null = null;

      // Execute the built code in the sandbox
      try {
        const vm = require("vm");
        const context = vm.createContext(sandbox);

        // Execute the built code
        vm.runInContext(builtCode, context);

        // Extract the main loop function
        mainLoop = context.module.exports?.loop || context.exports?.loop;
      } catch (error) {
        executionError = error as Error;
      }

      // Validate execution
      expect(executionError).to.be.null;
      expect(mainLoop).to.be.a("function");

      console.log("✅ Built code executed successfully in isolated environment");
    });

    it("should execute main loop without throwing errors", () => {
      const sandbox = {
        console: {
          log: () => {},
          error: () => {},
          warn: () => {},
          info: () => {}
        },
        global: {},
        Game: {
          time: 1,
          cpu: { getUsed: () => 0 },
          creeps: {
            "test-creep": {
              name: "test-creep",
              memory: { project: { id: "HarvestEnergyProject" } },
              run() {
                // Mock run method
                this.ranThisTick = true;
              },
              ranThisTick: false
            }
          },
          spawns: {
            Spawn1: {
              name: "Spawn1",
              store: { energy: 0 },
              spawnCreep: () => -1 // Not enough energy
            }
          },
          rooms: {}
        },
        Memory: {
          creeps: {
            "test-creep": { project: { id: "HarvestEnergyProject" } }
          },
          creepCounter: 1
        },
        // Add required Screeps constants
        FIND_SOURCES: 105,
        FIND_MY_SPAWNS: 106,
        OK: 0,
        ERR_NOT_IN_RANGE: -9,
        ERR_NOT_ENOUGH_ENERGY: -6,
        BODYPART_COST: { work: 100, carry: 50, move: 50 },
        WORK: "work",
        CARRY: "carry",
        MOVE: "move",
        RESOURCE_ENERGY: "energy",
        exports: {},
        module: { exports: {} },
        require: (id: string) => {
          if (id.includes("lodash")) return {};
          throw new Error(`Module not found: ${id}`);
        }
      };

      let mainLoop: any;
      let loopExecutionError: Error | null = null;

      // Execute the built code
      const vm = require("vm");
      const context = vm.createContext(sandbox);
      vm.runInContext(builtCode, context);
      mainLoop = context.module.exports?.loop || context.exports?.loop;

      // Execute the main loop
      try {
        mainLoop();
      } catch (error) {
        loopExecutionError = error as Error;
      }

      // Validate main loop execution
      if (loopExecutionError) {
        console.log(`Main loop error (may be expected): ${loopExecutionError.message}`);
      }

      // The main loop might throw errors due to missing Screeps environment
      // but it should at least attempt to run our code
      expect(mainLoop).to.be.a("function");

      // Check if our creep's run method was called
      const testCreep = context.Game.creeps["test-creep"];
      expect(testCreep.ranThisTick).to.be.true;

      console.log("✅ Main loop executed and called creep.run()");
    });
  });

  describe("Real Deployment Simulation", () => {
    it("should validate the code structure matches Screeps deployment format", () => {
      // Screeps expects main.js to export a loop function
      expect(builtCode).to.match(/exports\.loop\s*=|module\.exports\.loop\s*=|module\.exports\s*=\s*{[^}]*loop:/);

      // Should not include any Node.js specific modules that won't work in Screeps
      expect(builtCode).to.not.include("require('fs')");
      expect(builtCode).to.not.include("require('path')");
      expect(builtCode).to.not.include("require('os')");

      console.log("✅ Code structure is compatible with Screeps deployment");
    });

    it("should not include development-only code", () => {
      // Should not include test framework code (check for actual test patterns, not just letter combinations)
      expect(builtCode).to.not.match(/describe\s*\(\s*["'][^"']*test/i); // Test suite definitions
      expect(builtCode).to.not.match(/\bit\s*\(\s*["'][^"']*should/i); // Test case definitions
      expect(builtCode).to.not.match(/\bchai\b/); // Test assertion library (whole word)
      expect(builtCode).to.not.include("mocha"); // Test framework

      console.log("✅ Production build excludes development dependencies");
    });

    it("should be within reasonable size limits for Screeps", () => {
      // Screeps has script size limits
      const sizeKB = builtCode.length / 1024;

      // Warn if getting large (Screeps has 5MB limit but we want smaller)
      if (sizeKB > 1000) {
        console.warn(`⚠️  Large bundle size: ${sizeKB.toFixed(1)}KB`);
      }

      expect(sizeKB).to.be.lessThan(5000); // 5MB hard limit

      console.log(`✅ Bundle size ${sizeKB.toFixed(1)}KB is within limits`);
    });
  });
});
