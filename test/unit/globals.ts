export {};

// Base class that will receive extensions
class TestCreepClass {}

// Apply extensions
import { use } from "extensions";
// @ts-expect-error I'm intentionally shoving in an invalid class to be extended
use({ Creep: TestCreepClass });

// Helpers
export const globalsSetup = () => {
  // @ts-expect-error Use the extended class
  global.Creep = TestCreepClass;
  
  // Add Screeps constants for tests
  (global as any).OK = 0;
  (global as any).ERR_NOT_ENOUGH_ENERGY = -6;
  (global as any).ERR_BUSY = -4;
  (global as any).ERR_FULL = -8;
  (global as any).ERR_NOT_ENOUGH_RESOURCES = -6;
  (global as any).LOOK_STRUCTURES = 'structure';
  (global as any).LOOK_TERRAIN = 'terrain';
  (global as any).LOOK_CONSTRUCTION_SITES = 'constructionSite';
};

export const globalsCleanup = () => {
  // @ts-expect-error Clean up changes to global state
  delete global.Creep;
  
  // Clean up constants
  delete (global as any).OK;
  delete (global as any).ERR_NOT_ENOUGH_ENERGY;
  delete (global as any).ERR_BUSY;
  delete (global as any).ERR_FULL;
  delete (global as any).ERR_NOT_ENOUGH_RESOURCES;
  delete (global as any).LOOK_STRUCTURES;
  delete (global as any).LOOK_TERRAIN;
  delete (global as any).LOOK_CONSTRUCTION_SITES;
};
