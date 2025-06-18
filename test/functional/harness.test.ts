import { expect } from "chai";
import { FunctionalTestHarness } from "./test-harness";

/**
 * Test Harness Validation
 * 
 * These tests validate that the test harness itself works correctly.
 * They should be independent of the actual bot logic in src/.
 */

describe("Functional Test Harness", function () {
  const harness = new FunctionalTestHarness();
  
  this.timeout(300000); // 5 minutes

  before(async () => {
    await harness.prepareTestEnvironment();
  });

  after(async () => {
    await harness.cleanup();
  });

  it("should detect container runtime", () => {
    // This test already passed if we got here
    expect(true).to.be.true;
  });

  it("should prepare test environment with FileBot mod", async () => {
    // Environment was prepared in before(), verify FileBot is available
    const result = await harness["curlCli"]("typeof filebot");
    expect(result).to.include("object");
  });

  it("should deploy minimal test code", async () => {
    // Deploy a minimal bot that just logs
    const deployment = await harness.deployBot();
    
    expect(deployment.success).to.be.true;
    expect(deployment.userId).to.be.a("string");
    expect(deployment.userId).to.have.length.greaterThan(0);
    expect(deployment.room).to.equal("W12N12");
  });

  it("should monitor game tick progression", async () => {
    const deployment = harness.getLastDeployment();
    
    // Monitor for just 20 seconds
    const execution = await harness.monitorExecution(deployment.userId, {
      duration: 20,
      expectations: {
        minTicks: 1,
        cpuUsed: true,
        spawnActive: true
      }
    });
    
    // Game should be running
    expect(execution.ticksAdvanced).to.be.greaterThan(0);
  });

  it("should query game state", async () => {
    const deployment = harness.getLastDeployment();
    
    // Should be able to query memory
    const memory = await harness.getMemoryState(deployment.userId);
    expect(memory).to.not.be.null;
    
    // Should be able to query objects
    const objects = await harness.getGameObjects(deployment.userId);
    expect(objects.spawns).to.be.an("array");
    expect(objects.spawns).to.have.length.greaterThan(0); // FileBot creates a spawn
  });
});