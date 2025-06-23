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
global.FIND_MY_SPAWNS = 108 as any;
global.FIND_MY_STRUCTURES = 109 as any;
global.STRUCTURE_CONTAINER = "container" as any;
global.STRUCTURE_WALL = "constructedWall" as any;
global.STRUCTURE_RAMPART = "rampart" as any;
global.STRUCTURE_EXTENSION = "extension" as any;
global.RESOURCE_ENERGY = "energy" as any;

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
        builders: 0,
        haulers: 0
      });
    });

    it("should scale harvesters with sources", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}, {}, {}]); // 3 sources
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.harvesters).to.equal(3);
    });

    it("should have exactly 1 harvester per source", () => {
      room.find.withArgs(FIND_SOURCES).returns([{}]); // 1 source
      room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
      room.find.withArgs(FIND_STRUCTURES).returns([]);
      
      const quotas = RoleManager.getDesiredQuotas(room);
      
      expect(quotas.harvesters).to.equal(1);
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

  describe("getRoomAvailableEnergy", () => {
    beforeEach(() => {
      // Constants
      global.WORK = "work" as any;
      global.CARRY = "carry" as any;
      global.MOVE = "move" as any;
      global.BODYPART_COST = {
        work: 100,
        carry: 50,
        move: 50
      } as any;
    });

    it("should calculate energy from spawn only", () => {
      const spawn = {
        store: {
          [RESOURCE_ENERGY]: 300,
          getCapacity: sinon.stub().returns(300)
        }
      };
      
      room.find.withArgs(FIND_MY_SPAWNS).returns([spawn]);
      room.find.withArgs(FIND_MY_STRUCTURES).returns([]);
      
      const energy = RoleManager.getRoomAvailableEnergy(room);
      
      expect(energy).to.equal(300);
    });

    it("should calculate energy from spawn and extensions", () => {
      const spawn = {
        store: {
          [RESOURCE_ENERGY]: 300,
          getCapacity: sinon.stub().returns(300)
        }
      };
      const extension1 = {
        store: {
          [RESOURCE_ENERGY]: 50,
          getCapacity: sinon.stub().returns(50)
        },
        structureType: STRUCTURE_EXTENSION
      };
      const extension2 = {
        store: {
          [RESOURCE_ENERGY]: 50,
          getCapacity: sinon.stub().returns(50)
        },
        structureType: STRUCTURE_EXTENSION
      };
      
      room.find.withArgs(FIND_MY_SPAWNS).returns([spawn]);
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_MY_SPAWNS) return [spawn];
        if (findConstant === FIND_MY_STRUCTURES && opts?.filter) {
          // Handle object filter for structure type
          if (opts.filter.structureType === STRUCTURE_EXTENSION) {
            return [extension1, extension2];
          }
        }
        return [];
      });
      
      const energy = RoleManager.getRoomAvailableEnergy(room);
      
      expect(energy).to.equal(400); // 300 + 50 + 50
    });

    it("should handle room with no energy structures", () => {
      room.find.withArgs(FIND_MY_SPAWNS).returns([]);
      room.find.withArgs(FIND_MY_STRUCTURES).returns([]);
      
      const energy = RoleManager.getRoomAvailableEnergy(room);
      
      expect(energy).to.equal(0);
    });
  });

  describe("getRoomEnergyCapacity", () => {
    it("should calculate total capacity from spawn and extensions", () => {
      const spawn = {
        store: {
          [RESOURCE_ENERGY]: 100,
          getCapacity: sinon.stub().returns(300)
        }
      };
      const extension1 = {
        store: {
          [RESOURCE_ENERGY]: 30,
          getCapacity: sinon.stub().returns(50)
        },
        structureType: STRUCTURE_EXTENSION
      };
      const extension2 = {
        store: {
          [RESOURCE_ENERGY]: 40,
          getCapacity: sinon.stub().returns(50)
        },
        structureType: STRUCTURE_EXTENSION
      };
      
      room.find.withArgs(FIND_MY_SPAWNS).returns([spawn]);
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_MY_SPAWNS) return [spawn];
        if (findConstant === FIND_MY_STRUCTURES && opts?.filter) {
          // Handle object filter for structure type
          if (opts.filter.structureType === STRUCTURE_EXTENSION) {
            return [extension1, extension2];
          }
        }
        return [];
      });
      
      const capacity = RoleManager.getRoomEnergyCapacity(room);
      
      expect(capacity).to.equal(400); // 300 + 50 + 50
    });
  });

  describe("getBodyPartsForRole", () => {
    beforeEach(() => {
      // Constants
      global.WORK = "work" as any;
      global.CARRY = "carry" as any;
      global.MOVE = "move" as any;
      global.BODYPART_COST = {
        work: 100,
        carry: 50,
        move: 50
      } as any;
    });

    it("should return empty array when energy is insufficient", () => {
      const body = RoleManager.getBodyPartsForRole(HarvestEnergyProject.id, 150);
      
      expect(body).to.deep.equal([]);
    });

    describe("Harvester bodies", () => {
      it("should create basic harvester with minimum energy", () => {
        const body = RoleManager.getBodyPartsForRole(HarvestEnergyProject.id, 200);
        
        expect(body).to.deep.equal([WORK, CARRY, MOVE]);
      });

      it("should scale harvester with more WORK parts", () => {
        const body = RoleManager.getBodyPartsForRole(HarvestEnergyProject.id, 500);
        
        expect(body).to.include.members([WORK, CARRY, MOVE]);
        expect(body.filter(part => part === WORK).length).to.be.greaterThan(1);
        expect(body.filter(part => part === WORK).length).to.be.at.most(5); // Source limit
      });

      it("should limit WORK parts to 5 for harvesters", () => {
        const body = RoleManager.getBodyPartsForRole(HarvestEnergyProject.id, 2000);
        
        expect(body.filter(part => part === WORK).length).to.equal(5);
      });
    });

    describe("Builder bodies", () => {
      it("should create basic builder with minimum energy", () => {
        const body = RoleManager.getBodyPartsForRole(BuilderProject.id, 200);
        
        expect(body).to.deep.equal([WORK, CARRY, MOVE]);
      });

      it("should create balanced builder body with more energy", () => {
        const body = RoleManager.getBodyPartsForRole(BuilderProject.id, 550);
        
        expect(body).to.include.members([WORK, CARRY, MOVE]);
        // Should have more CARRY than WORK for building
        expect(body.filter(part => part === CARRY).length).to.be.greaterThan(body.filter(part => part === WORK).length);
      });
    });

    describe("Upgrader bodies", () => {
      it("should create basic upgrader with minimum energy", () => {
        const body = RoleManager.getBodyPartsForRole(UpgradeControllerProject.id, 200);
        
        expect(body).to.deep.equal([WORK, CARRY, MOVE]);
      });

      it("should prioritize WORK parts for upgraders", () => {
        const body = RoleManager.getBodyPartsForRole(UpgradeControllerProject.id, 500);
        
        expect(body).to.include.members([WORK, CARRY, MOVE]);
        expect(body.filter(part => part === WORK).length).to.be.greaterThan(1);
      });
    });

    it("should respect maximum body part limit of 50", () => {
      const body = RoleManager.getBodyPartsForRole(HarvestEnergyProject.id, 10000);
      
      expect(body.length).to.be.at.most(50);
    });

    it("should handle unknown role IDs with fallback", () => {
      const body = RoleManager.getBodyPartsForRole("UnknownProject", 300);
      
      expect(body).to.deep.equal([WORK, CARRY, MOVE]);
    });
  });
});