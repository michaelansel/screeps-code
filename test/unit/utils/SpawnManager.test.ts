import { expect } from "chai";
import sinon from "sinon";
import { globalsSetup, globalsCleanup } from "../globals";
import { SpawnManager } from "../../../src/utils/SpawnManager";
import { RoleManager } from "../../../src/utils/RoleManager";

describe("SpawnManager", () => {
  let sandbox: sinon.SinonSandbox;
  let room: any;
  let mockCreeps: any[];

  beforeEach(() => {
    globalsSetup();
    sandbox = sinon.createSandbox();
    
    // Setup Game mock
    (global as any).Game = { time: 100 };
    
    // Setup mock room
    room = {
      name: "W1N1",
      memory: {},
      find: sandbox.stub()
    };

    mockCreeps = [];
    room.find.withArgs((global as any).FIND_MY_CREEPS).returns(mockCreeps);

    // Mock RoleManager calls
    sandbox.stub(RoleManager, "getRoomAvailableEnergy").returns(300);
    sandbox.stub(RoleManager, "getRoomEnergyCapacity").returns(800);
    sandbox.stub(RoleManager, "countCreepsByRole").returns({
      harvesters: 2,
      upgraders: 1,
      builders: 1,
      haulers: 1
    });
    sandbox.stub(RoleManager, "getDesiredQuotas").returns({
      harvesters: 2,
      upgraders: 2,
      builders: 1,
      haulers: 1
    });

    // Update game time for this test
    (global as any).Game = { time: 100 };
  });

  afterEach(() => {
    sandbox.restore();
    globalsCleanup();
    delete (global as any).FIND_MY_CREEPS;
    delete (global as any).Game;
  });

  describe("analyzeEnergyPipeline", () => {
    it("should analyze pipeline health correctly", () => {
      // Add some active creeps
      mockCreeps.push(
        { memory: { role: "harvester" } },
        { memory: { role: "hauler" } }
      );

      const pipeline = SpawnManager.analyzeEnergyPipeline(room);

      expect(pipeline.currentEnergy).to.equal(300);
      expect(pipeline.energyCapacity).to.equal(800);
      expect(pipeline.hasActiveHarvesters).to.be.true;
      expect(pipeline.hasActiveHaulers).to.be.true;
    });

    it("should detect unhealthy pipeline without workers", () => {
      // No active creeps
      mockCreeps.length = 0;

      const pipeline = SpawnManager.analyzeEnergyPipeline(room);

      expect(pipeline.hasActiveHarvesters).to.be.false;
      expect(pipeline.hasActiveHaulers).to.be.false;
      expect(pipeline.isHealthy).to.be.false;
    });

    it("should track energy history", () => {
      // First call
      SpawnManager.analyzeEnergyPipeline(room);
      
      // Second call with different energy
      (RoleManager.getRoomAvailableEnergy as sinon.SinonStub).returns(400);
      const pipeline = SpawnManager.analyzeEnergyPipeline(room);

      expect(room.memory.spawnManager.energyHistory).to.have.length(2);
      expect(room.memory.spawnManager.energyHistory).to.include(300);
      expect(room.memory.spawnManager.energyHistory).to.include(400);
    });
  });

  describe("getSpawnDecision", () => {
    beforeEach(() => {
      // Add healthy creeps
      mockCreeps.push(
        { memory: { role: "harvester" } },
        { memory: { role: "hauler" } }
      );
    });

    it("should spawn immediately if at energy capacity", () => {
      (RoleManager.getRoomAvailableEnergy as sinon.SinonStub).returns(750);

      const decision = SpawnManager.getSpawnDecision(room, "HarvestEnergyProject", 200);

      expect(decision.shouldSpawn).to.be.true;
      expect(decision.reason).to.equal("At energy capacity");
    });

    it("should not spawn if insufficient energy", () => {
      (RoleManager.getRoomAvailableEnergy as sinon.SinonStub).returns(150);

      const decision = SpawnManager.getSpawnDecision(room, "HarvestEnergyProject", 200);

      expect(decision.shouldSpawn).to.be.false;
      expect(decision.reason).to.equal("Insufficient energy for minimum body");
    });

    it("should spawn immediately if no harvesters", () => {
      (RoleManager.countCreepsByRole as sinon.SinonStub).returns({
        harvesters: 0,
        upgraders: 1,
        builders: 1,
        haulers: 1
      });

      const decision = SpawnManager.getSpawnDecision(room, "HarvestEnergyProject", 200);

      expect(decision.shouldSpawn).to.be.true;
      expect(decision.reason).to.equal("Emergency: No harvesters");
    });

    it("should wait for optimal energy when pipeline is healthy", () => {
      // Healthy pipeline but not optimal energy for harvesters
      (RoleManager.getRoomAvailableEnergy as sinon.SinonStub).returns(400);
      (RoleManager.getRoomEnergyCapacity as sinon.SinonStub).returns(800);
      
      // Mock healthy pipeline analysis
      const mockPipeline = {
        isHealthy: true,
        energyIncome: 10,
        energyCapacity: 800,
        currentEnergy: 400,
        fillRate: 0.6,
        hasActiveHaulers: false,
        hasActiveHarvesters: true
      };
      sandbox.stub(SpawnManager, "analyzeEnergyPipeline").returns(mockPipeline);
      
      room.memory.spawnManager = {
        energyHistory: [400, 400, 400, 400, 400],
        consecutiveWaitTicks: 5
      };

      const decision = SpawnManager.getSpawnDecision(room, "HarvestEnergyProject", 200);

      expect(decision.shouldSpawn).to.be.false;
      expect(decision.waitForEnergy).to.be.greaterThan(400);
      expect(decision.reason).to.include("Waiting for optimal energy");
    });

    it("should spawn after maximum wait time", () => {
      // Mock healthy pipeline analysis
      const mockPipeline = {
        isHealthy: true,
        energyIncome: 5,
        energyCapacity: 800,
        currentEnergy: 450,
        fillRate: 0.56,
        hasActiveHaulers: false,
        hasActiveHarvesters: true
      };
      sandbox.stub(SpawnManager, "analyzeEnergyPipeline").returns(mockPipeline);
      
      // Set up a situation where we've been waiting
      room.memory.spawnManager = {
        energyHistory: [450, 450, 450, 450, 450],
        consecutiveWaitTicks: 100 // At maximum
      };

      const decision = SpawnManager.getSpawnDecision(room, "HarvestEnergyProject", 200);

      expect(decision.shouldSpawn).to.be.true;
      expect(decision.reason).to.equal("Exceeded maximum wait time");
    });

    it("should spawn if energy is not increasing", () => {
      // Mock healthy pipeline analysis but with negative energy income
      const mockPipeline = {
        isHealthy: true,
        energyIncome: -5, // Decreasing
        energyCapacity: 800,
        currentEnergy: 470,
        fillRate: 0.59,
        hasActiveHaulers: false,
        hasActiveHarvesters: true
      };
      sandbox.stub(SpawnManager, "analyzeEnergyPipeline").returns(mockPipeline);
      
      // Set up decreasing energy trend
      room.memory.spawnManager = {
        energyHistory: [500, 490, 480, 470, 460, 450],
        consecutiveWaitTicks: 10
      };

      const decision = SpawnManager.getSpawnDecision(room, "HarvestEnergyProject", 200);

      expect(decision.shouldSpawn).to.be.true;
      expect(decision.reason).to.equal("Would take too long to reach optimal");
    });
  });

  describe("recordSpawn", () => {
    it("should record spawn details and reset wait counter", () => {
      room.memory.spawnManager = {
        energyHistory: [],
        consecutiveWaitTicks: 50
      };

      SpawnManager.recordSpawn(room, 350);

      expect(room.memory.spawnManager.lastSpawnTime).to.equal(100);
      expect(room.memory.spawnManager.lastSpawnEnergy).to.equal(350);
      expect(room.memory.spawnManager.consecutiveWaitTicks).to.equal(0);
    });
  });
});