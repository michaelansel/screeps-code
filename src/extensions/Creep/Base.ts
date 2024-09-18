export interface CreepBaseExtension {}

export class CreepBaseExtensionClass {
  protected get creep(): Creep {
    return this as unknown as Creep;
  } // Do the funky typecast once instead of everywhere
}
