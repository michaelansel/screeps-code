// Global constants for Screeps API in tests
declare global {
  // Game object constants
  const FIND_SOURCES: number;
  const FIND_MY_CONSTRUCTION_SITES: number;
  const FIND_STRUCTURES: number;
  const FIND_MY_SPAWNS: number;
  const FIND_MY_STRUCTURES: number;
  const FIND_CREEPS: number;
  const FIND_HOSTILE_CREEPS: number;
  
  // Resource constants
  const RESOURCE_ENERGY: string;
  
  // Structure constants
  const STRUCTURE_CONTAINER: string;
  const STRUCTURE_WALL: string;
  const STRUCTURE_RAMPART: string;
  const STRUCTURE_EXTENSION: string;
  const STRUCTURE_ROAD: string;
  const STRUCTURE_SPAWN: string;
  const STRUCTURE_TOWER: string;
  const STRUCTURE_STORAGE: string;
  const STRUCTURE_LINK: string;
  
  // Body part constants
  const WORK: string;
  const CARRY: string;
  const MOVE: string;
  
  // Other constants
  const BODYPART_COST: { [bodyPart: string]: number };
  const TERRAIN_MASK_WALL: number;
  const LOOK_STRUCTURES: string;
  const OK: number;
  const ERR_NOT_ENOUGH_ENERGY: number;
  const ERR_BUSY: number;
}

export {};