type JsonNativeTypes = string | number | bigint | boolean;
type SeriablizableById = {id: Id<any>};

type Serialized<T> =
// If type is native, serialize directly
T extends JsonNativeTypes ? T :
// If type has id, then use the Id<> tag for serialization
T extends SeriablizableById ? Id<Exclude<T, undefined>> :
// If type is array, serialize objects
T extends Array<infer O> ? Array<Serialized<O>> :
// If type is a generic object, serialize each property
T extends object ? BackingMemoryRecord<Exclude<T, undefined>> :
// Fail on other types (i.e. come update here when that happens)
never;

export type BackingMemoryRecord<Record extends object> = {
    // Undefined is excluded because data objects can have optional properties and we don't serialize "undefined"
    [Property in keyof Record]?: Serialized<Exclude<Record[Property], undefined>>;
}
export type SerDeFunctions<Record extends object> = {
    [Property in keyof Record]-?: {
        required: Property extends RequiredKeys<Record> ? true : false,
        fromMemory: (memory: BackingMemoryRecord<Record>) => Record[Property] | undefined,
        toMemory: (memory: BackingMemoryRecord<Record>, value: Record[Property]) => boolean,
    };
}
type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
type OnlyRequiredKeys<T> = { [Property in RequiredKeys<T>]: T[Property] };
type OnlyOptionalKeys<T> = { [Property in OptionalKeys<T>]: T[Property] };

export class MemoryBackedClass {
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

    // Create a memory-backed proxy for Record<string, CacheRecord>
    // where all values are of the same shape. proxyMember is used to
    // create individual proxies for each of the values
    protected proxyMapOfRecords<SingleRecord extends object>(
        proxySingleRecord: (fetchMemory: () => BackingMemoryRecord<SingleRecord>, record?: SingleRecord) => SingleRecord | undefined,
        fetchMemory: () => BackingMemoryRecord<Record<string, SingleRecord>>,
        emptyRecord: Serialized<Exclude<SingleRecord, undefined>>,
        backingMapOfRecords: Record<string, SingleRecord>,
    ): Record<string, SingleRecord> {
        return new Proxy<Record<string, SingleRecord>>(backingMapOfRecords, {
            get: (target: Record<string, SingleRecord>, prop: string): SingleRecord | undefined => {
                const memory = fetchMemory();
                if (!target) return undefined;
                if (prop in target) return target[prop];
                if (prop in memory) {
                    const proxy = proxySingleRecord(() => {
                        const m = fetchMemory()[prop]
                        if (m === undefined) throw new Error(`Unable to retrieve memory object for ${prop}`);
                        return m;
                    });
                    if (proxy !== undefined) {
                        target[prop] = proxy;
                        // console.log(`Loaded ${prop} from memory: ${target[prop]}`);
                    }
                    return proxy;
                }
                return undefined;
            },
            set: (target, key: string, value: SingleRecord) => {
                const memory = fetchMemory();
                memory[key] = _.clone(emptyRecord);
                const proxy = proxySingleRecord(() => {
                    const m = fetchMemory()[key]
                        if (m === undefined) throw new Error(`Unable to retrieve memory object for ${key}`);
                        return m;
                }, value);
                if (proxy === undefined) {
                    // Cleanup non-proxiable entity; this results in also deleting any existing value prior to the attempted overwrite
                    delete memory[key];
                    return false;
                } else {
                    // console.log(`Saving new record to memory: ${key} : ${JSON.stringify(memoryRecord)}`);
                    target[key] = proxy;
                    // console.log(`Full proxy memory: ${JSON.stringify(memory)}`);
                    return true;
                }
            },
            deleteProperty: (target, prop: string): boolean => {
                const memory = fetchMemory();
                if (!target) return false;
                delete target[prop];
                delete memory[prop];
                return true;
            },
            has: (target, prop) => {
                const memory = fetchMemory();
                return prop in memory;
            },
            ownKeys: (target) => {
                const memory = fetchMemory();
                return Object.keys(memory);
            },
            getOwnPropertyDescriptor: (target, prop) => {
                const memory = fetchMemory();
                if (prop in memory) {
                    return {
                        enumerable: true,
                        configurable: true,
                      };
                }
                return undefined;
            },
        });
    }

    // Create a memory-backed proxy for a single object of shape CacheRecord
    // serde functions convert each property of CacheRecord to/from memory
    // cache can be provided to overwrite memory with a specific set of values (vs loading from memory)
    protected proxyGenericRecord<SingleRecord extends object>(
        serde: SerDeFunctions<SingleRecord>,
        fetchMemory: () => BackingMemoryRecord<SingleRecord>,
        backingRecord?: SingleRecord,
    ): SingleRecord | undefined {
        const memory = fetchMemory();
        if (backingRecord === undefined) {
            // Pre-load required properties from memory; not sure how to make the type system happy here
            backingRecord = <SingleRecord>{};
            for (const key in serde) {
                if (!serde[key].required) continue;
                // TODO Pretty sure "as keyof typeof" is just telling the type system to pound sand, which is bad
                let value = serde[key].fromMemory(memory);
                if (value == undefined) { return undefined; }
                backingRecord[key] = value;
            }
        } else {
            // Overwrite memory with state in CacheRecord
            for (const prop in serde) {
                serde[prop].toMemory(memory, backingRecord[prop]);
            }
            // console.log("Overwriting memory with new values: " + JSON.stringify(memory));
        }
        if (backingRecord === undefined) {
            // This should be impossible
            return undefined;
        }
        return new Proxy<SingleRecord>(backingRecord, {
            get: (target: SingleRecord, prop: string) => {
                const memory = fetchMemory();
                if (!target) return undefined;
                if (prop in target) return target[prop as keyof typeof target];
                if (prop in memory) {
                    let value = serde[prop as keyof typeof memory].fromMemory(memory);
                    if (value !== undefined) {
                        target[prop as keyof typeof memory] = value;
                        // console.log(`Loaded ${prop} from memory: ${target[prop as keyof typeof memory]}`);
                    }
                    return value;
                }
                return undefined;
            },
            set: (target, prop: string | Symbol, value) => {
                const memory = fetchMemory();
                if (typeof prop !== 'string') return false;
                if (prop in serde) {
                    target[prop as keyof typeof target] = value;
                    return serde[prop as keyof typeof serde].toMemory(memory, value);
                }
                return false;
            },
        });
    }
}
