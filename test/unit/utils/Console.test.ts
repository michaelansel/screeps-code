import { expect } from "chai";
import * as sinon from "sinon";
import { Console } from "utils/Console";
import { Logger } from "utils/Logger";
import { SourcePlanner } from "planners/SourcePlanner";
import { HarvestEnergyTask } from "tasks";
import { Projects } from "projects/Project";

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
    (global as any).RESOURCE_ENERGY = 'energy';
    
    // Stub console.log to avoid test output noise
    sandbox.stub(console, 'log');
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

  describe("Project Assignment Helpers", () => {
    beforeEach(() => {
      // Mock some projects
      (Projects as any)['HarvestEnergyProject'] = { id: 'HarvestEnergyProject' };
      (Projects as any)['BuilderProject'] = { id: 'BuilderProject' };
      (Projects as any)['DoNothingProject'] = { id: 'DoNothingProject' };
    });

    describe("listProjects", () => {
      it("should list all available projects", () => {
        const result = Console.listProjects();
        
        expect(result).to.include('HarvestEnergyProject');
        expect(result).to.include('BuilderProject');
        expect(result).to.include('DoNothingProject');
      });
    });

    describe("listCreeps", () => {
      it("should list all creeps with their project assignments", () => {
        mockGame.creeps = {
          Harvester1: {
            memory: { project: { id: 'HarvestEnergyProject' } },
            store: { energy: 50, getCapacity: () => 100 }
          },
          Builder1: {
            memory: { project: { id: 'BuilderProject' } },
            store: { energy: 25, getCapacity: () => 50 }
          },
          Worker1: {
            memory: {},
            store: { energy: 0, getCapacity: () => 50 }
          }
        };

        const result = Console.listCreeps();

        expect(result).to.deep.equal(['Harvester1', 'Builder1', 'Worker1']);
      });
    });

    describe("assignProject", () => {
      it("should assign project to existing creep", () => {
        const mockCreep = {
          memory: {},
          task: null,
          stopTask: sandbox.stub()
        };
        mockGame.creeps = { TestCreep: mockCreep };

        const result = Console.assignProject('TestCreep', 'HarvestEnergyProject', { someConfig: 'value' });

        expect(result).to.be.true;
        expect(mockCreep.memory.project).to.deep.equal({
          id: 'HarvestEnergyProject',
          config: { someConfig: 'value' }
        });
      });

      it("should return false for non-existent creep", () => {
        const result = Console.assignProject('NonExistentCreep', 'HarvestEnergyProject');

        expect(result).to.be.false;
      });

      it("should return false for non-existent project", () => {
        mockGame.creeps = { TestCreep: { memory: {}, task: null } };

        const result = Console.assignProject('TestCreep', 'NonExistentProject');

        expect(result).to.be.false;
      });

      it("should stop current task before assigning project", () => {
        const mockCreep = {
          memory: {},
          task: { id: 'SomeTask' },
          stopTask: sandbox.stub()
        };
        mockGame.creeps = { TestCreep: mockCreep };

        Console.assignProject('TestCreep', 'HarvestEnergyProject');

        expect(mockCreep.stopTask.calledOnce).to.be.true;
      });
    });

    describe("assignProjectToPattern", () => {
      beforeEach(() => {
        mockGame.creeps = {
          Harvester1: { memory: {}, task: null },
          Harvester2: { memory: {}, task: null },
          Builder1: { memory: {}, task: null },
          Worker1: { memory: {}, task: null }
        };
      });

      it("should assign project to creeps matching pattern", () => {
        const result = Console.assignProjectToPattern('Harvester*', 'HarvestEnergyProject');

        expect(result).to.deep.equal(['Harvester1', 'Harvester2']);
        expect(mockGame.creeps.Harvester1.memory.project.id).to.equal('HarvestEnergyProject');
        expect(mockGame.creeps.Harvester2.memory.project.id).to.equal('HarvestEnergyProject');
      });

      it("should return empty array for no matches", () => {
        const result = Console.assignProjectToPattern('NonExistent*', 'HarvestEnergyProject');

        expect(result).to.deep.equal([]);
      });

      it("should return empty array for invalid project", () => {
        const result = Console.assignProjectToPattern('Harvester*', 'InvalidProject');

        expect(result).to.deep.equal([]);
      });
    });

    describe("assignProjectToRole", () => {
      it("should assign project to all creeps with role prefix", () => {
        mockGame.creeps = {
          Builder1: { memory: {}, task: null },
          Builder2: { memory: {}, task: null },
          Harvester1: { memory: {}, task: null }
        };

        const result = Console.assignProjectToRole('Builder', 'BuilderProject');

        expect(result).to.deep.equal(['Builder1', 'Builder2']);
        expect(mockGame.creeps.Builder1.memory.project.id).to.equal('BuilderProject');
        expect(mockGame.creeps.Builder2.memory.project.id).to.equal('BuilderProject');
        expect(mockGame.creeps.Harvester1.memory.project).to.be.undefined;
      });
    });

    describe("projectStatus", () => {
      it("should provide detailed project status overview", () => {
        mockGame.creeps = {
          Harvester1: { memory: { project: { id: 'HarvestEnergyProject' } } },
          Harvester2: { memory: { project: { id: 'HarvestEnergyProject' } } },
          Builder1: { memory: { project: { id: 'BuilderProject' } } },
          Worker1: { memory: {} } // No project
        };

        const result = Console.projectStatus();

        expect(result.projectStats).to.deep.equal({
          HarvestEnergyProject: ['Harvester1', 'Harvester2'],
          BuilderProject: ['Builder1']
        });
        expect(result.creepsWithoutProjects).to.deep.equal(['Worker1']);
      });
    });
  });
});