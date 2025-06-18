import { expect } from "chai";
import sinon from "sinon";
import { use } from "chai";
import sinonChai from "sinon-chai";
import { UpgradeControllerTask, UpgradeControllerTaskConfig, UpgradeControllerTaskId } from "../../../src/tasks/UpgradeControllerTask";
import { TaskBehaviorSymbol } from "../../../src/tasks/Task";

use(sinonChai);

describe("UpgradeControllerTask", () => {
  let mockCreep: any;
  let mockController: any;
  let config: UpgradeControllerTaskConfig;

  beforeEach(() => {
    mockController = {
      id: "controller1" as Id<StructureController>,
      pos: { x: 25, y: 25 }
    };

    mockCreep = {
      name: "testCreep",
      store: { [RESOURCE_ENERGY]: 50 },
      pos: {
        x: 20,
        y: 20,
        inRangeTo: sinon.stub().returns(false)
      },
      moveTo: sinon.stub(),
      upgradeController: sinon.stub().returns(0), // OK = 0
      stopTask: sinon.stub()
    };

    config = {
      id: UpgradeControllerTaskId,
      controller: mockController.id
    };

    const mockGame = {
      getObjectById: sinon.stub().withArgs(mockController.id).returns(mockController)
    };
    global.Game = mockGame as any;
    global.OK = 0;
    global.ERR_NOT_ENOUGH_ENERGY = -6;
    global.ERR_INVALID_TARGET = -7;
    global.RESOURCE_ENERGY = "energy";
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("run", () => {
    it("should stop task if creep has no energy", () => {
      mockCreep.store[RESOURCE_ENERGY] = 0;

      UpgradeControllerTask.run(mockCreep, config);

      expect(mockCreep.stopTask).to.have.been.called;
      expect(mockCreep.moveTo).to.not.have.been.called;
      expect(mockCreep.upgradeController).to.not.have.been.called;
    });

    it("should stop task if controller no longer exists", () => {
      const mockGame = {
        getObjectById: sinon.stub().withArgs(mockController.id).returns(null)
      };
      global.Game = mockGame as any;

      UpgradeControllerTask.run(mockCreep, config);

      expect(mockCreep.stopTask).to.have.been.called;
      expect(mockCreep.moveTo).to.not.have.been.called;
      expect(mockCreep.upgradeController).to.not.have.been.called;
    });

    it("should move to controller if not in range", () => {
      mockCreep.pos.inRangeTo.withArgs(mockController, 3).returns(false);

      UpgradeControllerTask.run(mockCreep, config);

      expect(mockCreep.moveTo).to.have.been.calledWith(mockController, { visualizePathStyle: { stroke: '#ffffff' } });
      expect(mockCreep.upgradeController).to.not.have.been.called;
    });

    it("should upgrade controller when in range", () => {
      mockCreep.pos.inRangeTo.withArgs(mockController, 3).returns(true);

      UpgradeControllerTask.run(mockCreep, config);

      expect(mockCreep.upgradeController).to.have.been.calledWith(mockController);
      expect(mockCreep.moveTo).to.not.have.been.called;
      expect(mockCreep.stopTask).to.not.have.been.called;
    });

    it("should stop task if upgradeController returns ERR_NOT_ENOUGH_ENERGY", () => {
      mockCreep.pos.inRangeTo.withArgs(mockController, 3).returns(true);
      mockCreep.upgradeController.returns(-6); // ERR_NOT_ENOUGH_ENERGY

      UpgradeControllerTask.run(mockCreep, config);

      expect(mockCreep.upgradeController).to.have.been.calledWith(mockController);
      expect(mockCreep.stopTask).to.have.been.called;
    });

    it("should stop task and log error for other upgrade errors", () => {
      mockCreep.pos.inRangeTo.withArgs(mockController, 3).returns(true);
      mockCreep.upgradeController.returns(-7); // ERR_INVALID_TARGET
      const consoleSpy = sinon.stub(console, "log");

      UpgradeControllerTask.run(mockCreep, config);

      expect(mockCreep.upgradeController).to.have.been.calledWith(mockController);
      expect(mockCreep.stopTask).to.have.been.called;
      expect(consoleSpy).to.have.been.calledWith(`UpgradeControllerTask error for ${mockCreep.name}: ${-7}`);
    });
  });

  describe("task properties", () => {
    it("should have correct id", () => {
      expect(UpgradeControllerTask.id).to.equal(UpgradeControllerTaskId);
    });

    it("should have correct type", () => {
      expect(UpgradeControllerTask.type).to.equal(TaskBehaviorSymbol);
    });
  });

  describe("start", () => {
    it("should call TaskHelpers.start with correct parameters", () => {
      // Mock TaskHelpers to avoid validation
      const mockTaskHelpers = { start: sinon.stub() };
      const originalTaskHelpers = (global as any).TaskHelpers;
      (global as any).TaskHelpers = mockTaskHelpers;

      UpgradeControllerTask.start(mockCreep, config);

      expect(mockTaskHelpers.start).to.have.been.calledWith(mockCreep, UpgradeControllerTask, config);

      (global as any).TaskHelpers = originalTaskHelpers;
    });
  });

  describe("stop", () => {
    it("should complete without error", () => {
      expect(() => UpgradeControllerTask.stop(mockCreep, config)).to.not.throw();
    });
  });
});