/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { globalsCleanup, globalsSetup } from "test/unit/globals";
import { DepositEnergyTask } from "tasks";
import { DepositEnergyTaskConfig } from "tasks/DepositEnergyTask";
import { assert } from "chai";
import sinon from "sinon";

// TODO move to screeps-jest where this is all set up automatically
// @ts-expect-error we're just shoving in the necessary structures from the game
global.FIND_MY_SPAWNS = 104;
// @ts-expect-error we're just shoving in the necessary structures from the game
global.RESOURCE_ENERGY = "energy";

describe("DepositEnergyTask", () => {
  beforeEach(() => {
    globalsSetup();
    // @ts-expect-error we're just shoving in the necessary structures from the game
    global.Game = { getObjectById: sinon.stub() };
  });

  afterEach(() => {
    globalsCleanup();
  });

  describe("run", () => {
    let creep: Creep;
    let config: DepositEnergyTaskConfig;
    let spawn: StructureSpawn;

    beforeEach(() => {
      creep = new Creep("test" as Id<Creep>);
      spawn = { id: "spawn1" } as StructureSpawn;
      config = {} as DepositEnergyTaskConfig;

      // Set up basic creep mocks
      creep.memory = {};
      creep.moveTo = sinon.stub() as any;
      creep.transfer = sinon.stub() as any;
      creep.stopTask = sinon.stub();

      // @ts-expect-error we're just shoving in the necessary structures from the game
      creep.pos = {
        getRangeTo: sinon.stub() as any,
        findClosestByRange: sinon.stub() as any
      };

      // Reset Game.getObjectById stub
      (Game.getObjectById as sinon.SinonStub).reset();
    });

    it("should use target from config if available", () => {
      const targetId = "spawn1" as Id<Structure>;
      config.target = targetId;

      (Game.getObjectById as sinon.SinonStub).withArgs(targetId).returns(spawn);
      // @ts-expect-error mocking
      creep.pos.getRangeTo.withArgs(spawn).returns(1);

      DepositEnergyTask.run(creep, config);

      assert.isTrue((creep.transfer as sinon.SinonStub).calledWith(spawn, RESOURCE_ENERGY));
      assert.isTrue((creep.stopTask as sinon.SinonStub).called);
    });

    it("should find closest spawn if no target in config", () => {
      // @ts-expect-error mocking
      creep.pos.findClosestByRange.withArgs(FIND_MY_SPAWNS).returns(spawn);
      // @ts-expect-error mocking
      creep.pos.getRangeTo.withArgs(spawn).returns(1);

      DepositEnergyTask.run(creep, config);

      assert.isTrue((creep.transfer as sinon.SinonStub).calledWith(spawn, RESOURCE_ENERGY));
      assert.isTrue((creep.stopTask as sinon.SinonStub).called);
      assert.equal(config.target, spawn.id);
    });

    it("should find closest spawn if target from config is null", () => {
      const targetId = "spawn1" as Id<Structure>;
      config.target = targetId;

      (Game.getObjectById as sinon.SinonStub).withArgs(targetId).returns(null);
      // @ts-expect-error mocking
      creep.pos.findClosestByRange.withArgs(FIND_MY_SPAWNS).returns(spawn);
      // @ts-expect-error mocking
      creep.pos.getRangeTo.withArgs(spawn).returns(1);

      DepositEnergyTask.run(creep, config);

      assert.isTrue((creep.transfer as sinon.SinonStub).calledWith(spawn, RESOURCE_ENERGY));
      assert.isTrue((creep.stopTask as sinon.SinonStub).called);
      assert.equal(config.target, spawn.id);
    });

    it("should move to target if not in range", () => {
      // @ts-expect-error mocking
      creep.pos.findClosestByRange.withArgs(FIND_MY_SPAWNS).returns(spawn);
      // @ts-expect-error mocking
      creep.pos.getRangeTo.withArgs(spawn).returns(3); // Out of range

      DepositEnergyTask.run(creep, config);

      assert.isTrue((creep.moveTo as sinon.SinonStub).calledWith(spawn));
      assert.isFalse((creep.transfer as sinon.SinonStub).called);
      assert.isFalse((creep.stopTask as sinon.SinonStub).called);
    });

    it("should transfer and stop when in range", () => {
      // @ts-expect-error mocking
      creep.pos.findClosestByRange.withArgs(FIND_MY_SPAWNS).returns(spawn);
      // @ts-expect-error mocking
      creep.pos.getRangeTo.withArgs(spawn).returns(1); // In range

      DepositEnergyTask.run(creep, config);

      assert.isFalse((creep.moveTo as sinon.SinonStub).called);
      assert.isTrue((creep.transfer as sinon.SinonStub).calledWith(spawn, RESOURCE_ENERGY));
      assert.isTrue((creep.stopTask as sinon.SinonStub).called);
    });

    it("should handle case when no spawn is found", () => {
      // @ts-expect-error mocking
      creep.pos.findClosestByRange.withArgs(FIND_MY_SPAWNS).returns(null);

      DepositEnergyTask.run(creep, config);

      assert.isFalse((creep.moveTo as sinon.SinonStub).called);
      assert.isFalse((creep.transfer as sinon.SinonStub).called);
      assert.isFalse((creep.stopTask as sinon.SinonStub).called);
    });
  });

  describe("start", () => {
    it("should call TaskHelpers.start", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // Set up the creep to think it's running this task
      creep.startTask(DepositEnergyTask);

      // This should not throw an error
      assert.doesNotThrow(() => {
        DepositEnergyTask.start(creep);
      });
    });
  });

  describe("stop", () => {
    it("should not throw an error", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // This should not throw an error
      assert.doesNotThrow(() => {
        DepositEnergyTask.stop(creep);
      });
    });
  });

  describe("id", () => {
    it("should have the correct task id", () => {
      assert.equal(DepositEnergyTask.id, "DepositEnergyTask");
    });
  });
});
