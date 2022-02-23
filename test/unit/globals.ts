export { };

// Base class that will receive extensions
class TestCreepClass {
}


// Apply extensions

// @ts-ignore : allow adding Creep to global
global.Creep = TestCreepClass;

import 'extensions';

// @ts-ignore : avoid side effects
delete global.Creep;


// Helpers
export const globalsSetup = () => {
    // @ts-ignore Use the extended class
    global.Creep = TestCreepClass;
}

export const globalsCleanup = () => {
    // @ts-ignore Clean up changes to global state
    delete global.Creep;
}
