import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { BuildTask } from "../../../src/tasks/BuildTask";
import { TaskHelpers, TaskBehaviorSymbol } from "../../../src/tasks/Task";

use(sinonChai);

// Constants
global.FIND_MY_CONSTRUCTION_SITES = 107 as any;
global.STRUCTURE_EXTENSION = "extension" as any;
global.OK = 0 as any;
global.ERR_NOT_ENOUGH_RESOURCES = -6 as any;
global.ERR_INVALID_TARGET = -7 as any;

describe("BuildTask", () => {
  let creep: any;
  let room: any;
  let constructionSite: any;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(TaskHelpers, "start");
    
    // Setup mock room
    room = {
      name: "W1N1",
      find: sandbox.stub()
    };
    
    // Setup mock creep
    creep = {
      name: "TestCreep",
      room: room,
      store: { energy: 50 },
      memory: {},
      stopTask: sandbox.stub(),
      moveTo: sandbox.stub().returns(OK),
      build: sandbox.stub().returns(OK),
      pos: {
        getRangeTo: sandbox.stub()
      }
    };
    
    constructionSite = {
      id: "site1" as Id<ConstructionSite>,
      pos: { x: 25, y: 25 },
      progress: 50,
      progressTotal: 100,
      structureType: STRUCTURE_EXTENSION
    };
    
    // Setup global Game object
    global.Game = {
      getObjectById: sandbox.stub().returns(null)
    } as any;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("task properties", () => {
    it("should have correct id", () => {
      expect(BuildTask.id).to.equal("BuildTask");
    });

    it("should have correct type", () => {
      expect(BuildTask.type).to.equal(TaskBehaviorSymbol);
    });
  });

  describe("start", () => {
    it("should call TaskHelpers.start with correct parameters", () => {
      const config = { target: constructionSite.id };
      BuildTask.start(creep, config);
      
      expect(TaskHelpers.start).to.have.been.calledOnce;
      expect(TaskHelpers.start).to.have.been.calledWith(creep, BuildTask);
    });
  });

  describe("run", () => {
    it("should use target from config if available", () => {
      const config = { target: constructionSite.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(constructionSite.id).returns(constructionSite);
      
      creep.pos.getRangeTo.returns(2);
      
      BuildTask.run(creep, config);
      
      expect(creep.build).to.have.been.calledOnce;
      expect(creep.build).to.have.been.calledWith(constructionSite);
    });

    it("should find new target if configured target no longer exists", () => {
      const config = { target: constructionSite.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(constructionSite.id).returns(null);
      room.find.returns([constructionSite]);
      
      creep.pos.getRangeTo.returns(2);
      
      BuildTask.run(creep, config);
      
      expect(room.find).to.have.been.calledWith(FIND_MY_CONSTRUCTION_SITES);
      expect(config.target).to.equal(constructionSite.id);
      expect(creep.build).to.have.been.calledWith(constructionSite);
    });

    it("should prioritize construction sites by progress", () => {
      const site1 = { ...constructionSite, progress: 20 };
      const site2 = { ...constructionSite, id: "site2" as Id<ConstructionSite>, progress: 80 };
      const site3 = { ...constructionSite, id: "site3" as Id<ConstructionSite>, progress: 50 };
      
      room.find.returns([site1, site2, site3]);
      creep.pos.getRangeTo.returns(2);
      
      BuildTask.run(creep, {});
      
      expect(creep.build).to.have.been.calledWith(site2); // Highest progress
    });

    it("should move to target if not in range", () => {
      const config = { target: constructionSite.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(constructionSite.id).returns(constructionSite);
      
      creep.pos.getRangeTo.returns(5);
      
      BuildTask.run(creep, config);
      
      expect(creep.moveTo).to.have.been.calledOnce;
      expect(creep.moveTo).to.have.been.calledWith(constructionSite, { range: 3 });
      expect(creep.build).to.not.have.been.called;
    });

    it("should build when in range", () => {
      const config = { target: constructionSite.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(constructionSite.id).returns(constructionSite);
      
      creep.pos.getRangeTo.returns(3);
      
      BuildTask.run(creep, config);
      
      expect(creep.build).to.have.been.calledOnce;
      expect(creep.build).to.have.been.calledWith(constructionSite);
      expect(creep.moveTo).to.not.have.been.called;
    });

    it("should stop task when out of energy", () => {
      const config = { target: constructionSite.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(constructionSite.id).returns(constructionSite);
      
      creep.pos.getRangeTo.returns(3);
      creep.build.returns(ERR_NOT_ENOUGH_RESOURCES);
      
      BuildTask.run(creep, config);
      
      expect(creep.stopTask).to.have.been.calledOnce;
    });

    it("should clear target on invalid target error", () => {
      const config = { target: constructionSite.id };
      (Game.getObjectById as sinon.SinonStub).withArgs(constructionSite.id).returns(constructionSite);
      
      creep.pos.getRangeTo.returns(3);
      creep.build.returns(ERR_INVALID_TARGET);
      
      BuildTask.run(creep, config);
      
      expect(config.target).to.be.undefined;
    });

    it("should stop task when no construction sites found", () => {
      room.find.returns([]);
      
      BuildTask.run(creep, {});
      
      expect(creep.stopTask).to.have.been.calledOnce;
      expect(creep.build).to.not.have.been.called;
    });
  });

  describe("stop", () => {
    it("should complete without error", () => {
      expect(() => BuildTask.stop(creep)).to.not.throw();
    });
  });
});