import { Creep, Game, Memory } from "test/unit/mock";
import _ from "lodash";
import { assert, expect } from "chai";
import { loop } from "main";
import sinon from "sinon";
import * as SourcePlannerModule from "planners/SourcePlanner";

// Mock constants that are needed
(global as any).RESOURCE_ENERGY = 'energy';
(global as any).FIND_SOURCES = 'sources';
(global as any).FIND_STRUCTURES = 'structures';

describe("main", () => {
  let consoleLogStub: sinon.SinonStub;
  let sourcePlannerStub: sinon.SinonStub;
  
  before(() => {
    // runs before all test in this block
  });

  beforeEach(() => {
    // runs before each test in this block
    // @ts-expect-error : allow adding Game to global
    global.Game = _.clone(Game);
    // @ts-expect-error : allow adding Memory to global
    global.Memory = _.clone(Memory);
    
    // Stub console.log to capture logging  
    consoleLogStub = sinon.stub(console, 'log');
    
    // Mock SourcePlanner to avoid issues with singleton
    sourcePlannerStub = sinon.stub(SourcePlannerModule.SourcePlanner.prototype, 'assignSources');
  });
  
  afterEach(() => {
    sinon.restore();
  });

  it("should export a loop function", () => {
    assert.isTrue(typeof loop === "function");
  });

  it("should return void when called with no context", () => {
    assert.isUndefined(loop());
  });

  it("Automatically delete memory of missing creeps", () => {
    // Simulate that notPersistValue recently died
    Memory.creeps.persistValue = "any value";
    Memory.creeps.notPersistValue = "any value";

    // Indicate an active creep called persistValue
    Game.creeps.persistValue = _.clone(Creep);

    loop();

    assert.isDefined(Memory.creeps.persistValue);
    assert.isUndefined(Memory.creeps.notPersistValue);
  });

  it.skip("should log comprehensive tick information", () => {
    // Setup game state with spawns and rooms
    Game.spawns = {
      Spawn1: {
        store: { energy: 300 },
        spawning: null,
        room: { name: 'W1N1' }
      } as any
    };
    
    Game.rooms = {
      W1N1: {
        name: 'W1N1',
        controller: { level: 1 },
        find: sinon.stub().returns([])
      } as any
    };
    
    Game.time = 1000;
    
    loop();
    
    // Verify comprehensive logging
    expect(consoleLogStub.calledWith(sinon.match(/🎮 === TICK 1000 START ===/)), 'Should log tick start').to.be.true;
    expect(consoleLogStub.calledWith(sinon.match(/⚡ Energy:/)), 'Should log energy').to.be.true;
    expect(consoleLogStub.calledWith(sinon.match(/🤖 Creeps:/)), 'Should log creep count').to.be.true;
    expect(consoleLogStub.calledWith(sinon.match(/🏭 Spawns:.*🏠 Rooms:/)), 'Should log spawns and rooms').to.be.true;
    expect(consoleLogStub.calledWith(sinon.match(/🏠 === ROOM OPERATIONS ===/)), 'Should log room operations header').to.be.true;
    expect(consoleLogStub.calledWith(sinon.match(/🏭 === SPAWNING OPERATIONS ===/)), 'Should log spawning operations header').to.be.true;
    expect(consoleLogStub.calledWith(sinon.match(/🎮 === TICK 1000 END ===/)), 'Should log tick end').to.be.true;
  });

  it.skip("should ensure all creeps have projects assigned", () => {
    // Setup minimal mocks needed for the test
    Game.rooms = {};
    Game.spawns = {};
    
    // Create a creep without a project
    const creepMock = {
      memory: {},
      store: { energy: 0, getCapacity: () => 50 },
      run: sinon.stub()
    };
    
    Game.creeps = {
      TestCreep: creepMock as any
    };
    
    // Test manual assignment (to verify our understanding of the logic)
    if (!creepMock.memory.project || !creepMock.memory.project.id) {
      creepMock.memory.project = {
        id: "DoNothingProject" as any,
        config: {}
      };
    }
    
    // Verify manual assignment works
    expect(creepMock.memory.project).to.exist;
    expect(creepMock.memory.project.id).to.equal('DoNothingProject');
    
    // Reset for actual test
    creepMock.memory = {};
    expect(creepMock.memory.project).to.be.undefined;
    
    // Stub Logger to avoid potential issues
    const loggerStub = sinon.stub().returns({
      error: sinon.stub(),
      warn: sinon.stub(),
      info: sinon.stub(),
      debug: sinon.stub()
    });
    
    try {
      loop();
    } catch (error) {
      console.log('Loop threw error:', error);
      throw error;
    }
    
    // Verify the creep now has a project
    expect(creepMock.memory.project, 'Creep should have a project after loop').to.exist;
    expect(creepMock.memory.project.id, 'Creep should have DoNothingProject assigned').to.equal('DoNothingProject');
    expect(creepMock.memory.project.config, 'Creep should have project config').to.exist;
  });

  it.skip("should log project assignment statistics", () => {
    // Create creeps with different projects
    Game.creeps = {
      Harvester1: {
        memory: { project: { id: 'HarvestEnergyProject', config: {} } },
        store: { energy: 50, getCapacity: () => 50 },
        run: sinon.stub()
      } as any,
      Builder1: {
        memory: { project: { id: 'BuilderProject', config: {} } },
        store: { energy: 25, getCapacity: () => 50 },
        run: sinon.stub()
      } as any
    };
    
    loop();
    
    // Should log project statistics
    expect(consoleLogStub.calledWith(sinon.match(/📊 Project assignments:/)), 'Should log project statistics').to.be.true;
    
    // Should log individual creep information
    expect(consoleLogStub.calledWith(sinon.match(/🤖 Harvester1: HarvestEnergyProject/)), 'Should log Harvester1 details').to.be.true;
    expect(consoleLogStub.calledWith(sinon.match(/🤖 Builder1: BuilderProject/)), 'Should log Builder1 details').to.be.true;
  });

  it.skip("should never allow creeps to exist without projects", () => {
    // Create multiple creeps, some without projects
    Game.creeps = {
      GoodCreep: {
        memory: { project: { id: 'HarvestEnergyProject', config: {} } },
        store: { energy: 50, getCapacity: () => 50 },
        run: sinon.stub()
      } as any,
      BadCreep1: {
        memory: {},
        store: { energy: 0, getCapacity: () => 50 },
        run: sinon.stub()
      } as any,
      BadCreep2: {
        memory: { project: null },
        store: { energy: 25, getCapacity: () => 50 },
        run: sinon.stub()
      } as any
    };
    
    loop();
    
    // All creeps should now have projects
    expect(Game.creeps.GoodCreep.memory.project.id).to.equal('HarvestEnergyProject');
    expect(Game.creeps.BadCreep1.memory.project.id).to.equal('DoNothingProject');
    expect(Game.creeps.BadCreep2.memory.project.id).to.equal('DoNothingProject');
    
    // Should detect and fix multiple missing projects
    expect(consoleLogStub.calledWith(sinon.match(/🚨 CRITICAL: 2 creeps were missing projects!/)), 'Should detect 2 missing projects').to.be.true;
  });
});
