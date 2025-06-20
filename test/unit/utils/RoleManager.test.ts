import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { RoleManager } from "../../../src/utils/RoleManager";
import { HarvestEnergyProject } from "../../../src/projects/HarvestEnergyProject";
import { UpgradeControllerProject } from "../../../src/projects/UpgradeControllerProject";
import { BuilderProject } from "../../../src/projects/BuilderProject";

use(sinonChai);

// Constants
global.FIND_SOURCES = 105 as any;
global.FIND_MY_CONSTRUCTION_SITES = 107 as any;
global.FIND_STRUCTURES = 106 as any;
global.STRUCTURE_CONTAINER = "container" as any;
global.STRUCTURE_WALL = "constructedWall" as any;
global.STRUCTURE_RAMPART = "rampart" as any;

describe("RoleManager", () => {
  let sandbox: sinon.SinonSandbox;
  let room: any;
  let controller: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    controller = {
      id: "controller1" as Id<StructureController>,
      my: true,
      level: 1
    };
    
    room = {
      name: "W1N1",
      controller: controller,
      find: sandbox.stub()
    };
    
    // Setup global Game object
    global.Game = {
      creeps: {}
    } as any;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getDesiredQuotas", () => {
    it("should return base quotas for room with no controller", () => {
      room.controller = undefined;
      room.find.withArgs(FIND_SOURCES).returns([{}, {}]); // 2 sources
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas).to.deep.equal({
        harvesters: 2,
        upgraders: 0,
        builders: 0
      });
    });

    it("should scale harvesters with sources", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}, {}, {}]); // 3 sources
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.harvesters).to.equal(3);
    });

    it("should always have minimum 2 harvesters", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}]); // 1 source
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.harvesters).to.equal(2);
    });

    it("should add upgraders when controller is owned", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}, {}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.upgraders).to.equal(3);
    });

    it("should not add upgraders for unowned controller", () => {
      controller.my = false;
      room.find.withArgs(FIND_SOURCES).returns([{}, {}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.upgraders).to.equal(0);
    });

    it("should add 1 builder at low RCL when construction sites exist", () => {
      controller.level = 2;
      room.find.withArgs(FIND_SOURCES).returns([{}, {}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([{}]); // 1 site
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_SOURCES) return [{}, {}];
        if (findConstant === FIND_MY_CONSTRUCTION_SITES) return [{}];
        if (findConstant === FIND_STRUCTURES && opts?.filter) return [].filter(opts.filter);
        return [];
      });
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.builders).to.equal(1);
    });

    it("should add 2 builders at high RCL when construction sites exist", () => {
      controller.level = 4;
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_SOURCES) return [{}, {}];
        if (findConstant === FIND_MY_CONSTRUCTION_SITES) return [{}];
        if (findConstant === FIND_STRUCTURES && opts?.filter) return [].filter(opts.filter);
        return [];
      });
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.builders).to.equal(2);
    });

    it("should add builders when damaged structures exist", () => {
      const damagedStructure = {
        structureType: STRUCTURE_CONTAINER,
        hits: 500,
        hitsMax: 1000
      };
      
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_SOURCES) return [{}, {}];
        if (findConstant === FIND_MY_CONSTRUCTION_SITES) return [];
        if (findConstant === FIND_STRUCTURES && opts?.filter) return [damagedStructure].filter(opts.filter);
        return [];
      });
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.builders).to.equal(1);
    });

    it("should not count walls and ramparts for builder quota", () => {
      const wall = {
        structureType: STRUCTURE_WALL,
        hits: 100,
        hitsMax: 1000
      };
      const rampart = {
        structureType: STRUCTURE_RAMPART,
        hits: 100,
        hitsMax: 1000
      };
      
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_SOURCES) return [{}, {}];
        if (findConstant === FIND_MY_CONSTRUCTION_SITES) return [];
        if (findConstant === FIND_STRUCTURES && opts?.filter) return [wall, rampart].filter(opts.filter);
        return [];
      });
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.builders).to.equal(0);
    });
  });

  describe("countCreepsByRole", () => {
    it("should count harvesters correctly", () => {
      const harvester1 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      const harvester2 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      
      Game.creeps = {
        "Harvester1": harvester1,
        "Harvester2": harvester2
      };
      
      const counts = RoleManager.countCreepsByRole(room);
      
      expect(counts.harvesters).to.equal(2);
      expect(counts.upgraders).to.equal(0);
      expect(counts.builders).to.equal(0);
    });

    it("should count upgraders correctly", () => {
      const upgrader = {
        room: room,
        memory: { project: { id: UpgradeControllerProject.id } }
      };
      
      Game.creeps = {
        "Upgrader1": upgrader
      };
      
      const counts = RoleManager.countCreepsByRole(room);
      
      expect(counts.upgraders).to.equal(1);
    });

    it("should count builders correctly", () => {
      const builder = {
        room: room,
        memory: { project: { id: BuilderProject.id } }
      };
      
      Game.creeps = {
        "Builder1": builder
      };
      
      const counts = RoleManager.countCreepsByRole(room);
      
      expect(counts.builders).to.equal(1);
    });

    it("should only count creeps in the specified room", () => {
      const otherRoom = {
        name: "W2N1"
      };
      const creepInOtherRoom = {
        room: otherRoom,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      const creepInThisRoom = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      
      Game.creeps = {
        "Harvester1": creepInOtherRoom,
        "Harvester2": creepInThisRoom
      };
      
      const counts = RoleManager.countCreepsByRole(room);
      
      expect(counts.harvesters).to.equal(1);
    });

    it("should handle creeps with no project", () => {
      const creepNoProject = {
        room: room,
        memory: {}
      };
      
      Game.creeps = {
        "Worker1": creepNoProject
      };
      
      const counts = RoleManager.countCreepsByRole(room);
      
      expect(counts.harvesters).to.equal(0);
      expect(counts.upgraders).to.equal(0);
      expect(counts.builders).to.equal(0);
    });
  });

  describe("getNextRoleToSpawn", () => {
    beforeEach(() => {
      // Setup default room state
      room.find.withArgs(FIND_SOURCES).returns([{}, {}]);
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      // No existing creeps by default
      Game.creeps = {};
    });

    it("should prioritize harvesters first", () => {
      const result = RoleManager.getNextRoleToSpawn(room);
      
      expect(result).to.deep.equal({
        projectId: HarvestEnergyProject.id,
        roleName: "Harvester"
      });
    });

    it("should spawn builders second when construction sites exist", () => {
      // Already have enough harvesters
      const harvester1 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      const harvester2 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      Game.creeps = {
        "Harvester1": harvester1,
        "Harvester2": harvester2
      };
      
      // Add construction site
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([{}]);
      
      const result = RoleManager.getNextRoleToSpawn(room);
      
      expect(result).to.deep.equal({
        projectId: BuilderProject.id,
        roleName: "Builder"
      });
    });

    it("should spawn upgraders third", () => {
      // Already have enough harvesters and builders
      const harvester1 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      const harvester2 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      const builder = {
        room: room,
        memory: { project: { id: BuilderProject.id } }
      };
      Game.creeps = {
        "Harvester1": harvester1,
        "Harvester2": harvester2,
        "Builder1": builder
      };
      
      // Add construction site so builder quota is 1
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([{}]);
      
      const result = RoleManager.getNextRoleToSpawn(room);
      
      expect(result).to.deep.equal({
        projectId: UpgradeControllerProject.id,
        config: { controller: controller.id },
        roleName: "Upgrader"
      });
    });

    it("should return null when all quotas are met", () => {
      // Setup creeps to meet all quotas
      const harvester1 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      const harvester2 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      const upgrader1 = {
        room: room,
        memory: { project: { id: UpgradeControllerProject.id } }
      };
      const upgrader2 = {
        room: room,
        memory: { project: { id: UpgradeControllerProject.id } }
      };
      const upgrader3 = {
        room: room,
        memory: { project: { id: UpgradeControllerProject.id } }
      };
      
      Game.creeps = {
        "Harvester1": harvester1,
        "Harvester2": harvester2,
        "Upgrader1": upgrader1,
        "Upgrader2": upgrader2,
        "Upgrader3": upgrader3
      };
      
      const result = RoleManager.getNextRoleToSpawn(room);
      
      expect(result).to.be.null;
    });

    it("should not spawn upgraders without controller", () => {
      room.controller = undefined;
      
      // Have harvesters
      const harvester1 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      const harvester2 = {
        room: room,
        memory: { project: { id: HarvestEnergyProject.id } }
      };
      Game.creeps = {
        "Harvester1": harvester1,
        "Harvester2": harvester2
      };
      
      const result = RoleManager.getNextRoleToSpawn(room);
      
      expect(result).to.be.null;
    });
  });

  describe("getBodyPartsForRole", () => {
    // Constants
    global.WORK = "work" as any;
    global.CARRY = "carry" as any;
    global.MOVE = "move" as any;
    global.BODYPART_COST = {
      work: 100,
      carry: 50,
      move: 50
    } as any;

    it("should return basic body for any role with sufficient energy", () => {
      const body = RoleManager.getBodyPartsForRole(HarvestEnergyProject.id, 300);
      
      expect(body).to.deep.equal([WORK, CARRY, MOVE]);
    });

    it("should return empty array when energy is insufficient", () => {
      const body = RoleManager.getBodyPartsForRole(HarvestEnergyProject.id, 100);
      
      expect(body).to.deep.equal([]);
    });

    it("should handle different role IDs the same way for now", () => {
      const harvesterBody = RoleManager.getBodyPartsForRole(HarvestEnergyProject.id, 300);
      const builderBody = RoleManager.getBodyPartsForRole(BuilderProject.id, 300);
      const upgraderBody = RoleManager.getBodyPartsForRole(UpgradeControllerProject.id, 300);
      
      expect(harvesterBody).to.deep.equal(builderBody);
      expect(builderBody).to.deep.equal(upgraderBody);
    });
  });
});