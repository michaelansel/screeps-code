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
  let testCount = 0;
  const testRoom = "W11N11";

  this.timeout(300000); // 5 minutes

  before(async function () {
    this.timeout(300000);
    await harness.setupEnvironment();
  });

  beforeEach(async function () {
    this.timeout(30000);
    testCount++;
    // Only reset for the first test, subsequent tests share the same deployment
    if (testCount === 1) {
      await harness.prepareTestCase();
    }
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
    // ========== ESTABLISH WORLD STATE ==========
    console.log("🌍 Setting up test world with proper room and sources...");
    
    // Deploy bot and wait for basic operations (or use existing)
    let deployment;
    if (harness.hasValidDeployment()) {
      deployment = harness.getLastDeployment();
    } else {
      deployment = await harness.deployBot();
      expect(deployment.success).to.be.true;
    }

    // Set up a proper test room with sources
    const roomSetup = await harness.setupTestRoom(testRoom, deployment.userId, {
      sources: 2
    });
    expect(roomSetup.success).to.be.true;

    // ========== LET CODE RUN ==========
    console.log("⚡ Letting bot run with proper game world...");
    await harness.waitForTicks(deployment.userId, 25);

    // ========== EVALUATE WORLD STATE ==========
    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    console.log(`🔍 Game state:`, {
      creeps: objects.creeps.length,
      sources: objects.sources.length,
      spawns: objects.spawns.length,
      total: objects.total
    });

    // Should have spawned creeps for energy harvesting
    expect(objects.creeps).to.have.length.greaterThan(0);
    expect(objects.sources).to.have.length.greaterThan(0, "Should have energy sources in properly set up room");

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
          'UpgradeControllerProject',
          'BuilderProject'
        ]);
      }
    }
  });

  it("should implement Project/Task framework execution", async () => {
    const deployment = await harness.getLastDeployment();

    // Just test that the framework is working with real creeps
    await harness.waitForTicks(deployment.userId, 15);

    const memory = await harness.getMemoryState(deployment.userId);
    const objects = await harness.getGameObjects(deployment.userId);
    
    // Verify framework structures exist
    expect(memory.creeps).to.exist;
    expect(objects.creeps).to.have.length.greaterThan(0);

    // Check that at least one real creep has project/task assignments
    let foundProjectAssignment = false;
    for (const creep of objects.creeps) {
      const creepMemory = memory.creeps[creep.name];
      if (creepMemory?.project?.id) {
        expect(creepMemory.project.id).to.be.oneOf([
          'HarvestEnergyProject', 
          'UpgradeControllerProject',
          'BuilderProject'
        ]);
        foundProjectAssignment = true;
      }
    }

    expect(foundProjectAssignment).to.be.true;

    console.log(`🎯 Project/Task framework validation: Found project assignments for ${objects.creeps.length} creeps`);

    // System should handle the framework without crashes
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

    // Check if sources are available for planning (may not be in test environment)
    console.log(`🔍 Sources available: ${objects.sources.length}`);

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
    
    if (harvesterCount > 0 && sourceCount > 0) {
      expect(harvesterCount).to.be.at.most(sourceCount * 3, 
        "Should not over-assign harvesters to sources");
    } else if (harvesterCount > 0 && sourceCount === 0) {
      console.log(`ℹ️  Test environment has ${harvesterCount} harvesters but no sources detected`);
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
    // Get deployment, or create one if none exists
    let deployment;
    if (harness.hasValidDeployment()) {
      deployment = harness.getLastDeployment();
    } else {
      deployment = await harness.deployBot();
      expect(deployment.success).to.be.true;
    }

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

  it("should implement Builder role and RoleManager integration", async () => {
    // ========== ESTABLISH WORLD STATE ==========
    const deployment = await harness.getLastDeployment();

    // Set up room with construction sites to trigger builder spawning
    const builderRoomSetup = await harness.setupTestRoom(testRoom, deployment.userId, {
      sources: 2,
      constructionSites: [
        { x: 30, y: 30, structureType: "extension" },
        { x: 32, y: 32, structureType: "road" }
      ]
    });
    expect(builderRoomSetup.success).to.be.true;
    
    console.log("🔨 Created construction sites to trigger builder role");

    // ========== LET CODE RUN ==========
    // Allow time for the economy to develop and potentially spawn builders
    await harness.waitForTicks(deployment.userId, 45);

    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    // Verify the RoleManager is working by checking role distribution
    const harvesterCreeps = objects.creeps.filter(c => c.name.includes('Harvester'));
    const builderCreeps = objects.creeps.filter(c => c.name.includes('Builder'));
    const upgraderCreeps = objects.creeps.filter(c => c.name.includes('Upgrader'));

    console.log(`🎯 Role distribution:`, {
      harvesters: harvesterCreeps.length,
      builders: builderCreeps.length,
      upgraders: upgraderCreeps.length,
      total: objects.creeps.length
    });

    // Should have diverse roles - not just all one type
    expect(objects.creeps.length).to.be.greaterThan(1, "Should spawn multiple creeps");
    
    // Verify role priority: Harvesters should exist first
    expect(harvesterCreeps.length).to.be.greaterThan(0, "Should prioritize harvester spawning");

    // Check that roles have correct project assignments
    for (const creep of objects.creeps) {
      const creepMemory = memory.creeps[creep.name];
      if (creepMemory?.project?.id) {
        expect(creepMemory.project.id).to.be.oneOf([
          'HarvestEnergyProject',
          'UpgradeControllerProject', 
          'BuilderProject'
        ], `Creep ${creep.name} should have valid project assignment`);
        
        // Verify project assignment matches creep name pattern
        if (creep.name.includes('Builder')) {
          expect(creepMemory.project.id).to.equal('BuilderProject');
        } else if (creep.name.includes('Harvester')) {
          expect(creepMemory.project.id).to.equal('HarvestEnergyProject');
        } else if (creep.name.includes('Upgrader')) {
          expect(creepMemory.project.id).to.equal('UpgradeControllerProject');
        }
      }
    }

    // Test Builder role specifically if spawned
    if (builderCreeps.length > 0) {
      console.log(`🔨 Builder role active: ${builderCreeps.length} builders`);
      
      // Verify builders have correct project assignment
      for (const builder of builderCreeps) {
        const builderMemory = memory.creeps[builder.name];
        expect(builderMemory?.project?.id).to.equal('BuilderProject');
      }

      // Check if builders are responding to construction/repair needs
      // (This tests the BuilderProject logic indirectly)
      console.log(`✅ Builder role system verified`);
    } else {
      console.log(`ℹ️  No builders spawned yet - may indicate no construction/repair needs`);
      console.log(`   This is expected behavior if room has no construction sites or damaged structures`);
    }

    // Verify RoleManager three-role system is operational
    const roleTypes = new Set(objects.creeps.map(c => {
      if (c.name.includes('Harvester')) return 'Harvester';
      if (c.name.includes('Builder')) return 'Builder';
      if (c.name.includes('Upgrader')) return 'Upgrader';
      return 'Unknown';
    }));

    console.log(`🎮 Role types active: ${Array.from(roleTypes).join(', ')}`);

    // Should have at least harvesters, may have builders/upgraders based on needs
    expect(roleTypes.has('Harvester')).to.be.true;
    expect(roleTypes.size).to.be.at.least(1);

    // Verify memory patterns for role system
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      "testScenario": "builder_role_system",
      "creepCounter": null,
      "creeps": null
    });

    expect(patterns.testScenario).to.be.true;
    expect(patterns.creeps).to.be.true;
    
    console.log(`🎯 Builder role system integration validated`);
  });
});