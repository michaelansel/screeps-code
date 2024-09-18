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
};

export const globalsCleanup = () => {
  // @ts-expect-error Clean up changes to global state
  delete global.Creep;
};
