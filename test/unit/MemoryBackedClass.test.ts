import { assert } from "chai";
import { HarvestEnergyTask, Task, Tasks } from "tasks";
import { BackingMemoryRecord, MemoryBackedClass, SerDeFunctions } from "utils/MemoryBackedClass";

interface TestData {
    task: Task,
    source?: Source
};
type TestDataMemory = BackingMemoryRecord<TestData>;

type TestCollection = Record<string, TestData>;
type TestCollectionMemory = Record<string, TestDataMemory>;
export interface TestMemory {
    records?: TestCollectionMemory;
}

type MockMemory = { Test?: TestMemory };
const MockSource: Source = <Source>{ id: "1234567890" };
const EmptyMemory: MockMemory = {}
const FilledMemory: MockMemory = {
    Test: {
        records: {
            a: {
                task: "HarvestEnergyTask" as Id<Task>,
            },
            b: {
                task: "HarvestEnergyTask" as Id<Task>,
                source: "1234567890" as Id<Source>,
            }
        }
    }
}
const InvalidMemory: MockMemory = {
    Test: {
        records: {
            a: {
                task: "InvalidRequiredParameter" as Id<Task>,
            },
        }
    }
}

declare global {
    interface Memory extends MockMemory { }
}

const Game: object = {};
class Creep {
}
// @ts-ignore
global.Creep = Creep;

class TestClass extends MemoryBackedClass {
    constructor() { super(); }

    private _data: TestCollection | undefined;
    get data(): TestCollection {
        if (this._data === undefined) {
            function fetchMemory() {
                // TODO this is the wrong place for this check
                if (Memory.Test === undefined) Memory.Test = {};
                if (Memory.Test.records === undefined) Memory.Test.records = {};
                return Memory.Test.records;
            }
            this._data = this.proxyGenericObject(this.proxyTestData.bind(this), fetchMemory, {});
        }
        return this._data;
    }

    private proxyTestData(memory: TestDataMemory, cache?: TestData): TestData | undefined {
        const serde: SerDeFunctions<TestData> = {
            fromMemory: {
                required: {
                    'task': (m: TestDataMemory) => { return this.loadByIdFromTable(m.task, Tasks); },
                },
                optional: {
                    'source': (m: TestDataMemory) => { return this.loadGameObjectById(m.source); },
                }
            },
            toMemory: {
                required: {
                    'task': (m: TestDataMemory, task: Task) => {
                        m.task = task.id;
                        return true;
                    },
                },
                optional: {
                    'source': (m: TestDataMemory, source: Source | undefined) => {
                        if (source === undefined) {
                            m.source = undefined;
                        } else {
                            m.source = source.id;
                        }
                        return true;
                    },
                }
            }
        };
        function fetchMemory() {
            // TODO this is wrong; need to retrieve from Memory path
            return memory;
        }
        return this.proxyGenericRecord(serde, fetchMemory, cache);
    }
}

describe("MemoryBackedClass", () => {
    before(() => {
        // runs before all test in this block
    });

    beforeEach(() => {
        // runs before each test in this block
        // @ts-ignore : allow adding Game to global
        global.Game = _.clone(Game);
        // @ts-ignore : allow adding Creep to global
        global.Creep = _.clone(Creep);
    });

    it("should store saved values in memory", () => {
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(EmptyMemory);
        const test = new TestClass();
        test.data["a"] = { task: HarvestEnergyTask };
        test.data["b"] = { task: HarvestEnergyTask, source: <Source>{ id: "1234567890" } };
        assert.strictEqual(JSON.stringify(Memory), JSON.stringify(FilledMemory));
    });

    it("should load saved values from memory", () => {
        global.Game.getObjectById = (id: Id<any>): any => {
            assert.equal(id, MockSource.id);
            return MockSource;
        };

        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(FilledMemory);
        const test = new TestClass();
        assert.strictEqual(test.data.a.task, HarvestEnergyTask);
        assert.strictEqual(test.data.b.task, HarvestEnergyTask);
        assert.equal(test.data.b.source, MockSource);
    })
});
