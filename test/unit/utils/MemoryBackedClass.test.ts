import { assert } from "chai";
import sinonChai from "sinon-chai";
import { BackingMemoryRecord, MemoryBackedClass, SerDeFunctions } from "utils/MemoryBackedClass";

// Types
type Arbitrary = {};
interface TestObjectRecord {
    propA: string,
    propB?: string
};
type TestObjectRecordCollection = Record<string, TestObjectRecord>;
type TestObjectMemory = BackingMemoryRecord<TestObjectRecordCollection>;

type TestArrayRecord = Arbitrary[]
type TestArrayMemory = BackingMemoryRecord<TestArrayRecord>;

type TestClassMemory = { Objects?: TestObjectMemory, Array?: TestArrayMemory, };

type MockMemory = { Test?: TestClassMemory, };
declare global {
    interface Memory extends MockMemory { }
}
/*
Memory = {
  Test = {
    Objects = {
        keyA: {
            a: Thing1,
            b: Thing2
        },
        b: Thing2
    },
    Array = [
        Thing1,
        Thing2
    ]
  }
}
*/

// Fixtures
const MockSource: Source = <Source>{ id: "1234567890" };
const EmptyMemory: MockMemory = {}
const FilledMemoryObject: MockMemory = {
    Test: {
        Objects: {
            a: {
            },
            b: {
            }
        }
    }
}
const FilledMemoryArray = {
    Test: {
        Array: [
        ],
    }
}
const InvalidMemory: MockMemory = {
    Test: {
        Objects: {
            a: {
            },
        },
        Array: [
        ],
    }
}

const Game: object = {};
class Creep {
}
// @ts-ignore
global.Creep = Creep;

// TODO this is way too much code for a test implementation
class TestClass extends MemoryBackedClass {
    constructor() { super(); }

