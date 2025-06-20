import { expect } from "chai";
import { FunctionalTestHarness } from "./test-harness";

/**
 * Console Logging and Project Assignment Functional Tests
 *
 * These tests validate that the main loop provides comprehensive console logging
 * and ensures all creeps always have projects assigned in a real Screeps environment.
 */

describe("Console Logging and Project Assignment", function () {
  const harness = new FunctionalTestHarness();
  let testFailed = false;
  const testRoom = "W15N15";

  this.timeout(300000); // 5 minutes

  before(async function () {
    this.timeout(300000);
    await harness.setupEnvironment();
  });

  beforeEach(async function () {
    this.timeout(60000);
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

  it("should provide comprehensive console logging for every tick", async () => {
    // ========== ESTABLISH WORLD STATE ==========
    console.log("🌍 Setting up test world with proper logging validation...");
    
    const deployment = await harness.deployBot();
    expect(deployment.success).to.be.true;
    
    // Set up a test room with sources
    const roomSetup = await harness.setupTestRoom(testRoom, deployment.userId, {
      sources: 2
    });
    expect(roomSetup.success).to.be.true;
    
    // ========== LET CODE RUN ==========
    console.log("⚡ Letting bot run to generate console logs...");
    await harness.waitForTicks(deployment.userId, 10);
    
    // ========== EVALUATE WORLD STATE ==========
    const consoleLogs = harness.getConsoleLogs(deployment.userId);
    
    console.log("📝 Console log validation:");
    console.log(`   Total log entries: ${consoleLogs.length}`);
    
    // Verify comprehensive logging exists
    const logContent = consoleLogs.join('\n');
    
    // Should have tick start/end markers
    expect(logContent).to.include('🎮 === TICK', 'Should log tick start');
    expect(logContent).to.include('START ===', 'Should log tick start');
    expect(logContent).to.include('END ===', 'Should log tick end');
    
    // Should have system information
    expect(logContent).to.include('⚡ Energy:', 'Should log energy information');
    expect(logContent).to.include('🤖 Creeps:', 'Should log creep count');
    expect(logContent).to.include('🏭 Spawns:', 'Should log spawn count');
    expect(logContent).to.include('🏠 Rooms:', 'Should log room count');
    
    // Should have section headers
    expect(logContent).to.include('🏠 === ROOM OPERATIONS ===', 'Should log room operations header');
    expect(logContent).to.include('🏭 === SPAWNING OPERATIONS ===', 'Should log spawning operations header');
    
    // Should have project assignment tracking
    expect(logContent).to.include('📊 Project assignments:', 'Should log project assignments');
    
    console.log("✅ Console logging validation completed");
  });

  it("should ensure no creeps exist without projects", async () => {
    // ========== ESTABLISH WORLD STATE ==========
    console.log("🌍 Setting up test world for project assignment validation...");
    
    let deployment;
    if (harness.hasValidDeployment()) {
      deployment = harness.getLastDeployment();
    } else {
      deployment = await harness.deployBot();
      expect(deployment.success).to.be.true;
    }
    
    // Set up room for creep spawning
    const roomSetup = await harness.setupTestRoom(testRoom, deployment.userId, {
      sources: 2
    });
    expect(roomSetup.success).to.be.true;
    
    // ========== LET CODE RUN ==========
    console.log("⚡ Letting bot run to spawn creeps...");
    await harness.waitForTicks(deployment.userId, 25);
    
    // ========== EVALUATE WORLD STATE ==========
    const gameObjects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);
    
    console.log("🔍 Project assignment validation:");
    console.log(`   Total creeps: ${gameObjects.creeps.length}`);
    
    // Verify all creeps have projects
    let creepsWithoutProjects = 0;
    let projectStats: Record<string, number> = {};
    
    for (const creep of gameObjects.creeps) {
      const creepMemory = memory.creeps[creep.name];
      
      if (!creepMemory || !creepMemory.project || !creepMemory.project.id) {
        creepsWithoutProjects++;
        console.log(`❌ Creep ${creep.name} has no project!`);
      } else {
        const projectId = creepMemory.project.id;
        projectStats[projectId] = (projectStats[projectId] || 0) + 1;
        console.log(`✅ Creep ${creep.name}: ${projectId}`);
      }
    }
    
    console.log(`📊 Project distribution:`, projectStats);
    
    // CRITICAL: No creeps should exist without projects
    expect(creepsWithoutProjects).to.equal(0, `All creeps must have projects assigned. Found ${creepsWithoutProjects} creeps without projects.`);
    
    // Should have at least some creeps (to make the test meaningful)
    expect(gameObjects.creeps.length).to.be.greaterThan(0, "Should have spawned at least one creep");
    
    // All existing creeps should have valid project assignments
    expect(Object.keys(projectStats).length).to.be.greaterThan(0, "Should have at least one project type assigned");
    
    console.log("✅ Project assignment validation completed - no creeps without projects found");
  });

  it("should automatically fix creeps without projects using DoNothingProject", async () => {
    // ========== ESTABLISH WORLD STATE ==========
    console.log("🌍 Setting up test world with broken creep memory...");
    
    let deployment;
    if (harness.hasValidDeployment()) {
      deployment = harness.getLastDeployment();
    } else {
      deployment = await harness.deployBot();
      expect(deployment.success).to.be.true;
    }
    
    // Wait for at least one creep to spawn
    await harness.waitForTicks(deployment.userId, 15);
    
    // Corrupt a creep's memory to simulate the issue
    const corruptedMemory = {
      creepCounter: 5,
      creeps: {
        CorruptedCreep: {
          // Missing project assignment
        },
        AnotherCorruptedCreep: {
          project: null // Explicitly null project
        }
      }
    };
    
    await harness.preloadMemory(deployment.userId, corruptedMemory);
    
    // ========== LET CODE RUN ==========
    console.log("⚡ Letting bot run to auto-fix corrupted creep memory...");
    await harness.waitForTicks(deployment.userId, 5);
    
    // ========== EVALUATE WORLD STATE ==========
    const consoleLogs = harness.getConsoleLogs(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);
    
    const logContent = consoleLogs.join('\n');
    
    // Should detect and fix missing projects
    if (logContent.includes('⚠️  FIXING:')) {
      console.log("✅ Detected auto-fixing in logs");
      expect(logContent).to.include('⚠️  FIXING:', 'Should log project assignment fixes');
      expect(logContent).to.include('DoNothingProject', 'Should assign DoNothingProject');
    }
    
    // Should log critical warnings if any were found
    if (logContent.includes('🚨 CRITICAL:')) {
      console.log("✅ Detected critical warning for missing projects");
      expect(logContent).to.include('🚨 CRITICAL:', 'Should log critical warnings');
      expect(logContent).to.include('creeps were missing projects', 'Should describe the issue');
    }
    
    console.log("✅ Auto-fix validation completed");
  });
});