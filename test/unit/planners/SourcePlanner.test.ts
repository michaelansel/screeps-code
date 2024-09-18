import { SourcePlanner, SourcePlannerMemory } from "planners/SourcePlanner";
import { globalsCleanup, globalsSetup } from "test/unit/globals";

import { HarvestEnergyTask } from "tasks";
import { HarvestEnergyTaskConfig } from "tasks/HarvestEnergyTask";

import _ from "lodash";
import { assert } from "chai";
import sinon from "sinon";

const EmptyGame: object = {};
const EmptyMemory: object = {};

function makeTestCreep(props: { name?: string; memory?: CreepMemory; room?: string }): Creep {
  const creep = new Creep("ignored" as Id<Creep>);
  creep.name = props.name || "creep";
  creep.memory = props.memory || {};
  creep.room = { name: props.room || "room" } as Room;
  return creep;
}

function fakeLoadGameObjectById<T extends _HasId>(objects: { [key: Id<T>]: T }) {
  return sinon.fake((id: Id<T>): T | undefined => {
    if (id in objects) return objects[id];
    return undefined;
  });
}

describe("SourcePlanner", () => {
  beforeEach(() => {
    globalsSetup();

    // @ts-expect-error : allow adding Game to global
    global.Game = _.clone(EmptyGame);
    // @ts-expect-error : allow adding Memory to global
    global.Memory = _.clone(EmptyMemory);
  });

  afterEach(() => {
    globalsCleanup();
    sinon.restore();
  });

  context("only one creep requesting assignment", () => {
    it("should assign a source", () => {
      // Fixtures
      const roomName = "room1";
      const creep: Creep = makeTestCreep({
        room: roomName,
        memory: {
          task: {
            id: HarvestEnergyTask.id
          }
        }
      });
      const sources: Source[] = [{ id: "source1" } as Source];

      // Object Under Test
      const planner = SourcePlanner.instance;

      // Fake
      sinon.replace(planner, "sourcesInRoom" as keyof SourcePlanner, sinon.fake.returns(sources));
      sinon.replace(planner, "requestingCreeps" as keyof SourcePlanner, sinon.fake.returns([creep]));

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
            config: {
              source: "source1" as Id<Source>
            } as HarvestEnergyTaskConfig
          }
        }
      });
      const sources: Source[] = [{ id: "source2" } as Source]; // Trigger reassigment
      // Existing planner state
      const memory: SourcePlannerMemory = {
        creeps: {
          [creep.name]: {
            task: HarvestEnergyTask.id,
            source: "source1" as Id<Source>
          }
        }
      };

      // Object Under Test
      const planner = SourcePlanner.instance;

      // Fake
      sinon.replace(planner, "fetchMemory" as keyof SourcePlanner, sinon.fake.returns(memory));
      sinon.replace(planner, "sourcesInRoom" as keyof SourcePlanner, sinon.fake.returns(sources));
      sinon.replace(planner, "requestingCreeps" as keyof SourcePlanner, sinon.fake.returns([creep]));
      const sourceObjects = {
        source1: { id: "source1" } as Source,
        source2: { id: "source2" } as Source
      };
      sinon.replace(
        planner,
        "loadGameObjectById" as keyof SourcePlanner,
        // TODO see if this is still broken after MemoryBackedClass has been fixed
        // @ts-expect-error this is probably broken because of MemoryBackedClass shenanigans
        fakeLoadGameObjectById<Source>(sourceObjects)
      );

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
      const creeps: Creep[] = [];
      for (let i = 0; i < 10; i++) {
        const name = `test${i.toString()}`;
        const creep: Creep = makeTestCreep({
          name,
          room: roomName,
          memory: {
            task: {
              id: HarvestEnergyTask.id
            }
          }
        });
        creeps.push(creep);
      }
      const sources: Source[] = [{ id: "source1" } as Source];

      // Object Under Test
      const planner = SourcePlanner.instance;

      // Fake
      sinon.replace(planner, "sourcesInRoom" as keyof SourcePlanner, sinon.fake.returns(sources));
      sinon.replace(planner, "requestingCreeps" as keyof SourcePlanner, sinon.fake.returns(creeps));
      const sourceObjects = {
        source1: { id: "source1" } as Source,
        source2: { id: "source2" } as Source
      };
      sinon.replace(
        planner,
        "loadGameObjectById" as keyof SourcePlanner,
        // TODO see if this is still broken after MemoryBackedClass has been fixed
        // @ts-expect-error this is probably broken because of MemoryBackedClass shenanigans
        fakeLoadGameObjectById<Source>(sourceObjects)
      );

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
  });
});