    // TODO move this all out to a utility helper class that can be tested, leaving only the "glue" untested when we join it up
    // Expose protected methods for testing
    // This is normally an anti-pattern, but we specifically want to test the interface exposed to classes extending us
    public testLoadByIdFromTable<T extends { id: Id<any>; }>(id: Id<T> | undefined, lookupTable: { [id: Id<T>]: T; }): T | undefined {
        return this.loadByIdFromTable(id, lookupTable);
    }
    public testLoadGameObjectById<T extends { id: Id<any>; }>(id: Id<T> | undefined): T | undefined {
        return this.loadGameObjectById(id);
    }
    public testProxyMapOfRecords<SingleRecord extends object>(proxySingleRecord: (fetchMemory: () => BackingMemoryRecord<SingleRecord>, record?: SingleRecord) => SingleRecord | undefined, fetchMemory: () => BackingMemoryRecord<Record<string, SingleRecord>>, emptyRecord: Exclude<SingleRecord, undefined> extends string | number | bigint | boolean ? (string | number | bigint | boolean) & Exclude<SingleRecord, undefined> : Exclude<SingleRecord, undefined> extends { id: Id<any>; } ? Id<Exclude<{ id: Id<any>; } & Exclude<SingleRecord, undefined>, undefined>> : Exclude<SingleRecord, undefined> extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? (O extends string | number | bigint | boolean ? O : O extends { id: Id<any>; } ? Id<Exclude<O, undefined>> : O extends (infer O)[] ? any[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : O extends object ? BackingMemoryRecord<Exclude<O, undefined>> : never)[] : Exclude<SingleRecord, undefined> extends object ? BackingMemoryRecord<Exclude<object & Exclude<SingleRecord, undefined>, undefined>> : never, backingMapOfRecords: Record<string, SingleRecord>): Record<string, SingleRecord> {
        return this.proxyMapOfRecords(proxySingleRecord, fetchMemory, emptyRecord, backingMapOfRecords);
    }
    public testProxyGenericRecord<SingleRecord extends object>(serde: SerDeFunctions<SingleRecord>, fetchMemory: () => BackingMemoryRecord<SingleRecord>, emptyRecord: SingleRecord, initialValue?: SingleRecord): SingleRecord | undefined {
        return this.proxyGenericRecord(serde, fetchMemory, emptyRecord, initialValue);
    }

    // private fetchMemory() {
    //     if (Memory.Test === undefined) Memory.Test = {};
    //     return Memory.Test;
    // }

    // private _objectData: TestObjectRecordCollection | undefined;
    // private fetchObjectMemoryFunction(): () => BackingMemoryRecord<TestObjectRecordCollection> {
    //     return function (this: TestClass) {
    //         const base = this.fetchMemory();
    //         if (base.Object === undefined) base.Object = {};
    //         return base.Object;
    //     }.bind(this);
    // }
    // get objectData(): TestObjectRecordCollection {
    //     if (this._objectData === undefined) {
    //         this._objectData = this.proxyMapOfRecords(this.proxyTestObjectData.bind(this), this.fetchObjectMemoryFunction(), {}, {});
    //     }
    //     return this._objectData;
    // }

    // private proxyTestObjectData(fetchMemory: () => BackingMemoryRecord<TestObjectRecord>, cache?: TestObjectRecord): TestObjectRecord | undefined {
    //     const serde: SerDeFunctions<TestObjectRecord> = {
    //         task: {
    //             required: true,
    //             fromMemory: (m: BackingMemoryRecord<TestObjectRecord>) => { return this.loadByIdFromTable(m.task, Tasks); },
    //             toMemory: (m: BackingMemoryRecord<TestObjectRecord>, task: Task) => {
    //                 m.task = task.id;
    //                 return true;
    //             },
    //         },
    //         source: {
    //             required: false,
    //             fromMemory: (m: BackingMemoryRecord<TestObjectRecord>) => { return this.loadGameObjectById(m.source); },
    //             toMemory: (m: BackingMemoryRecord<TestObjectRecord>, source: Source | undefined) => {
    //                 if (source === undefined) {
    //                     m.source = undefined;
    //                 } else {
    //                     m.source = source.id;
    //                 }
    //                 return true;
    //             },
    //         }
    //     };
    //     return this.proxyGenericRecord(serde, fetchMemory, <TestObjectRecord>{}, cache);
    // }

    // private _arrayData: TestArrayRecord | undefined;
    // private fetchArrayMemoryFunction(): () => BackingMemoryRecord<TestArrayRecord> {
    //     return function (this: TestClass) {
    //         const base = this.fetchMemory();
    //         if (base.Array === undefined) base.Array = [];
    //         return base.Array;
    //     }.bind(this);
    // }
    // private readonly _arrayDataSerDe: SerDeFunctions<TestArrayRecord> = {
    //     __fromMemory__: (memory) => {
    //         let ret: TestArrayRecord = [];
    //         for (const t of memory) {
    //             const task = this.loadByIdFromTable(t, Tasks);
    //             if (task !== undefined) ret.push(task);
    //         }
    //         return ret;
    //     },
    //     __toMemory__: (memory, value) => {
    //         while (memory.length > 0) memory.shift();
    //         for (const t of value) {
    //             memory.push(t.id);
    //         }
    //         return true;
    //     },
    // }
    // get arrayData(): TestArrayRecord {
    //     if (this._arrayData === undefined) {
    //         this._arrayData = this.proxyGenericRecord<TestArrayRecord>(this._arrayDataSerDe, this.fetchArrayMemoryFunction(), []);
    //     }
    //     if (this._arrayData == undefined) throw new Error("Unable to create arrayData proxy");
    //     return this._arrayData;
    // }
    // set arrayData(value) {
    //     if (value == undefined) {
    //         this._arrayData = undefined;
    //     } else {
    //         this._arrayData = this.proxyGenericRecord<TestArrayRecord>(this._arrayDataSerDe, this.fetchArrayMemoryFunction(), [], value);
    //     }

    // }
}

xdescribe("MemoryBackedClass", () => {
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

    // it("should store saved values in memory", () => {
    //     // @ts-ignore : allow adding Memory to global
    //     global.Memory = _.clone(EmptyMemory);
    //     const test = new TestClass();
    //     test.objectData["a"] = { task: HarvestEnergyTask };
    //     test.objectData["b"] = { task: HarvestEnergyTask, source: <Source>{ id: "1234567890" } };
    //     assert.strictEqual(JSON.stringify(Memory), JSON.stringify(FilledMemoryObject));
    // });

    // it("should load saved values from memory", () => {
    //     // Shim
    //     global.Game.getObjectById = (id: Id<any>): any => {
    //         assert.equal(id, MockSource.id);
    //         return MockSource;
    //     };

    //     // @ts-ignore : allow adding Memory to global
    //     global.Memory = _.clone(FilledMemoryObject);
    //     const test = new TestClass();
    //     assert.strictEqual(test.objectData.a.task, HarvestEnergyTask);
    //     assert.strictEqual(test.objectData.b.task, HarvestEnergyTask);
    //     assert.deepEqual(test.objectData.b.source, MockSource);
    // });

    // it("should work across multiple ticks", () => {
    //     // @ts-ignore : allow adding Memory to global
    //     global.Memory = _.clone(EmptyMemory);
    //     const test = new TestClass();
    //     test.objectData["a"] = { task: HarvestEnergyTask };
    //     test.objectData["b"] = { task: HarvestEnergyTask };

    //     // Simulate a serialize/de-serialize sequence between ticks
    //     // @ts-ignore : allow overwriting Memory
    //     global.Memory = JSON.parse(JSON.stringify(Memory));

    //     test.objectData["b"].source = <Source>{ id: "1234567890" };
    //     assert.strictEqual(JSON.stringify(Memory), JSON.stringify(FilledMemoryObject));
    // });

    // it("should have all keys in memory", () => {
    //     global.Game.getObjectById = (id: Id<any>): any => {
    //         assert.equal(id, MockSource.id);
    //         return MockSource;
    //     };

    //     // @ts-ignore : allow adding Memory to global
    //     global.Memory = _.clone(FilledMemoryObject);
    //     const test = new TestClass();
    //     assert.deepEqual(Object.keys(test.objectData), ["a", "b"]);
    //     assert.isTrue("a" in test.objectData);
    // });

    // it("should load array values", () => {
    //     // @ts-ignore : allow adding Memory to global
    //     global.Memory = _.clone(FilledMemoryArray);
    //     const test = new TestClass();
    //     assert.deepEqual(test.arrayData[0], HarvestEnergyTask);
    //     assert.deepEqual(test.arrayData, [HarvestEnergyTask, HarvestEnergyTask]);
    // });

    // it("should persist a full array replacement", () => {
    //     // @ts-ignore : allow adding Memory to global
    //     global.Memory = _.clone(FilledMemoryArray);
    //     const test = new TestClass();
    //     test.arrayData = [DepositEnergyTask, DepositEnergyTask];
    //     assert.strictEqual(JSON.stringify(Memory.Test?.Array), JSON.stringify([DepositEnergyTask.id, DepositEnergyTask.id]));
    // });
});
