import { TaskBehavior, TaskBehaviorSymbol, TaskHelpers, TaskId } from "tasks/Task";
import { globalsCleanup, globalsSetup } from "test/unit/globals";

import { DoNothingProject } from "projects";
import { DoNothingTask } from "tasks";
import { DoNothingTaskConfig } from "tasks/DoNothingTask";

import { assert } from "chai";

describe("CreepTaskingExtension", () => {
  beforeEach(() => {
    globalsSetup();
  });
  afterEach(() => {
    globalsCleanup();
  });

  it("should save task ID to memory on start", () => {
    const creep = new Creep("test" as Id<Creep>);
    creep.memory = {};
    creep.startTask(DoNothingTask);
    assert.equal(creep.memory.task?.id, DoNothingTask.id);
  });

  it("should parse task from memory", () => {
    const creep = new Creep("test" as Id<Creep>);
    creep.memory = { task: { id: DoNothingTask.id } };
    assert.equal(creep.task, DoNothingTask);
  });

  it("should save project ID to memory on start", () => {
    const creep = new Creep("test" as Id<Creep>);
    creep.memory = {};
    creep.startProject(DoNothingProject);
    assert.equal(creep.memory.project?.id, DoNothingProject.id);
  });

  it("should parse project from memory", () => {
    const creep = new Creep("test" as Id<Creep>);
    creep.memory = { project: { id: DoNothingProject.id } };
    assert.equal(creep.project, DoNothingProject);
  });

  it("handles a task stopping itself right away", () => {
    const creep = new Creep("test" as Id<Creep>);
    creep.memory = {};

    // Create a task that stops itself during start()
    const selfStoppingTask: TaskBehavior<TaskId> = {
      type: TaskBehaviorSymbol,
      id: "SelfStoppingTask" as TaskId,
      start(c: Creep, config?: any): void {
        c.stopTask(); // Stop immediately
      },
      run(c: Creep, config?: any): void {},
      stop(c: Creep): void {}
    };

    creep.startTask(selfStoppingTask);

    // Task should have been stopped
    assert.isUndefined(creep.memory.task);
    assert.isNull(creep.task);
  });

  it("stops running tasks", () => {
    const creep = new Creep("test" as Id<Creep>);
    creep.memory = {};

    let stopCalled = false;
    const firstTask: TaskBehavior<TaskId> = {
      type: TaskBehaviorSymbol,
      id: "FirstTask" as TaskId,
      start(c: Creep, config?: any): void {},
      run(c: Creep, config?: any): void {},
      stop(c: Creep): void {
        stopCalled = true;
      }
    };

    // Start first task
    creep.startTask(firstTask);
    assert.equal(creep.memory.task?.id, "FirstTask");
    assert.isFalse(stopCalled);

    // Start second task (should stop first)
    creep.startTask(DoNothingTask);
    assert.isTrue(stopCalled, "First task's stop() method should have been called");
    assert.equal(creep.memory.task?.id, DoNothingTask.id);
  });

  describe("TaskHelpers", () => {
    describe("#loadConfig", () => {
      it("returns a type-matched config object", () => {
        const creep = new Creep("test" as Id<Creep>);
        creep.memory = { task: { id: DoNothingTask.id, config: {} as DoNothingTaskConfig } };
        const config = TaskHelpers.loadConfig<DoNothingTaskConfig>(creep, DoNothingTask);
        assert.deepEqual(config, {} as DoNothingTaskConfig);
      });

      it("fails when requested config type and running task don't match", () => {
        const creep = new Creep("test" as Id<Creep>);
        creep.memory = { task: { id: "SomeOtherTask" as TaskId } };
        assert.throws(() => {
          TaskHelpers.loadConfig<DoNothingTaskConfig>(creep, DoNothingTask);
        }, "Running TaskBehavior method on a Creep that isn't assigned to the Task");
      });
    });
  });
});
