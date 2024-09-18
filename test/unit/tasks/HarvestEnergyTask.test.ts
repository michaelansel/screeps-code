import { globalsCleanup, globalsSetup } from "test/unit/globals";
import { HarvestEnergyTask } from "tasks";
import { HarvestEnergyTaskConfig } from "tasks/HarvestEnergyTask";
import { assert } from "chai";
import sinon from "sinon";

// TODO move to screeps-jest where this is all set up automatically
// @ts-expect-error we're just shoving in the necessary structures from the game
global.FIND_SOURCES = typeof FIND_SOURCES;
// @ts-expect-error we're just shoving in the necessary structures from the game
global.RESOURCE_ENERGY = typeof FIND_SOURCES;

describe("HarvestEnergyTask", () => {
  beforeEach(() => {
    globalsSetup();
  });
  afterEach(() => {
    globalsCleanup();
  });

  it("saves the Source when one is found", () => {
    const source = { id: "Source1" } as Source;
    const config: HarvestEnergyTaskConfig = {} as HarvestEnergyTaskConfig;
    const creep = new Creep("test" as Id<Creep>);

    // begin nonsense
    // TODO move to screeps-jest where this is all set up automatically
    // @ts-expect-error we're just shoving in the necessary structures from the game
    creep.pos = {
      getRangeTo: sinon.stub().returns(1)
    };
    creep.harvest = sinon.stub();
    // @ts-expect-error we're just shoving in the necessary structures from the game
    creep.store = {
      getFreeCapacity: sinon.stub().returns(0)
    };
    creep.memory = {};
    // end nonsense

    creep.pos.findClosestByPath = sinon.stub().returns(source);

    HarvestEnergyTask.run(creep, config);

    assert.equal(source.id, config.source);
  });
});
