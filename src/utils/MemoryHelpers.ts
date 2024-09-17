export function loadByIdFromTable<T extends _HasId>(id: Id<T> | undefined, lookupTable: { [id: Id<T>]: T }): T | undefined {
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

export function loadGameObjectById<T extends _HasId>(id: Id<T> | undefined): T | undefined {
    if (id == undefined) {
        return undefined;
    } else {
        const obj = Game.getObjectById(id);
        return obj ? obj : undefined;
    }
}
