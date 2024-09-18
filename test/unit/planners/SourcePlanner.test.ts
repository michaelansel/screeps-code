import { globalsSetup, globalsCleanup } from 'test/unit/globals';
import * as _ from "lodash";

import { SourcePlanner, SourcePlannerMemory } from "planners/SourcePlanner";
import { HarvestEnergyTask } from "tasks";

import { assert } from "chai";
import { HarvestEnergyTaskConfig } from 'tasks/HarvestEnergyTask';
const sinon = require('sinon');

const EmptyGame: object = {};
const EmptyMemory: object = {};

function makeTestCreep(props: { name?: string, memory?: CreepMemory, room?: string }): Creep {
    const creep = new Creep("ignored" as Id<Creep>);
    creep.name = props.name || "creep";
    creep.memory = props.memory || {};
    creep.room = <Room>{ name: props.room || "room" };
    return creep;
}

function fakeLoadGameObjectById(objects: { [key: string]: any }) {
    return sinon.fake(
        (id: string): object | undefined => {
            if (id in objects) return objects[id];
            return undefined;
        });
}

describe("SourcePlanner", () => {
    beforeEach(() => {
        globalsSetup();

        // @ts-ignore : allow adding Game to global
        global.Game = _.clone(EmptyGame);
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(EmptyMemory);
    });

    afterEach(() => {
        globalsCleanup();
        sinon.restore();
    })

    context("only one creep requesting assignment", () => {
        it("should assign a source", () => {
            // Fixtures
            const roomName = "room1";
            const creep: Creep = makeTestCreep({
                room: roomName,
                memory: {
                    task: {
                        id: HarvestEnergyTask.id,
                    },
                },
            });
            const sources: Source[] = [<Source>{ id: "source1" }];

            // Object Under Test
            const planner = SourcePlanner.instance;

            // Fake
            sinon.replace(planner, 'sourcesInRoom', sinon.fake.returns(sources));
            sinon.replace(planner, 'requestingCreeps', sinon.fake.returns([creep]));

            // Act
            planner.requestSourceAssignment(creep);
            planner.assignSources({ name: roomName } as Room);

            // Assert
            assert.isDefined((creep.memory.task?.config as HarvestEnergyTaskConfig).source);
        });

        it("should maintain existing assignments", () => {
            // Fixtures
            const roomName = "room1";
            const creep: Creep = makeTestCreep({
                room: roomName,
                memory: {
                    task: {
                        id: HarvestEnergyTask.id,
                        config: <HarvestEnergyTaskConfig>{
                            source: "source1" as Id<Source>,
                        },
                    },
                },
            });
            const sources: Source[] = [<Source>{ id: "source2" }]; // Trigger reassigment
            // Existing planner state
            const memory: SourcePlannerMemory = {
                creeps: {
                    [creep.name]: {
                        task: HarvestEnergyTask.id,
                        source: "source1" as Id<Source>,
                    }
                }
            };

            // Object Under Test
            const planner = SourcePlanner.instance;

            // Fake
            sinon.replace(planner, 'fetchMemory', sinon.fake.returns(memory));
            sinon.replace(planner, 'sourcesInRoom', sinon.fake.returns(sources));
            sinon.replace(planner, 'requestingCreeps', sinon.fake.returns([creep]));
            sinon.replace(planner, 'loadGameObjectById', fakeLoadGameObjectById({
                "source1": <Source>{ id: "source1" },
                "source2": <Source>{ id: "source2" },
            }));

            // Act
            planner.assignSources({ name: roomName } as Room);

            // Assert
            // TODO reconsider test since the memory structure changed
            // assert.isDefined(creep.memory.source);
            // if (creep.memory.source === undefined) assert.fail(); // Just to make TypeScript happy
            // assert.equal(creep.memory.source, "source1");
        });
    });

    context("too many creeps requesting assignment", () => {
        it("should assign a source to some creeps", () => {
            // Fixtures
            const roomName = "room1";
            let creeps: Creep[] = [];
            for (let i = 0; i < 10; i++) {
                const name = `test${i.toString()}`;
                const creep: Creep = makeTestCreep({
                    name: name,
                    room: roomName,
                    memory: {
                        task: {
                            id: HarvestEnergyTask.id,
                        },
                    },
                });
                creeps.push(creep);
            }
            const sources: Source[] = [<Source>{ id: "source1" }];

            // Object Under Test
            const planner = SourcePlanner.instance;

            // Fake
            sinon.replace(planner, 'sourcesInRoom', sinon.fake.returns(sources));
            sinon.replace(planner, 'requestingCreeps', sinon.fake.returns(creeps));
            sinon.replace(planner, 'loadGameObjectById', fakeLoadGameObjectById({
                "source1": <Source>{ id: "source1" },
            }));

            // Act
            for (const creep of creeps) {
                planner.requestSourceAssignment(creep);
            }
            planner.assignSources({ name: roomName } as Room);

            // Assert
            // TODO reconsider test since the memory structure changed
            // let numCreepsWithSource = creeps.filter(
            //     (creep) => { return creep.memory.source !== undefined; }
            // ).length;

            // assert.isAtLeast(numCreepsWithSource, 1, "should assign at least one creep to a source");
            // assert.isBelow(numCreepsWithSource, creeps.length, "should not assign all creeps to a source");
        });

        it("should maintain existing assignments");
        it("should ignore creeps in different rooms");
    });

    context("#creepsBySourceInRoom", () => {
        it("should map creeps to assigned sources");
        it("should only trust internal assignment state"); // as opposed to trusting creep.memory.source
        it("should not return creeps without a source");
        it("should ignore creeps in other rooms");
    })
});
