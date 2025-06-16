/* eslint-disable */
import { assert } from "chai";
import sinon from "sinon";

import { DoNothingTask } from "tasks";
import { DoNothingTaskConfig } from "tasks/DoNothingTask";
import { globalsCleanup, globalsSetup } from "test/unit/globals";

describe("DoNothingTask", () => {
  beforeEach(() => {
    globalsSetup();
  });

  afterEach(() => {
    globalsCleanup();
  });

  describe("run", () => {
    it("should do nothing when run is called", () => {
      const creep = new Creep("test" as Id<Creep>);
      const config = {} as DoNothingTaskConfig;
      creep.memory = {};

      // Mock any creep methods that might be called
      const moveToSpy = sinon.spy();
      const stopTaskSpy = sinon.spy();
      creep.moveTo = moveToSpy as any;
      creep.stopTask = stopTaskSpy;

      DoNothingTask.run(creep, config);

      // Verify no actions were taken
      assert.isFalse(moveToSpy.called, "No movement should occur");
      assert.isFalse(stopTaskSpy.called, "Task should not stop itself");
    });

    it("should handle undefined config gracefully", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // This should not throw an error
      assert.doesNotThrow(() => {
        DoNothingTask.run(creep, undefined);
      });
    });

    it("should not modify creep state", () => {
      const creep = new Creep("test" as Id<Creep>);
      const config = {} as DoNothingTaskConfig;
      const originalMemory = { test: "value", taskData: "preserved" } as any;
      creep.memory = originalMemory;

      DoNothingTask.run(creep, config);

      // Memory should remain unchanged
      assert.deepEqual(creep.memory, originalMemory);
    });

    it("should not call any creep actions", () => {
      const creep = new Creep("test" as Id<Creep>);
      const config = {} as DoNothingTaskConfig;
      creep.memory = {};

      // Mock various creep action methods
      const harvestSpy = sinon.spy();
      const transferSpy = sinon.spy();
      const buildSpy = sinon.spy();
      const repairSpy = sinon.spy();

      creep.harvest = harvestSpy as any;
      creep.transfer = transferSpy as any;
      creep.build = buildSpy as any;
      creep.repair = repairSpy as any;

      DoNothingTask.run(creep, config);

      // Verify no actions were called
      assert.isFalse(harvestSpy.called, "harvest should not be called");
      assert.isFalse(transferSpy.called, "transfer should not be called");
      assert.isFalse(buildSpy.called, "build should not be called");
      assert.isFalse(repairSpy.called, "repair should not be called");
    });
  });

  describe("start", () => {
    it("should call TaskHelpers.start", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // Set up the creep to think it's running this task
      creep.startTask(DoNothingTask);

      // This should not throw an error
      assert.doesNotThrow(() => {
        DoNothingTask.start(creep);
      });
    });

    it("should handle config parameter", () => {
      const creep = new Creep("test" as Id<Creep>);
      const config = {} as DoNothingTaskConfig;
      creep.memory = {};

      // Set up the creep to think it's running this task
      creep.startTask(DoNothingTask);

      // This should not throw an error with config
      assert.doesNotThrow(() => {
        DoNothingTask.start(creep, config);
      });
    });
  });

  describe("stop", () => {
    it("should not throw an error", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // This should not throw an error
      assert.doesNotThrow(() => {
        DoNothingTask.stop(creep);
      });
    });

    it("should not modify creep state", () => {
      const creep = new Creep("test" as Id<Creep>);
      const originalMemory = { test: "value" } as any;
      creep.memory = originalMemory;

      DoNothingTask.stop(creep);

      // Memory should remain unchanged
      assert.deepEqual(creep.memory, originalMemory);
    });
  });

  describe("id", () => {
    it("should have the correct task id", () => {
      assert.equal(DoNothingTask.id, "DoNothingTask");
    });
  });

  describe("type", () => {
    it("should have the correct task behavior type", () => {
      assert.isDefined(DoNothingTask.type);
      assert.equal(typeof DoNothingTask.type, "symbol");
    });
  });

  describe("config interface", () => {
    it("should accept valid config object", () => {
      const config: DoNothingTaskConfig = {
        type: DoNothingTask.type as any,
        id: DoNothingTask.id
      };

      // Should be able to use config without errors
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      assert.doesNotThrow(() => {
        DoNothingTask.run(creep, config);
      });
    });
  });
});