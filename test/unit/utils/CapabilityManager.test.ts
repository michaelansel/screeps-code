import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { CapabilityManager } from "../../../src/utils/CapabilityManager";

use(sinonChai);

// Global constants
global.FIND_SOURCES = 105 as any;
global.FIND_MY_CONSTRUCTION_SITES = 107 as any;
global.FIND_STRUCTURES = 106 as any;
global.FIND_MY_SPAWNS = 108 as any;
global.FIND_MY_STRUCTURES = 109 as any;
global.FIND_MY_CREEPS = 102 as any;
global.STRUCTURE_CONTAINER = "container" as any;
global.STRUCTURE_WALL = "constructedWall" as any;
global.STRUCTURE_RAMPART = "rampart" as any;
global.STRUCTURE_EXTENSION = "extension" as any;
global.RESOURCE_ENERGY = "energy" as any;
global.CARRY_CAPACITY = 50;

global.WORK = "work" as any;
global.CARRY = "carry" as any;
global.MOVE = "move" as any;
global.BODYPART_COST = {
  work: 100,
  carry: 50,
  move: 50
} as any;

describe("CapabilityManager", () => {
  let sandbox: sinon.SinonSandbox;
  let room: any;
  let controller: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    controller = {
      id: "controller1" as Id<StructureController>,
      my: true,
      level: 3
    };
    
    room = {
      name: "W1N1",
      controller: controller,
      find: sandbox.stub()
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("analyzeRoomNeeds", () => {
    it("should calculate harvest needs based on sources", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}, {}]); // 2 sources
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const needs = CapabilityManager.analyzeRoomNeeds(room);

      expect(needs.harvest.required).to.equal(10); // 2 sources * 5 WORK each
      expect(needs.harvest.priority).to.equal(10); // Highest priority
    });

    it("should calculate build needs based on construction sites", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([{}, {}, {}]); // 3 sites
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const needs = CapabilityManager.analyzeRoomNeeds(room);

      expect(needs.build.required).to.equal(6); // 3 sites * 2 WORK each
      expect(needs.build.priority).to.be.at.least(5); // High priority for many sites
    });

    it("should calculate haul needs when containers exist", () => {
      const container = { structureType: STRUCTURE_CONTAINER };
      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([container]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const needs = CapabilityManager.analyzeRoomNeeds(room);

      expect(needs.haul.required).to.equal(2); // 1 source * 2 CARRY per source
      expect(needs.haul.priority).to.equal(8);
    });

    it("should set zero haul needs without containers", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const needs = CapabilityManager.analyzeRoomNeeds(room);

      expect(needs.haul.required).to.equal(0);
      expect(needs.haul.priority).to.equal(0);
    });

    it("should calculate upgrade needs for owned controller", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const needs = CapabilityManager.analyzeRoomNeeds(room);

      expect(needs.upgrade.required).to.equal(6); // Base upgrade need
      expect(needs.upgrade.priority).to.equal(4); // Medium priority
    });

    it("should set zero upgrade needs for unowned controller", () => {
      controller.my = false;
      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const needs = CapabilityManager.analyzeRoomNeeds(room);

      expect(needs.upgrade.required).to.equal(0);
    });

    it("should account for existing creep capabilities", () => {
      const mockCreep = {
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

      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([mockCreep]); // FIND_MY_CREEPS

      const needs = CapabilityManager.analyzeRoomNeeds(room);

      expect(needs.harvest.current).to.be.greaterThan(0);
      expect(needs.build.current).to.be.greaterThan(0);
    });
  });

  describe("getNextSpawnRequest", () => {
    it("should return null when all needs are met", () => {
      // Mock that all needs are satisfied
      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      const powerfulCreep = {
        body: Array(30).fill({ type: WORK, hits: 100 }).concat(Array(10).fill({ type: CARRY, hits: 100 })), // Massive creep to satisfy all needs
        store: { getUsedCapacity: () => 0, getCapacity: () => 500 }
      };
      room.find.withArgs(102).returns([powerfulCreep]); // FIND_MY_CREEPS
      room.find.withArgs(FIND_MY_SPAWNS).returns([
        { store: { [RESOURCE_ENERGY]: 300 } }
      ]);
      room.find.withArgs(FIND_MY_STRUCTURES).returns([]);

      const request = CapabilityManager.getNextSpawnRequest(room);

      expect(request).to.be.null;
    });

    it("should return emergency worker for zero harvest capability", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS
      room.find.withArgs(FIND_MY_SPAWNS).returns([
        { store: { [RESOURCE_ENERGY]: 200 } }
      ]);
      room.find.withArgs(FIND_MY_STRUCTURES).returns([]);

      const request = CapabilityManager.getNextSpawnRequest(room);

      expect(request).to.not.be.null;
      expect(request!.priority).to.equal(100); // Emergency priority
      expect(request!.memory.purpose).to.equal("emergency");
    });

    it("should prioritize harvest capability when insufficient", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}, {}]); // 2 sources, need 10 WORK
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      const weakCreep = {
        body: [{ type: WORK, hits: 100 }], // Only 1 WORK, need 10
        store: { getUsedCapacity: () => 0, getCapacity: () => 50 }
      };
      room.find.withArgs(102).returns([weakCreep]); // FIND_MY_CREEPS
      room.find.withArgs(FIND_MY_SPAWNS).returns([
        { store: { [RESOURCE_ENERGY]: 600 } }
      ]);
      room.find.withArgs(FIND_MY_STRUCTURES).returns([]);

      const request = CapabilityManager.getNextSpawnRequest(room);

      expect(request).to.not.be.null;
      expect(request!.memory.capabilities?.primary).to.equal("harvest");
    });
  });

  describe("assignProjectToCreep", () => {
    it("should assign harvest project to capable harvester", () => {
      const harvester: any = {
        room: room,
        body: Array(5).fill({ type: WORK, hits: 100 }).concat([
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ]),
        store: { getUsedCapacity: () => 0, getCapacity: () => 50 }
      };

      room.find.withArgs(FIND_SOURCES).returns([{}, {}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const project = CapabilityManager.assignProjectToCreep(harvester);

      expect(project).to.equal('HarvestEnergyProject');
    });

    it("should assign haul project to transport specialist", () => {
      const hauler: any = {
        room: room,
        body: [
          { type: CARRY, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: { getUsedCapacity: () => 0, getCapacity: () => 150 }
      };

      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([
        { structureType: STRUCTURE_CONTAINER }
      ]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const project = CapabilityManager.assignProjectToCreep(hauler);

      expect(project).to.equal('HaulerProject');
    });

    it("should fall back to harvest for general worker", () => {
      const worker: any = {
        room: room,
        body: [
          { type: WORK, hits: 100 },
          { type: CARRY, hits: 100 },
          { type: MOVE, hits: 100 }
        ],
        store: { getUsedCapacity: () => 0, getCapacity: () => 50 }
      };

      room.find.withArgs(FIND_SOURCES).returns([{}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      room.find.withArgs(102).returns([]); // FIND_MY_CREEPS

      const project = CapabilityManager.assignProjectToCreep(worker);

      expect(project).to.equal('HarvestEnergyProject');
    });
  });
});