/* eslint-disable */
import { assert } from "chai";
import sinon from "sinon";

import {
  ProjectBehaviorSymbol,
  ProjectConfigSymbol,
  ProjectHelpers,
  Projects,
  registerProject
} from "projects/Project";
import type { Project, ProjectBehavior, ProjectConfig, ProjectId } from "projects/Project";
import { globalsCleanup, globalsSetup } from "test/unit/globals";

describe("Project Base Class", () => {
  beforeEach(() => {
    globalsSetup();
  });

  afterEach(() => {
    globalsCleanup();
  });

  describe("ProjectBehaviorSymbol", () => {
    it("should be a unique symbol", () => {
      assert.equal(typeof ProjectBehaviorSymbol, "symbol");
      assert.notEqual(ProjectBehaviorSymbol, Symbol());
    });
  });

  describe("ProjectConfigSymbol", () => {
    it("should be a unique symbol", () => {
      assert.equal(typeof ProjectConfigSymbol, "symbol");
      assert.notEqual(ProjectConfigSymbol, Symbol());
      assert.notEqual(ProjectConfigSymbol as any, ProjectBehaviorSymbol as any);
    });
  });

  describe("registerProject", () => {
    let testProject: Project;

    beforeEach(() => {
      // Create a test project
      const testProjectId = "TestProject" as ProjectId;
      testProject = {
        type: ProjectBehaviorSymbol,
        id: testProjectId,
        start: sinon.stub(),
        run: sinon.stub(),
        stop: sinon.stub()
      };

      // Clean up any existing test project
      delete Projects[testProject.id];
    });

    afterEach(() => {
      // Clean up test project
      delete Projects[testProject.id];
    });

    it("should register a project in the Projects registry", () => {
      registerProject(testProject);

      assert.equal(Projects[testProject.id], testProject);
    });

    it("should allow retrieval of registered project", () => {
      registerProject(testProject);

      const retrieved = Projects[testProject.id];
      assert.equal(retrieved, testProject);
      assert.equal(retrieved.id, testProject.id);
      assert.equal(retrieved.type, ProjectBehaviorSymbol);
    });

    it("should overwrite existing project with same id", () => {
      const firstProject = { ...testProject };
      const secondProject = {
        ...testProject,
        run: sinon.stub() // Different implementation
      };

      registerProject(firstProject);
      registerProject(secondProject);

      assert.equal(Projects[testProject.id], secondProject);
      assert.notEqual(Projects[testProject.id], firstProject);
    });
  });

  describe("ProjectHelpers", () => {
    let creep: Creep;
    let testProject: Project;

    beforeEach(() => {
      creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      const testProjectId = "TestProject" as ProjectId;
      testProject = {
        type: ProjectBehaviorSymbol,
        id: testProjectId,
        start: sinon.stub(),
        run: sinon.stub(),
        stop: sinon.stub()
      };
    });

    describe("start", () => {
      it("should not throw when creep.project matches ProjectType", () => {
        // Mock creep.project to return the test project
        Object.defineProperty(creep, "project", {
          get: () => testProject,
          configurable: true
        });

        assert.doesNotThrow(() => {
          ProjectHelpers.start(creep, testProject);
        });
      });

      it("should throw error when creep.project does not match ProjectType", () => {
        const differentProject = {
          ...testProject,
          id: "DifferentProject" as ProjectId
        };

        // Mock creep.project to return different project
        Object.defineProperty(creep, "project", {
          get: () => differentProject,
          configurable: true
        });

        assert.throws(() => {
          ProjectHelpers.start(creep, testProject);
        }, "Starting project for creep that doesn't know it is doing that project");
      });

      it("should throw error when creep.project is null", () => {
        // Mock creep.project to return null
        Object.defineProperty(creep, "project", {
          get: () => null,
          configurable: true
        });

        assert.throws(() => {
          ProjectHelpers.start(creep, testProject);
        }, "Starting project for creep that doesn't know it is doing that project");
      });

      it("should include helpful error message", () => {
        Object.defineProperty(creep, "project", {
          get: () => null,
          configurable: true
        });

        try {
          ProjectHelpers.start(creep, testProject);
          assert.fail("Should have thrown an error");
        } catch (error) {
          assert.include(
            (error as Error).message,
            "using Creep.startProject"
          );
        }
      });
    });

    describe("stop", () => {
      it("should not throw when creep.task is null", () => {
        // Mock creep.task to return null
        Object.defineProperty(creep, "task", {
          get: () => null,
          configurable: true
        });

        assert.doesNotThrow(() => {
          ProjectHelpers.stop(creep, testProject);
        });
      });

      it("should throw error when creep has a running task", () => {
        const mockTask = {
          id: "SomeTask",
          run: sinon.stub()
        };

        // Mock creep.task to return a task
        Object.defineProperty(creep, "task", {
          get: () => mockTask,
          configurable: true
        });

        assert.throws(() => {
          ProjectHelpers.stop(creep, testProject);
        }, "Stopping a project for a creep with a running task");
      });

      it("should include helpful error message", () => {
        const mockTask = {
          id: "SomeTask",
          run: sinon.stub()
        };

        Object.defineProperty(creep, "task", {
          get: () => mockTask,
          configurable: true
        });

        try {
          ProjectHelpers.stop(creep, testProject);
          assert.fail("Should have thrown an error");
        } catch (error) {
          assert.include(
            (error as Error).message,
            "using Creep.stopProject"
          );
        }
      });
    });
  });

  describe("Type System", () => {
    it("should allow valid ProjectConfig to be created", () => {
      const testProjectId = "TestProject" as ProjectId;
      const config: ProjectConfig<typeof testProjectId> = {
        type: ProjectConfigSymbol,
        id: testProjectId
      };

      assert.equal(config.type, ProjectConfigSymbol);
      assert.equal(config.id, testProjectId);
    });

    it("should allow valid ProjectBehavior to be created", () => {
      const testProjectId = "TestProject" as ProjectId;
      const behavior: ProjectBehavior<typeof testProjectId> = {
        type: ProjectBehaviorSymbol,
        id: testProjectId,
        start: sinon.stub(),
        run: sinon.stub(),
        stop: sinon.stub()
      };

      assert.equal(behavior.type, ProjectBehaviorSymbol);
      assert.equal(behavior.id, testProjectId);
      assert.isFunction(behavior.start);
      assert.isFunction(behavior.run);
      assert.isFunction(behavior.stop);
    });
  });
});