import { use as useCreep } from "./Creep";

// This is a bit wonky, but exists so that extensions are applied at runtime, not module load-time
export function use(extend: { Creep?: CreepConstructor }) {
  if (extend.Creep !== undefined) useCreep(extend.Creep);
}

export function discover(global: { Creep?: CreepConstructor }): { Creep?: CreepConstructor } {
  let CreepClass;
  if (global?.Creep) {
    CreepClass = global.Creep;
  } else if (typeof Creep !== "undefined") {
    CreepClass = Creep;
  }

  return {
    Creep: CreepClass
  };
}
