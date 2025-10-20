import { SourcePlannerMemory } from "planners/SourcePlanner.js";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LoggerMemory {
  componentLogLevels?: { [component: string]: LogLevel };
}

declare global {
  interface Memory extends MemoryExtension {}

  interface MemoryExtension {
    creepCounter?: number; // main.ts for generating unique creep names
    SourcePlanner?: SourcePlannerMemory;
    Logger?: LoggerMemory;
  }
}
