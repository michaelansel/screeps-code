// Map of an ID-able object to an arbitrary value, keyed internally on the ID-able object's ID
export class IdMap<K extends { id: Id<K>; }, V> implements Map<K, V> {
    private map;

    public constructor() {
        this.map = new Map<Id<K>, { key: K; value: V; }>();
    }
    get size() { return this.map.size; }
    clear(): void {
        this.map.clear();
    }
    delete(key: K): boolean {
        return this.map.delete(key.id);
    }
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        throw new Error("Method not implemented.");
    }
    get(key: K): V | undefined {
        return this.map.get(key.id)?.value;
    }
    has(key: K): boolean {
        return this.map.has(key.id);
    }
    set(key: K, value: V): this {
        this.map.set(key.id, { key: key, value: value });
        return this;
    }
    entries(): IterableIterator<[K, V]> {
        throw new Error("Method not implemented.");
    }
    keys(): IterableIterator<K> {
        const keys = Array.from(this.map.keys())
            .map(
                (id) => {
                    const obj = this.map.get(id);
                    if (obj !== undefined)
                        return obj.key;
                    throw new Error("Impossible: key is both in and not in map");
                }
            );
        // Do something spooky to make eslint happy
        return Array.prototype[Symbol.iterator].bind(keys)();
    }
    values(): IterableIterator<V> {
        const values = Array.from(this.map.values())
            .map(
                (obj) => { return obj.value; }
            );
        // Do something spooky to make eslint happy
        return Array.prototype[Symbol.iterator].bind(values)();
    }
    [Symbol.iterator](): IterableIterator<[K, V]> {
        throw new Error("Method not implemented.");
    }
    readonly [Symbol.toStringTag]: string = "IdMap";
}
