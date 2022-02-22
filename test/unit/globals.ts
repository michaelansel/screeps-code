export { };

class EmptyCreepClass {
    memory = {};
}
// @ts-ignore : allow adding Creep to global
global.Creep = EmptyCreepClass;
