import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { CreepCapabilityAnalyzer } from "../../../src/utils/CreepCapabilities";

use(sinonChai);

// Global constants
global.WORK = "work" as any;
global.CARRY = "carry" as any;
global.MOVE = "move" as any;
global.ATTACK = "attack" as any;
global.RANGED_ATTACK = "ranged_attack" as any;
global.HEAL = "heal" as any;
global.CLAIM = "claim" as any;
global.TOUGH = "tough" as any;

global.CARRY_CAPACITY = 50;

describe("CreepCapabilityAnalyzer", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    CreepCapabilityAnalyzer.clearCache();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("analyzeCapabilities", () => {
    it("should analyze a basic worker creep", () => {
      const creep: any = {
        id: "creep1",
        body: [
          { type: WORK, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: {
          getUsedCapacity: () => 0,
          getCapacity: () => 50
        }
      };

      const capabilities = CreepCapabilityAnalyzer.analyzeCapabilities(creep);

      expect(capabilities.canWork).to.be.true;
      expect(capabilities.workPower).to.equal(1);
      expect(capabilities.canCarry).to.be.true;
      expect(capabilities.carryCapacity).to.equal(50);
      expect(capabilities.canHarvest).to.be.true;
      expect(capabilities.canBuild).to.be.true;
      expect(capabilities.canHaul).to.be.true;
      expect(capabilities.canUpgrade).to.be.true;
      expect(capabilities.harvestEfficiency).to.be.greaterThan(0);
    });

    it("should analyze an energy specialist (5W 1C 3M)", () => {
      const creep: any = {
        id: "creep2",
        body: [
          { type: WORK, hits: 100 },
          { type: WORK, hits: 100 },
          { type: WORK, hits: 100 },
          { type: WORK, hits: 100 },
          { type: WORK, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 },
          { type: MOVE, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: {
          getUsedCapacity: () => 0,
          getCapacity: () => 50
        }
      };

      const capabilities = CreepCapabilityAnalyzer.analyzeCapabilities(creep);

      expect(capabilities.workPower).to.equal(5);
      expect(capabilities.carryCapacity).to.equal(50);
      expect(capabilities.harvestEfficiency).to.be.greaterThan(0.8); // Should be very efficient
      expect(capabilities.canHarvest).to.be.true;
      expect(capabilities.canBuild).to.be.true;
    });

    it("should analyze a transport specialist (4C 2M)", () => {
      const creep: any = {
        id: "creep3",
        body: [
          { type: CARRY, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: {
          getUsedCapacity: () => 0,
          getCapacity: () => 200
        }
      };

      const capabilities = CreepCapabilityAnalyzer.analyzeCapabilities(creep);

      expect(capabilities.workPower).to.equal(0);
      expect(capabilities.carryCapacity).to.equal(200);
      expect(capabilities.canWork).to.be.false;
      expect(capabilities.canCarry).to.be.true;
      expect(capabilities.canHarvest).to.be.false;
      expect(capabilities.canBuild).to.be.false;
      expect(capabilities.canHaul).to.be.true;
      expect(capabilities.haulEfficiency).to.be.greaterThan(0.3); // Lower threshold since it's 4C 2M
    });

    it("should ignore damaged body parts", () => {
      const creep: any = {
        id: "creep4",
        body: [
          { type: WORK, hits: 100 },
          { type: WORK, hits: 0 }, // Damaged
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: {
          getUsedCapacity: () => 0,
          getCapacity: () => 50
        }
      };

      const capabilities = CreepCapabilityAnalyzer.analyzeCapabilities(creep);

      expect(capabilities.workPower).to.equal(1); // Only count active parts
    });

    it("should cache capabilities", () => {
      const creep: any = {
        id: "creep5",
        body: [
          { type: WORK, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: {
          getUsedCapacity: () => 0,
          getCapacity: () => 50
        }
      };

      const capabilities1 = CreepCapabilityAnalyzer.analyzeCapabilities(creep);
      const capabilities2 = CreepCapabilityAnalyzer.analyzeCapabilities(creep);

      expect(capabilities1).to.equal(capabilities2); // Should be same object from cache
    });
  });

  describe("findCapableCreeps", () => {
    it("should find creeps that meet requirements", () => {
      const harvester: any = {
        id: "harvester",
        body: [
          { type: WORK, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: { getUsedCapacity: () => 0, getCapacity: () => 50 }
      };

      const hauler: any = {
        id: "hauler",
        body: [
          { type: CARRY, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: { getUsedCapacity: () => 0, getCapacity: () => 100 }
      };

      const capable = CreepCapabilityAnalyzer.findCapableCreeps(
        [harvester, hauler],
        { canHarvest: true, workPower: 1 }
      );

      expect(capable).to.have.length(1);
      expect(capable[0]).to.equal(harvester);
    });
  });

  describe("scoreCreepForTask", () => {
    it("should score harvest capability correctly", () => {
      const energySpecialist: any = {
        id: "specialist",
        body: Array(5).fill({ type: WORK, hits: 100 }).concat([
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ]),
        store: { getUsedCapacity: () => 0, getCapacity: () => 50 }
      };

      const basicWorker: any = {
        id: "worker",
        body: [
          { type: WORK, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: { getUsedCapacity: () => 0, getCapacity: () => 50 }
      };

      const specialistScore = CreepCapabilityAnalyzer.scoreCreepForTask(energySpecialist, 'harvest');
      const workerScore = CreepCapabilityAnalyzer.scoreCreepForTask(basicWorker, 'harvest');

      expect(specialistScore).to.be.greaterThan(workerScore);
      expect(specialistScore).to.be.greaterThan(0.8);
    });

    it("should return 0 for incapable creeps", () => {
      const hauler: any = {
        id: "hauler",
        body: [
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: { getUsedCapacity: () => 0, getCapacity: () => 50 }
      };

      const score = CreepCapabilityAnalyzer.scoreCreepForTask(hauler, 'harvest');
      expect(score).to.equal(0);
    });
  });
});