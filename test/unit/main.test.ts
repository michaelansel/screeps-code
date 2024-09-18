import { Creep, Game, Memory } from "test/unit/mock";
import _ from "lodash";
import { assert } from "chai";
import { loop } from "main";

describe("main", () => {
  before(() => {
    // runs before all test in this block
  });

  beforeEach(() => {
    // runs before each test in this block
    // @ts-expect-error : allow adding Game to global
    global.Game = _.clone(Game);
    // @ts-expect-error : allow adding Memory to global
    global.Memory = _.clone(Memory);
  });

  it("should export a loop function", () => {
    assert.isTrue(typeof loop === "function");
  });

  it("should return void when called with no context", () => {
    assert.isUndefined(loop());
  });

  it("Automatically delete memory of missing creeps", () => {
    // Simulate that notPersistValue recently died
    Memory.creeps.persistValue = "any value";
    Memory.creeps.notPersistValue = "any value";

    // Indicate an active creep called persistValue
    Game.creeps.persistValue = _.clone(Creep);

    loop();

    assert.isDefined(Memory.creeps.persistValue);
    assert.isUndefined(Memory.creeps.notPersistValue);
  });
});
