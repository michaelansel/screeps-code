// Mock RESOURCE_ENERGY constant
(global as any).RESOURCE_ENERGY = 'energy';

export const Game: {
  creeps: { [name: string]: any };
  rooms: any;
  spawns: any;
  time: any;
} = {
  creeps: {},
  rooms: {},
  spawns: {},
  time: 12345
};

export const Memory: {
  creeps: { [name: string]: any };
  creepCounter?: number;
} = {
  creeps: {},
  creepCounter: 0
};

export const Creep: {
  run(): void;
  memory: any;
  store: any;
} = {
  run: () => {},
  memory: {},
  store: {
    energy: 0,
    getCapacity: () => 50
  }
};
