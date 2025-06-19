import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { UpgradeControllerProject, UpgradeControllerProjectConfig, UpgradeControllerProjectId } from "../../../src/projects/UpgradeControllerProject";
import { ProjectBehaviorSymbol, ProjectConfigSymbol } from "../../../src/projects/Project";
import { HarvestEnergyTask } from "../../../src/tasks/HarvestEnergyTask";
import { UpgradeControllerTask } from "../../../src/tasks/UpgradeControllerTask";

use(sinonChai);

describe("UpgradeControllerProject", () => {
  let mockCreep: any;
  let mockController: any;
  let mockRoom: any;
  let mockSource: any;
  let config: UpgradeControllerProjectConfig;

  beforeEach(() => {
    mockController = {
      id: "controller1" as Id<StructureController>
    };

    mockSource = {
      id: "source1" as Id<Source>,
      pos: { x: 10, y: 10 }
    };

    mockRoom = {
      name: "W1N1",
      find: sinon.stub().returns([mockSource])
    };

    mockCreep = {
      name: "testCreep",
      room: { name: "W1N1" },
      store: { [RESOURCE_ENERGY]: 0 },
      startTask: sinon.stub()
    };

    config = {
      type: ProjectConfigSymbol,
      id: UpgradeControllerProjectId,
      controller: mockController.id
    };

    const mockGame = {
      rooms: { "W1N1": mockRoom },
      getObjectById: sinon.stub().withArgs(mockController.id).returns(mockController)
    };
    global.Game = mockGame as any;
    global.FIND_SOURCES = 105;
    global.RESOURCE_ENERGY = "energy" as ResourceConstant;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("run", () => {
    it("should start HarvestEnergyTask when creep has no energy", () => {
      mockCreep.store[RESOURCE_ENERGY] = 0;

      UpgradeControllerProject.run(mockCreep, config);

      expect(mockCreep.startTask).to.have.been.calledWith(HarvestEnergyTask, { source: mockSource.id });
    });

    it("should start UpgradeControllerTask when creep has energy", () => {
      mockCreep.store[RESOURCE_ENERGY] = 50;

      UpgradeControllerProject.run(mockCreep, config);

      expect(mockCreep.startTask).to.have.been.calledWith(UpgradeControllerTask, { controller: config.controller });
    });

    it("should log message when no sources are available", () => {
      mockCreep.store[RESOURCE_ENERGY] = 0;
      mockRoom.find.returns([]);
      const consoleSpy = sinon.stub(console, "log");

      UpgradeControllerProject.run(mockCreep, config);

      expect(mockCreep.startTask).to.not.have.been.called;
      expect(consoleSpy).to.have.been.calledWith(`${mockCreep.name}: No sources available for energy`);
    });

    it("should log message when controller is not found", () => {
      mockCreep.store[RESOURCE_ENERGY] = 50;
      const mockGame = {
        rooms: { "W1N1": mockRoom },
        getObjectById: sinon.stub().withArgs(mockController.id).returns(null)
      };
      global.Game = mockGame as any;
      const consoleSpy = sinon.stub(console, "log");

      UpgradeControllerProject.run(mockCreep, config);

      expect(mockCreep.startTask).to.not.have.been.called;
      expect(consoleSpy).to.have.been.calledWith(`${mockCreep.name}: Controller ${config.controller} not found`);
    });

    it("should find sources in creep's room", () => {
      mockCreep.store[RESOURCE_ENERGY] = 0;

      UpgradeControllerProject.run(mockCreep, config);

      expect(mockRoom.find).to.have.been.calledWith(FIND_SOURCES);
    });

    it("should pick first available source", () => {
      const mockSource2 = { id: "source2" as Id<Source>, pos: { x: 15, y: 15 } };
      mockRoom.find.returns([mockSource, mockSource2]);
      mockCreep.store[RESOURCE_ENERGY] = 0;

      UpgradeControllerProject.run(mockCreep, config);

      expect(mockCreep.startTask).to.have.been.calledWith(HarvestEnergyTask, { source: mockSource.id });
    });
  });

  describe("project properties", () => {
    it("should have correct id", () => {
      expect(UpgradeControllerProject.id).to.equal(UpgradeControllerProjectId);
    });

    it("should have correct type", () => {
      expect(UpgradeControllerProject.type).to.equal(ProjectBehaviorSymbol);
    });
  });

  describe("start", () => {
    it("should call ProjectHelpers.start with correct parameters", () => {
      // Set up the creep to pass validation
      mockCreep.project = UpgradeControllerProject;
      
      // Spy on the actual ProjectHelpers
      const ProjectHelpers = require("../../../src/projects/Project").ProjectHelpers;
      const startSpy = sinon.spy(ProjectHelpers, "start");

      UpgradeControllerProject.start(mockCreep, config);

      expect(startSpy).to.have.been.calledWith(mockCreep, UpgradeControllerProject, config);

      startSpy.restore();
    });
  });

  describe("stop", () => {
    it("should call ProjectHelpers.stop with creep", () => {
      // Set up the creep to pass validation
      mockCreep.task = null;
      
      // Spy on the actual ProjectHelpers
      const ProjectHelpers = require("../../../src/projects/Project").ProjectHelpers;
      const stopSpy = sinon.spy(ProjectHelpers, "stop");

      UpgradeControllerProject.stop(mockCreep);

      expect(stopSpy).to.have.been.calledWith(mockCreep);

      stopSpy.restore();
    });
  });
});