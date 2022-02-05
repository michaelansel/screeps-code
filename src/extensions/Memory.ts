export { }

declare global {
    interface Memory extends MemoryExtension { }

    interface MemoryExtension {
        creepCounter: number;
    }
}
