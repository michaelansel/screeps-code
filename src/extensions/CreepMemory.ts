import * as Tasking from "./Creep/Tasking";

declare global {
  interface CreepMemory extends CreepMemoryExtension {}

  interface CreepMemoryExtension {
    project?: Tasking.CreepProjectMemory; // CreepTaskingExtension
    task?: Tasking.CreepTaskMemory; // CreepTaskingExtension
  }
}
