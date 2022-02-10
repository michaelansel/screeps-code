type JsonNativeTypes = string | number | bigint | boolean;
export type BackingMemoryRecord<Record extends object> = {
    [Property in keyof Record]?:
    // If type has id, then use the Id<> tag for serialization; undefined is allowed here so that data objects can have optional properties
    Record[Property] extends { id: Id<any> } | undefined ? Id<Extract<Record[Property], { id: Id<any> }>> // Extract is used to remove the undefined possibility from the Id generic
    // If type is native, serialize directly
    : Record[Property] extends JsonNativeTypes | undefined ? Record[Property]
    // Fail on other types (i.e. come update here when that happens)
    : never;
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
            for (const key in serde) {
                if (!serde[key].required) continue;
                // TODO Pretty sure "as keyof typeof" is just telling the type system to pound sand, which is bad
                let value = serde[key].fromMemory(memory);
                if (value == undefined) { return undefined; }
                cache[key] = value;
            }
        } else {
            // Overwrite memory with state in CacheRecord
            for (const prop in serde) {
                serde[prop].toMemory(memory, cache[prop]);
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
                    let value = serde[prop as keyof typeof memory].fromMemory(memory);
                    if (value !== undefined) {
                        target[prop as keyof typeof memory] = value;
                        console.log(`Loaded ${prop} from memory: ${target[prop as keyof typeof memory]}`);
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
