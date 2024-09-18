export { };

// Base class that will receive extensions
class TestCreepClass {
}


// Apply extensions
import { use } from 'extensions';
// @ts-ignore I'm intentionally shoving in an invalid class to be extended
use({ "Creep": TestCreepClass });


// Helpers
export const globalsSetup = () => {
    // @ts-ignore Use the extended class
    global.Creep = TestCreepClass;
}

export const globalsCleanup = () => {
    // @ts-ignore Clean up changes to global state
    delete global.Creep;
}
