/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { assert } from "chai";
import sinon from "sinon";

import * as tasks from "tasks";
import { globalsCleanup, globalsSetup } from "test/unit/globals";
import { HarvestEnergyProject } from "projects";
import { HarvestEnergyProjectConfig } from "projects/HarvestEnergyProject";

// TODO move to screeps-jest where this is all set up automatically
// @ts-expect-error we're just shoving in the necessary structures from the game
global.RESOURCE_ENERGY = typeof RESOURCE_ENERGY;

describe("HarvestEnergyProject", () => {
  beforeEach(() => {
    globalsSetup();
  });

  afterEach(() => {
    globalsCleanup();
  });

  describe("run", () => {
    let creep: Creep;
    let config: HarvestEnergyProjectConfig;

    beforeEach(() => {
      creep = new Creep("test" as Id<Creep>);
      config = {} as HarvestEnergyProjectConfig;

      // Set up basic creep mocks
      creep.memory = {};
      creep.startTask = sinon.stub();

      // @ts-expect-error we're just shoving in the necessary structures from the game
      creep.store = {
        getFreeCapacity: sinon.stub(),
        getUsedCapacity: sinon.stub(),
        getCapacity: sinon.stub().returns(100)
      };
    });

    it("should start DepositEnergyTask when creep is full of energy", () => {
      // Mock creep as full of energy (100 energy in 100 capacity)
      // @ts-expect-error we're just shoving in the necessary structures from the game
      creep.store.getUsedCapacity.withArgs(RESOURCE_ENERGY).returns(100);

      HarvestEnergyProject.run(creep, config);

      assert.isTrue((creep.startTask as sinon.SinonStub).calledWith(tasks.DepositEnergyTask));
    });

    it("should start HarvestEnergyTask when creep is not full of energy", () => {
      // Mock creep as not full of energy
      // @ts-expect-error we're just shoving in the necessary structures from the game
      creep.store.getUsedCapacity.withArgs(RESOURCE_ENERGY).returns(50);

      HarvestEnergyProject.run(creep, config);

      assert.isTrue((creep.startTask as sinon.SinonStub).calledWith(tasks.HarvestEnergyTask));
    });

    it("should start HarvestEnergyTask when creep has empty energy storage", () => {
      // Mock creep as empty
      // @ts-expect-error we're just shoving in the necessary structures from the game
      creep.store.getUsedCapacity.withArgs(RESOURCE_ENERGY).returns(0);

      HarvestEnergyProject.run(creep, config);

      assert.isTrue((creep.startTask as sinon.SinonStub).calledWith(tasks.HarvestEnergyTask));
    });
  });

  describe("start", () => {
    it("should call ProjectHelpers.start", () => {
      const creep = new Creep("test" as Id<Creep>);
      creep.memory = {};

      // Mock creep.project to return HarvestEnergyProject
      Object.defineProperty(creep, "project", {
        get: () => HarvestEnergyProject,
        configurable: true
      });

      // This should not throw an error
      assert.doesNotThrow(() => {
        HarvestEnergyProject.start(creep);
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
        HarvestEnergyProject.stop(creep);
      });
    });
  });

  describe("id", () => {
    it("should have the correct project id", () => {
      assert.equal(HarvestEnergyProject.id, "HarvestEnergyProject");
    });
  });
});
