import { assert } from "chai";
import { DepositEnergyTask, HarvestEnergyTask, Task, Tasks } from "tasks";
import { BackingMemoryRecord, MemoryBackedClass, SerDeFunctions } from "utils/MemoryBackedClass";

// Types
interface ObjectRecord {
    task: Task,
    source?: Source
};
type ObjectRecordCollection = Record<string, ObjectRecord>;
type ObjectMemory = BackingMemoryRecord<ObjectRecordCollection>;

type ArrayRecord = Task[]
type ArrayMemory = BackingMemoryRecord<ArrayRecord>;

type TestClassMemory = { Object?: ObjectMemory, Array?: ArrayMemory, };

type MockMemory = { Test?: TestClassMemory, };
declare global {
    interface Memory extends MockMemory { }
}

// Fixtures
const MockSource: Source = <Source>{ id: "1234567890" };
const EmptyMemory: MockMemory = {}
const FilledMemoryObject: MockMemory = {
    Test: {
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
}
const FilledMemoryArray = {
    Test: {
        Array: [
            "HarvestEnergyTask" as Id<Task>,
            "HarvestEnergyTask" as Id<Task>,
        ],
    }
}
const InvalidMemory: MockMemory = {
    Test: {
        Object: {
            a: {
                task: "InvalidRequiredParameter" as Id<Task>,
            },
        },
        Array: [
            "InvalidRequiredParameter" as Id<Task>,
        ],
    }
}

const Game: object = {};
class Creep {
}
// @ts-ignore
global.Creep = Creep;

class TestClass extends MemoryBackedClass {
    constructor() { super(); }

    private fetchMemory() {
        if (Memory.Test === undefined) Memory.Test = {};
        return Memory.Test;
    }

    private _objectData: ObjectRecordCollection | undefined;
    private fetchObjectMemoryFunction(): () => BackingMemoryRecord<ObjectRecordCollection> {
        return function (this: TestClass) {
            const base = this.fetchMemory();
            if (base.Object === undefined) base.Object = {};
            return base.Object;
        }.bind(this);
    }
    get objectData(): ObjectRecordCollection {
        if (this._objectData === undefined) {
            this._objectData = this.proxyMapOfRecords(this.proxyTestObjectData.bind(this), this.fetchObjectMemoryFunction(), {}, {});
        }
        return this._objectData;
    }

    private proxyTestObjectData(fetchMemory: () => BackingMemoryRecord<ObjectRecord>, cache?: ObjectRecord): ObjectRecord | undefined {
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
        return this.proxyGenericRecord(serde, fetchMemory, <ObjectRecord>{}, cache);
    }

    private _arrayData: ArrayRecord | undefined;
    private fetchArrayMemoryFunction(): () => BackingMemoryRecord<ArrayRecord> {
        return function (this: TestClass) {
            const base = this.fetchMemory();
            if (base.Array === undefined) base.Array = [];
            return base.Array;
        }.bind(this);
    }
    private readonly _arrayDataSerDe: SerDeFunctions<ArrayRecord> = {
        __fromMemory__: (memory) => {
            //console.log("loading array from memory");
            let ret: ArrayRecord = [];
            for (const t of memory) {
                const task = this.loadByIdFromTable(t, Tasks);
                if (task !== undefined) ret.push(task);
            }
            return ret;
        },
        __toMemory__: (memory, value) => {
            while (memory.length > 0) memory.shift();
            for (const t of value) {
                memory.push(t.id);
            }
            return true;
        },
    }
    get arrayData(): ArrayRecord {
        if (this._arrayData === undefined) {
            this._arrayData = this.proxyGenericRecord<ArrayRecord>(this._arrayDataSerDe, this.fetchArrayMemoryFunction(), []);
        }
        if (this._arrayData == undefined) throw new Error("Unable to create arrayData proxy");
        return this._arrayData;
    }
    set arrayData(value) {
        if (value == undefined) {
            this._arrayData = undefined;
        } else {
            this._arrayData = this.proxyGenericRecord<ArrayRecord>(this._arrayDataSerDe, this.fetchArrayMemoryFunction(), [], value);
        }

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
        test.objectData["a"] = { task: HarvestEnergyTask };
        test.objectData["b"] = { task: HarvestEnergyTask, source: <Source>{ id: "1234567890" } };
        assert.strictEqual(JSON.stringify(Memory), JSON.stringify(FilledMemoryObject));
    });

    it("should load saved values from memory", () => {
        // Shim
        global.Game.getObjectById = (id: Id<any>): any => {
            assert.equal(id, MockSource.id);
            return MockSource;
        };

        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(FilledMemoryObject);
        const test = new TestClass();
        assert.strictEqual(test.objectData.a.task, HarvestEnergyTask);
        assert.strictEqual(test.objectData.b.task, HarvestEnergyTask);
        assert.deepEqual(test.objectData.b.source, MockSource);
    });

    it("should work across multiple ticks", () => {
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(EmptyMemory);
        const test = new TestClass();
        test.objectData["a"] = { task: HarvestEnergyTask };
        test.objectData["b"] = { task: HarvestEnergyTask };

        // Simulate a serialize/de-serialize sequence between ticks
        // @ts-ignore : allow overwriting Memory
        global.Memory = JSON.parse(JSON.stringify(Memory));

        test.objectData["b"].source = <Source>{ id: "1234567890" };
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
        assert.deepEqual(Object.keys(test.objectData), ["a", "b"]);
        assert.isTrue("a" in test.objectData);
    });

    it("should load array values", () => {
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(FilledMemoryArray);
        const test = new TestClass();
        assert.deepEqual(test.arrayData[0], HarvestEnergyTask);
        assert.deepEqual(test.arrayData, [HarvestEnergyTask, HarvestEnergyTask]);
    });

    it("should persist a full array replacement", () => {
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(FilledMemoryArray);
        const test = new TestClass();
        test.arrayData = [DepositEnergyTask, DepositEnergyTask];
        assert.strictEqual(JSON.stringify(Memory.Test?.Array), JSON.stringify([DepositEnergyTask.id, DepositEnergyTask.id]));
    });
});
