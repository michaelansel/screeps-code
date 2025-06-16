/* eslint-disable */
import { assert } from "chai";
import sinon from "sinon";

import {
  TaskBehaviorSymbol,
  TaskConfigSymbol,
  TaskHelpers,
  Tasks,
  registerTask
} from "tasks/Task";
import type { Task, TaskBehavior, TaskConfig, TaskId } from "tasks/Task";
import { globalsCleanup, globalsSetup } from "test/unit/globals";

describe("Task Base Class", () => {
  beforeEach(() => {
    globalsSetup();
  });

  afterEach(() => {
    globalsCleanup();
  });

  describe("TaskBehaviorSymbol", () => {
    it("should be a unique symbol", () => {
      assert.equal(typeof TaskBehaviorSymbol, "symbol");
      assert.notEqual(TaskBehaviorSymbol, Symbol());
    });
  });

  describe("TaskConfigSymbol", () => {
    it("should be a unique symbol", () => {
      assert.equal(typeof TaskConfigSymbol, "symbol");
      assert.notEqual(TaskConfigSymbol, Symbol());
      assert.notEqual(TaskConfigSymbol as any, TaskBehaviorSymbol as any);
    });
  });

  describe("registerTask", () => {
    let testTask: Task;

    beforeEach(() => {
      // Create a test task
      const testTaskId = "TestTask" as TaskId;
      testTask = {
        type: TaskBehaviorSymbol,
        id: testTaskId,
        start: sinon.stub(),
        run: sinon.stub(),
        stop: sinon.stub()
      };

      // Clean up any existing test task
      delete Tasks[testTask.id];
    });

    afterEach(() => {
      // Clean up test task
      delete Tasks[testTask.id];
    });

    it("should register a task in the Tasks registry", () => {
      registerTask(testTask);

      assert.equal(Tasks[testTask.id], testTask);
    });

    it("should allow retrieval of registered task", () => {
      registerTask(testTask);

      const retrieved = Tasks[testTask.id];
      assert.equal(retrieved, testTask);
      assert.equal(retrieved.id, testTask.id);
      assert.equal(retrieved.type, TaskBehaviorSymbol);
    });

    it("should overwrite existing task with same id", () => {
      const firstTask = { ...testTask };
      const secondTask = {
        ...testTask,
        run: sinon.stub() // Different implementation
      };

      registerTask(firstTask);
      registerTask(secondTask);

      assert.equal(Tasks[testTask.id], secondTask);
      assert.notEqual(Tasks[testTask.id], firstTask);
    });
  });

  describe("TaskHelpers", () => {
    let creep: Creep;
    let testTask: Task;

    beforeEach(() => {
      creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      const testTaskId = "TestTask" as TaskId;
      testTask = {
        type: TaskBehaviorSymbol,
        id: testTaskId,
        start: sinon.stub(),
        run: sinon.stub(),
        stop: sinon.stub()
      };
    });

    describe("start", () => {
      it("should not throw when creep.task matches TaskType", () => {
        // Mock creep.task to return the test task
        Object.defineProperty(creep, "task", {
          get: () => testTask,
          configurable: true
        });

        assert.doesNotThrow(() => {
          TaskHelpers.start(creep, testTask);
        });
      });

      it("should throw error when creep.task does not match TaskType", () => {
        const differentTask = {
          ...testTask,
          id: "DifferentTask" as TaskId
        };

        // Mock creep.task to return different task
        Object.defineProperty(creep, "task", {
          get: () => differentTask,
          configurable: true
        });

        assert.throws(() => {
          TaskHelpers.start(creep, testTask);
        }, "Starting task for creep that doesn't know it is doing that task");
      });

      it("should throw error when creep.task is null", () => {
        // Mock creep.task to return null
        Object.defineProperty(creep, "task", {
          get: () => null,
          configurable: true
        });

        assert.throws(() => {
          TaskHelpers.start(creep, testTask);
        }, "Starting task for creep that doesn't know it is doing that task");
      });

      it("should include helpful error message", () => {
        Object.defineProperty(creep, "task", {
          get: () => null,
          configurable: true
        });

        try {
          TaskHelpers.start(creep, testTask);
          assert.fail("Should have thrown an error");
        } catch (error) {
          assert.include(
            (error as Error).message,
            "using Creep.startTask"
          );
        }
      });
    });

    describe("loadConfig", () => {
      it("should return existing config when present", () => {
        const expectedConfig = { customData: "test-value" } as any;
        creep.memory = {
          task: {
            id: testTask.id,
            config: expectedConfig
          }
        } as any;

        // Mock creep.task to return the test task
        Object.defineProperty(creep, "task", {
          get: () => testTask,
          configurable: true
        });

        const config = TaskHelpers.loadConfig(creep, testTask as any);

        assert.deepEqual(config, expectedConfig);
      });

      it("should create empty config when none exists", () => {
        creep.memory = {
          task: {
            id: testTask.id
          }
        } as any;

        // Mock creep.task to return the test task
        Object.defineProperty(creep, "task", {
          get: () => testTask,
          configurable: true
        });

        const config = TaskHelpers.loadConfig(creep, testTask as any);

        assert.deepEqual(config, {} as any);
        assert.deepEqual(creep.memory.task!.config, {} as any);
      });

      it("should throw error when creep.task does not match TaskType", () => {
        const differentTask = {
          ...testTask,
          id: "DifferentTask" as TaskId
        };

        creep.memory = {
          task: {
            id: testTask.id,
            config: {}
          }
        } as any;

        // Mock creep.task to return different task
        Object.defineProperty(creep, "task", {
          get: () => differentTask,
          configurable: true
        });

        assert.throws(() => {
          TaskHelpers.loadConfig(creep, testTask as any);
        }, "Running TaskBehavior method on a Creep that isn't assigned to the Task");
      });

      it("should throw error when task memory is missing", () => {
        creep.memory = {}; // No task memory

        // Mock creep.task to return the test task
        Object.defineProperty(creep, "task", {
          get: () => testTask,
          configurable: true
        });

        assert.throws(() => {
          TaskHelpers.loadConfig(creep, testTask as any);
        }, "Corrupt Creep memory: no CreepTaskMemory structure when assigned Task");
      });

      it("should handle undefined task memory gracefully", () => {
        creep.memory = {
          task: undefined as any
        };

        // Mock creep.task to return the test task
        Object.defineProperty(creep, "task", {
          get: () => testTask,
          configurable: true
        });

        assert.throws(() => {
          TaskHelpers.loadConfig(creep, testTask as any);
        }, "Corrupt Creep memory: no CreepTaskMemory structure when assigned Task");
      });

      it("should preserve existing config data", () => {
        const initialConfig = { 
          existingData: "preserved",
          counter: 42
        } as any;
        
        creep.memory = {
          task: {
            id: testTask.id,
            config: initialConfig
          }
        } as any;

        // Mock creep.task to return the test task
        Object.defineProperty(creep, "task", {
          get: () => testTask,
          configurable: true
        });

        const config = TaskHelpers.loadConfig(creep, testTask as any);

        assert.deepEqual(config, initialConfig);
        assert.equal((config as any).existingData, "preserved");
        assert.equal((config as any).counter, 42);
      });
    });
  });

  describe("Type System", () => {
    it("should allow valid TaskConfig to be created", () => {
      const testTaskId = "TestTask" as TaskId;
      const config: TaskConfig<typeof testTaskId> = {
        type: TaskConfigSymbol,
        id: testTaskId
      };

      assert.equal(config.type, TaskConfigSymbol);
      assert.equal(config.id, testTaskId);
    });

    it("should allow valid TaskBehavior to be created", () => {
      const testTaskId = "TestTask" as TaskId;
      const behavior: TaskBehavior<typeof testTaskId> = {
        type: TaskBehaviorSymbol,
        id: testTaskId,
        start: sinon.stub(),
        run: sinon.stub(),
        stop: sinon.stub()
      };

      assert.equal(behavior.type, TaskBehaviorSymbol);
      assert.equal(behavior.id, testTaskId);
      assert.isFunction(behavior.start);
      assert.isFunction(behavior.run);
      assert.isFunction(behavior.stop);
    });
  });
});