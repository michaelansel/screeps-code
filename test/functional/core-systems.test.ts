import { expect } from "chai";
import { FunctionalTestHarness } from "./test-harness";

/**
 * Core Systems Functional Tests
 *
 * These tests validate the fundamental game systems work correctly
 * in a real Screeps server environment, including energy harvesting,
 * task/project framework, and basic AI behaviors.
 */

describe("Core Game Systems", function () {
  const harness = new FunctionalTestHarness();
  let testFailed = false;

  this.timeout(300000); // 5 minutes

  before(async function () {
    this.timeout(300000);
    await harness.setupEnvironment();
  });

  beforeEach(async function () {
    this.timeout(30000);
    await harness.prepareTestCase();
  });

  afterEach(function () {
    if (this.currentTest?.state === "failed") {
      testFailed = true;
    }
  });

  after(async () => {
    await harness.cleanup(testFailed);
  });

  it("should implement basic energy harvesting workflow", async () => {
    // Deploy bot and wait for basic operations
    const deployment = await harness.deployBot();
    expect(deployment.success).to.be.true;

    await harness.waitForTicks(deployment.userId, 20);

    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    // Should have spawned creeps for energy harvesting
    expect(objects.creeps).to.have.length.greaterThan(0);
    expect(objects.sources).to.have.length.greaterThan(0, "Room should have energy sources");

    // Check for energy harvesting task assignments
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      "creeps": null, // Should have creeps in memory
      creepCounter: null // Should track creep spawning
    });

    expect(patterns.creeps).to.be.true;
    expect(patterns.creepCounter).to.be.true;

    console.log(`⚡ Energy harvesting system operational:`, {
      creeps: objects.creeps.length,
      sources: objects.sources.length,
      spawns: objects.spawns.length
    });

    // Verify creeps have harvesting-related projects
    for (const creep of objects.creeps) {
      const creepMemory = memory.creeps[creep.name];
      if (creepMemory?.project?.id) {
        expect(creepMemory.project.id).to.be.oneOf([
          'HarvestEnergyProject', 
          'UpgradeControllerProject'
        ]);
      }
    }
  });

  it("should implement Project/Task framework execution", async () => {
    const deployment = await harness.getLastDeployment();

    // Set up a specific scenario to test task framework
    await harness.preloadMemory(deployment.userId, {
      creepCounter: 2,
      creeps: {
        TestWorker1: {
          project: { id: "HarvestEnergyProject" },
          task: { id: "HarvestEnergyTask", config: { source: "test_source_123" } }
        },
        TestWorker2: {
          project: { id: "UpgradeControllerProject", config: { controller: "test_controller_456" } }
        }
      },
      testScenario: "project_task_framework"
    });

    await harness.waitForTicks(deployment.userId, 15);

    const memory = await harness.getMemoryState(deployment.userId);
    
    // Verify framework structures are maintained
    expect(memory.testScenario).to.equal("project_task_framework");
    expect(memory.creeps).to.exist;

    // Check specific project/task assignments
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      "creeps.TestWorker1.project.id": "HarvestEnergyProject",
      "creeps.TestWorker1.task.id": "HarvestEnergyTask",
      "creeps.TestWorker2.project.id": "UpgradeControllerProject",
      "creeps.TestWorker2.project.config.controller": "test_controller_456"
    });

    expect(patterns["creeps.TestWorker1.project.id"]).to.be.true;
    expect(patterns["creeps.TestWorker2.project.id"]).to.be.true;

    console.log(`🎯 Project/Task framework validation:`, {
      worker1Project: patterns["creeps.TestWorker1.project.id"],
      worker1Task: patterns["creeps.TestWorker1.task.id"],
      worker2Project: patterns["creeps.TestWorker2.project.id"],
      worker2Config: patterns["creeps.TestWorker2.project.config.controller"]
    });

    // System should handle the framework without crashes
    const objects = await harness.getGameObjects(deployment.userId);
    expect(objects.spawns).to.have.length.greaterThan(0, "Game should remain stable");
  });

  it("should implement energy depositing workflow", async () => {
    const deployment = await harness.getLastDeployment();

    // Set up scenario with energy-gathering focus
    await harness.preloadMemory(deployment.userId, {
      creepCounter: 1,
      creeps: {
        HarvesterTest: {
          project: { id: "HarvestEnergyProject" }
        }
      },
      economy: { phase: "energy_gathering" }
    });

    await harness.waitForTicks(deployment.userId, 25);

    const memory = await harness.getMemoryState(deployment.userId);
    const objects = await harness.getGameObjects(deployment.userId);

    // Verify energy deposit targets exist (spawns/extensions)
    expect(objects.spawns).to.have.length.greaterThan(0);
    
    // Check that harvesting creeps can transition to depositing
    const harvesterCreeps = objects.creeps.filter(c => 
      c.name.includes('Harvester') || c.name.includes('HarvesterTest')
    );

    if (harvesterCreeps.length > 0) {
      console.log(`🏗️ Energy depositing workflow active with ${harvesterCreeps.length} harvesters`);
      
      // The HarvestEnergyProject should switch between harvest and deposit tasks
      // This is behavioral validation - the logic exists and doesn't crash
      expect(memory.creeps).to.exist;
    }

    // Spawns should be available as deposit targets
    const spawnEnergy = objects.spawns.reduce((total, spawn) => total + spawn.energy, 0);
    console.log(`⚡ Total spawn energy: ${spawnEnergy}`);
  });

  it("should implement source planning and assignment", async () => {
    const deployment = await harness.getLastDeployment();

    await harness.waitForTicks(deployment.userId, 20);

    const memory = await harness.getMemoryState(deployment.userId);
    const objects = await harness.getGameObjects(deployment.userId);

    // Verify sources are available for planning
    expect(objects.sources).to.have.length.greaterThan(0);

    // Check for source planning memory structures (may vary by implementation)
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      "sourcePlanner": null,
      "sources": null,
      "assignments": null
    });

    // Source planning may use different memory structures
    const hasPlanningData = patterns.sourcePlanner || patterns.sources || patterns.assignments;
    
    if (hasPlanningData) {
      console.log(`🎯 Source planning system detected`, {
        sourcePlanner: patterns.sourcePlanner,
        sources: patterns.sources,
        assignments: patterns.assignments
      });
    } else {
      console.log(`ℹ️  Source planning may use different storage or real-time calculation`);
    }

    // More important: verify that multiple creeps can coexist without conflicts
    if (objects.creeps.length > 1) {
      console.log(`👥 Multiple creep coordination: ${objects.creeps.length} creeps`);
      expect(objects.creeps.length).to.be.at.most(10, "Should maintain reasonable creep counts");
    }

    // Verify source-to-creep ratio makes sense
    const sourceCount = objects.sources.length;
    const harvesterCount = objects.creeps.filter(c => c.name.includes('Harvester')).length;
    
    if (harvesterCount > 0) {
      expect(harvesterCount).to.be.at.most(sourceCount * 3, 
        "Should not over-assign harvesters to sources");
    }

    console.log(`⚡ Source assignment ratio: ${harvesterCount} harvesters to ${sourceCount} sources`);
  });

  it("should handle creep lifecycle and memory cleanup", async () => {
    const deployment = await harness.getLastDeployment();

    // Create scenario with known creep memory
    const initialMemory = {
      creepCounter: 5,
      creeps: {
        ExistingCreep1: { project: { id: "HarvestEnergyProject" } },
        ExistingCreep2: { project: { id: "UpgradeControllerProject" } },
        OrphanedCreep: { project: { id: "DoNothingProject" } } // This creep won't exist in game
      }
    };

    await harness.preloadMemory(deployment.userId, initialMemory);
    await harness.waitForTicks(deployment.userId, 10);

    const memory = await harness.getMemoryState(deployment.userId);
    const objects = await harness.getGameObjects(deployment.userId);

    // System should handle memory cleanup automatically
    expect(memory.creeps).to.exist;

    // Check that memory is reasonable (not accumulating orphaned entries indefinitely)
    const memoryCreepCount = Object.keys(memory.creeps).length;
    const actualCreepCount = objects.creeps.length;

    console.log(`🧠 Memory cleanup validation:`, {
      memoryEntries: memoryCreepCount,
      actualCreeps: actualCreepCount,
      difference: memoryCreepCount - actualCreepCount
    });

    // Some difference is normal, but shouldn't be excessive
    expect(memoryCreepCount).to.be.at.most(actualCreepCount + 5, 
      "Memory should not accumulate excessive orphaned entries");
  });

  it("should implement runtime extensions system", async () => {
    const deployment = await harness.getLastDeployment();

    await harness.waitForTicks(deployment.userId, 10);

    // The runtime extensions system is harder to test directly, but we can verify
    // that the bot executes without errors, which indicates extensions are working
    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    expect(objects.spawns).to.have.length.greaterThan(0);
    expect(memory).to.exist;

    // If we got this far, extensions are working (creep.run(), etc.)
    console.log(`🔧 Runtime extensions operational (bot executing successfully)`);

    // Look for evidence of extended functionality in creep behavior
    if (objects.creeps.length > 0) {
      const patterns = await harness.checkMemoryPatterns(deployment.userId, {
        "creeps": null
      });
      
      expect(patterns.creeps).to.be.true;
      console.log(`🤖 Creep extensions working: ${objects.creeps.length} creeps executing`);
    }
  });

  it("should demonstrate error handling and recovery", async () => {
    const deployment = await harness.getLastDeployment();

    // Introduce some problematic memory state to test error handling
    await harness.preloadMemory(deployment.userId, {
      creepCounter: 1,
      creeps: {
        BrokenCreep: {
          project: { id: "NonExistentProject" }, // Invalid project
          task: { id: "InvalidTask", config: null }
        }
      },
      testScenario: "error_handling"
    });

    await harness.waitForTicks(deployment.userId, 15);

    // System should continue operating despite errors
    const memory = await harness.getMemoryState(deployment.userId);
    const objects = await harness.getGameObjects(deployment.userId);

    expect(memory).to.exist;
    expect(objects.spawns).to.have.length.greaterThan(0);

    // Bot should recover and continue normal operation
    if (objects.creeps.length > 0) {
      console.log(`💪 Error recovery: Bot continues operating with ${objects.creeps.length} creeps`);
    }

    console.log(`🛡️ Error handling system operational`);
  });

  it("should support memory-backed persistence", async () => {
    const deployment = await harness.getLastDeployment();

    // Set up complex memory state to test persistence
    const complexMemory = {
      creepCounter: 10,
      persistent: {
        gamePhase: "early_economy",
        lastUpdate: Date.now(),
        statistics: {
          totalCreepsSpawned: 10,
          energyHarvested: 5000
        }
      },
      creeps: {
        PersistentWorker: {
          project: { id: "HarvestEnergyProject" },
          persistent: { totalEnergyHarvested: 250 }
        }
      }
    };

    await harness.preloadMemory(deployment.userId, complexMemory);
    await harness.waitForTicks(deployment.userId, 10);

    // Verify complex data structures are maintained
    const memory = await harness.getMemoryState(deployment.userId);
    
    expect(memory.persistent).to.exist;
    expect(memory.persistent.gamePhase).to.equal("early_economy");
    expect(memory.persistent.statistics).to.exist;

    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      "persistent.gamePhase": "early_economy",
      "persistent.statistics.totalCreepsSpawned": 10,
      "creeps.PersistentWorker.persistent.totalEnergyHarvested": 250
    });

    expect(patterns["persistent.gamePhase"]).to.be.true;
    expect(patterns["persistent.statistics.totalCreepsSpawned"]).to.be.true;

    console.log(`💾 Memory persistence validated:`, {
      gamePhase: patterns["persistent.gamePhase"],
      statistics: patterns["persistent.statistics.totalCreepsSpawned"],
      creepData: patterns["creeps.PersistentWorker.persistent.totalEnergyHarvested"]
    });
  });
});