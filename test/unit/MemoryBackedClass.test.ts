import { assert } from "chai";
import { HarvestEnergyTask, Task, Tasks } from "tasks";
import { BackingMemoryRecord, MemoryBackedClass, SerDeFunctions } from "utils/MemoryBackedClass";

// Types
interface ObjectRecord {
    task: Task,
    source?: Source
};
type ObjectRecordCollection = Record<string, ObjectRecord>;
type ObjectMemory = BackingMemoryRecord<ObjectRecordCollection>;

type MockMemory = { Object?: ObjectMemory };
declare global {
    interface Memory extends MockMemory { }
}

// Fixtures
const MockSource: Source = <Source>{ id: "1234567890" };
const EmptyMemory: MockMemory = {}
const FilledMemoryObject: MockMemory = {
    Object: {
        a: {
            task: "HarvestEnergyTask" as Id<Task>,
        },
        b: {
            task: "HarvestEnergyTask" as Id<Task>,
            source: "1234567890" as Id<Source>,
        }
    }
}
const InvalidMemory: MockMemory = {
    Object: {
        a: {
            task: "InvalidRequiredParameter" as Id<Task>,
        },
    },
}

const Game: object = {};
class Creep {
}
// @ts-ignore
global.Creep = Creep;

class TestClass extends MemoryBackedClass {
    constructor() { super(); }

    private _data: ObjectRecordCollection | undefined;
    get data(): ObjectRecordCollection {
        if (this._data === undefined) {
            function fetchMemory() {
                // TODO this is the wrong place for this check
                if (Memory.Object === undefined) Memory.Object = {};
                return Memory.Object;
            }
            this._data = this.proxyMapOfRecords(this.proxyTestData.bind(this), fetchMemory, {}, {});
        }
        return this._data;
    }

    private proxyTestData(fetchMemory: () => BackingMemoryRecord<ObjectRecord>, cache?: ObjectRecord): ObjectRecord | undefined {
        const serde: SerDeFunctions<ObjectRecord> = {
            task: {
                required: true,
                fromMemory: (m: BackingMemoryRecord<ObjectRecord>) => { return this.loadByIdFromTable(m.task, Tasks); },
                toMemory: (m: BackingMemoryRecord<ObjectRecord>, task: Task) => {
                    m.task = task.id;
                    return true;
                },
            },
            source: {
                required: false,
                fromMemory: (m: BackingMemoryRecord<ObjectRecord>) => { return this.loadGameObjectById(m.source); },
                toMemory: (m: BackingMemoryRecord<ObjectRecord>, source: Source | undefined) => {
                    if (source === undefined) {
                        m.source = undefined;
                    } else {
                        m.source = source.id;
                    }
                    return true;
                },
            }
        };
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
        assert.strictEqual(JSON.stringify(Memory), JSON.stringify(FilledMemoryObject));
    });

    it("should load saved values from memory", () => {
        global.Game.getObjectById = (id: Id<any>): any => {
            assert.equal(id, MockSource.id);
            return MockSource;
        };

        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(FilledMemoryObject);
        const test = new TestClass();
        assert.strictEqual(test.data.a.task, HarvestEnergyTask);
        assert.strictEqual(test.data.b.task, HarvestEnergyTask);
        assert.equal(test.data.b.source, MockSource);
    });

    it("should work across multiple ticks", () => {
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(EmptyMemory);
        const test = new TestClass();
        test.data["a"] = { task: HarvestEnergyTask };
        test.data["b"] = { task: HarvestEnergyTask };
        // @ts-ignore : allow overwriting Memory
        global.Memory = JSON.parse(JSON.stringify(Memory));
        test.data["b"].source = <Source>{ id: "1234567890" };
        assert.strictEqual(JSON.stringify(Memory), JSON.stringify(FilledMemoryObject));
    });

    it("should have all keys in memory", () => {
        global.Game.getObjectById = (id: Id<any>): any => {
            assert.equal(id, MockSource.id);
            return MockSource;
        };

        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(FilledMemoryObject);
        const test = new TestClass();
        assert.deepEqual(Object.keys(test.data), ["a", "b"]);
        assert.isTrue("a" in test.data);
    });
});
