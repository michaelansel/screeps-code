import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { BuilderProject } from "../../../src/projects/BuilderProject";
import { ProjectHelpers, ProjectBehaviorSymbol } from "../../../src/projects/Project";
import { HarvestEnergyTask } from "../../../src/tasks/HarvestEnergyTask";
import { BuildTask } from "../../../src/tasks/BuildTask";
import { RepairTask } from "../../../src/tasks/RepairTask";

use(sinonChai);

// Constants
global.FIND_SOURCES = 105 as any;
global.FIND_MY_CONSTRUCTION_SITES = 107 as any;
global.FIND_STRUCTURES = 106 as any;
global.STRUCTURE_CONTAINER = "container" as any;
global.STRUCTURE_WALL = "constructedWall" as any;
global.STRUCTURE_RAMPART = "rampart" as any;
global.RESOURCE_ENERGY = "energy" as any;

describe("BuilderProject", () => {
  let sandbox: sinon.SinonSandbox;
  let creep: any;
  let room: any;
  let source: any;
  let constructionSite: any;
  let structure: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    source = {
      id: "source1" as Id<Source>,
      pos: { x: 10, y: 10 }
    };
    
    constructionSite = {
      id: "site1" as Id<ConstructionSite>,
      pos: { x: 20, y: 20 },
      progress: 50,
      progressTotal: 100,
      structureType: "extension"
    };
    
    structure = {
      id: "struct1" as Id<Structure>,
      pos: { x: 30, y: 30 },
      hits: 500,
      hitsMax: 1000,
      structureType: STRUCTURE_CONTAINER
    };
    
    room = {
      name: "W1N1",
      find: sandbox.stub().returns([])
    };
    
    creep = {
      name: "TestCreep",
      room: room,
      store: { energy: 0 },
      memory: {},
      startTask: sandbox.stub(),
      pos: {
        findClosestByPath: sandbox.stub()
      }
    };
    
    sandbox.stub(ProjectHelpers, "start");
    sandbox.stub(ProjectHelpers, "stop");
    sandbox.stub(console, "log");
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("project properties", () => {
    it("should have correct id", () => {
      expect(BuilderProject.id).to.equal("BuilderProject");
    });

    it("should have correct type", () => {
      expect(BuilderProject.type).to.equal(ProjectBehaviorSymbol);
    });
  });

  describe("start", () => {
    it("should call ProjectHelpers.start with correct parameters", () => {
      const config = { repairThreshold: 0.8 };
      BuilderProject.start(creep, config);
      
      expect(ProjectHelpers.start).to.have.been.calledOnce;
      expect(ProjectHelpers.start).to.have.been.calledWith(creep, BuilderProject, config);
    });
  });

  describe("stop", () => {
    it("should call ProjectHelpers.stop with creep", () => {
      BuilderProject.stop(creep);
      
      expect(ProjectHelpers.stop).to.have.been.calledOnce;
      expect(ProjectHelpers.stop).to.have.been.calledWith(creep);
    });
  });

  describe("run", () => {
    describe("when creep has no energy", () => {
      beforeEach(() => {
        creep.store.energy = 0;
      });

      it("should start HarvestEnergyTask when sources are available", () => {
        room.find.callsFake((findConstant: any) => {
          if (findConstant === FIND_SOURCES) return [source];
          if (findConstant === FIND_MY_CONSTRUCTION_SITES) return [];
          return [];
        });
        creep.pos.findClosestByPath.withArgs(FIND_SOURCES).returns(source);
        
        BuilderProject.run(creep, {});
        
        expect(creep.startTask).to.have.been.calledOnce;
        expect(creep.startTask).to.have.been.calledWith(HarvestEnergyTask, { source: source.id });
      });

      it("should pick closest source", () => {
        const source2 = { ...source, id: "source2" as Id<Source> };
        room.find.callsFake((findConstant: any) => {
          if (findConstant === FIND_SOURCES) return [source, source2];
          if (findConstant === FIND_MY_CONSTRUCTION_SITES) return [];
          return [];
        });
        creep.pos.findClosestByPath.withArgs(FIND_SOURCES).returns(source2);
        
        BuilderProject.run(creep, {});
        
        expect(creep.startTask).to.have.been.calledWith(HarvestEnergyTask, { source: source2.id });
      });

      it("should log message when no sources are available", () => {
        // Ensure creep has no energy
        creep.store[RESOURCE_ENERGY] = 0;
        
        room.find.callsFake((findConstant: any) => {
          if (findConstant === FIND_SOURCES) return [];
          if (findConstant === FIND_MY_CONSTRUCTION_SITES) return [];
          return [];
        });
        
        BuilderProject.run(creep, {});
        
        expect(console.log).to.have.been.calledWith(`${creep.name}: No sources available for energy`);
        expect(creep.startTask).to.not.have.been.called;
      });
    });

    describe("when creep has energy", () => {
      beforeEach(() => {
        creep.store.energy = 50;
      });

      it("should prioritize BuildTask when construction sites exist", () => {
        room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([constructionSite]);
        room.find.withArgs(FIND_STRUCTURES).returns([structure]); // Damaged structure also exists
        
        BuilderProject.run(creep, {});
        
        expect(creep.startTask).to.have.been.calledOnce;
        expect(creep.startTask).to.have.been.calledWith(BuildTask);
      });

      it("should start RepairTask when no construction sites but damaged structures exist", () => {
        room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
        room.find.callsFake((findConstant: any, opts?: any) => {
          if (findConstant === FIND_STRUCTURES && opts?.filter) {
            return [structure].filter(opts.filter);
          }
          return [];
        });
        
        BuilderProject.run(creep, {});
        
        expect(creep.startTask).to.have.been.calledOnce;
        expect(creep.startTask).to.have.been.calledWith(RepairTask, { repairThreshold: undefined });
      });

      it("should pass repair threshold to RepairTask", () => {
        room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
        room.find.callsFake((findConstant: any, opts?: any) => {
          if (findConstant === FIND_STRUCTURES && opts?.filter) {
            return [structure].filter(opts.filter);
          }
          return [];
        });
        
        BuilderProject.run(creep, { repairThreshold: 0.8 });
        
        expect(creep.startTask).to.have.been.calledWith(RepairTask, { repairThreshold: 0.8 });
      });

      it("should filter structures based on repair threshold", () => {
        const healthyStructure = { ...structure, hits: 800, hitsMax: 1000 }; // 80%
        const damagedStructure = { ...structure, id: "struct2" as Id<Structure>, hits: 700, hitsMax: 1000 }; // 70%
        
        room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
        room.find.callsFake((findConstant: any, opts?: any) => {
          if (findConstant === FIND_STRUCTURES && opts?.filter) {
            return [healthyStructure, damagedStructure].filter(opts.filter);
          }
          return [];
        });
        
        BuilderProject.run(creep, { repairThreshold: 0.75 });
        
        // Should find the damaged structure and start repair task
        expect(creep.startTask).to.have.been.calledWith(RepairTask, { repairThreshold: 0.75 });
      });

      it("should skip walls and ramparts when checking for repairs", () => {
        const wall = { ...structure, structureType: STRUCTURE_WALL };
        const rampart = { ...structure, structureType: STRUCTURE_RAMPART };
        
        room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
        room.find.callsFake((findConstant: any, opts?: any) => {
          if (findConstant === FIND_STRUCTURES && opts?.filter) {
            return [wall, rampart].filter(opts.filter);
          }
          return [];
        });
        creep.pos.findClosestByPath.withArgs(FIND_SOURCES).returns(source);
        
        BuilderProject.run(creep, {});
        
        // Should not find any valid repair targets, so harvest instead
        expect(creep.pos.findClosestByPath).to.have.been.calledWith(FIND_SOURCES);
      });

      it("should harvest energy when nothing to build or repair", () => {
        room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
        room.find.withArgs(FIND_STRUCTURES).returns([]); // No damaged structures
        creep.pos.findClosestByPath.withArgs(FIND_SOURCES).returns(source);
        
        BuilderProject.run(creep, {});
        
        expect(creep.startTask).to.have.been.calledOnce;
        expect(creep.startTask).to.have.been.calledWith(HarvestEnergyTask, { source: source.id });
      });

      it("should do nothing when no work available and no sources", () => {
        room.find.withArgs(FIND_MY_CONSTRUCTION_SITES).returns([]);
        room.find.withArgs(FIND_STRUCTURES).returns([]);
        creep.pos.findClosestByPath.withArgs(FIND_SOURCES).returns(null);
        
        BuilderProject.run(creep, {});
        
        expect(creep.startTask).to.not.have.been.called;
      });
    });
  });
});