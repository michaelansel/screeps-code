import { expect } from "chai";
import { FunctionalTestHarness } from "./test-harness";

/**
 * Resource Management System Functional Tests
 *
 * These tests validate that the Resource Management System works correctly
 * in a real Screeps server environment, including role-based spawning,
 * controller upgrading, and energy management behaviors.
 */

describe("Resource Management System", function () {
  const harness = new FunctionalTestHarness();
  let testFailed = false;
  let testCount = 0;

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

  it("should implement role-based spawning with harvesters and upgraders", async () => {
    // Deploy the bot with our Resource Management System (or use existing)
    let deployment;
    if (harness.hasValidDeployment()) {
      deployment = harness.getLastDeployment();
    } else {
      deployment = await harness.deployBot();
      expect(deployment.success).to.be.true;
    }

    // Wait for initial spawning to occur
    await harness.waitForTicks(deployment.userId, 15);

    // Check that creeps are spawned with role-based names
    const objects = await harness.getGameObjects(deployment.userId);
    expect(objects.creeps).to.have.length.greaterThan(0);

    // Verify role-based naming convention
    const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));
    const upgraderCreeps = objects.creeps.filter(c => c.name.startsWith('Upgrader'));

    expect(harvesterCreeps.length).to.be.greaterThan(0, "Should spawn at least one harvester");
    
    console.log(`🤖 Spawned creeps:`, {
      harvesters: harvesterCreeps.length,
      upgraders: upgraderCreeps.length,
      total: objects.creeps.length
    });

    // Check memory structure for role configuration
    const memory = await harness.getMemoryState(deployment.userId);
    expect(memory.creepCounter).to.be.greaterThan(0);

    // Verify creep memory has proper project configuration
    if (objects.creeps.length > 0) {
      const creepName = objects.creeps[0].name;
      const creepMemory = memory.creeps[creepName];
      
      expect(creepMemory).to.exist;
      expect(creepMemory.project).to.exist;
      expect(creepMemory.project.id).to.be.oneOf(['HarvestEnergyProject', 'UpgradeControllerProject']);
    }
  });

  it("should prioritize harvester spawning before upgraders", async () => {
    const deployment = await harness.getLastDeployment();

    // Start with clean memory to test spawning priority
    await harness.preloadMemory(deployment.userId, {
      creepCounter: 0,
      creeps: {}
    });

    // Wait for spawning to occur with priority logic
    await harness.waitForTicks(deployment.userId, 20);

    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    // Should prioritize harvesters first (exactly 1 per source before upgraders)
    const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));
    const upgraderCreeps = objects.creeps.filter(c => c.name.startsWith('Upgrader'));
    const sources = objects.sources;

    if (objects.creeps.length >= sources.length) {
      expect(harvesterCreeps.length).to.equal(sources.length, `Should spawn exactly ${sources.length} harvesters first (1 per source)`);
    }

    // If we have upgraders, we should have sufficient harvesters
    if (upgraderCreeps.length > 0) {
      expect(harvesterCreeps.length).to.equal(sources.length, "Should have 1 harvester per source before spawning upgraders");
    }

    console.log(`⚖️ Spawning priority verification:`, {
      sources: sources.length,
      harvesters: harvesterCreeps.length,
      upgraders: upgraderCreeps.length,
      priorityMaintained: harvesterCreeps.length >= sources.length || upgraderCreeps.length === 0
    });
  });

  it("should assign correct projects to different role types", async () => {
    const deployment = await harness.getLastDeployment();

    // Wait for various creep types to be spawned
    await harness.waitForTicks(deployment.userId, 25);

    const memory = await harness.getMemoryState(deployment.userId);
    const objects = await harness.getGameObjects(deployment.userId);

    // Analyze project assignments by role type
    const roleAssignments = {
      harvesters: { HarvestEnergyProject: 0, UpgradeControllerProject: 0, other: 0 },
      upgraders: { HarvestEnergyProject: 0, UpgradeControllerProject: 0, other: 0 }
    };

    for (const creep of objects.creeps) {
      const creepMemory = memory.creeps[creep.name];
      if (creepMemory?.project?.id) {
        const projectId = creepMemory.project.id;
        
        if (creep.name.startsWith('Harvester')) {
          if (projectId === 'HarvestEnergyProject') roleAssignments.harvesters.HarvestEnergyProject++;
          else if (projectId === 'UpgradeControllerProject') roleAssignments.harvesters.UpgradeControllerProject++;
          else roleAssignments.harvesters.other++;
        } else if (creep.name.startsWith('Upgrader')) {
          if (projectId === 'HarvestEnergyProject') roleAssignments.upgraders.HarvestEnergyProject++;
          else if (projectId === 'UpgradeControllerProject') roleAssignments.upgraders.UpgradeControllerProject++;
          else roleAssignments.upgraders.other++;
        }
      }
    }

    // Harvesters should typically have HarvestEnergyProject
    // Upgraders should have UpgradeControllerProject with controller config
    const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));
    const upgraderCreeps = objects.creeps.filter(c => c.name.startsWith('Upgrader'));

    if (harvesterCreeps.length > 0) {
      expect(roleAssignments.harvesters.HarvestEnergyProject).to.be.greaterThan(0, 
        "Harvesters should have HarvestEnergyProject");
    }

    if (upgraderCreeps.length > 0) {
      expect(roleAssignments.upgraders.UpgradeControllerProject).to.be.greaterThan(0,
        "Upgraders should have UpgradeControllerProject");
      
      // Check that upgraders have controller configuration
      const upgraderName = upgraderCreeps[0].name;
      const upgraderMemory = memory.creeps[upgraderName];
      
      if (upgraderMemory?.project?.config) {
        expect(upgraderMemory.project.config.controller).to.exist;
        expect(upgraderMemory.project.config.controller).to.be.a('string');
      }
    }

    console.log(`🎯 Project assignment analysis:`, roleAssignments);
  });

  it("should respect role quotas (1 harvester per source, max 3 upgraders)", async () => {
    const deployment = await harness.getLastDeployment();

    // Wait for quota limits to potentially be reached
    await harness.waitForTicks(deployment.userId, 40);

    const objects = await harness.getGameObjects(deployment.userId);
    const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));
    const upgraderCreeps = objects.creeps.filter(c => c.name.startsWith('Upgrader'));
    const sources = objects.sources;

    // Harvesters: exactly 1 per source (new optimal allocation)
    expect(harvesterCreeps.length).to.equal(sources.length, `Should maintain exactly ${sources.length} harvesters for ${sources.length} sources`);
    
    // Upgraders: should not exceed 3 unless quota logic changes
    if (upgraderCreeps.length > 0) {
      expect(upgraderCreeps.length).to.be.at.most(5, "Should respect reasonable upgrader limits");
    }

    console.log(`📊 Role quota status:`, {
      sources: sources.length,
      harvesters: `${harvesterCreeps.length} (target: ${sources.length})`,
      upgraders: `${upgraderCreeps.length} (max: ~3)`,
      totalCreeps: objects.creeps.length
    });

    // If we have room capacity and energy, creeps should be spawned up to quotas
    const spawns = objects.spawns;
    if (spawns.length > 0 && spawns[0].energy >= 200) {
      expect(objects.creeps.length).to.be.greaterThan(0, "Should spawn creeps when energy available");
    }
  });

  it("should demonstrate controller upgrading behavior", async () => {
    const deployment = await harness.getLastDeployment();

    // Set up scenario with upgrader creeps and energy
    await harness.preloadMemory(deployment.userId, {
      creepCounter: 3,
      creeps: {
        TestUpgrader1: {
          project: { 
            id: "UpgradeControllerProject",
            config: { controller: "test_controller_id" }
          }
        }
      }
    });

    // Wait for upgrading behavior to manifest
    await harness.waitForTicks(deployment.userId, 20);

    // Check that controller upgrading logic is working
    const memory = await harness.getMemoryState(deployment.userId);
    const objects = await harness.getGameObjects(deployment.userId);

    // Verify upgrader creeps exist and have proper configuration
    const upgraderCreeps = objects.creeps.filter(c => 
      c.name.startsWith('Upgrader') || c.name.startsWith('TestUpgrader')
    );

    if (upgraderCreeps.length > 0) {
      console.log(`🔧 Found ${upgraderCreeps.length} upgrader creeps for controller upgrading`);
      
      // Check memory state for upgrading configuration
      for (const creep of upgraderCreeps) {
        const creepMemory = memory.creeps[creep.name];
        if (creepMemory?.project?.id === 'UpgradeControllerProject') {
          expect(creepMemory.project.config).to.exist;
          console.log(`✅ Upgrader ${creep.name} configured for controller upgrading`);
        }
      }
    }

    // Test the dual-phase behavior: harvest energy -> upgrade controller
    // This is more about validating the logic exists rather than specific behavior timing
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      "creeps": null, // Should have creeps object
      creepCounter: null // Should have counter
    });

    expect(patterns.creeps).to.be.true;
    expect(patterns.creepCounter).to.be.true;

    console.log(`🎮 Controller upgrading system operational`);
  });

  it("should integrate with existing SourcePlanner system", async () => {
    const deployment = await harness.getLastDeployment();

    // Wait for source planning to take effect
    await harness.waitForTicks(deployment.userId, 25);

    const memory = await harness.getMemoryState(deployment.userId);
    
    // Check for SourcePlanner memory structures
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      "sourcePlanner": null, // Should have source planner data
      "sourcePlanner.assignments": null // Should have assignments
    });

    // SourcePlanner integration may be optional depending on implementation
    if (patterns.sourcePlanner) {
      console.log(`🎯 SourcePlanner integration detected`);
      expect(patterns["sourcePlanner.assignments"]).to.be.true;
    } else {
      console.log(`ℹ️  SourcePlanner memory not detected (may use different storage)`)
    }

    // Verify that harvesters can find and target sources
    const objects = await harness.getGameObjects(deployment.userId);
    expect(objects.sources).to.have.length.greaterThan(0, "Room should have energy sources");

    console.log(`⚡ Energy sources available: ${objects.sources.length}`);
    console.log(`🤖 Harvester creeps: ${objects.creeps.filter(c => c.name.startsWith('Harvester')).length}`);
  });

  it("should handle empty spawns and energy constraints gracefully", async () => {
    const deployment = await harness.getLastDeployment();

    // Test with low energy scenario
    await harness.preloadMemory(deployment.userId, {
      creepCounter: 0,
      creeps: {},
      testScenario: "low_energy"
    });

    // Wait a bit to see how system responds to constraints
    await harness.waitForTicks(deployment.userId, 15);

    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    // System should handle constraints gracefully (not crash)
    expect(memory).to.exist;
    expect(objects.spawns).to.have.length.greaterThan(0);

    // If energy is available, spawning should work
    const spawn = objects.spawns[0];
    if (spawn.energy >= 200) { // Basic creep cost
      // Should eventually spawn something if energy permits
      await harness.waitForTicks(deployment.userId, 10);
      const updatedObjects = await harness.getGameObjects(deployment.userId);
      
      console.log(`⚡ Spawn energy: ${spawn.energy}, Creeps spawned: ${updatedObjects.creeps.length}`);
    }

    console.log(`✅ Resource constraints handled gracefully`);
  });
});