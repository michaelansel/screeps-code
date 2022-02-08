import { Task, Tasks } from "tasks";

interface SourcePlannerCreeps { [name: string]: { task: Task, source?: Source } };

export class SourcePlanner {
    private static _instance: SourcePlanner;
    static get instance(): SourcePlanner {
        if (!SourcePlanner._instance) {
            SourcePlanner._instance = new SourcePlanner();
        }
        return SourcePlanner._instance;
    };
    private constructor() { };

    // TODO persist to Memory
    private _creeps: SourcePlannerCreeps | undefined;
    get creeps(): SourcePlannerCreeps {
        if (this._creeps === undefined) {
            this._creeps = {};
        }
        return this._creeps
    };
    set creeps(creeps: SourcePlannerCreeps) {
        this._creeps = creeps;
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
            if (Game.creeps[name].task !== this.creeps[name].task) {
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
                    console.log(`Assigning ${nextCreepName} to Source[${source.id}]`);
                }
            }
            for (const source of creepsBySource.keys()) {
                let creeps = creepsBySource.get(source);
                if (creeps === undefined) creeps = [];
                for (const creep of creeps) {
                    creep.memory.source = source;
                }
            }
            if (unassignedCreeps.length > 0) {
                console.log("Ran out of space at Sources for waiting creeps: " + unassignedCreeps.join(', '));
            }
        }
    }
}
