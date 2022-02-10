import { Task, Tasks } from "tasks";
import { BackingMemoryRecord, MemoryBackedClass, SerDeFunctions } from "utils/MemoryBackedClass";

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
    private constructor() { super(); };

    private _creeps: SourcePlannerCreeps | undefined;

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
        return this.proxyGenericRecord(serde, fetchMemory, cache);
    }

    get creeps(): SourcePlannerCreeps {
        if (this._creeps === undefined) {
            function fetchMemory() {
                // TODO this is the wrong place for this check
                if (Memory.SourcePlanner === undefined) Memory.SourcePlanner = {};
                if (Memory.SourcePlanner.creeps === undefined) Memory.SourcePlanner.creeps = {};
                return Memory.SourcePlanner.creeps;
            }
            this._creeps = this.proxyGenericObject(this.proxySourcePlannerCreepData.bind(this), fetchMemory, {});
        }
        return this._creeps;
    };

    // Request SourcePlanner to assign a Source by the end of the tick; may or may not happen
    requestSourceAssignment(creep: Creep): void {
        if (creep.task !== null) {
            console.log(`${creep.name} would like to harvest from an available Source`);
            this.creeps[creep.name] = {
                task: creep.task
            };
        }
    }
    assignSources(): void {
        for (const name in this.creeps) {
            // Only maintain request until task changes
            // TODO figure out why the typechecker doesn't alert on Game.creeps[name] could be undefined
            if (Game.creeps[name]?.task !== this.creeps[name].task) {
                delete this.creeps[name];
            }
        }
        for (const room in Game.rooms) {
            const sources = Game.rooms[room].find(FIND_SOURCES);
            let unassignedCreeps = Object.keys(this.creeps).filter((name) => { return Game.creeps[name].room.name == room; })
            let creepsBySource = new Map<Id<Source>, Creep[]>();
            // TODO Optimize requests based on number of WORK parts and path distance to Source
            for (const source of sources) {
                if (!creepsBySource.has(source.id)) creepsBySource.set(source.id, []);
                // Override the type checker because we know assignedCreeps isn't empty via the above test
                const assignedCreeps = <Creep[]>creepsBySource.get(source.id);
                while (assignedCreeps.length < 3 && unassignedCreeps.length > 0) {
                    // Override the type checker because we know unassignedCreeps isn't empty via the while condition
                    const nextCreepName: string = <string>unassignedCreeps.shift();
                    assignedCreeps.push(Game.creeps[nextCreepName]);
                    this.creeps[nextCreepName].source = source;
                    console.log(`Assigning ${nextCreepName} to Source[${source.id}]`);
                    console.log(JSON.stringify(Memory.SourcePlanner?.creeps));
                }
            }
            for (const sourceId of creepsBySource.keys()) {
                let creeps = creepsBySource.get(sourceId);
                if (creeps === undefined) creeps = [];
                for (const creep of creeps) {
                    creep.memory.source = sourceId;
                }
            }
            if (unassignedCreeps.length > 0) {
                console.log("Ran out of space at Sources for waiting creeps: " + unassignedCreeps.join(', '));
            }
        }
    }
}
