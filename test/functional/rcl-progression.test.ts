import { expect } from "chai";
import { FunctionalTestHarness } from "./test-harness";

describe("RCL Progression Functional Tests", function() {
  this.timeout(300000); // 5 minutes per test
  let harness: FunctionalTestHarness;

  beforeEach(async () => {
    harness = new FunctionalTestHarness();
    await harness.setup();
  });

  afterEach(async () => {
    if (harness) {
      await harness.teardown();
    }
  });

  describe("RCL 1 - Basic Survival", () => {
    it("should create harvesters and upgraders at RCL 1", async () => {
      // Set up RCL 1 room conditions
      await harness.initializeRoom({
        rcl: 1,
        energy: 300,
        extensions: 0,
        sources: 2,
        controller: true
      });

      // Run for several ticks to establish basic operations
      for (let tick = 0; tick < 50; tick++) {
        await harness.runTick();
        
        // Check room state every 10 ticks
        if (tick % 10 === 0) {
          const roomState = await harness.getRoomState();
          
          // Should have spawning activity
          expect(roomState.spawns.length).to.be.greaterThan(0);
          
          // Should prioritize harvesters first
          if (roomState.creeps.length > 0) {
            const harvesters = roomState.creeps.filter(c => c.memory.project?.id === "HarvestEnergyProject");
            const upgraders = roomState.creeps.filter(c => c.memory.project?.id === "UpgradeControllerProject");
            
            // At RCL 1, should have harvesters before upgraders
            if (harvesters.length === 0) {
              expect(upgraders.length).to.equal(0, "Should not have upgraders before harvesters");
            }
          }
        }
      }

      const finalState = await harness.getRoomState();
      
      // Verify basic functionality
      expect(finalState.creeps.length).to.be.greaterThan(0, "Should have spawned some creeps");
      
      const harvesters = finalState.creeps.filter(c => c.memory.project?.id === "HarvestEnergyProject");
      expect(harvesters.length).to.be.greaterThan(0, "Should have at least one harvester");
      
      // Should be making progress on controller
      expect(finalState.controller.progress).to.be.greaterThan(0, "Should be upgrading controller");
    });

    it("should handle energy scarcity gracefully at RCL 1", async () => {
      // Start with very low energy
      await harness.initializeRoom({
        rcl: 1,
        energy: 200, // Just enough for basic creep
        extensions: 0,
        sources: 1,
        controller: true
      });

      // Run simulation
      for (let tick = 0; tick < 30; tick++) {
        await harness.runTick();
      }

      const roomState = await harness.getRoomState();
      
      // Should still function with minimal resources
      expect(roomState.creeps.length).to.be.greaterThan(0, "Should spawn at least basic creeps with limited energy");
      
      // All creeps should have valid projects
      roomState.creeps.forEach(creep => {
        expect(creep.memory.project?.id).to.exist;
        expect(creep.memory.project.id).to.not.equal("", "Creep should have a valid project assigned");
      });
    });
  });

  describe("RCL 2-3 - Extension Development", () => {
    it("should utilize extensions for larger creeps at RCL 2", async () => {
      await harness.initializeRoom({
        rcl: 2,
        energy: 550, // 300 spawn + 250 from 5 extensions
        extensions: 5,
        sources: 2,
        controller: true
      });

      // Run simulation to establish operations
      for (let tick = 0; tick < 40; tick++) {
        await harness.runTick();
      }

      const roomState = await harness.getRoomState();
      
      // Should be creating larger creeps with extensions
      const creepsWithMultipleBodyParts = roomState.creeps.filter(creep => 
        creep.body.length > 3 // More than basic [WORK, CARRY, MOVE]
      );
      
      expect(creepsWithMultipleBodyParts.length).to.be.greaterThan(0, 
        "Should create larger creeps when extensions are available");
    });

    it("should maintain operations during RCL 2-3 transition", async () => {
      await harness.initializeRoom({
        rcl: 2,
        energy: 550,
        extensions: 5,
        sources: 2,
        controller: true,
        controllerProgress: 180000 // Near RCL 3
      });

      const initialState = await harness.getRoomState();
      const initialCreepCount = initialState.creeps.length;

      // Run through RCL progression
      for (let tick = 0; tick < 60; tick++) {
        await harness.runTick();
        
        // Check that operations don't break during RCL transition
        if (tick % 15 === 0) {
          const state = await harness.getRoomState();
          
          // Should maintain minimum operations
          expect(state.creeps.length).to.be.greaterThan(0, "Should maintain creep population");
          
          // All creeps should have projects
          state.creeps.forEach(creep => {
            expect(creep.memory.project?.id).to.exist;
          });
        }
      }
    });
  });

  describe("RCL 4-5 - Advanced Operations", () => {
    it("should handle complex room layouts at RCL 4", async () => {
      await harness.initializeRoom({
        rcl: 4,
        energy: 800, // More energy capacity
        extensions: 10,
        sources: 2,
        controller: true,
        constructionSites: [
          { structureType: "road", x: 25, y: 25 },
          { structureType: "container", x: 20, y: 20 },
          { structureType: "extension", x: 30, y: 30 }
        ]
      });

      // Run simulation
      for (let tick = 0; tick < 50; tick++) {
        await harness.runTick();
      }

      const roomState = await harness.getRoomState();
      
      // Should have builders working on construction
      const builders = roomState.creeps.filter(c => c.memory.project?.id === "BuilderProject");
      expect(builders.length).to.be.greaterThan(0, "Should have builders for construction sites");
      
      // Should be making construction progress
      const remainingConstructionSites = roomState.constructionSites?.length || 0;
      expect(remainingConstructionSites).to.be.lessThan(3, "Should be making progress on construction");
    });

    it("should scale creep bodies appropriately at RCL 5", async () => {
      await harness.initializeRoom({
        rcl: 5,
        energy: 1000, // High energy capacity
        extensions: 20,
        sources: 2,
        controller: true
      });

      // Run simulation
      for (let tick = 0; tick < 40; tick++) {
        await harness.runTick();
      }

      const roomState = await harness.getRoomState();
      
      // Should create powerful creeps with high energy
      const powerfulCreeps = roomState.creeps.filter(creep => {
        const workParts = creep.body.filter(part => part === "work").length;
        return workParts >= 3;
      });
      
      expect(powerfulCreeps.length).to.be.greaterThan(0, 
        "Should create creeps with multiple WORK parts at high RCL");
    });
  });

  describe("RCL 6-8 - Mature Room Operations", () => {
    it("should maintain efficient operations at RCL 6+", async () => {
      await harness.initializeRoom({
        rcl: 6,
        energy: 1800,
        extensions: 40,
        sources: 2,
        controller: true,
        structures: [
          { structureType: "tower", x: 25, y: 25 },
          { structureType: "storage", x: 30, y: 30 },
          { structureType: "link", x: 35, y: 35 }
        ]
      });

      const tickResults = [];
      
      // Run simulation and track performance
      for (let tick = 0; tick < 30; tick++) {
        await harness.runTick();
        
        if (tick % 10 === 0) {
          const state = await harness.getRoomState();
          tickResults.push({
            tick,
            creepCount: state.creeps.length,
            energyProgress: state.controller.progress,
            energyLevel: state.energyAvailable
          });
        }
      }

      const finalState = await harness.getRoomState();
      
      // Should have stable, efficient operations
      expect(finalState.creeps.length).to.be.greaterThan(5, "Should maintain good creep population");
      
      // Should be efficiently upgrading controller
      const progressMade = tickResults[tickResults.length - 1].energyProgress - tickResults[0].energyProgress;
      expect(progressMade).to.be.greaterThan(0, "Should be making controller progress");
      
      // Energy levels should be stable (not constantly empty)
      const averageEnergy = tickResults.reduce((sum, r) => sum + r.energyLevel, 0) / tickResults.length;
      expect(averageEnergy).to.be.greaterThan(200, "Should maintain reasonable energy levels");
    });

    it("should handle high creep counts without performance issues", async () => {
      await harness.initializeRoom({
        rcl: 8,
        energy: 2300, // Max energy
        extensions: 50,
        sources: 2,
        controller: true
      });

      // Run for extended period
      const startTime = Date.now();
      for (let tick = 0; tick < 50; tick++) {
        await harness.runTick();
      }
      const endTime = Date.now();
      
      const roomState = await harness.getRoomState();
      const executionTime = endTime - startTime;
      
      // Should handle large operations efficiently
      expect(roomState.creeps.length).to.be.greaterThan(8, "Should support many creeps at RCL 8");
      expect(executionTime).to.be.lessThan(30000, "Should complete 50 ticks within 30 seconds");
      
      // All creeps should still have valid projects
      roomState.creeps.forEach(creep => {
        expect(creep.memory.project?.id).to.exist;
        expect(["HarvestEnergyProject", "BuilderProject", "UpgradeControllerProject"])
          .to.include(creep.memory.project.id);
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle rooms with unusual source configurations", async () => {
      await harness.initializeRoom({
        rcl: 3,
        energy: 600,
        extensions: 8,
        sources: 1, // Only one source
        controller: true,
        terrain: {
          // Sources surrounded by walls except for 2 positions
          "source1": { accessiblePositions: 2 }
        }
      });

      // Run simulation
      for (let tick = 0; tick < 40; tick++) {
        await harness.runTick();
      }

      const roomState = await harness.getRoomState();
      
      // Should adapt to source limitations
      const harvesters = roomState.creeps.filter(c => c.memory.project?.id === "HarvestEnergyProject");
      
      // Should not over-assign harvesters to limited source
      expect(harvesters.length).to.be.at.most(3, "Should respect source capacity limitations");
      
      // Should still maintain operations
      expect(roomState.creeps.length).to.be.greaterThan(0);
      expect(roomState.controller.progress).to.be.greaterThan(0);
    });

    it("should recover from creep losses gracefully", async () => {
      await harness.initializeRoom({
        rcl: 4,
        energy: 800,
        extensions: 15,
        sources: 2,
        controller: true
      });

      // Establish operations
      for (let tick = 0; tick < 20; tick++) {
        await harness.runTick();
      }

      // Simulate creep loss
      await harness.killAllCreeps();
      
      const postLossState = await harness.getRoomState();
      expect(postLossState.creeps.length).to.equal(0, "All creeps should be dead");

      // Recovery phase
      for (let tick = 0; tick < 30; tick++) {
        await harness.runTick();
      }

      const recoveryState = await harness.getRoomState();
      
      // Should recover operations
      expect(recoveryState.creeps.length).to.be.greaterThan(0, "Should spawn new creeps");
      
      // Should prioritize correctly during recovery
      const harvesters = recoveryState.creeps.filter(c => c.memory.project?.id === "HarvestEnergyProject");
      expect(harvesters.length).to.be.greaterThan(0, "Should prioritize harvesters during recovery");
    });

    it("should handle memory corruption gracefully", async () => {
      await harness.initializeRoom({
        rcl: 3,
        energy: 600,
        extensions: 10,
        sources: 2,
        controller: true
      });

      // Establish operations
      for (let tick = 0; tick < 15; tick++) {
        await harness.runTick();
      }

      // Corrupt memory
      await harness.corruptCreepMemory();
      
      // Run recovery
      for (let tick = 0; tick < 25; tick++) {
        await harness.runTick();
      }

      const roomState = await harness.getRoomState();
      
      // Should recover from memory issues
      expect(roomState.creeps.length).to.be.greaterThan(0);
      
      // All creeps should have valid projects after recovery
      roomState.creeps.forEach(creep => {
        expect(creep.memory.project?.id).to.exist;
        expect(creep.memory.project.id).to.not.equal("", "Should assign valid projects after memory corruption");
      });
    });
  });
});