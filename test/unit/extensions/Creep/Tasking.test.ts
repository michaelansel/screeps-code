import { globalsSetup, globalsCleanup } from 'test/unit/globals';

import { DoNothingTask } from "tasks";
import { DoNothingProject } from 'projects';

import { assert } from "chai";

describe("CreepTaskingExtension", () => {
    beforeEach(() => {
        globalsSetup();
    })
    afterEach(() => {
        globalsCleanup();
    })

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
});
