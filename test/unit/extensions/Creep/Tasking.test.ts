import { globalsCleanup, globalsSetup } from "test/unit/globals";

import { DoNothingTask } from "tasks";
import { DoNothingProject } from "projects";

import { assert } from "chai";
import { TaskHelpers, TaskId } from "tasks/Task";
import { DoNothingTaskConfig } from "tasks/DoNothingTask";

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

  it("handles a task stopping itself right away");
  it("stops running tasks");

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
