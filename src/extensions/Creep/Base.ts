export interface CreepBaseExtension { }

export class CreepBaseExtensionClass {
    protected get creep(): Creep { return <Creep><unknown>this; } // Do the funky typecast once instead of everywhere
}
