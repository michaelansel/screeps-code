import { BasePrivateKeyEncodingOptions } from "crypto";

export const registeredCreepRoles: Array<typeof CreepRole> = [];
export function registerCreepRole<T extends typeof CreepRole>(target: T) {
    registeredCreepRoles.push(target);
    return target;
}

export class CreepRole {
    static readonly RoleName: string;
    creep: Creep;

    constructor(creep: Creep) {
        this.matchRoleOrThrow(creep, (this.constructor as typeof CreepRole).RoleName);
        this.creep = creep;
    }

    private matchRoleOrThrow(creep: Creep, roleName: string) {
        if (creep.memory.role != roleName) throw Error(`Unable to create creep with mismatched role (expected: ${roleName}; got: ${creep.memory.role})`);
    }

    static matchesRole(creep: Creep): boolean {
        return creep.memory.role == this.RoleName;
    }

    run(): any {
        console.log(`Executing CreepRole default logic for ${this.creep.name}`);
    };
}

interface Project {};
interface Task {};

const Projects : { [projectName : string]: Id<Project> } = {
    HarvestEnergy: "HarvestEnergyProject" as Id<Project>,
}

const Tasks : { [taskName : string]: Id<Task> } = {
    HarvestEnergy: "HarvestEnergyTask" as Id<Task>,
    DepositEnergy: "DepositEnergyTask" as Id<Task>,
}

interface HarvesterMemory extends CreepMemory {
    source: Id<Source> | undefined;
    project: Id<Project> | undefined;
    task: Id<Task> | undefined;
    target: Id<StructureSpawn> | undefined;
}

@registerCreepRole
export class Harvester extends CreepRole {
    static readonly RoleName = "harvester";
    memory: HarvesterMemory;
    source: Source | null;
    target: StructureSpawn | null;

    constructor(creep: Creep) {
        super(creep);

        this.memory = creep.memory as HarvesterMemory;
        this.source = this.memory.source ? Game.getObjectById(this.memory.source) : null;
        this.target = this.memory.target ? Game.getObjectById(this.memory.target) : null;
    }

    fullOfEnergy() {
        return this.creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0;
    }

    setProject(project : Id<Project> | undefined) {
        if (project == undefined) {
            this.memory.project = undefined;
        } else {
            this.memory.project = project;
        }
    }
    setTask(task : Id<Task> | undefined) {
        if (task == undefined) {
            this.memory.task = undefined;
        } else {
            this.memory.task = task;
        }
    }
    getNextTask() {
        if (!this.memory.project) {
            this.getNextProject();
        }
        if (this.memory.project == Projects.HarvestEnergy) {
            if (this.fullOfEnergy()) {
                this.setTask(Tasks.DepositEnergy);
            } else {
                this.setTask(Tasks.HarvestEnergy);
            }
        }
    }
    getNextProject() {
        this.setProject(Projects.HarvestEnergy);
    }

    run(): any {
        console.log(`Executing Harvester logic for ${this.creep.name}`);
        if (!this.memory.task) {
            this.getNextTask();
        }
        switch(this.memory.task) {
            case Tasks.DepositEnergy:
                if (!this.memory.target) {
                    this.target = this.creep.pos.findClosestByRange(FIND_MY_SPAWNS);
                }

                if (this.target) {
                    this.memory.target = this.target.id;

                    // Keep draining the spawn so we have a place to put energy
                    const cost = BODYPART_COST.work + BODYPART_COST.carry + BODYPART_COST.move;
                    if (this.target.store[RESOURCE_ENERGY] > cost) {
                        this.target.spawnCreep([WORK, CARRY, MOVE], (Math.random()*1000).toString());
                    }

                    if (this.creep.pos.getRangeTo(this.target) > 1) {
                        this.creep.moveTo(this.target);
                    } else {
                        this.creep.transfer(this.target, RESOURCE_ENERGY);
                        this.setTask(undefined);
                        this.memory.target = undefined;
                    }
                }
                break;
            case Tasks.HarvestEnergy:
                if (!this.source) {
                    this.source = this.creep.pos.findClosestByPath(FIND_SOURCES);
                }

                if (this.source) {
                    this.memory.source = this.source.id;

                    if (this.creep.pos.getRangeTo(this.source) > 1) {
                        this.creep.moveTo(this.source);
                    } else {
                        this.creep.harvest(this.source);
                    }
                }

                if (this.fullOfEnergy()) {
                    // All done
                    this.setTask(undefined);
                    this.memory.source = undefined;
                }
                break;
            default:
                break;
        }
    }
}
