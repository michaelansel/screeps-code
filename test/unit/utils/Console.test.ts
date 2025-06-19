import { expect } from "chai";
import * as sinon from "sinon";
import { Console } from "utils/Console";
import { Logger } from "utils/Logger";
import { SourcePlanner } from "planners/SourcePlanner";
import { HarvestEnergyTask } from "tasks";

describe("Console", () => {
  let sandbox: sinon.SinonSandbox;
  let mockGame: any;
  let mockMemory: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    mockGame = {
      creeps: {}
    };
    mockMemory = {
      SourcePlanner: {
        creeps: {}
      }
    };
    global.Game = mockGame;
    (global as any).Memory = mockMemory;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("Logger", () => {
    it("should return Logger instance", () => {
      const loggerInstanceStub = sandbox.stub();
      sandbox.stub(Logger, "instance").get(() => loggerInstanceStub);

      const result = Console.Logger();

      expect(result).to.equal(loggerInstanceStub);
    });
  });

  describe("LogEverything", () => {
    it("should enable debug logging for default component", () => {
      const mockLogger = {
        setComponentLogLevel: sandbox.stub()
      };
      sandbox.stub(Logger, "instance").get(() => mockLogger);

      Console.LogEverything();

      expect(mockLogger.setComponentLogLevel.calledOnce).to.be.true;
      expect(mockLogger.setComponentLogLevel.calledWith("DEFAULT_COMPONENT", "DEBUG")).to.be.true;
    });
  });

  describe("SourcePlanner", () => {
    it("should return SourcePlanner instance", () => {
      const sourcePlannerInstanceStub = sandbox.stub();
      sandbox.stub(SourcePlanner, "instance").get(() => sourcePlannerInstanceStub);

      const result = Console.SourcePlanner();

      expect(result).to.equal(sourcePlannerInstanceStub);
    });
  });

  describe("resetSourcePlanner", () => {
    it("should stop harvest tasks for all creeps", () => {
      const creep1 = {
        task: HarvestEnergyTask,
        stopTask: sandbox.stub()
      };
      const creep2 = {
        task: null,
        stopTask: sandbox.stub()
      };
      const creep3 = {
        task: HarvestEnergyTask,
        stopTask: sandbox.stub()
      };

      mockGame.creeps = {
        creep1,
        creep2,
        creep3
      };

      Console.resetSourcePlanner();

      expect(creep1.stopTask.calledOnce).to.be.true;
      expect(creep2.stopTask.called).to.be.false;
      expect(creep3.stopTask.calledOnce).to.be.true;
    });

    it("should delete SourcePlanner creeps memory", () => {
      mockMemory.SourcePlanner = {
        creeps: {
          creep1: { task: "HarvestEnergyTask" },
          creep2: { task: "HarvestEnergyTask" }
        }
      };

      Console.resetSourcePlanner();

      expect(mockMemory.SourcePlanner.creeps).to.be.undefined;
    });

    it("should handle missing SourcePlanner memory gracefully", () => {
      delete mockMemory.SourcePlanner;

      expect(() => Console.resetSourcePlanner()).to.not.throw();
    });

    it("should handle missing creeps memory gracefully", () => {
      mockMemory.SourcePlanner = {};

      expect(() => Console.resetSourcePlanner()).to.not.throw();
    });
  });
});