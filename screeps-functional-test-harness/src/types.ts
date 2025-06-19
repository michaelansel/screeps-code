/**
 * Core types for the Screeps Functional Test Harness
 */

export interface ContainerRuntime {
  name: 'docker' | 'finch';
  available: boolean;
}

export interface ServerConfig {
  containerImage?: string;
  composeFile?: string;
  ports?: {
    game: number;
    cli: number;
  };
  timeout?: number;
}

export interface DeploymentResult {
  success: boolean;
  userId: string;
  codeSize: number;
  room: string;
  error?: string;
}

export interface ExecutionResult {
  ticksAdvanced: number;
  cpuUsed: boolean;
  spawnActive: boolean;
  memoryInitialized: boolean;
  consoleOutput: string[];
}

export interface MonitorOptions {
  duration: number; // seconds
  expectations: {
    minTicks: number;
    cpuUsed?: boolean;
    spawnActive?: boolean;
  };
}

export interface GameObjects {
  spawns: { name: string; energy: number }[];
  creeps: { name: string; memory: any }[];
  sources: { id: string; energy: number }[];
  total: number;
}

export interface MemoryStats {
  exists: boolean;
  size: number;
  hasCreeps: boolean;
  creepCount: number;
  hasCreepCounter: boolean;
  memoryStructure: string[];
}

export interface UserInfo {
  userId: string;
  memory: any;
}

export interface RoomInfo {
  name: string;
  objects: GameObjects;
}

export interface SimulationState {
  tick: number;
  paused: boolean;
  cpu: number;
}