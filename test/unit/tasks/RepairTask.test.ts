import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { RepairTask } from "../../../src/tasks/RepairTask";
import { TaskHelpers, TaskBehaviorSymbol } from "../../../src/tasks/Task";
import { globalsSetup, globalsCleanup } from "../../unit/globals";

use(sinonChai);

// Constants
global.FIND_STRUCTURES = 106 as any;
global.STRUCTURE_CONTAINER = "container" as any;
global.STRUCTURE_WALL = "constructedWall" as any;
global.STRUCTURE_RAMPART = "rampart" as any;
global.OK = 0 as any;
global.ERR_NOT_ENOUGH_RESOURCES = -6 as any;

describe("RepairTask", () => {
  let creep: any;
  let room: any;
  let structure: any;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    globalsSetup();
    sandbox = sinon.createSandbox();
    sandbox.stub(TaskHelpers, "start");
    
    // Setup mock room
    room = {
      name: "W1N1",
      find: sandbox.stub().returns([])
    };
    
    // Setup mock creep
    creep = {
      name: "TestCreep",
      room: room,
      store: { energy: 50 },
      memory: {},
      stopTask: sandbox.stub(),
      moveTo: sandbox.stub().returns(OK),
      repair: sandbox.stub().returns(OK),
      pos: {
        getRangeTo: sandbox.stub()
      }
    };
    
    structure = {
      id: "structure1" as Id<Structure>,
      pos: { x: 25, y: 25 },
      hits: 500,
      hitsMax: 1000,
      structureType: STRUCTURE_CONTAINER
    };
    
    // Setup global Game object
    global.Game = {
      getObjectById: sandbox.stub().returns(null)
    } as any;
  });

  afterEach(() => {
    sandbox.restore();
    globalsCleanup();
  });

  describe("task properties", () => {
    it("should have correct id", () => {
      expect(RepairTask.id).to.equal("RepairTask");
    });

    it("should have correct type", () => {
      expect(RepairTask.type).to.equal(TaskBehaviorSymbol);
    });
  });

  describe("start", () => {
    it("should call TaskHelpers.start with correct parameters", () => {
      const config = { target: structure.id };
      RepairTask.start(creep, config);
      
      expect(TaskHelpers.start).to.have.been.calledOnce;
      expect(TaskHelpers.start).to.have.been.calledWith(creep, RepairTask);
    });
  });

  describe("run", () => {
    it("should use target from config if available", () => {
      const config = { target: structure.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(structure.id).returns(structure);
      
      creep.pos.getRangeTo.returns(2);
      
      RepairTask.run(creep, config);
      
      expect(creep.repair).to.have.been.calledOnce;
      expect(creep.repair).to.have.been.calledWith(structure);
    });

    it("should clear target if it no longer needs repair", () => {
      const healthyStructure = { ...structure, hits: 900, hitsMax: 1000 };
      const config = { target: structure.id, repairThreshold: 0.75 };
      (Game.getObjectById as sinon.SinonStub).withArgs(structure.id).returns(healthyStructure);
      
      RepairTask.run(creep, config);
      
      expect(config.target).to.be.undefined;
      expect(creep.repair).to.not.have.been.called;
    });

    it("should find new target if configured target no longer exists", () => {
      const config = { target: structure.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(structure.id).returns(null);
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_STRUCTURES && opts?.filter) {
          return [structure].filter(opts.filter);
        }
        return [];
      });
      
      creep.pos.getRangeTo.returns(2);
      
      RepairTask.run(creep, config);
      
      expect(room.find).to.have.been.calledWith(FIND_STRUCTURES);
      expect(config.target).to.equal(structure.id);
      expect(creep.repair).to.have.been.calledWith(structure);
    });

    it("should prioritize structures by damage percentage", () => {
      const struct1 = { ...structure, hits: 200, hitsMax: 1000 }; // 20%
      const struct2 = { ...structure, id: "struct2" as Id<Structure>, hits: 100, hitsMax: 1000 }; // 10%
      const struct3 = { ...structure, id: "struct3" as Id<Structure>, hits: 500, hitsMax: 1000 }; // 50%
      
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_STRUCTURES && opts?.filter) {
          return [struct1, struct2, struct3].filter(opts.filter);
        }
        return [];
      });
      creep.pos.getRangeTo.returns(2);
      
      RepairTask.run(creep, {});
      
      expect(creep.repair).to.have.been.calledWith(struct2); // Most damaged
    });

    it("should skip walls and ramparts", () => {
      const wall = { ...structure, id: "wall1" as Id<Structure>, structureType: STRUCTURE_WALL };
      const rampart = { ...structure, id: "rampart1" as Id<Structure>, structureType: STRUCTURE_RAMPART };
      const container = { ...structure, id: "container1" as Id<Structure>, structureType: STRUCTURE_CONTAINER };
      
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_STRUCTURES && opts?.filter) {
          return [wall, rampart, container].filter(opts.filter);
        }
        return [];
      });
      creep.pos.getRangeTo.returns(2);
      
      RepairTask.run(creep, {});
      
      expect(creep.repair).to.have.been.calledWith(container);
    });

    it("should use default repair threshold of 75%", () => {
      const damagedStruct = { ...structure, hits: 700, hitsMax: 1000 }; // 70%
      const healthyStruct = { ...structure, id: "struct2" as Id<Structure>, hits: 800, hitsMax: 1000 }; // 80%
      
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_STRUCTURES && opts?.filter) {
          return [damagedStruct, healthyStruct].filter(opts.filter);
        }
        return [];
      });
      creep.pos.getRangeTo.returns(2);
      
      RepairTask.run(creep, {});
      
      expect(creep.repair).to.have.been.calledWith(damagedStruct);
    });

    it("should use custom repair threshold from config", () => {
      const struct = { ...structure, hits: 850, hitsMax: 1000 }; // 85%
      
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_STRUCTURES && opts?.filter) {
          return [struct].filter(opts.filter);
        }
        return [];
      });
      creep.pos.getRangeTo.returns(2);
      
      RepairTask.run(creep, { repairThreshold: 0.9 }); // 90% threshold
      
      expect(creep.repair).to.have.been.calledWith(struct);
    });

    it("should move to target if not in range", () => {
      const config = { target: structure.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(structure.id).returns(structure);
      
      creep.pos.getRangeTo.returns(5);
      
      RepairTask.run(creep, config);
      
      expect(creep.moveTo).to.have.been.calledOnce;
      expect(creep.moveTo).to.have.been.calledWith(structure, { range: 3 });
      expect(creep.repair).to.not.have.been.called;
    });

    it("should repair when in range", () => {
      const config = { target: structure.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(structure.id).returns(structure);
      
      creep.pos.getRangeTo.returns(3);
      
      RepairTask.run(creep, config);
      
      expect(creep.repair).to.have.been.calledOnce;
      expect(creep.repair).to.have.been.calledWith(structure);
      expect(creep.moveTo).to.not.have.been.called;
    });

    it("should stop task when out of energy", () => {
      const config = { target: structure.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(structure.id).returns(structure);
      
      creep.pos.getRangeTo.returns(3);
      creep.repair.returns(ERR_NOT_ENOUGH_RESOURCES);
      
      RepairTask.run(creep, config);
      
      expect(creep.stopTask).to.have.been.calledOnce;
    });

    it("should clear target when repaired to threshold", () => {
      const config = { target: structure.id, repairThreshold: 0.75 };
      // Structure that needs repair but we'll simulate it being at threshold after repair
      const damagedStructure = { ...structure, hits: 700, hitsMax: 1000 }; // 70% - needs repair
      (Game.getObjectById as sinon.SinonStub).withArgs(structure.id).returns(damagedStructure);
      
      creep.pos.getRangeTo.returns(3);
      
      // Simulate the repair bringing it to threshold
      creep.repair.callsFake(() => {
        damagedStructure.hits = 750; // Now at 75% threshold
        return OK;
      });
      
      RepairTask.run(creep, config);
      
      expect(creep.repair).to.have.been.calledOnce;
      expect(config.target).to.be.undefined;
    });

    it("should stop task when no structures need repair", () => {
      room.find.callsFake((findConstant: any, opts?: any) => {
        if (findConstant === FIND_STRUCTURES && opts?.filter) {
          return [].filter(opts.filter);
        }
        return [];
      });
      
      RepairTask.run(creep, {});
      
      expect(creep.stopTask).to.have.been.calledOnce;
      expect(creep.repair).to.not.have.been.called;
    });
  });

  describe("stop", () => {
    it("should complete without error", () => {
      expect(() => RepairTask.stop(creep)).to.not.throw();
    });
  });
});