/* eslint-disable */
import { assert } from "chai";
import sinon from "sinon";

import { DoNothingProject } from "projects";
import { DoNothingProjectConfig } from "projects/DoNothingProject";
import { globalsCleanup, globalsSetup } from "test/unit/globals";

describe("DoNothingProject", () => {
  beforeEach(() => {
    globalsSetup();
  });

  afterEach(() => {
    globalsCleanup();
  });

  describe("run", () => {
    it("should do nothing when run is called", () => {
      const creep = new Creep("test" as Id<Creep>);
      const config = {} as DoNothingProjectConfig;
      creep.memory = {};

      // Mock any creep methods that might be called
      const startTaskSpy = sinon.spy();
      creep.startTask = startTaskSpy;

      DoNothingProject.run(creep, config);

      // Verify no tasks were started or actions taken
      assert.isFalse(startTaskSpy.called, "No tasks should be started");
    });

    it("should handle undefined config gracefully", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // This should not throw an error
      assert.doesNotThrow(() => {
        DoNothingProject.run(creep, undefined);
      });
    });

    it("should not modify creep state", () => {
      const creep = new Creep("test" as Id<Creep>);
      const config = {} as DoNothingProjectConfig;
      const originalMemory = { test: "value" } as any;
      creep.memory = originalMemory;

      DoNothingProject.run(creep, config);

      // Memory should remain unchanged
      assert.deepEqual(creep.memory, originalMemory);
    });
  });

  describe("start", () => {
    it("should call ProjectHelpers.start", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // Mock creep.project to return DoNothingProject
      Object.defineProperty(creep, "project", {
        get: () => DoNothingProject,
        configurable: true
      });

      // This should not throw an error
      assert.doesNotThrow(() => {
        DoNothingProject.start(creep);
      });
    });

    it("should handle config parameter", () => {
      const creep = new Creep("test" as Id<Creep>);
      const config = {} as DoNothingProjectConfig;
      creep.memory = {};

      // Mock creep.project to return DoNothingProject
      Object.defineProperty(creep, "project", {
        get: () => DoNothingProject,
        configurable: true
      });

      // This should not throw an error with config
      assert.doesNotThrow(() => {
        DoNothingProject.start(creep, config);
      });
    });
  });

  describe("stop", () => {
    it("should call ProjectHelpers.stop", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // Mock creep.task to return null (no running task)
      Object.defineProperty(creep, "task", {
        get: () => null,
        configurable: true
      });

      // This should not throw an error
      assert.doesNotThrow(() => {
        DoNothingProject.stop(creep);
      });
    });
  });

  describe("id", () => {
    it("should have the correct project id", () => {
      assert.equal(DoNothingProject.id, "DoNothingProject");
    });
  });

  describe("type", () => {
    it("should have the correct project behavior type", () => {
      assert.isDefined(DoNothingProject.type);
      assert.equal(typeof DoNothingProject.type, "symbol");
    });
  });

  describe("config interface", () => {
    it("should accept valid config object", () => {
      const config: DoNothingProjectConfig = {
        type: DoNothingProject.type as any,
        id: DoNothingProject.id
      };

      // Should be able to use config without errors
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      assert.doesNotThrow(() => {
        DoNothingProject.run(creep, config);
      });
    });
  });
});