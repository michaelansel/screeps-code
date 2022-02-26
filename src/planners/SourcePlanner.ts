import { Task, Tasks } from "tasks";
import { BackingMemoryRecord, MemoryBackedClass, SerDeFunctions } from "utils/MemoryBackedClass";
import { IdMap } from "utils/IdMap";

interface SourcePlannerCreepData {
    task: Task,
    source?: Source,
};
type SourcePlannerCreepDataMemory = BackingMemoryRecord<SourcePlannerCreepData>;

type SourcePlannerCreeps = Record<string, SourcePlannerCreepData>;
type SourcePlannerCreepsMemory = Record<string, SourcePlannerCreepDataMemory>;
export interface SourcePlannerMemory {
    creeps?: SourcePlannerCreepsMemory;
}

export class SourcePlanner extends MemoryBackedClass {
    private static _instance: SourcePlanner;
    static get instance(): SourcePlanner {
        if (!SourcePlanner._instance) {
            SourcePlanner._instance = new SourcePlanner();
        }
        return SourcePlanner._instance;
    };


    private creeps: SourcePlannerCreeps;

    private constructor() {
        super();
        this.creeps = this.proxyMapOfRecords<SourcePlannerCreepData>(this.proxySourcePlannerCreepData.bind(this), this.fetchCreepsMemory.bind(this), {}, {});
    };

    private fetchMemory(): SourcePlannerMemory {
        if (Memory.SourcePlanner === undefined) Memory.SourcePlanner = {};
        return Memory.SourcePlanner;
    }

    private fetchCreepsMemory(): SourcePlannerCreepsMemory {
        const memory = this.fetchMemory();
        if (memory.creeps === undefined) memory.creeps = {};
        return memory.creeps;
    }

    private proxySourcePlannerCreepData(fetchMemory: () => BackingMemoryRecord<SourcePlannerCreepDataMemory>, cache?: SourcePlannerCreepData): SourcePlannerCreepData | undefined {
        const serde: SerDeFunctions<SourcePlannerCreepData> = {
            task: {
                required: true,
                fromMemory: (m: SourcePlannerCreepDataMemory) => { return this.loadByIdFromTable(m.task, Tasks); },
                toMemory: (m: SourcePlannerCreepDataMemory, task: Task) => {
                    m.task = task.id;
                    return true;
                },
            },
            source: {
                required: false,
                fromMemory: (m: SourcePlannerCreepDataMemory) => { return this.loadGameObjectById(m.source); },
                toMemory: (m: SourcePlannerCreepDataMemory, source: Source | undefined) => {
                    if (source === undefined) {
                        m.source = undefined;
                    } else {
                        m.source = source.id;
                    }
                    return true;
                },
            },
        };
        return this.proxyGenericRecord<SourcePlannerCreepData>(serde, fetchMemory, <SourcePlannerCreepData>{}, cache);
    }

    private _addRequest(creep: Creep) {
        if (creep.task === null) {
            console.log(`Ignoring source request from ${creep.name} because task is null`);
        } else {
            this.creeps[creep.name] = {
                task: creep.task
            };
        }
    }

    private _assignCreepToSource(creep: Creep, source: Source) {
        this.creeps[creep.name].source = source;
    }

    private requestingCreeps(): Creep[] {
        for (const name in this.creeps) {
            // Only maintain request until task changes
            if (name in Game.creeps && Game.creeps[name].task === this.creeps[name].task) {
                continue;
            } else {
                // Creep is dead or has changed task
                delete this.creeps[name];
            }
        }
        return Object.keys(this.creeps).
            map((name) => { return Game.creeps[name]; });
    }

    private requestingCreepsInRoom(room: Room): Creep[] {
        return this.requestingCreeps()
            .filter((creep) => { return creep.room.name == room.name; }); // TODO compare objects directly?
    }

    private sourcesInRoom(room: Room): Source[] {
        const sources = room.find(FIND_SOURCES);
        return sources;
    }

    private unassignedCreepsInRoom(room: Room): Creep[] {
        const allCreeps = this.requestingCreepsInRoom(room);
        let unassignedCreepsInRoom = allCreeps
            .filter((creep) => { return this.creeps[creep.name].source === undefined; });
        return unassignedCreepsInRoom;
    }

    private creepsBySourceInRoom(room: Room): Map<Source, Creep[]> {
        const allRequestingCreeps = this.requestingCreepsInRoom(room);
        let unassignedCreepsMap = allRequestingCreeps.reduce(
            (map: { [name: string]: Creep }, creep: Creep) => {
                map[creep.name] = creep;
                return map;
            }, {});
        let creepsBySource = new IdMap<Source, Creep[]>();
        // Rebuild assignment index
        for (const creep of allRequestingCreeps) {
            const creepData = this.creeps[creep.name];
            if (creepData.source !== undefined) {
                console.log(`${creep.name} previously assigned to ${creepData.source.id}`);
                const assignedCreeps = creepsBySource.get(creepData.source) || [];
                assignedCreeps.push(creep);
                creepsBySource.set(creepData.source, assignedCreeps);
                delete unassignedCreepsMap[creep.name];
            }
        }
        return creepsBySource;
    }

    // Request SourcePlanner to assign a Source by the end of the tick; may or may not happen
    requestSourceAssignment(creep: Creep): void {
        console.log(`${creep.name} would like to harvest from an available Source`);
        this._addRequest(creep);
    }

    // Request SourcePlanner to assign Creeps to Sources in a given room
    assignSources(room: Room): void {
        let sources: Source[] = this.sourcesInRoom(room);
        let unassignedCreeps: { [name: string]: Creep } =
            this.unassignedCreepsInRoom(room)
                .reduce(
                    (map: { [key: string]: Creep }, data: Creep) => {
                        const key: string = data['name'];
                        map[data['name']] = data;
                        return map;
                    }, {});
        let creepsBySource: Map<Source, Creep[]> = this.creepsBySourceInRoom(room);

        // TODO Optimize requests based on number of WORK parts and path distance to Source
        for (const source of sources) {
            const assignedCreeps = creepsBySource.get(source) || [];
            creepsBySource.set(source, assignedCreeps);
            while (assignedCreeps.length < 3 && Object.keys(unassignedCreeps).length > 0) {
                const nextCreepName = Object.keys(unassignedCreeps)[0];
                const nextCreep = unassignedCreeps[nextCreepName];
                if (nextCreep === undefined) break; // this should be impossible, so bail rather than possibly infinite loop
                assignedCreeps.push(nextCreep);
                delete unassignedCreeps[nextCreepName];
            }
        }
        // Persist the plan
        for (const source of creepsBySource.keys()) {
            let creeps = creepsBySource.get(source);
            if (creeps === undefined) continue;
            for (const creep of creeps) {
                console.log(`Assigning ${creep.name} to Source[${source.id}]`);
                // Save in planner memory
                this._assignCreepToSource(creep, source);
                // Save in creep memory
                creep.memory.source = source.id;
            }
        }
        if (Object.keys(unassignedCreeps).length > 0) {
            console.log("Ran out of space at Sources for waiting creeps: " + Object.values(unassignedCreeps).map((creep) => { return creep.name; }).join(', '));
        }
    }
}
