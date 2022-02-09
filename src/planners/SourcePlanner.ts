import { stringify } from "querystring";
import { HarvestEnergyTask, Task, Tasks } from "tasks";

type JsonNativeTypes = string | number | bigint | boolean;
type BackingMemoryRecord<Record extends object> = {
    [Property in keyof Record]?:
    // If type has id, then use the Id<> tag for serialization; undefined is allowed here so that data objects can have optional properties
    Record[Property] extends { id: Id<any> } | undefined ? Id<Extract<Record[Property], { id: Id<any> }>> // Extract is used to remove the undefined possibility from the Id generic
    // If type is native, serialize directly
    : Record[Property] extends JsonNativeTypes | undefined ? Record[Property]
    // Fail on other types (i.e. come update here when that happens)
    : never;
}
type SerDeFunctions<Record extends object> = {
    toMemory: {
        required: Required<{
            [Property in RequiredKeys<Record>]: (memory: BackingMemoryRecord<Record>, value: Record[Property]) => boolean;
        }>,
        optional: Required<{
            [Property in OptionalKeys<Record>]: (memory: BackingMemoryRecord<Record>, value: Record[Property]) => boolean;
        }>,
    },
    fromMemory: {
        required: Required<{
            [Property in RequiredKeys<Record>]: (memory: BackingMemoryRecord<Record>) => Record[Property] | undefined;
        }>,
        optional: Required<{
            [Property in OptionalKeys<Record>]: (memory: BackingMemoryRecord<Record>) => Record[Property] | undefined;
        }>,
    },
}
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
type OnlyRequiredKeys<T> = { [Property in RequiredKeys<T>]: T[Property] };
type OnlyOptionalKeys<T> = { [Property in OptionalKeys<T>]: T[Property] };

class MemoryBackedClass {
    protected constructor() { }

    protected loadByIdFromTable<T>(id: Id<T> | undefined, lookupTable: { [id: Id<T>]: T }): T | undefined {
        if (id == undefined) {
            return undefined;
        } else {
            if (id in lookupTable) {
                return lookupTable[id];
            }
            // else: this is an invalid/not-found ID, so we return undefined
        }
        return undefined;
    }

    protected loadGameObjectById<T>(id: Id<T> | undefined): T | undefined {
        if (id == undefined) {
            return undefined;
        } else {
            const obj = Game.getObjectById(id);
            return obj ? obj : undefined;
        }
    }
    protected nullToUndefined(input: any): any {
        if (input === null) return undefined;
        return input;
    }

    protected proxyGenericObject<CacheRecord extends object>(
        proxyCacheRecord: (memory: BackingMemoryRecord<CacheRecord>, cache?: CacheRecord) => CacheRecord | undefined,
        fetchMemory: () => Record<string, BackingMemoryRecord<CacheRecord>>,
        cache: Record<string, CacheRecord>,
    ): Record<string, CacheRecord> {
        return new Proxy<Record<string, CacheRecord>>(cache, {
            get: (target: Record<string, CacheRecord>, prop: string): CacheRecord | undefined => {
                const memory = fetchMemory();
                if (!target) return undefined;
                if (prop in target) return target[prop];
                if (prop in memory) {
                    const data = memory[prop];
                    const proxy = proxyCacheRecord(data);
                    if (proxy !== undefined) {
                        target[prop] = proxy;
                        console.log(`Loaded ${prop} from memory: ${target[prop]}`);
                    }
                    return proxy;
                }
                return undefined;
            },
            set: (target, key: string, value: CacheRecord) => {
                const memory = fetchMemory();
                const memoryRecord: BackingMemoryRecord<CacheRecord> = {};
                const proxy = proxyCacheRecord(memoryRecord, value);
                if (proxy === undefined) {
                    return false;
                } else {
                    console.log(`Saving new record to memory: ${key} : ${JSON.stringify(memoryRecord)}`);
                    target[key] = proxy;
                    memory[key] = memoryRecord;
                    console.log(`Full proxy memory: ${JSON.stringify(memory)}`);
                    console.log(`Sameness check: ${memory === Memory.SourcePlanner?.creeps}`);
                    return true;
                }
            },
            deleteProperty: (target, prop: string): boolean => {
                const memory = fetchMemory();
                if (!target) return false;
                delete target[prop];
                delete memory[prop];
                return true;
            }
        });
    }

