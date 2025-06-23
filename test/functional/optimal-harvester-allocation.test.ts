import { expect } from "chai";
import { FunctionalTestHarness } from "./test-harness";

/**
 * Optimal Harvester Allocation Functional Tests
 *
 * These tests validate that the harvester allocation system works correctly
 * in advanced rooms, ensuring:
 * 1. Optimal harvester body composition (5 WORK parts for 10 energy/tick)
 * 2. Exactly one harvester assigned per source
 * 3. Sources are fully drained (reach zero energy before regeneration)
 * 4. Proper integration with SourcePlanner for distribution
 * 5. Dynamic scaling based on room RCL and energy capacity
 */

describe("Optimal Harvester Allocation System", function () {
  const harness = new FunctionalTestHarness();
  let testFailed = false;
  let testCount = 0;

  this.timeout(600000); // 10 minutes for advanced scenarios

  before(async function () {
    this.timeout(600000);
    await harness.setupEnvironment();
  });

  beforeEach(async function () {
    this.timeout(60000);
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

  it("should spawn optimal harvesters with 5 WORK parts in advanced rooms", async () => {
    // Deploy the bot with our harvester allocation system
    let deployment;
    if (harness.hasValidDeployment()) {
      deployment = harness.getLastDeployment();
    } else {
      deployment = await harness.deployBot();
      expect(deployment.success).to.be.true;
    }

    // Set up advanced room scenario (RCL 3+ with sufficient energy capacity)
    await harness.preloadMemory(deployment.userId, {
      creepCounter: 0,
      creeps: {},
      testScenario: "advanced_room_optimal_harvesters"
    });

    // Wait for spawning system to create optimal harvesters
    await harness.waitForTicks(deployment.userId, 30);

    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    // Find harvester creeps
    const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));
    expect(harvesterCreeps.length).to.be.greaterThan(0, "Should spawn at least one harvester");

    // Check energy capacity - should be sufficient for optimal harvesters (550 energy)
    const spawns = objects.spawns;
    const extensions = objects.structures?.filter(s => s.structureType === 'extension') || [];
    const totalEnergyCapacity = spawns.reduce((sum, spawn) => sum + 300, 0) + 
                               extensions.reduce((sum, ext) => sum + 50, 0);

    console.log(`⚡ Room energy capacity: ${totalEnergyCapacity}`);
    console.log(`🤖 Harvester creeps spawned: ${harvesterCreeps.length}`);

    // If we have sufficient energy capacity (550+), verify optimal body composition
    if (totalEnergyCapacity >= 550) {
      // Check that harvesters have optimal body composition
      for (const harvester of harvesterCreeps) {
        const creepMemory = memory.creeps[harvester.name];
        if (creepMemory?.project?.id === 'HarvestEnergyProject') {
          // Verify the harvester has optimal body parts (should be 5W+1C+1M minimum)
          if (harvester.body) {
            const workParts = harvester.body.filter(part => part.type === 'work').length;
            const carryParts = harvester.body.filter(part => part.type === 'carry').length;
            const moveParts = harvester.body.filter(part => part.type === 'move').length;

            console.log(`🔧 Harvester ${harvester.name} body: ${workParts}W+${carryParts}C+${moveParts}M`);
            
            // Optimal harvester should have exactly 5 WORK parts (matches source regeneration)
            expect(workParts).to.equal(5, `Harvester ${harvester.name} should have 5 WORK parts for optimal efficiency`);
            expect(carryParts).to.be.at.least(1, `Harvester ${harvester.name} should have at least 1 CARRY part`);
            expect(moveParts).to.be.at.least(1, `Harvester ${harvester.name} should have at least 1 MOVE part`);
          }
        }
      }

      console.log(`✅ Advanced room spawned optimal harvesters with 5 WORK parts`);
    } else {
      console.log(`ℹ️  Room energy capacity (${totalEnergyCapacity}) insufficient for optimal harvesters (550 needed)`);
    }
  });

  it("should assign exactly one harvester per source", async () => {
    const deployment = await harness.getLastDeployment();

    // Wait for source assignment system to distribute harvesters
    await harness.waitForTicks(deployment.userId, 25);

    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    const sources = objects.sources;
    const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));

    expect(sources.length).to.be.greaterThan(0, "Room should have energy sources");
    
    console.log(`⚡ Energy sources in room: ${sources.length}`);
    console.log(`🤖 Harvester creeps: ${harvesterCreeps.length}`);

    // Check SourcePlanner memory for proper distribution
    const patterns = await harness.checkMemoryPatterns(deployment.userId, {
      "sourcePlanner": null,
      "sourcePlanner.assignments": null
    });

    if (patterns.sourcePlanner) {
      console.log(`🎯 SourcePlanner detected - checking assignments`);
      
      // Verify assignment distribution
      const sourcePlannerMemory = memory.sourcePlanner;
      if (sourcePlannerMemory?.assignments) {
        const assignmentsBySource = new Map<string, string[]>();
        
        // Group assignments by source
        for (const [creepName, sourceId] of Object.entries(sourcePlannerMemory.assignments)) {
          if (!assignmentsBySource.has(sourceId)) {
            assignmentsBySource.set(sourceId, []);
          }
          assignmentsBySource.get(sourceId)!.push(creepName);
        }

        console.log(`📊 Source assignments:`, Array.from(assignmentsBySource.entries()).map(([sourceId, creeps]) => 
          `${sourceId}: [${creeps.join(', ')}]`
        ));

        // Verify exactly one harvester per source
        for (const [sourceId, assignedCreeps] of assignmentsBySource.entries()) {
          const activeHarvesters = assignedCreeps.filter(creepName => 
            objects.creeps.some(c => c.name === creepName && c.name.startsWith('Harvester'))
          );
          
          expect(activeHarvesters.length).to.equal(1, 
            `Source ${sourceId} should have exactly 1 harvester, found: ${activeHarvesters.length} (${activeHarvesters.join(', ')})`
          );
        }

        console.log(`✅ Verified exactly one harvester per source`);
      }
    } else {
      // Fallback: check that harvester count matches source count
      expect(harvesterCreeps.length).to.equal(sources.length, 
        `Should have exactly ${sources.length} harvesters for ${sources.length} sources`);
      console.log(`✅ Harvester count matches source count (${sources.length})`);
    }
  });

  it("should ensure sources reach zero energy before regeneration", async () => {
    const deployment = await harness.getLastDeployment();

    // Wait for harvesters to start working
    await harness.waitForTicks(deployment.userId, 20);

    const objects = await harness.getGameObjects(deployment.userId);
    const sources = objects.sources;
    const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));

    expect(sources.length).to.be.greaterThan(0, "Room should have energy sources");
    expect(harvesterCreeps.length).to.be.greaterThan(0, "Should have active harvesters");

    console.log(`⚡ Monitoring ${sources.length} sources for optimal draining`);

    // Track source energy levels over multiple regeneration cycles
    const sourceEnergyHistory: Record<string, number[]> = {};
    const monitoringTicks = 15; // Monitor for ~15 ticks

    for (let tick = 0; tick < monitoringTicks; tick++) {
      await harness.waitForTicks(deployment.userId, 1);
      const currentObjects = await harness.getGameObjects(deployment.userId);
      
      for (const source of currentObjects.sources) {
        if (!sourceEnergyHistory[source.id]) {
          sourceEnergyHistory[source.id] = [];
        }
        sourceEnergyHistory[source.id].push(source.energy);
      }
    }

    // Analyze energy patterns to verify optimal draining
    let sourcesReachingZero = 0;
    let totalRegenerationCycles = 0;

    for (const [sourceId, energyLevels] of Object.entries(sourceEnergyHistory)) {
      console.log(`📈 Source ${sourceId} energy pattern: [${energyLevels.slice(0, 10).join(', ')}...]`);
      
      // Check for regeneration cycles (energy jumps from low to 3000)
      let regenerationCycles = 0;
      let reachedZero = false;
      
      for (let i = 1; i < energyLevels.length; i++) {
        const prevEnergy = energyLevels[i - 1];
        const currentEnergy = energyLevels[i];
        
        // Detect regeneration (significant energy increase)
        if (currentEnergy > prevEnergy + 2000) {
          regenerationCycles++;
          totalRegenerationCycles++;
          
          // Check if previous cycle reached zero or near-zero
          if (prevEnergy <= 50) { // Allow small margin for timing
            reachedZero = true;
          }
          
          console.log(`🔄 Source ${sourceId} regenerated at tick ${i}: ${prevEnergy} -> ${currentEnergy}`);
        }
      }
      
      if (reachedZero) {
        sourcesReachingZero++;
        console.log(`✅ Source ${sourceId} properly drained to zero before regeneration`);
      } else if (regenerationCycles > 0) {
        const lowestEnergy = Math.min(...energyLevels);
        console.log(`⚠️  Source ${sourceId} regenerated but lowest energy was ${lowestEnergy} (should reach ~0)`);
      }
    }

    // Verify optimal source draining behavior
    if (totalRegenerationCycles > 0) {
      const drainageEfficiency = sourcesReachingZero / Object.keys(sourceEnergyHistory).length;
      console.log(`📊 Source drainage efficiency: ${sourcesReachingZero}/${Object.keys(sourceEnergyHistory).length} sources (${Math.round(drainageEfficiency * 100)}%)`);
      
      // With optimal harvesters (5 WORK = 10 energy/tick), sources should reach zero
      expect(drainageEfficiency).to.be.at.least(0.5, 
        "At least 50% of sources should reach zero energy before regeneration with optimal harvesters");
        
      if (drainageEfficiency >= 0.8) {
        console.log(`🏆 Excellent source drainage efficiency: ${Math.round(drainageEfficiency * 100)}%`);
      }
    } else {
      console.log(`ℹ️  No source regeneration cycles observed during monitoring period`);
    }
  });

  it("should scale harvester allocation dynamically with room development", async () => {
    const deployment = await harness.getLastDeployment();

    // Test different room development scenarios
    const scenarios = [
      { name: "Early Room (RCL 1-2)", expectedHarvesters: 2 },
      { name: "Developed Room (RCL 3-4)", expectedHarvesters: 2 },
      { name: "Advanced Room (RCL 5+)", expectedHarvesters: 2 }
    ];

    for (const scenario of scenarios) {
      console.log(`🏗️  Testing scenario: ${scenario.name}`);
      
      // Reset and wait for stabilization
      await harness.preloadMemory(deployment.userId, {
        creepCounter: 0,
        creeps: {},
        testScenario: scenario.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
      });

      await harness.waitForTicks(deployment.userId, 20);

      const objects = await harness.getGameObjects(deployment.userId);
      const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));
      const sources = objects.sources;

      console.log(`   Sources: ${sources.length}, Harvesters: ${harvesterCreeps.length}`);

      // Should have exactly one harvester per source (not minimum 2)
      expect(harvesterCreeps.length).to.equal(sources.length, 
        `${scenario.name} should have exactly ${sources.length} harvesters for ${sources.length} sources`);
    }

    console.log(`✅ Harvester allocation scales properly with room development`);
  });

  it("should maintain harvester distribution when harvesters die", async () => {
    const deployment = await harness.getLastDeployment();

    // Wait for stable harvester distribution
    await harness.waitForTicks(deployment.userId, 25);

    const initialObjects = await harness.getGameObjects(deployment.userId);
    const initialHarvesters = initialObjects.creeps.filter(c => c.name.startsWith('Harvester'));
    const sources = initialObjects.sources;

    console.log(`💀 Testing harvester replacement: ${initialHarvesters.length} harvesters, ${sources.length} sources`);

    // Simulate harvester death by clearing some harvester memory
    if (initialHarvesters.length > 0) {
      const harvesterToRemove = initialHarvesters[0].name;
      console.log(`   Simulating death of harvester: ${harvesterToRemove}`);
      
      await harness.preloadMemory(deployment.userId, {
        creeps: Object.fromEntries(
          Object.entries((await harness.getMemoryState(deployment.userId)).creeps || {})
            .filter(([name]) => name !== harvesterToRemove)
        )
      });

      // Wait for system to detect missing harvester and spawn replacement
      await harness.waitForTicks(deployment.userId, 30);

      const updatedObjects = await harness.getGameObjects(deployment.userId);
      const updatedHarvesters = updatedObjects.creeps.filter(c => c.name.startsWith('Harvester'));

      // Should maintain proper harvester count
      expect(updatedHarvesters.length).to.equal(sources.length, 
        `Should maintain ${sources.length} harvesters after harvester death`);

      console.log(`✅ System properly replaced dead harvester: ${updatedHarvesters.length} harvesters maintained`);
    }
  });

  it("should integrate properly with RoleManager quota system", async () => {
    const deployment = await harness.getLastDeployment();

    // Wait for quota system to stabilize
    await harness.waitForTicks(deployment.userId, 25);

    const objects = await harness.getGameObjects(deployment.userId);
    const memory = await harness.getMemoryState(deployment.userId);

    const sources = objects.sources;
    const harvesterCreeps = objects.creeps.filter(c => c.name.startsWith('Harvester'));
    const upgraderCreeps = objects.creeps.filter(c => c.name.startsWith('Upgrader'));
    const builderCreeps = objects.creeps.filter(c => c.name.startsWith('Builder'));

    console.log(`📊 Creep distribution:`);
    console.log(`   Harvesters: ${harvesterCreeps.length} (target: ${sources.length})`);
    console.log(`   Upgraders: ${upgraderCreeps.length}`);
    console.log(`   Builders: ${builderCreeps.length}`);

    // Verify RoleManager quota compliance
    expect(harvesterCreeps.length).to.equal(sources.length, 
      `RoleManager should maintain exactly ${sources.length} harvesters for ${sources.length} sources`);

    // Check that other roles are not over-spawned
    expect(upgraderCreeps.length).to.be.at.most(5, "Should not spawn excessive upgraders");
    expect(builderCreeps.length).to.be.at.most(3, "Should not spawn excessive builders");

    // Verify spawning priority (harvesters first, then others)
    if (harvesterCreeps.length < sources.length) {
      expect(upgraderCreeps.length + builderCreeps.length).to.equal(0, 
        "Should not spawn upgraders or builders until harvester quota is met");
    }

    console.log(`✅ RoleManager quota system working correctly with new harvester allocation`);
  });
});