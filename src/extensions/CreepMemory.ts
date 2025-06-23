import * as Tasking from "./Creep/Tasking";

export interface CreepCapabilityMemory {
  primary: string;      // Primary capability this creep was spawned for
  secondary: string;    // Secondary capability
}

declare global {
  interface CreepMemory extends CreepMemoryExtension {}

  interface CreepMemoryExtension {
    project?: Tasking.CreepProjectMemory; // CreepTaskingExtension
    task?: Tasking.CreepTaskMemory; // CreepTaskingExtension
    role?: string; // DEPRECATED - Role name for backwards compatibility
    
    // New capability-based system
    spawnTime?: number;
    purpose?: string;  // Why this creep was spawned (e.g., "harvest", "build")
    capabilities?: CreepCapabilityMemory;
    bodyTemplate?: string;  // Which template was used to spawn
  }
}
