import { expect, use } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { HaulerProject } from "../../../src/projects/HaulerProject";
import { ProjectHelpers } from "../../../src/projects/Project";
import { globalsSetup, globalsCleanup } from "../globals";

use(sinonChai);

describe("HaulerProject", () => {
  let sandbox: sinon.SinonSandbox;
  let creep: any;
  let room: any;

  beforeEach(() => {
    globalsSetup();
    sandbox = sinon.createSandbox();
    
    // Mock ProjectHelpers
    sandbox.stub(ProjectHelpers, "start");
    sandbox.stub(ProjectHelpers, "stop");

    // Setup mock room
    room = {
      name: "W1N1",
      find: sandbox.stub().returns([])
    };

    // Setup mock creep
    creep = {
      name: "TestHauler",
      room: room,
      store: {
        getUsedCapacity: sandbox.stub().returns(0)
      },
      memory: {},
      startTask: sandbox.stub()
    };
  });

  afterEach(() => {
    sandbox.restore();
    globalsCleanup();
  });

  describe("project properties", () => {
    it("should have correct id", () => {
      expect(HaulerProject.id).to.equal("HaulerProject");
    });

    it("should have correct type", () => {
      expect(HaulerProject.type).to.be.a("symbol");
    });
  });

  describe("start", () => {
    it("should call ProjectHelpers.start with correct parameters", () => {
      const config = { targetRoom: "W1N2" };
      
      HaulerProject.start(creep, config);
      
      expect(ProjectHelpers.start).to.have.been.calledWith(creep, HaulerProject, config);
    });
  });

  describe("stop", () => {
    it("should call ProjectHelpers.stop with creep", () => {
      HaulerProject.stop(creep);
      
      expect(ProjectHelpers.stop).to.have.been.calledWith(creep);
    });
  });

  describe("run", () => {
    it("should use creep's room when no targetRoom specified", () => {
      HaulerProject.run(creep, {});
      
      // Should not throw and should use creep.room
      expect(creep.store.getUsedCapacity).to.have.been.called;
    });

    it("should use targetRoom when specified", () => {
      const targetRoom = {
        name: "W1N2",
        find: sandbox.stub().returns([])
      };
      (global as any).Game = {
        rooms: {
          "W1N2": targetRoom
        }
      };

      HaulerProject.run(creep, { targetRoom: "W1N2" });
      
      // Should use the target room for finding structures
      expect(targetRoom.find).to.have.been.called;
    });

    it("should handle empty creep without energy", () => {
      creep.store.getUsedCapacity.returns(0);
      
      HaulerProject.run(creep, {});
      
      // Should try to find energy sources
      expect(room.find).to.have.been.called;
    });

    it("should handle creep with energy", () => {
      creep.store.getUsedCapacity.returns(100);
      
      HaulerProject.run(creep, {});
      
      // Should start deposit task
      expect(creep.startTask).to.have.been.called;
    });
  });
});