    protected proxyGenericRecord<CacheRecord extends object>(
        serde: SerDeFunctions<CacheRecord>,
        fetchMemory: () => BackingMemoryRecord<CacheRecord>,
        cache?: CacheRecord,
    ): CacheRecord | undefined {
        const memory = fetchMemory();
        if (cache === undefined) {
            // Pre-load required properties from memory; not sure how to make the type system happy here
            cache = <CacheRecord>{};
            const required = serde.fromMemory.required;
            for (const key in required) {
                // TODO Pretty sure "as keyof typeof" is just telling the type system to pound sand, which is bad
                let value = required[key as keyof typeof required](memory);
                if (value == undefined) { return undefined; }
                cache[key as keyof typeof required] = value;
            }
        } else {
            // Overwrite memory with state in CacheRecord
            for (const funcs of Object.values(serde.toMemory)) {
                for (const func in funcs) {
                    // @ts-ignore I don't understand what the heck is going on here type-wise
                    funcs[func](memory, cache[func]);
                }
            }
            console.log("Overwriting memory with new values: " + JSON.stringify(memory));
        }
        if (cache === undefined) {
            console.log('wtf');
            return undefined;
        }
        return new Proxy<CacheRecord>(cache, {
            get: (target: CacheRecord, prop: string) => {
                const memory = fetchMemory();
                if (!target) return undefined;
                if (prop in target) return target[prop as keyof typeof target];
                if (prop in memory) {
                    if (prop in serde.fromMemory.optional) {
                        let value = serde.fromMemory.optional[prop as keyof typeof serde.fromMemory.optional](memory);
                        if (value !== undefined) {
                            target[prop as keyof typeof target] = value;
                            console.log(`Loaded ${prop} from memory: ${target[prop as keyof typeof target]}`);
                        }
                        return value;
                    }
                }
                return undefined;
            },
            set: (target, prop: string | Symbol, value) => {
                const memory = fetchMemory();
                if (typeof prop !== 'string') return false;
                target[prop as keyof typeof target] = value;
                for (const funcs of Object.values(serde.toMemory)) {
                    if (prop in funcs) {
                        funcs[prop as keyof typeof funcs](memory, value);
                        return true;
                    }
                }
                return false;
            },
        });
    }
}

interface SourcePlannerCreepData {
    task: Task,
    source?: Source,
};
type SourcePlannerCreepDataMemory = BackingMemoryRecord<SourcePlannerCreepData>;

type SourcePlannerCreeps = Record<string, SourcePlannerCreepData>;
type SourcePlannerCreepsMemory = Record<string, SourcePlannerCreepDataMemory>;
export interface SourcePlannerMemory {
    creeps?: SourcePlannerCreepsMemory;
}

export class SourcePlanner extends MemoryBackedClass {
    private static _instance: SourcePlanner;
    static get instance(): SourcePlanner {
        if (!SourcePlanner._instance) {
            SourcePlanner._instance = new SourcePlanner();
        }
        return SourcePlanner._instance;
    };
    private constructor() { super(); };

    private _creeps: SourcePlannerCreeps | undefined;

    private proxySourcePlannerCreepData(memory: SourcePlannerCreepDataMemory, cache?: SourcePlannerCreepData): SourcePlannerCreepData | undefined {
        const serde: SerDeFunctions<SourcePlannerCreepData> = {
            fromMemory: {
                required: {
                    'task': (m: SourcePlannerCreepDataMemory) => { return this.loadByIdFromTable(m.task, Tasks); },
                },
                optional: {
                    'source': (m: SourcePlannerCreepDataMemory) => { return this.loadGameObjectById(m.source); },
                }
            },
            toMemory: {
                required: {
                    'task': (m: SourcePlannerCreepDataMemory, task: Task) => {
                        m.task = task.id;
                        return true;
                    },
                },
                optional: {
                    'source': (m: SourcePlannerCreepDataMemory, source: Source | undefined) => {
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

    get creeps(): SourcePlannerCreeps {
        if (this._creeps === undefined) {
            function fetchMemory() {
                // TODO this is the wrong place for this check
                if (Memory.SourcePlanner === undefined) Memory.SourcePlanner = {};
                if (Memory.SourcePlanner.creeps === undefined) Memory.SourcePlanner.creeps = {};
                return Memory.SourcePlanner.creeps;
            }
            this._creeps = this.proxyGenericObject(this.proxySourcePlannerCreepData.bind(this), fetchMemory, {});
        }
        return this._creeps;
    };

    // Request SourcePlanner to assign a Source by the end of the tick; may or may not happen
    requestSourceAssignment(creep: Creep): void {
        if (creep.task !== null) {
            console.log(`${creep.name} would like to harvest from an available Source`);
            this.creeps[creep.name] = {
                task: creep.task
            };
        }
    }
    assignSources(): void {
        for (const name in this.creeps) {
            // Only maintain request until task changes
            if (Game.creeps[name].task !== this.creeps[name].task) {
                delete this.creeps[name];
            }
        }
        for (const room in Game.rooms) {
            const sources = Game.rooms[room].find(FIND_SOURCES);
            let unassignedCreeps = Object.keys(this.creeps).filter((name) => { return Game.creeps[name].room.name == room; })
            let creepsBySource = new Map<Id<Source>, Creep[]>();
            // TODO Optimize requests based on number of WORK parts and path distance to Source
            for (const source of sources) {
                if (!creepsBySource.has(source.id)) creepsBySource.set(source.id, []);
                // Override the type checker because we know assignedCreeps isn't empty via the above test
                const assignedCreeps = <Creep[]>creepsBySource.get(source.id);
                while (assignedCreeps.length < 3 && unassignedCreeps.length > 0) {
                    // Override the type checker because we know unassignedCreeps isn't empty via the while condition
                    const nextCreepName: string = <string>unassignedCreeps.shift();
                    assignedCreeps.push(Game.creeps[nextCreepName]);
                    this.creeps[nextCreepName].source = source;
                    console.log(`Assigning ${nextCreepName} to Source[${source.id}]`);
                    console.log(JSON.stringify(Memory.SourcePlanner?.creeps));
                }
            }
            for (const sourceId of creepsBySource.keys()) {
                let creeps = creepsBySource.get(sourceId);
                if (creeps === undefined) creeps = [];
                for (const creep of creeps) {
                    creep.memory.source = sourceId;
                }
            }
            if (unassignedCreeps.length > 0) {
                console.log("Ran out of space at Sources for waiting creeps: " + unassignedCreeps.join(', '));
            }
        }
    }
}
